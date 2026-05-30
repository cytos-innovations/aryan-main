import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import {
  SendingOrderIcon,
  PrinterIcon,
  ReceiptIndianRupeeIcon,
  CashIcon,
  Hold01Icon,
  Discount01Icon,
  PercentIcon,
  ArrowLeft01Icon,
  AlertCircleIcon,
  MoreHorizontalCircle01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillingContext } from "../state/billing-context";
import { useGenerateKot, useGenerateBill } from "../hooks/use-billing-queries";
import { PAYMENT_TYPE } from "../constants/billing";
import { fmtAmount } from "../utils/billing-calc";

// ─── Panel mode enum ──────────────────────────────────────────

export const BOTTOM_PANEL_MODE = {
  BILLING:     "billing",
  DISCOUNT:    "discount",
  TABLE_SHIFT: "tableShift",
  REPRINT:     "reprint",
};

// ─── Keyboard shortcut badge ──────────────────────────────────

function KbdBadge({ children }) {
  if (!children) return <span className="h-3.5 block" />;
  return (
    <span className="text-[8px] font-mono px-1 py-0.5 rounded leading-none bg-black/10 dark:bg-white/10 opacity-80">
      {children}
    </span>
  );
}

// ─── Generic action button: icon + label + shortcut ───────────

// Tab-chain order for POS keyboard navigation
const POS_ACTIONS = ["kotprint", "billprint", "settle"];

function focusPosAction(after) {
  const start = after ? POS_ACTIONS.indexOf(after) + 1 : 0;
  for (let i = start; i < POS_ACTIONS.length; i++) {
    const el = document.querySelector(`[data-pos-action="${POS_ACTIONS[i]}"]`);
    if (el && !el.disabled) { el.focus(); return; }
  }
  // Wrap back to search
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
      className={`h-auto py-1.5 px-2 flex-1 flex flex-col items-center gap-0.5 min-w-0 text-xs ${className}`}
      {...rest}
    >
      <HugeiconsIcon icon={icon} size={14} strokeWidth={2} />
      <span className="text-[10px] leading-none font-medium whitespace-nowrap">{label}</span>
      <KbdBadge>{shortcut}</KbdBadge>
    </Button>
  );
}

// ─── Billing mode: 2-row action grid + total ─────────────────

function BillingModePanel({
  sessionId, session, items, isDraft, isKotting, isNearReservation,
  netAmount, billId, isSettling,
  onKotDraft, onSettle, onSwitchMode,
  // exposed action handlers for keyboard shortcuts
  onRegisterHandlers,
}) {
  const { clearSession, paymentEntries } = useBillingContext();
  const generateKot  = useGenerateKot(sessionId);
  const generateBill = useGenerateBill(sessionId);

  const activeItems = (items ?? []).filter((i) => i.item_status === "ACTIVE");
  const pendingKot  = activeItems.filter((i) => i.kot_status === "PENDING").length;
  const hasItems    = activeItems.length > 0;
  const isClosed    = !isDraft && session?.session_status === "BILL_PRINTED";
  const isKotSent   = !isDraft && session?.session_status === "KOT_SENT";

  const canKot     = isDraft ? activeItems.length > 0 : (pendingKot > 0 && !isClosed);
  const canBill    = !isDraft && hasItems && (isKotSent || session?.session_status === "OPEN") && !isClosed;
  const canSettle  = !isDraft && isClosed && !!billId && (netAmount ?? 0) > 0 && !isSettling;
  const kotPending = isDraft ? isKotting : generateKot.isPending;
  const kotLabel   = kotPending ? "Sending…" : (isDraft ? "KOT" : (pendingKot > 0 ? `KOT (${pendingKot})` : "KOT"));

  const handleKot = useCallback(() => {
    if (isNearReservation) {
      toast.error("This table has an upcoming reservation. KOT cannot be created before reservation time.");
      return;
    }
    if (isDraft) { onKotDraft(); return; }
    generateKot.mutate({}, { onSuccess: clearSession });
  }, [isNearReservation, isDraft, onKotDraft, generateKot, clearSession]);

  const handleBill = useCallback(() => {
    generateBill.mutate(undefined, { onSuccess: clearSession });
  }, [generateBill, clearSession]);

  const handleSettle = useCallback(() => {
    const enteredTotal = paymentEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const useEntries = paymentEntries.length > 0
      ? paymentEntries
      : [{ payment_mode: PAYMENT_TYPE.CASH, amount: enteredTotal > 0 ? enteredTotal : (netAmount ?? 0), reference_no: null }];
    onSettle(useEntries);
  }, [paymentEntries, netAmount, onSettle]);

  // Expose handlers to parent for keyboard shortcuts
  useEffect(() => {
    onRegisterHandlers({
      handleKot:     canKot && !kotPending    ? handleKot  : null,
      handleBill:    canBill && !generateBill.isPending ? handleBill : null,
      handleSettle:  canSettle                ? handleSettle : null,
    });
  }, [canKot, kotPending, canBill, canSettle, handleKot, handleBill, handleSettle, onRegisterHandlers, generateBill.isPending]);

  return (
    <div className="flex items-stretch gap-2 px-3 py-2">
      {/* Total — left side */}
      <div className="flex flex-col justify-center items-start shrink-0 rounded-lg bg-muted/40 px-3 py-1 min-w-22">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-1">
          Total
        </span>
        <span className="text-lg font-bold tabular-nums tracking-tight leading-tight whitespace-nowrap">
          ₹{fmtAmount(netAmount ?? 0)}
        </span>
      </div>

      {/* Vertical divider */}
      <div className="w-px bg-border mx-0.5 self-stretch" />

      {/* Action columns */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Row 1: Primary */}
        <div className="flex gap-1">
          <ActionBtn
            icon={SendingOrderIcon}
            label={kotLabel}
            shortcut="F8"
            onClick={handleKot}
            disabled={!canKot || kotPending}
            variant="default"
            className="bg-amber-500 hover:bg-amber-600 text-white border-0 disabled:opacity-50"
          />
          <ActionBtn
            icon={PrinterIcon}
            label="KOT+Print"
            shortcut="F1"
            onClick={handleKot}
            disabled={!canKot || kotPending}
            data-pos-action="kotprint"
            onKeyDown={makePosTabHandler("kotprint")}
          />
          <ActionBtn
            icon={ReceiptIndianRupeeIcon}
            label="Bill"
            shortcut="F9"
            onClick={handleBill}
            disabled={!canBill || generateBill.isPending}
          />
          <ActionBtn
            icon={PrinterIcon}
            label="Bill+Print"
            shortcut="*"
            onClick={handleBill}
            disabled={!canBill || generateBill.isPending}
            data-pos-action="billprint"
            onKeyDown={makePosTabHandler("billprint")}
          />
          <ActionBtn
            icon={CashIcon}
            label="Settle"
            shortcut="F11"
            onClick={handleSettle}
            disabled={!canSettle}
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 disabled:opacity-50"
            data-pos-action="settle"
            onKeyDown={makePosTabHandler("settle")}
          />
        </div>

        {/* Row 2: Secondary */}
        <div className="flex gap-1">
          <ActionBtn
            icon={Discount01Icon}
            label="Discount"
            shortcut="/"
            onClick={() => onSwitchMode(BOTTOM_PANEL_MODE.DISCOUNT)}
          />
          <ActionBtn
            icon={PrinterIcon}
            label="Reprint"
            shortcut="F2"
            onClick={() => onSwitchMode(BOTTOM_PANEL_MODE.REPRINT)}
            disabled={isDraft}
          />
          <ActionBtn
            icon={Refresh01Icon}
            label="Table Shift"
            shortcut="F7"
            onClick={() => onSwitchMode(BOTTOM_PANEL_MODE.TABLE_SHIFT)}
            disabled={isDraft}
          />
          <ActionBtn
            icon={Hold01Icon}
            label="Hold"
            shortcut="F6"
            disabled
          />
          <ActionBtn
            icon={MoreHorizontalCircle01Icon}
            label="More"
            shortcut=""
            disabled
          />
        </div>
      </div>
    </div>
  );
}

// ─── Discount mode panel ──────────────────────────────────────

function DiscountModePanel({ discountPercent, onDiscountChange, onBack }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 min-h-20.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 text-xs shrink-0"
        onClick={onBack}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} />
        Back
      </Button>

      <HugeiconsIcon icon={Discount01Icon} size={18} strokeWidth={2} className="text-primary shrink-0" />

      <div>
        <p className="text-sm font-semibold">Bill Discount</p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Enter % discount for the entire bill
        </p>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={discountPercent}
          onChange={(e) => onDiscountChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              onBack();
            }
          }}
          className="h-9 w-24 text-sm text-right tabular-nums"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <HugeiconsIcon icon={PercentIcon} size={14} strokeWidth={2} className="text-muted-foreground mr-2" />
      </div>
    </div>
  );
}

// ─── Main bottom action bar ───────────────────────────────────

export default function BottomActionBar({
  sessionId, session, items, isDraft,
  isKotting, isNearReservation,
  netAmount, billId, isSettling, onSettle,
  onKotDraft, onCancel,
  discountPercent, onDiscountChange,
}) {
  const [panelMode, setPanelMode] = useState(BOTTOM_PANEL_MODE.BILLING);
  // Handlers registered by BillingModePanel for keyboard access
  const [actionHandlers, setActionHandlers] = useState({
    handleKot: null, handleBill: null, handleSettle: null,
  });

  const handleRegisterHandlers = useCallback((handlers) => {
    setActionHandlers(handlers);
  }, []);

  const switchMode = useCallback((mode) => {
    if (mode === BOTTOM_PANEL_MODE.TABLE_SHIFT) {
      toast.info("Table Shift Feature Coming Soon");
      return;
    }
    if (mode === BOTTOM_PANEL_MODE.REPRINT) {
      toast.info("Bill Reprint Coming Soon");
      return;
    }
    setPanelMode(mode);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Escape always returns to billing mode
      if (e.key === "Escape" && panelMode !== BOTTOM_PANEL_MODE.BILLING) {
        e.preventDefault();
        setPanelMode(BOTTOM_PANEL_MODE.BILLING);
        return;
      }

      if (panelMode !== BOTTOM_PANEL_MODE.BILLING) return;

      switch (e.key) {
        case "F1":
          if (actionHandlers.handleKot) { e.preventDefault(); actionHandlers.handleKot(); }
          break;
        case "F2":
          e.preventDefault();
          switchMode(BOTTOM_PANEL_MODE.REPRINT);
          break;
        case "F7":
          e.preventDefault();
          switchMode(BOTTOM_PANEL_MODE.TABLE_SHIFT);
          break;
        case "/":
          e.preventDefault();
          setPanelMode(BOTTOM_PANEL_MODE.DISCOUNT);
          break;
        case "F11":
          if (actionHandlers.handleSettle) { e.preventDefault(); actionHandlers.handleSettle(); }
          break;
        case "*":
          if (actionHandlers.handleBill) { e.preventDefault(); actionHandlers.handleBill(); }
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelMode, actionHandlers, switchMode]);

  return (
    <div className="shrink-0 border-t bg-card">
      {/* Reservation warning */}
      {isNearReservation && (
        <div className="mx-3 mt-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 flex items-center gap-1.5">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={11}
            strokeWidth={2}
            className="text-blue-600 dark:text-blue-400 shrink-0"
          />
          <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-snug">
            Table reserved soon — KOT &amp; session creation are blocked until reservation time.
          </p>
        </div>
      )}

      {/* Panel content — animated on mode switch */}
      <div key={panelMode} className="animate-in fade-in duration-150">
        {panelMode === BOTTOM_PANEL_MODE.BILLING && (
          <BillingModePanel
            sessionId={sessionId}
            session={session}
            items={items}
            isDraft={isDraft}
            isKotting={isKotting}
            isNearReservation={isNearReservation}
            netAmount={netAmount}
            billId={billId}
            isSettling={isSettling}
            onKotDraft={onKotDraft}
            onSettle={onSettle}
            onSwitchMode={switchMode}
            onRegisterHandlers={handleRegisterHandlers}
          />
        )}

        {panelMode === BOTTOM_PANEL_MODE.DISCOUNT && (
          <DiscountModePanel
            discountPercent={discountPercent}
            onDiscountChange={onDiscountChange}
            onBack={() => setPanelMode(BOTTOM_PANEL_MODE.BILLING)}
          />
        )}
      </div>

      {/* Cancel / discard link */}
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
