import { useState, useEffect, useCallback, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import {
  SendingOrderIcon,
  PrinterIcon,
  ReceiptIndianRupeeIcon,
  CashIcon,
  Hold01Icon,
  Discount01Icon,
  ArrowLeft01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { useBillingContext } from "../state/billing-context";
import { useGenerateKot, useGenerateBill } from "../hooks/use-billing-queries";
import { billingService } from "../services/billing-service";
import { fmtAmount, calcBillTotals } from "../utils/billing-calc";

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
  kotLabel, canKot, kotPending,
  canBill, billPending,
  canSettle,
  netAmount,
  onKot, onBill, onSettle, onSwitchMode,
}) {
  return (
    <div className="flex items-stretch gap-1.5 px-2 py-1.5">
      <ActionBtn
        icon={SendingOrderIcon}
        label={kotLabel}
        shortcut="F8"
        onClick={onKot}
        disabled={!canKot || kotPending}
        variant="default"
        className="bg-amber-500 hover:bg-amber-600 text-white border-0 disabled:opacity-50"
      />
      <ActionBtn
        icon={PrinterIcon}
        label="KOT+Print"
        shortcut="Home"
        onClick={onKot}
        disabled={!canKot || kotPending}
        data-pos-action="kotprint"
        onKeyDown={makePosTabHandler("kotprint")}
      />
      <ActionBtn
        icon={ReceiptIndianRupeeIcon}
        label="Bill"
        shortcut="F9"
        onClick={onBill}
        disabled={!canBill || billPending}
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
        icon={Discount01Icon}
        label="Discount"
        shortcut="/"
        onClick={() => onSwitchMode(BOTTOM_PANEL_MODE.DISCOUNT)}
      />
      <ActionBtn icon={Hold01Icon} label="Hold" shortcut="F6" disabled />

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
const clampPct = (p) => Math.max(0, Math.min(100, p));
// Keep only digits and a single decimal point
const sanitizeNum = (v) => v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

/**
 * Bill-discount editor — compact single-row strip (matches the billing bar
 * height). Shows total + tax, two linked inputs (% ↔ ₹), and a live discount /
 * net readout. Save commits the percent (driving every dependent total and the
 * Settle amount); Cancel discards the edit.
 */
function DiscountModePanel({ totals, discountPercent, onApply, onBack }) {
  const base = totals.finalAmount || 0;

  const [pctStr, setPctStr] = useState(() => String(Number(discountPercent) || 0));
  const [amtStr, setAmtStr] = useState(() => String(r2((base * (Number(discountPercent) || 0)) / 100)));

  function changePct(raw) {
    const v = sanitizeNum(raw);
    setPctStr(v);
    const p = clampPct(Number(v) || 0);
    setAmtStr(String(r2((base * p) / 100)));
  }
  function changeAmt(raw) {
    const v = sanitizeNum(raw);
    setAmtStr(v);
    const a = Math.max(0, Math.min(base, Number(v) || 0));
    setPctStr(String(base > 0 ? r2((a / base) * 100) : 0));
  }

  const pctNum      = clampPct(Number(pctStr) || 0);
  const discountAmt = r2((base * pctNum) / 100);
  const afterDisc   = r2(base - discountAmt);
  const roundOff    = r2(Math.round(afterDisc) - afterDisc);
  const net         = r2(afterDisc + roundOff);

  function handleSave() { onApply(pctNum); onBack(); }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 min-h-20.5">
      {/* Back + title */}
      <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs px-2 -ml-1 shrink-0" onClick={onBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} />
        Back
      </Button>
      <div className="flex items-center gap-1.5 shrink-0">
        <HugeiconsIcon icon={Discount01Icon} size={16} strokeWidth={2} className="text-primary" />
        <span className="text-sm font-semibold">Discount</span>
      </div>

      {/* Inline summary */}
      <div className="flex items-center gap-3 text-[11px] shrink-0">
        <span className="text-muted-foreground">
          Total <span className="text-foreground font-medium tabular-nums">₹{fmtAmount(base)}</span>
        </span>
        {totals.taxAmount > 0 && (
          <span className="text-muted-foreground">
            Tax <span className="text-foreground font-medium tabular-nums">₹{fmtAmount(totals.taxAmount)}</span>
          </span>
        )}
      </div>

      {/* Linked inputs */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Percent */}
        <div className="flex items-center h-8 rounded-md border bg-background overflow-hidden transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
          <input
            inputMode="decimal"
            value={pctStr}
            onChange={(e) => changePct(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
            className="w-16 h-full bg-transparent px-2 text-sm text-right tabular-nums outline-none"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <span className="h-full px-2 flex items-center text-xs font-medium text-muted-foreground border-l bg-muted/50">%</span>
        </div>

        <span className="text-muted-foreground text-xs">=</span>

        {/* Amount */}
        <div className="flex items-center h-8 rounded-md border bg-background overflow-hidden transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
          <span className="h-full px-2 flex items-center text-xs font-medium text-muted-foreground border-r bg-muted/50">₹</span>
          <input
            inputMode="decimal"
            value={amtStr}
            onChange={(e) => changeAmt(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
            className="w-20 h-full bg-transparent px-2 text-sm text-right tabular-nums outline-none"
          />
        </div>
      </div>

      {/* Discount + Net readout */}
      <div className="flex items-center gap-3 shrink-0 border-l pl-3">
        <div className="text-right leading-tight">
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Discount</div>
          <div className="text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">−₹{fmtAmount(discountAmt)}</div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Net</div>
          <div className="text-sm font-bold tabular-nums">₹{fmtAmount(net)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={onBack}>Cancel</Button>
        <Button type="button" size="sm" className="h-8 px-4 text-xs" onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}

// ─── Main bottom action bar ───────────────────────────────────

export default function BottomActionBar({
  sessionId, session, items, isDraft,
  isKotting, isNearReservation,
  netAmount, billId, isSettling,
  onRequestSettle, settleDialogOpen,
  onKotDraft, onCancel,
  discountPercent, onDiscountChange,
}) {
  const { clearSession, pendingItemKotMsgs, clearPendingItemKotMsgs } = useBillingContext();
  const generateKot  = useGenerateKot(sessionId);
  const generateBill = useGenerateBill(sessionId);
  const [panelMode, setPanelMode] = useState(BOTTOM_PANEL_MODE.BILLING);

  // ── Derived state ─────────────────────────────────────────
  const activeItems = (items ?? []).filter((i) => i.item_status === "ACTIVE");
  const billTotals  = calcBillTotals(items ?? []);
  const pendingKot  = activeItems.filter((i) => i.kot_status === "PENDING").length;
  const hasItems    = activeItems.length > 0;
  const isClosed    = !isDraft && session?.session_status === "BILL_PRINTED";
  const isKotSent   = !isDraft && session?.session_status === "KOT_SENT";

  const canKot    = isDraft ? activeItems.length > 0 : (pendingKot > 0 && !isClosed);
  const canBill   = !isDraft && hasItems && (isKotSent || session?.session_status === "OPEN") && !isClosed;
  const canSettle = !isDraft && isClosed && !!billId && (netAmount ?? 0) > 0 && !isSettling;
  const kotPending = isDraft ? isKotting : generateKot.isPending;
  const kotLabel   = kotPending ? "Sending…" : (isDraft ? "KOT" : (pendingKot > 0 ? `KOT (${pendingKot})` : "KOT"));

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
    generateBill.mutate(undefined, { onSuccess: clearSession });
  }, [generateBill, clearSession]);

  // Settle now opens the SettleDialog (customer + payment method + split)
  const handleSettle = useCallback(() => {
    onRequestSettle();
  }, [onRequestSettle]);

  const switchMode = useCallback((mode) => setPanelMode(mode), []);

  // ── Ref: always holds the LATEST values without stale closure ─
  const live = useRef({});
  // Sync ref every render (no effect needed — runs synchronously before paint)
  live.current = { canKot, kotPending, canBill, billPending: generateBill.isPending, canSettle, panelMode, settleDialogOpen, handleKot, handleBill, handleSettle, switchMode };

  // ── Keyboard shortcuts (registered once, reads from ref) ──
  useEffect(() => {
    const POS_KEYS = new Set(["Home", "F11", "/", "*"]);

    function onKey(e) {
      const tag = e.target.tagName;
      const isInput    = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const isSearchBar = isInput && e.target.hasAttribute("data-pos-search");
      const isCharKey  = e.key === "/" || e.key === "*";
      // Block char-key shortcuts in non-search inputs (e.g. payment amount field)
      // but allow them through from the search bar (search bar prevents typing them already)
      if (isInput && !isSearchBar && isCharKey) return;

      const cur = live.current;

      // Escape: return to billing mode from any sub-panel
      if (e.key === "Escape" && cur.panelMode !== BOTTOM_PANEL_MODE.BILLING) {
        e.preventDefault();
        setPanelMode(BOTTOM_PANEL_MODE.BILLING);
        return;
      }

      if (cur.panelMode !== BOTTOM_PANEL_MODE.BILLING) return;

      // Prevent browser defaults for all POS keys (F11 fullscreen, F7 caret, etc.)
      if (POS_KEYS.has(e.key)) e.preventDefault();

      switch (e.key) {
        case "Home":
          if (cur.canKot && !cur.kotPending) cur.handleKot();
          break;
        case "/":
          setPanelMode(BOTTOM_PANEL_MODE.DISCOUNT);
          break;
        case "F11":
          // When the settle dialog is already open, it owns F11 (confirm)
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
            kotLabel={kotLabel}
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
          />
        )}

        {panelMode === BOTTOM_PANEL_MODE.DISCOUNT && (
          <DiscountModePanel
            totals={billTotals}
            discountPercent={discountPercent}
            onApply={onDiscountChange}
            onBack={() => setPanelMode(BOTTOM_PANEL_MODE.BILLING)}
          />
        )}
      </div>

      <div className="px-3 pb-1.5 flex justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors"
        >
          {isDraft ? "Discard Draft" : "Cancel Order"}
        </button>
      </div>
    </div>
  );
}
