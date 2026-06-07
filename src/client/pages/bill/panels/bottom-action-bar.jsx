import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import {
  PrinterIcon,
  CashIcon,
  Hold01Icon,
  Discount01Icon,
  AlertCircleIcon,
  CouponPercentIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useBillingContext } from "../state/billing-context";
import { useGenerateKot, useGenerateBill } from "../hooks/use-billing-queries";
import { billingService } from "../services/billing-service";
import { fmtAmount, calcBillTotals, buildMenuLookups, buildCategories } from "../utils/billing-calc";
import { BQK } from "../constants/billing";

// ─── Panel mode enum ──────────────────────────────────────────

export const BOTTOM_PANEL_MODE = {
  BILLING:  "billing",
  DISCOUNT: "discount",
};

// ─── Shared helpers ───────────────────────────────────────────

function KbdBadge({ children }) {
  if (!children) return <span className="h-3.5 block" />;
  return (
    <span className="text-[8px] font-mono px-1 py-0.5 rounded leading-none bg-black/10 dark:bg-white/10 opacity-80">
      {children}
    </span>
  );
}

const POS_ACTIONS = ["kotprint", "billprint", "settle"];

function focusPosAction(after) {
  const start = after ? POS_ACTIONS.indexOf(after) + 1 : 0;
  for (let i = start; i < POS_ACTIONS.length; i++) {
    const el = document.querySelector(`[data-pos-action="${POS_ACTIONS[i]}"]`);
    if (el && !el.disabled) { el.focus(); return; }
  }
  document.querySelector("[data-pos-search]")?.focus();
}

function makePosTabHandler(current) {
  return (e) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    focusPosAction(current);
  };
}

function ActionBtn({ icon, label, shortcut, onClick, disabled, className = "", variant = "outline", ...rest }) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 py-1 px-1.5 flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 ${className}`}
      {...rest}
    >
      <HugeiconsIcon icon={icon} size={14} strokeWidth={2} />
      <span className="text-[10px] leading-none font-medium whitespace-nowrap">{label}</span>
      <KbdBadge>{shortcut}</KbdBadge>
    </Button>
  );
}

// ─── Billing mode panel (single-row action bar) ───────────────

function BillingModePanel({
  canKot, kotPending,
  canBill, billPending,
  canSettle,
  netAmount,
  onKot, onBill, onSettle, onSwitchMode, onHold, canHold, isRestoredFromHold,
}) {
  return (
    <div className="flex items-stretch gap-1.5 px-2 py-1.5">
      <ActionBtn
        icon={PrinterIcon}
        label="KOT+Print"
        shortcut="Home"
        onClick={onKot}
        disabled={!canKot || kotPending}
        variant="default"
        className="bg-amber-500 hover:bg-amber-600 text-white border-0 disabled:opacity-50"
        data-pos-action="kotprint"
        onKeyDown={makePosTabHandler("kotprint")}
      />
      <ActionBtn
        icon={PrinterIcon}
        label="Bill+Print"
        shortcut="*"
        onClick={onBill}
        disabled={!canBill || billPending}
        data-pos-action="billprint"
        onKeyDown={makePosTabHandler("billprint")}
      />
      <ActionBtn
        icon={CouponPercentIcon}
        label="Pre-Disc"
        shortcut="F8"
        disabled
      />
      <ActionBtn
        icon={Discount01Icon}
        label="Discount"
        shortcut="/"
        onClick={() => onSwitchMode(BOTTOM_PANEL_MODE.DISCOUNT)}
      />
      <ActionBtn
        icon={Hold01Icon}
        label={isRestoredFromHold ? "Release" : "Hold"}
        shortcut="F6"
        onClick={onHold}
        disabled={!canHold}
        className={isRestoredFromHold ? "text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700" : ""}
      />

      {/* Settle — prominent, carries the running total */}
      <Button
        type="button"
        size="sm"
        onClick={onSettle}
        disabled={!canSettle}
        data-pos-action="settle"
        onKeyDown={makePosTabHandler("settle")}
        className="h-12 py-1 px-3 flex-[1.9] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 disabled:opacity-50"
      >
        <HugeiconsIcon icon={CashIcon} size={17} strokeWidth={2} />
        <span className="text-xs font-semibold">Settle</span>
        <span className="text-base font-bold tabular-nums tracking-tight">₹{fmtAmount(netAmount ?? 0)}</span>
        <span className="text-[8px] font-mono px-1 py-0.5 rounded leading-none bg-white/20">F11</span>
      </Button>
    </div>
  );
}

// ─── Discount mode panel ──────────────────────────────────────

const r2 = (n) => Math.round(n * 100) / 100;
const sanitizeNum = (v) => v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

function DiscField({ label, value, onChange, readOnly, autoFocus, onKeyDown, inputRef }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[10px] font-bold text-foreground whitespace-nowrap">{label}</span>
      <input
        ref={inputRef}
        inputMode="decimal"
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(sanitizeNum(e.target.value)) : undefined}
        onFocus={(e) => !readOnly && e.target.select()}
        onKeyDown={onKeyDown}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        className={[
          "w-20 h-7 rounded border text-xs text-right tabular-nums px-2",
          "bg-muted/30 border-border/60",
          "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
          readOnly
            ? "text-foreground font-semibold bg-muted/10 border-border/30 cursor-default select-none"
            : "text-foreground",
        ].join(" ")}
      />
    </div>
  );
}


function DiscountModePanel({ totals, items, menu: menuProp, sessionDisc, onApply, onBack }) {
  const billAmt = totals.finalAmount || 0;
  const taxAmt  = totals.taxAmount   || 0;

  const { auth } = useAuth();
  const capsQuery = useQuery({
    queryKey: ["discount-cap", auth?.user?.id],
    queryFn:  () => invoke("get_user_discount_cap", { userId: auth.user.id }),
    enabled:  !!auth?.user?.id,
    staleTime: 60_000,
  });
  const userTotalCap = capsQuery.data?.total_discount ?? 100;

  // Always fetch fresh menu data when the discount panel opens so caps are never stale
  const freshMenuQuery = useQuery({
    queryKey: [...BQK.MENU, "discount-fresh"],
    queryFn:  () => invoke("get_menu_for_billing"),
    staleTime: 0,
  });
  // Use fresh data if available, fall back to prop
  const menu = freshMenuQuery.data ?? menuProp;

  // Menu master lookups (authoritative source for category caps)
  const { menuIdToCatId, catIdToInfo } = useMemo(() => buildMenuLookups(menu), [menu]);

  // Derive categories from current bill items, enriched via menu master
  const categories = useMemo(
    () => buildCategories(items ?? [], menuIdToCatId, catIdToInfo),
    [items, menuIdToCatId, catIdToInfo],
  );

  // ── Per-category discount state ─────────────────────────
  // discMode: "pct" | "flat"  — one mode for the whole form (mutually exclusive)
  const [discMode, setDiscMode] = useState(
    () => sessionDisc?.discMode ?? "pct"
  );

  // catRows: { [catId]: { value: string } }
  // Pre-fill with auto_discount if no saved value — auto_discount > 0 means apply immediately
  const [catRows, setCatRows] = useState(() => {
    const saved = sessionDisc?.catRows ?? {};
    const { menuIdToCatId: mid2cat, catIdToInfo: cat2info } = buildMenuLookups(menuProp);
    const rows  = {};
    for (const cat of buildCategories(items ?? [], mid2cat, cat2info)) {
      const savedVal = saved[cat.id]?.value;
      rows[cat.id] = { value: savedVal !== undefined ? savedVal : String(cat.auto_discount ?? 0) };
    }
    return rows;
  });

  // When fresh menu data arrives, update catRows with correct auto_discount values.
  // Only overwrite rows that are still at "0" (untouched by user) and have no saved value.
  const freshMenuApplied = useRef(false);
  useEffect(() => {
    if (!freshMenuQuery.data || freshMenuApplied.current) return;
    freshMenuApplied.current = true;
    const saved = sessionDisc?.catRows ?? {};
    const { menuIdToCatId: mid2cat, catIdToInfo: cat2info } = buildMenuLookups(freshMenuQuery.data);
    const freshCats = buildCategories(items ?? [], mid2cat, cat2info);
    setCatRows(prev => {
      const next = { ...prev };
      for (const cat of freshCats) {
        const savedVal = saved[cat.id]?.value;
        // Add rows for newly discovered categories
        if (!(cat.id in next)) {
          next[cat.id] = { value: savedVal !== undefined ? savedVal : String(cat.auto_discount ?? 0) };
        } else if (savedVal === undefined && next[cat.id]?.value === "0" && cat.auto_discount > 0) {
          // Row exists but was initialised with 0 from stale menu — now we have real auto_discount
          next[cat.id] = { value: String(cat.auto_discount) };
        }
      }
      return next;
    });
  }, [freshMenuQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Misc fields
  const [misc,      setMisc]      = useState(() => String(sessionDisc?.misc      ?? 0));
  const [miscMinus, setMiscMinus] = useState(() => String(sessionDisc?.miscMinus ?? 0));
  const [sCharge,   setSCharge]   = useState(() => String(sessionDisc?.sCharge   ?? 0));

  // Overall bill discount % applied directly on net (after category discounts)
  const [billDiscPct, setBillDiscPct] = useState(() => String(sessionDisc?.billDiscPct ?? 0));

  // Effective cap = min(category max, user's total_discount cap).
  // cat.max_discount is null when not configured in DB → no category-level restriction.
  function effectiveCap(cat) {
    if (!cat.allow_discount) return 0;
    const catMax = cat.max_discount != null ? cat.max_discount : 100;
    return Math.min(catMax, userTotalCap);
  }

  // ── Validation: error message per category ──────────────
  const catErrors = useMemo(() => {
    const errs = {};
    for (const cat of categories) {
      const val = parseFloat(catRows[cat.id]?.value) || 0;
      if (!cat.allow_discount && val > 0) {
        errs[cat.id] = "Discount not allowed";
        continue;
      }
      const cap = effectiveCap(cat);
      if (discMode === "pct" && val > cap) {
        errs[cat.id] = `Max ${cap}%`;
      } else if (discMode === "flat") {
        const maxFlat = r2((cat.total * cap) / 100);
        if (val > maxFlat) errs[cat.id] = `Max ₹${fmtAmount(maxFlat)}`;
      }
    }
    return errs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catRows, discMode, categories, userTotalCap]);

  const hasErrors = Object.keys(catErrors).length > 0;

  // ── Per-category discount amounts ───────────────────────
  const catDiscAmts = useMemo(() => {
    const amts = {};
    for (const cat of categories) {
      const val = parseFloat(catRows[cat.id]?.value) || 0;
      if (discMode === "pct") {
        amts[cat.id] = r2((cat.total * Math.min(val, effectiveCap(cat))) / 100);
      } else {
        const maxFlat = r2((cat.total * effectiveCap(cat)) / 100);
        amts[cat.id] = r2(Math.min(val, maxFlat));
      }
    }
    return amts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catRows, discMode, categories, userTotalCap]);

  const totalCatDisc  = r2(Object.values(catDiscAmts).reduce((s, v) => s + v, 0));
  const afterCatDisc  = r2(billAmt - totalCatDisc);
  const billDiscAmt   = r2(afterCatDisc * (Math.min(parseFloat(billDiscPct) || 0, 100)) / 100);

  const net = r2(
    afterCatDisc
    - billDiscAmt
    + (Number(misc)      || 0)
    - (Number(miscMinus) || 0)
    + (Number(sCharge)   || 0)
  );

  // ── Mode switch — reset values (% keeps auto_discount, flat resets to 0) ──
  function switchMode(mode) {
    setDiscMode(mode);
    const reset = {};
    for (const cat of categories) {
      reset[cat.id] = { value: mode === "pct" ? String(cat.auto_discount ?? 0) : "0" };
    }
    setCatRows(reset);
    setApplyAllVal("");
  }

  // ── Save ─────────────────────────────────────────────────
  function handleSave() {
    if (hasErrors) return;
    const totalDisc = r2(totalCatDisc + billDiscAmt);
    const discPct   = billAmt > 0 ? r2((totalDisc / billAmt) * 100) : 0;
    onApply({
      discMode,
      catRows,
      catDiscAmts,
      totalCatDisc,
      billDiscPct:  Number(billDiscPct) || 0,
      billDiscAmt,
      misc:         Number(misc)      || 0,
      miscMinus:    Number(miscMinus) || 0,
      sCharge:      Number(sCharge)   || 0,
      netAmt:       net,
      discPct,
    });
    onBack();
  }

  const miscRef    = useRef(null);
  const minusRef   = useRef(null);
  const sChargeRef = useRef(null);

  return (
    <div className="px-3 py-2 bg-card border-t space-y-2">
      {/* ── Header row: totals + mode toggle + apply-all ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <DiscField label="Tax Amt. :"  value={fmtAmount(taxAmt)}  readOnly />
        <DiscField label="Bill Amt. :" value={fmtAmount(billAmt)} readOnly />

        {/* % / Flat toggle */}
        <div className="flex items-center gap-0.5 rounded-md border border-border/60 overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => switchMode("pct")}
            className={[
              "h-7 px-2.5 text-[10px] font-semibold transition-colors",
              discMode === "pct"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => switchMode("flat")}
            className={[
              "h-7 px-2.5 text-[10px] font-semibold transition-colors",
              discMode === "flat"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            ₹
          </button>
        </div>

        {/* Bill-level discount % on net (extra on top of category discounts) */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-bold text-foreground whitespace-nowrap">
            Bill Disc % :
          </span>
          <input
            inputMode="decimal"
            value={billDiscPct}
            onChange={(e) => setBillDiscPct(sanitizeNum(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
            className="w-16 h-7 rounded border text-xs text-right tabular-nums px-2 bg-muted/30 border-border/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
          />
        </div>
      </div>

      {/* ── Per-category rows ── */}
      <div className="space-y-1">
        {categories.map((cat, idx) => {
          const val  = catRows[cat.id]?.value ?? "0";
          const err  = catErrors[cat.id];
          const disc = catDiscAmts[cat.id] ?? 0;
          const cap  = effectiveCap(cat);
          // Show cap label: if category has no configured max, show user cap as the limit
          const capLabel = !cat.allow_discount
            ? "No discount"
            : discMode === "pct"
              ? `Max ${cap}%`
              : `Max ₹${fmtAmount(r2((cat.total * cap) / 100))}`;

          return (
            <div key={cat.id} className="flex items-center gap-2 flex-wrap">
              {/* Category name */}
              <span className="text-[10px] font-bold text-foreground w-28 truncate shrink-0" title={cat.name}>
                {cat.name}
              </span>
              {/* Category total */}
              <span className="text-[10px] tabular-nums text-muted-foreground w-16 text-right shrink-0">
                ₹{fmtAmount(cat.total)}
              </span>
              {/* Cap badge */}
              <span className="text-[9px] text-muted-foreground/70 shrink-0 w-20">{capLabel}</span>
              {/* Auto badge — shown when auto_discount > 0 */}
              {cat.auto_discount > 0 && (
                <span className="text-[9px] text-blue-500 shrink-0">Auto:{cat.auto_discount}%</span>
              )}
              {/* Discount input */}
              <input
                inputMode="decimal"
                value={val}
                disabled={!cat.allow_discount}
                onChange={(e) => {
                  const v = sanitizeNum(e.target.value);
                  setCatRows((prev) => ({ ...prev, [cat.id]: { value: v } }));
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  // Focus next category input or misc field
                  const next = categories[idx + 1];
                  if (next) {
                    document.querySelector(`[data-cat-input="${next.id}"]`)?.focus();
                  } else {
                    miscRef.current?.focus();
                  }
                }}
                data-cat-input={cat.id}
                className={[
                  "w-20 h-7 rounded border text-xs text-right tabular-nums px-2",
                  "focus:outline-none focus:ring-1 focus:border-primary",
                  !cat.allow_discount
                    ? "bg-muted/10 border-border/20 text-muted-foreground cursor-not-allowed"
                    : err
                      ? "border-destructive bg-destructive/5 focus:ring-destructive text-foreground"
                      : "bg-muted/30 border-border/60 focus:ring-primary text-foreground",
                ].join(" ")}
              />
              <span className="text-[10px] text-muted-foreground shrink-0">
                {discMode === "pct" ? "%" : "₹"}
              </span>
              {/* Derived discount amount */}
              {disc > 0 && !err && (
                <span className="text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
                  −₹{fmtAmount(disc)}
                </span>
              )}
              {/* Inline error */}
              {err && (
                <span className="text-[10px] text-destructive font-medium shrink-0">{err}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Misc / service charge row ── */}
      <div className="flex items-center gap-2.5 flex-wrap border-t border-border/30 pt-1.5">
        <DiscField label="+ Misc :"    value={misc}      inputRef={miscRef}    onChange={setMisc}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); minusRef.current?.focus(); } }} />
        <DiscField label="- Misc :"    value={miscMinus} inputRef={minusRef}   onChange={setMiscMinus}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sChargeRef.current?.focus(); } }} />
        <DiscField label="+ Svc Chg :" value={sCharge}   inputRef={sChargeRef} onChange={setSCharge}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }} />
        <DiscField label="Net Amt :" value={fmtAmount(net)} readOnly />
        {totalCatDisc > 0 && (
          <span className="text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
            Total Disc: −₹{fmtAmount(totalCatDisc)}
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={hasErrors}
            className="h-8 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-0 disabled:opacity-50"
          >
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const reset = {};
              for (const cat of categories) {
                reset[cat.id] = { value: discMode === "pct" ? String(cat.auto_discount ?? 0) : "0" };
              }
              setCatRows(reset);
              setBillDiscPct("0");
              setMisc("0"); setMiscMinus("0"); setSCharge("0");
            }}
            className="h-8 px-4 text-xs"
          >
            Reset
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onBack} className="h-8 px-4 text-xs">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main bottom action bar ───────────────────────────────────

export default function BottomActionBar({
  sessionId, session, items, menu, isDraft,
  isKotting, isNearReservation,
  netAmount, billId, isSettling,
  onRequestSettle, settleDialogOpen,
  onKotDraft, onCancel, onHold,
  isRestoredFromHold,
  sessionDisc, onDiscountChange,
}) {
  const { clearSession, pendingItemKotMsgs, clearPendingItemKotMsgs } = useBillingContext();
  const generateKot  = useGenerateKot(sessionId);
  const generateBill = useGenerateBill(sessionId);
  const [panelMode, setPanelMode] = useState(BOTTOM_PANEL_MODE.BILLING);

  // ── Derived state ─────────────────────────────────────────
  const activeItems  = (items ?? []).filter((i) => i.item_status === "ACTIVE");
  const billTotals   = calcBillTotals(items ?? []);
  const pendingKot  = activeItems.filter((i) => i.kot_status === "PENDING").length;
  const hasItems    = activeItems.length > 0;
  const isClosed    = !isDraft && session?.session_status === "BILL_PRINTED";
  const isKotSent   = !isDraft && session?.session_status === "KOT_SENT";

  const canKot    = isDraft ? activeItems.length > 0 : (pendingKot > 0 && !isClosed);
  const canBill   = !isDraft && hasItems && (isKotSent || session?.session_status === "OPEN") && !isClosed;
  const canSettle = !isDraft && isClosed && !!billId && (netAmount ?? 0) > 0 && !isSettling;
  const kotPending = isDraft ? isKotting : generateKot.isPending;
  // Hold is only meaningful in draft mode. When restored from hold, always enable (to release).
  const canHold   = isDraft && (activeItems.length > 0 || isRestoredFromHold);

  // Persist UI-held KOT messages for existing pending items into the DB
  async function flushPendingKotMsgs() {
    const entries = Object.entries(pendingItemKotMsgs ?? {});
    if (entries.length === 0) return;
    await Promise.all(entries.map(async ([id, msg]) => {
      const orderItemId = Number(id);
      await billingService.clearOrderItemModifiers(orderItemId);
      if (msg && msg.trim()) await billingService.addOrderItemModifier(orderItemId, msg.trim());
    }));
    clearPendingItemKotMsgs();
  }

  // ── Action handlers ───────────────────────────────────────
  const handleKot = useCallback(async () => {
    if (isNearReservation) {
      toast.error("This table has an upcoming reservation. KOT cannot be created before reservation time.");
      return;
    }
    if (isDraft) { onKotDraft(); return; }
    try {
      await flushPendingKotMsgs();   // save KOT messages before sending to kitchen
    } catch (e) {
      toast.error(String(e));
      return;
    }
    generateKot.mutate({}, { onSuccess: clearSession });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNearReservation, isDraft, onKotDraft, generateKot, clearSession, pendingItemKotMsgs]);

  const handleBill = useCallback(() => {
    const payload = sessionDisc ? {
      billDiscountAmount: Math.round((sessionDisc.totalCatDisc || 0) * 100) / 100,
      billNetAmount: sessionDisc.netAmt ?? undefined,
    } : {};
    generateBill.mutate(payload, { onSuccess: clearSession });
  }, [generateBill, clearSession, sessionDisc]);

  // Settle now opens the SettleDialog (customer + payment method + split)
  const handleSettle = useCallback(() => {
    onRequestSettle();
  }, [onRequestSettle]);

  const switchMode = useCallback((mode) => setPanelMode(mode), []);

  // ── Ref: always holds the LATEST values without stale closure ─
  const live = useRef({});
  live.current = { canKot, kotPending, canBill, billPending: generateBill.isPending, canSettle, canHold, onHold, panelMode, settleDialogOpen, handleKot, handleBill, handleSettle, switchMode };

  // ── Keyboard shortcuts (registered once, reads from ref) ──
  useEffect(() => {
    const POS_KEYS = new Set(["Home", "F11", "F6", "/"]);

    function onKey(e) {
      const tag = e.target.tagName;
      const isInput    = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const isSearchBar = isInput && e.target.hasAttribute("data-pos-search");
      const isCharKey  = e.key === "/";
      if (isInput && !isSearchBar && isCharKey) return;

      const cur = live.current;

      // Escape: return to billing mode from any sub-panel (stop propagation so order-entry Esc doesn't also fire)
      if (e.key === "Escape" && cur.panelMode !== BOTTOM_PANEL_MODE.BILLING) {
        e.preventDefault();
        e.stopPropagation();
        setPanelMode(BOTTOM_PANEL_MODE.BILLING);
        return;
      }

      if (cur.panelMode !== BOTTOM_PANEL_MODE.BILLING) return;

      if (POS_KEYS.has(e.key)) e.preventDefault();

      switch (e.key) {
        case "Home":
          if (cur.canKot && !cur.kotPending) cur.handleKot();
          break;
        case "/":
          setPanelMode(BOTTOM_PANEL_MODE.DISCOUNT);
          break;
        case "F6":
          if (cur.canHold && cur.onHold) cur.onHold();
          break;
        case "F11":
          if (!cur.settleDialogOpen && cur.canSettle) cur.handleSettle();
          break;
        case "*":
          if (cur.canBill && !cur.billPending) cur.handleBill();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // ← empty deps: register once, always reads live ref

  return (
    <div className="shrink-0 border-t bg-card">
      {isNearReservation && (
        <div className="mx-3 mt-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 flex items-center gap-1.5">
          <HugeiconsIcon icon={AlertCircleIcon} size={11} strokeWidth={2} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-snug">
            Table reserved soon — KOT &amp; session creation are blocked until reservation time.
          </p>
        </div>
      )}

      <div key={panelMode} className="animate-in fade-in duration-150">
        {panelMode === BOTTOM_PANEL_MODE.BILLING && (
          <BillingModePanel
            canKot={canKot}
            kotPending={kotPending}
            canBill={canBill}
            billPending={generateBill.isPending}
            canSettle={canSettle}
            netAmount={netAmount}
            onKot={handleKot}
            onBill={handleBill}
            onSettle={handleSettle}
            onSwitchMode={switchMode}
            onHold={onHold}
            canHold={canHold}
            isRestoredFromHold={isRestoredFromHold}
          />
        )}

        {panelMode === BOTTOM_PANEL_MODE.DISCOUNT && (
          <DiscountModePanel
            totals={billTotals}
            items={items}
            menu={menu}
            sessionDisc={sessionDisc}
            onApply={onDiscountChange}
            onBack={() => setPanelMode(BOTTOM_PANEL_MODE.BILLING)}
          />
        )}
      </div>

      {/* Discard Draft / Cancel Order — prominently visible */}
      <div className="px-3 pb-2 flex justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-muted-foreground hover:text-destructive border border-dashed border-muted-foreground/30 hover:border-destructive/50 rounded px-3 py-1 transition-colors"
        >
          {isDraft ? "Discard Draft" : "Cancel Order"}
        </button>
      </div>
    </div>
  );
}
