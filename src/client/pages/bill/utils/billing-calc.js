// ─────────────────────────────────────────────────────────────
// Billing calculation engine
// All monetary values kept to 2 decimal places.
// All percentages are 0-100 values (e.g. 10 = 10%).
// ─────────────────────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Compute all amounts for a single order line item.
 * Returns grossAmount, discountAmount, taxableAmount, taxAmount, finalAmount.
 */
export function calcLineItem({ rate, quantity, discountPercent = 0, taxPercent = 0 }) {
  const qty  = Number(quantity) || 0;
  const r    = Number(rate) || 0;
  const disc = Number(discountPercent) || 0;
  const tax  = Number(taxPercent) || 0;

  const grossAmount    = round2(r * qty);
  const discountAmount = round2((grossAmount * disc) / 100);
  const taxableAmount  = round2(grossAmount - discountAmount);
  const taxAmount      = round2((taxableAmount * tax) / 100);
  const finalAmount    = round2(taxableAmount + taxAmount);

  return { grossAmount, discountAmount, taxableAmount, taxAmount, finalAmount };
}

/**
 * Aggregate all ACTIVE order items into bill-level totals.
 * Handles round-off to nearest rupee.
 */
export function calcBillTotals(items = []) {
  const active = items.filter((i) => i.item_status === "ACTIVE");

  let grossAmount    = 0;
  let discountAmount = 0;
  let taxableAmount  = 0;
  let taxAmount      = 0;
  let finalAmount    = 0;

  for (const item of active) {
    grossAmount    += Number(item.gross_amount)    || 0;
    discountAmount += Number(item.discount_amount) || 0;
    taxableAmount  += Number(item.taxable_amount)  || 0;
    taxAmount      += Number(item.tax_amount)      || 0;
    finalAmount    += Number(item.final_amount)    || 0;
  }

  const roundOff = round2(Math.round(finalAmount) - finalAmount);
  const netAmount = round2(finalAmount + roundOff);

  return {
    grossAmount:    round2(grossAmount),
    discountAmount: round2(discountAmount),
    taxableAmount:  round2(taxableAmount),
    taxAmount:      round2(taxAmount),
    finalAmount:    round2(finalAmount),
    roundOff,
    netAmount,
  };
}

/**
 * Resolve the total bill-level discount (category + bill discount, plus legacy
 * fields) carried on a sessionDisc object. Excludes item-level (per-line)
 * discounts which already live in each item's discount_amount.
 */
export function resolveBillDiscount(sessionDisc) {
  if (!sessionDisc) return 0;
  const catDisc = sessionDisc.catDiscAmts
    ? Object.values(sessionDisc.catDiscAmts).reduce((s, a) => s + (Number(a) || 0), 0)
    : (Number(sessionDisc.totalCatDisc) || 0);
  const legacy = (Number(sessionDisc.discAmt) || 0)
    + (Number(sessionDisc.foodDiscAmt) || 0)
    + (Number(sessionDisc.liquorDiscAmt) || 0);
  const billDisc  = Number(sessionDisc.billDiscAmt) || 0;
  const miscMinus = Number(sessionDisc.miscMinus)   || 0;
  // catDisc/billDisc are the canonical new-shape fields; fall back to legacy only
  // when no new-shape value is present.
  const base = (catDisc + billDisc) > 0 ? (catDisc + billDisc) : legacy;
  return round2(base + miscMinus);
}

/**
 * Recompute a sessionDisc's discount AMOUNTS live from its saved INTENT
 * (per-category values + bill discount, interpreted per discMode) against the
 * CURRENT items. This keeps the discount in sync as items are added/removed —
 * a saved "5%" always re-derives the right rupee amount, and a saved flat ₹
 * amount is capped so it never exceeds the (possibly smaller) new bill.
 *
 * Returns a fresh sessionDisc (catDiscAmts, totalCatDisc, billDiscAmt, billDiscPct,
 * netAmt, discPct) or null when there is no discount intent to apply.
 */
export function recalcSessionDisc(items, sessionDisc, menu) {
  if (!sessionDisc) return null;

  const { menuIdToCatId, catIdToInfo } = buildMenuLookups(menu);
  const cats = buildCategories(items ?? [], menuIdToCatId, catIdToInfo);
  const totals = calcBillTotals(items ?? []);
  const taxable = totals.taxableAmount;

  const discMode = sessionDisc.discMode ?? "pct";
  const catRows  = sessionDisc.catRows ?? {};

  // Per-category discount amounts, re-derived from the saved value + current total.
  const catDiscAmts = {};
  let totalCatDisc = 0;
  for (const cat of cats) {
    const raw = parseFloat(catRows[cat.id]?.value) || 0;
    const catMax = cat.max_discount != null ? cat.max_discount : 100;
    const cap = cat.allow_discount ? catMax : 0;
    let amt;
    if (discMode === "pct") {
      amt = round2(cat.total * Math.min(raw, cap) / 100);
    } else {
      const maxFlat = round2(cat.total * cap / 100);
      amt = round2(Math.min(raw, maxFlat));
    }
    if (amt > 0) { catDiscAmts[cat.id] = amt; totalCatDisc = round2(totalCatDisc + amt); }
  }

  // Bill-level discount: % re-applies to the post-category-discount taxable;
  // a saved flat amount is capped at the current post-category taxable.
  const afterCatDisc = round2(taxable - totalCatDisc);
  const billDiscPctSaved = Number(sessionDisc.billDiscPct) || 0;
  const billDiscFlatSaved = Number(sessionDisc.billDiscAmt) || 0;
  let billDiscAmt;
  if (discMode === "pct") {
    billDiscAmt = round2(afterCatDisc * Math.min(billDiscPctSaved, 100) / 100);
  } else {
    billDiscAmt = round2(Math.min(billDiscFlatSaved, afterCatDisc));
  }
  const billDiscPct = afterCatDisc > 0 ? round2(billDiscAmt / afterCatDisc * 100) : 0;

  const nextDisc = {
    ...sessionDisc,
    discMode, catRows, catDiscAmts, totalCatDisc,
    billDiscAmt, billDiscPct,
  };
  const dt = calcDiscountedTotals(items ?? [], nextDisc);
  const discPct = taxable > 0
    ? round2((totalCatDisc + billDiscAmt) / taxable * 100)
    : 0;

  return { ...nextDisc, netAmt: dt.netAmount, discPct };
}

/**
 * Apply an Indian-GST-compliant discount-before-tax recomputation.
 *
 * The bill-level discount (category + bill discount) is apportioned across the
 * ACTIVE items in proportion to each item's taxable_amount. Each item's taxable
 * base is reduced by its share and its tax is recomputed at the same effective
 * rate, so GST is charged on the post-discount value (as the law requires).
 *
 * Item-level (per-line) discounts are already baked into each item's
 * taxable_amount/tax_amount, so this only spreads the *additional* bill-level
 * discount on top.
 *
 * Returns aggregate totals plus a per-item map (id → reduced taxable/tax) and a
 * recomputed tax breakdown.
 */
export function calcDiscountedTotals(items = [], sessionDisc = null) {
  const active = items.filter((i) => i.item_status === "ACTIVE");

  const grossAmount   = round2(active.reduce((s, i) => s + (Number(i.gross_amount)   || 0), 0));
  const itemDiscount  = round2(active.reduce((s, i) => s + (Number(i.discount_amount)|| 0), 0));
  const baseTaxable   = round2(active.reduce((s, i) => s + (Number(i.taxable_amount) || 0), 0));
  const baseTax       = round2(active.reduce((s, i) => s + (Number(i.tax_amount)     || 0), 0));

  // Bill-level discount to spread (never exceeds the taxable base).
  const billDiscount  = Math.min(resolveBillDiscount(sessionDisc), baseTaxable);
  const sCharge       = Number(sessionDisc?.sCharge) || 0;
  const miscAdd       = Number(sessionDisc?.misc)    || 0;

  // Apportion the bill discount across items proportionally to taxable amount.
  // Track a running remainder so rounding never loses/gains a paisa.
  const perItem = {};
  let allocated = 0;
  let taxableAfter = 0;
  let taxAfter     = 0;
  for (let idx = 0; idx < active.length; idx++) {
    const item    = active[idx];
    const taxable = Number(item.taxable_amount) || 0;
    const tax     = Number(item.tax_amount)     || 0;
    const isLast  = idx === active.length - 1;

    const share = baseTaxable > 0
      ? (isLast ? round2(billDiscount - allocated) : round2(billDiscount * taxable / baseTaxable))
      : 0;
    allocated = round2(allocated + share);

    const newTaxable = round2(taxable - share);
    // Recompute tax at the item's own effective rate (tax scales with taxable).
    const newTax     = taxable > 0 ? round2(tax * (newTaxable / taxable)) : 0;

    perItem[item.id] = {
      discShare:    share,
      taxableAfter: newTaxable,
      taxAfter:     newTax,
    };
    taxableAfter = round2(taxableAfter + newTaxable);
    taxAfter     = round2(taxAfter + newTax);
  }

  const finalAfter = round2(taxableAfter + taxAfter + sCharge + miscAdd);
  const roundOff   = round2(Math.round(finalAfter) - finalAfter);
  const netAmount  = round2(finalAfter + roundOff);

  return {
    grossAmount,
    itemDiscount,                       // per-line discounts (already in items)
    billDiscount: round2(billDiscount), // bill-level discount spread here
    discountAmount: round2(itemDiscount + billDiscount),
    baseTaxable,                        // taxable before bill discount
    baseTax,                            // tax before bill discount
    taxableAmount: taxableAfter,        // taxable after bill discount
    taxAmount:     taxAfter,            // tax after bill discount (GST on net)
    sCharge,
    miscAdd,
    finalAmount: finalAfter,
    roundOff,
    netAmount,
    perItem,
  };
}

/**
 * Group tax amounts by tax name for the bill tax breakdown table.
 *
 * Pass the optional `perItem` map from calcDiscountedTotals to render the
 * post-discount (GST-on-net) tax figures; omit it for the raw pre-discount tax.
 */
export function calcTaxBreakdown(items = [], perItem = null) {
  const map = {};
  for (const item of items.filter((i) => i.item_status === "ACTIVE")) {
    const rawTaxable = Number(item.taxable_amount) || 0;
    // When a per-item override is supplied (post-discount), use the reduced
    // taxable so the breakdown reflects GST-on-net.
    const override = perItem?.[item.id];
    const taxable  = override ? Number(override.taxableAfter) || 0 : rawTaxable;
    const details = Array.isArray(item.tax_details) && item.tax_details.length > 0
      ? item.tax_details
      : null;

    if (details) {
      for (const d of details) {
        const pct  = Number(d.tax_percentage) || 0;
        const key  = d.tax_name ?? "No Tax";
        const tamt = round2(taxable * pct / 100);
        if (!map[key]) map[key] = { tax_name: key, tax_percentage: pct, tax_amount: 0 };
        map[key].tax_amount = round2(map[key].tax_amount + tamt);
      }
    } else {
      // Compound tax_name like "CGST ON FOODS + SGST ON FOODS" — split and attribute
      // total tax_amount equally among components so they merge with detail-based entries.
      const rawName   = item.tax_name ?? "No Tax";
      const components = rawName.split(" + ").map((s) => s.trim()).filter(Boolean);
      // Scale the stored tax by the post-discount reduction when an override
      // is supplied (override.taxAfter already holds the recomputed figure).
      const rawTamt    = Number(item.tax_amount) || 0;
      const totalTamt  = override ? Number(override.taxAfter) || 0 : rawTamt;
      const perComp    = round2(totalTamt / components.length);
      // Percentage is derived from the ORIGINAL rate (rawTaxable/rawTamt) so the
      // displayed % stays stable regardless of any discount applied to the base.
      const rawPerComp = round2(rawTamt / components.length);
      for (let i = 0; i < components.length; i++) {
        const key  = components[i];
        const tamt = i === components.length - 1
          ? round2(totalTamt - perComp * (components.length - 1)) // last gets remainder
          : perComp;
        const pct  = rawTaxable > 0 ? round2(rawPerComp / rawTaxable * 100) : 0;
        if (!map[key]) map[key] = { tax_name: key, tax_percentage: pct, tax_amount: 0 };
        map[key].tax_amount = round2(map[key].tax_amount + tamt);
      }
    }
  }
  return Object.values(map);
}

/**
 * Select the correct rate from a menu item based on the applicable_rate column (1-5).
 */
export function selectItemRate(menuItem, applicableRate) {
  const rateKey = `rate_${applicableRate ?? 1}`;
  const rate = Number(menuItem[rateKey]);
  return isNaN(rate) ? Number(menuItem.rate_1) || 0 : rate;
}

/**
 * Validate payment entries: total paid must cover or equal net amount.
 */
export function validatePayments(payments, netAmount) {
  const totalPaid = round2(
    payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  );
  return {
    isValid:   totalPaid >= round2(netAmount),
    totalPaid,
    shortfall: round2(Math.max(0, netAmount - totalPaid)),
    excess:    round2(Math.max(0, totalPaid - netAmount)),
  };
}

/**
 * Build two lookup Maps from the menu master array:
 *   menuIdToCatId : menu_id  → category_id
 *   catIdToInfo   : cat_id   → { id, name, allow_discount, max_discount, auto_discount }
 * max_discount is null when not configured (treat as uncapped).
 */
export function buildMenuLookups(menu) {
  const menuIdToCatId = new Map();
  const catIdToInfo   = new Map();
  for (const m of menu ?? []) {
    const catId = m.category_id ?? 0;
    menuIdToCatId.set(m.id, catId);
    if (!catIdToInfo.has(catId)) {
      catIdToInfo.set(catId, {
        id:             catId,
        name:           m.category_name        ?? "Uncategorised",
        allow_discount: m.allow_discount        ?? false,
        max_discount:   (m.max_discount_percent  != null && m.max_discount_percent  > 0) ? m.max_discount_percent  : null,
        auto_discount:  (m.auto_discount_percent != null && m.auto_discount_percent > 0) ? m.auto_discount_percent : 0,
      });
    }
  }
  return { menuIdToCatId, catIdToInfo };
}

/**
 * Derive the unique category list from active bill items.
 * Uses menu lookups as authoritative source (works for draft/optimistic items too).
 */
export function buildCategories(items, menuIdToCatId, catIdToInfo) {
  const seen = new Map();
  for (const item of items) {
    if (item.item_status !== "ACTIVE") continue;
    const catId = (item.menu_id != null ? menuIdToCatId.get(item.menu_id) : null)
                  ?? item.category_id
                  ?? 0;
    if (!seen.has(catId)) {
      const fromInfo = catIdToInfo.get(catId);
      seen.set(catId, {
        id:             catId,
        name:           fromInfo?.name           ?? item.category_name        ?? "Uncategorised",
        allow_discount: fromInfo?.allow_discount ?? item.allow_discount        ?? false,
        max_discount:   fromInfo?.max_discount   ?? (item.max_discount_percent > 0 ? item.max_discount_percent : null),
        auto_discount:  fromInfo?.auto_discount  ?? item.auto_discount_percent ?? 0,
        total:          0,
      });
    }
    // Pre-tax (taxable) subtotal — category/bill discount % applies to the
    // pre-tax base, per Indian GST (discount before tax).
    seen.get(catId).total += Number(item.taxable_amount) || 0;
  }
  return [...seen.values()];
}

/**
 * Format a NUMERIC value for display (2 decimal places, INR style).
 */
export function fmtAmount(n) {
  return Number(n || 0).toFixed(2);
}

/**
 * Minutes until reservation time today (negative = already past).
 * timeStr is "HH:MM" or "HH:MM:SS" in local restaurant time.
 */
export function minsUntilReservation(timeStr, nowMs) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const res = new Date(nowMs);
  res.setHours(h, m, 0, 0);
  return (res.getTime() - nowMs) / 60_000;
}

/**
 * Compute reservation warning phase for a floor-view table row.
 *
 * Returns:
 *   null       – no active reservation overlay
 *   "ARRIVED"  – guest marked arrived, KOT allowed, reservation_id must be attached to session
 *   "NEAR"     – 0–10 min before reservation time: blue visual, KOT blocked
 *   "WARNING"  – 10–30 min before: warning toast on click, no visual change
 *   "NORMAL"   – > 30 min away: no special behavior
 *   "PAST"     – reservation time has passed without arrival: restrictions cleared
 */
export function getReservationPhase(table, nowMs) {
  if (table.reservation_id == null) return null;

  // Guest has been marked as arrived — show blue, allow KOT with reservation attachment
  if (table.reservation_status === "ARRIVED") return "ARRIVED";

  // Only apply timing logic for RESERVED status
  if (table.reservation_status !== "RESERVED" || !table.reservation_time) return null;

  const mins = minsUntilReservation(table.reservation_time, nowMs);
  if (mins === null) return null;
  // Keep table BLUE for the full 15-min no-show grace window after reservation time.
  // Only revert to normal once the auto-expiry backend has had a chance to run.
  if (mins < -15) return "PAST";
  if (mins <= 10) return "NEAR";   // covers 0–10 min before AND overdue within grace period
  if (mins <= 30) return "WARNING";
  return "NORMAL";
}
