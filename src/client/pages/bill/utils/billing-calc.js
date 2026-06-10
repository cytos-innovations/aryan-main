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
 * Group tax amounts by tax name for the bill tax breakdown table.
 */
export function calcTaxBreakdown(items = []) {
  const map = {};
  for (const item of items.filter((i) => i.item_status === "ACTIVE")) {
    const taxable = Number(item.taxable_amount) || 0;
    const details = Array.isArray(item.tax_details) && item.tax_details.length > 0
      ? item.tax_details
      : null;

    if (details) {
      // Each tax component applies independently to the full taxable amount
      for (const d of details) {
        const pct  = Number(d.tax_percentage) || 0;
        const key  = d.tax_name ?? "No Tax";
        const tamt = round2(taxable * pct / 100);
        if (!map[key]) map[key] = { tax_name: key, tax_percentage: pct, taxable_amount: 0, tax_amount: 0 };
        map[key].taxable_amount = round2(map[key].taxable_amount + taxable);
        map[key].tax_amount     = round2(map[key].tax_amount     + tamt);
      }
    } else {
      const key = item.tax_name ?? "No Tax";
      if (!map[key]) map[key] = { tax_name: key, tax_percentage: Number(item.tax_percentage) || 0, taxable_amount: 0, tax_amount: 0 };
      map[key].taxable_amount = round2(map[key].taxable_amount + taxable);
      map[key].tax_amount     = round2(map[key].tax_amount     + (Number(item.tax_amount) || 0));
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
    seen.get(catId).total += Number(item.final_amount) || 0;
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
