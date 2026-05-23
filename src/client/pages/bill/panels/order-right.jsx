import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  MinusSignIcon,
  Delete01Icon,
  ChefHatIcon,
  ReceiptIndianRupeeIcon,
  UserAccountIcon,
  UserGroupIcon,
  PercentIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CashIcon,
  CreditCardIcon,
  QrCodeIcon,
  Wallet01Icon,
  MinusPlusIcon,
  PrinterIcon,
  Hold01Icon,
  StickyNote01Icon,
  Cancel01Icon,
  SendingOrderIcon,
  Discount01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingContext } from "../state/billing-context";
import {
  useOrderItems,
  useUpdateOrderItemQty,
  useCancelOrderItem,
  useGenerateKot,
  useGenerateBill,
  useSettleBill,
  useBillSummary,
  useUpdateSessionInfo,
} from "../hooks/use-billing-queries";
import {
  ORDER_TYPE,
  ORDER_TYPE_LABELS,
  PAYMENT_TYPE,
  PAYMENT_TYPE_LABELS,
} from "../constants/billing";
import { calcBillTotals, calcTaxBreakdown, fmtAmount } from "../utils/billing-calc";
import { FoodTypeDot } from "./menu-center";

// ─── KOT status config ────────────────────────────────────────────

const KOT_CFG = {
  PENDING:   { dot: "bg-amber-400",   label: "Pending"   },
  SENT:      { dot: "bg-blue-500",    label: "Sent"      },
  PREPARING: { dot: "bg-orange-500",  label: "Preparing" },
  READY:     { dot: "bg-emerald-500", label: "Ready"     },
  SERVED:    { dot: "bg-emerald-700", label: "Served"    },
};

function KotDot({ status }) {
  const cfg = KOT_CFG[status] ?? KOT_CFG.PENDING;
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`}
      title={cfg.label}
    />
  );
}

// ─── Order item row ───────────────────────────────────────────────

function OrderItemRow({ item, sessionId, isDraft }) {
  const updateQty  = useUpdateOrderItemQty(sessionId);
  const cancelItem = useCancelOrderItem(sessionId);
  const { updateDraftQty, removeDraftItem } = useBillingContext();

  if (item.item_status === "CANCELLED") return null;

  const canEdit = isDraft || (item.kot_status === "PENDING" && item.item_status === "ACTIVE");

  function handleDecrement() {
    if (isDraft) updateDraftQty(item.menu_id, item.quantity - 1);
    else updateQty.mutate({ id: item.id, qty: item.quantity - 1 });
  }

  function handleIncrement() {
    if (isDraft) updateDraftQty(item.menu_id, item.quantity + 1);
    else updateQty.mutate({ id: item.id, qty: item.quantity + 1 });
  }

  function handleRemove() {
    if (isDraft) removeDraftItem(item.menu_id);
    else cancelItem.mutate(item.id);
  }

  const decDisabled = isDraft ? item.quantity <= 1 : (!canEdit || item.quantity <= 1 || updateQty.isPending);
  const incDisabled = isDraft ? false : (!canEdit || updateQty.isPending);
  const delDisabled = isDraft ? false : (!canEdit || cancelItem.isPending);

  return (
    <div className="group flex flex-col border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Type dot + KOT status */}
        <div className="flex items-center gap-1 shrink-0">
          <FoodTypeDot type={item.food_type} size={9} />
          <KotDot status={item.kot_status} />
        </div>

        {/* Name */}
        <span className="flex-1 min-w-0 text-xs leading-snug truncate font-medium">
          {item.item_name}
        </span>

        {/* Qty controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={decDisabled}
            className="h-5 w-5 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-25 transition-colors"
          >
            <HugeiconsIcon icon={MinusSignIcon} size={8} strokeWidth={2.5} />
          </button>
          <span className="w-6 text-center text-xs font-mono font-semibold tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={handleIncrement}
            disabled={incDisabled}
            className="h-5 w-5 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-25 transition-colors"
          >
            <HugeiconsIcon icon={Add01Icon} size={8} strokeWidth={2.5} />
          </button>
        </div>

        {/* Amount */}
        <span className="text-xs font-semibold tabular-nums shrink-0 w-14 text-right">
          ₹{fmtAmount(item.final_amount)}
        </span>

        {/* Remove */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={delDisabled}
          className="h-5 w-5 shrink-0 rounded flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 disabled:!opacity-0! transition-all"
          title="Remove item"
        >
          <HugeiconsIcon icon={Delete01Icon} size={10} strokeWidth={2} />
        </button>
      </div>

      {/* Special instruction */}
      {item.special_instruction && (
        <div className="flex items-start gap-1 px-3 pb-2 -mt-0.5">
          <HugeiconsIcon icon={StickyNote01Icon} size={9} strokeWidth={2} className="text-muted-foreground/50 mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground italic leading-snug">
            {item.special_instruction}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Order items area ─────────────────────────────────────────────

function OrderItemsArea({ sessionId, items, isLoading, isDraft }) {
  if (isLoading) {
    return (
      <div className="p-2 space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-md" />
        ))}
      </div>
    );
  }

  const activeItems = (items ?? []).filter((i) => i.item_status !== "CANCELLED");

  if (activeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-8">
        <HugeiconsIcon icon={ChefHatIcon} size={36} strokeWidth={1.5} className="opacity-20" />
        <p className="text-xs">Select items from the menu</p>
      </div>
    );
  }

  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/40 sticky top-0">
        <span className="flex-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Item</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-20 text-center">Qty</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-14 text-right">Amt</span>
        <span className="w-5" />
      </div>
      {activeItems.map((item) => (
        <OrderItemRow key={item.id} item={item} sessionId={sessionId} isDraft={isDraft} />
      ))}
    </div>
  );
}

// ─── Bill totals section ──────────────────────────────────────────

function BillTotals({ items, discountPercent, onDiscountChange }) {
  const [taxExpanded, setTaxExpanded] = useState(false);

  const totals = useMemo(() => calcBillTotals(items ?? []), [items]);

  const foodTotal = useMemo(
    () => (items ?? [])
      .filter((i) => i.item_status === "ACTIVE" && !i.is_liquor)
      .reduce((s, i) => s + (Number(i.final_amount) || 0), 0),
    [items],
  );

  const liquorTotal = useMemo(
    () => (items ?? [])
      .filter((i) => i.item_status === "ACTIVE" && i.is_liquor)
      .reduce((s, i) => s + (Number(i.final_amount) || 0), 0),
    [items],
  );

  const taxBreakdown = useMemo(() => calcTaxBreakdown(items ?? []), [items]);

  const billDiscountAmt = Math.round((totals.finalAmount * (Number(discountPercent) || 0)) / 100 * 100) / 100;
  const afterDiscount   = Math.round((totals.finalAmount - billDiscountAmt) * 100) / 100;
  const roundOff        = Math.round(afterDiscount) - afterDiscount;
  const netAmount       = afterDiscount + roundOff;

  return (
    <div className="shrink-0 border-t bg-card">
      <div className="px-4 py-3 space-y-2">
        {liquorTotal > 0 && (
          <>
            <TotalsRow label="Food" value={foodTotal} />
            <TotalsRow label="Liquor" value={liquorTotal} accent="text-amber-600 dark:text-amber-400" />
          </>
        )}

        {totals.discountAmount > 0 && (
          <TotalsRow label="Item Discounts" value={-totals.discountAmount} accent="text-emerald-600 dark:text-emerald-400" />
        )}

        {totals.taxAmount > 0 && (
          <>
            <button
              type="button"
              onClick={() => setTaxExpanded((p) => !p)}
              className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={PercentIcon} size={10} strokeWidth={2} />
                Tax
              </span>
              <div className="flex items-center gap-1">
                <span className="tabular-nums text-foreground font-medium">
                  ₹{fmtAmount(totals.taxAmount)}
                </span>
                <HugeiconsIcon
                  icon={taxExpanded ? ArrowUp01Icon : ArrowDown01Icon}
                  size={10}
                  strokeWidth={2}
                />
              </div>
            </button>
            {taxExpanded && (
              <div className="pl-2 space-y-0.5">
                {taxBreakdown.map((t) => (
                  <div key={t.tax_name} className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{t.tax_name} ({t.tax_percentage}%)</span>
                    <span className="tabular-nums">₹{fmtAmount(t.tax_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Bill-level discount */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0 flex-1">
            <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
            <span>Discount</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={discountPercent}
              onChange={(e) => onDiscountChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="h-6 w-14 text-xs text-right tabular-nums px-1.5 py-0"
            />
            <HugeiconsIcon icon={PercentIcon} size={10} strokeWidth={2} className="text-muted-foreground" />
          </div>
          {billDiscountAmt > 0 && (
            <span className="text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
              -₹{fmtAmount(billDiscountAmt)}
            </span>
          )}
        </div>

        {roundOff !== 0 && (
          <TotalsRow label="Round Off" value={roundOff} small />
        )}
      </div>

      {/* Net total */}
      <div className="px-4 py-2.5 bg-primary/5 dark:bg-primary/10 border-t flex items-center justify-between">
        <span className="text-sm font-bold">Total</span>
        <span className="text-lg font-bold tabular-nums tracking-tight">
          ₹{fmtAmount(netAmount)}
        </span>
      </div>
    </div>
  );
}

function TotalsRow({ label, value, accent, small }) {
  return (
    <div className={`flex justify-between ${small ? "text-[10px]" : "text-[11px]"} text-muted-foreground`}>
      <span>{label}</span>
      <span className={`tabular-nums font-medium ${accent ?? "text-foreground"}`}>
        {value < 0 ? "-" : ""}₹{fmtAmount(Math.abs(value))}
      </span>
    </div>
  );
}

// ─── Payment section (only shown when bill is printed) ────────────

const PAYMENT_MODES = [
  { key: PAYMENT_TYPE.CASH, icon: CashIcon,       label: "Cash"  },
  { key: PAYMENT_TYPE.CARD, icon: CreditCardIcon,  label: "Card"  },
  { key: PAYMENT_TYPE.UPI,  icon: QrCodeIcon,      label: "UPI"   },
  { key: PAYMENT_TYPE.DUE,  icon: Wallet01Icon,    label: "Due"   },
  { key: PAYMENT_TYPE.PART, icon: MinusPlusIcon,   label: "Split" },
];

function PaymentSection({ netAmount, isClosed, onSettle, isSettling }) {
  const {
    paymentEntries,
    addPaymentEntry,
    removePaymentEntry,
    setPaymentEntries,
  } = useBillingContext();

  const [mode, setMode]     = useState(PAYMENT_TYPE.CASH);
  const [amount, setAmount] = useState("");
  const [ref, setRef]       = useState("");

  const totalPaid = paymentEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance   = Math.round((netAmount - totalPaid) * 100) / 100;

  const isSettle = isClosed && mode !== PAYMENT_TYPE.PART;

  function handleAddEntry() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    if (mode === PAYMENT_TYPE.PART) {
      addPaymentEntry({ payment_mode: PAYMENT_TYPE.CASH, amount: amt, reference_no: ref || null });
      setAmount(""); setRef("");
    } else {
      const entry = { payment_mode: mode, amount: amt, reference_no: ref || null };
      setPaymentEntries([entry]);
      setAmount(""); setRef("");
      if (isClosed && onSettle) onSettle([entry]);
    }
  }

  const needsRef = mode === PAYMENT_TYPE.CARD || mode === PAYMENT_TYPE.UPI;

  return (
    <div className="shrink-0 border-t bg-card">
      {/* Mode tabs */}
      <div className="flex border-b">
        {PAYMENT_MODES.map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setMode(key); setAmount(""); setRef(""); }}
            className={[
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              mode === key
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            <HugeiconsIcon icon={icon} size={14} strokeWidth={mode === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {/* Amount entry */}
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">₹</span>
            <Input
              type="number"
              placeholder={balance > 0 ? fmtAmount(balance) : "0.00"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={() => !amount && balance > 0 && setAmount(fmtAmount(balance))}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="h-8 pl-5 text-sm font-mono"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className={`h-8 px-3 text-xs shrink-0${isSettle ? " bg-emerald-600 hover:bg-emerald-700 text-white border-0" : ""}`}
            onClick={handleAddEntry}
            disabled={!amount || Number(amount) <= 0 || isSettling}
          >
            {isSettle ? "Settle" : "Set"}
          </Button>
        </div>

        {needsRef && (
          <Input
            placeholder="Reference / UTR no."
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="h-7 text-xs"
          />
        )}

        {mode === PAYMENT_TYPE.PART && paymentEntries.length > 0 && (
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {paymentEntries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                <span className="text-muted-foreground">{PAYMENT_TYPE_LABELS[entry.payment_mode] ?? entry.payment_mode}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium">₹{fmtAmount(entry.amount)}</span>
                  <button
                    type="button"
                    onClick={() => removePaymentEntry(i)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground px-1">
              <span>Balance</span>
              <span className={balance > 0.01 ? "text-destructive" : "text-emerald-600"}>
                ₹{fmtAmount(Math.max(0, balance))}
              </span>
            </div>
          </div>
        )}

        {!isClosed && mode !== PAYMENT_TYPE.PART && paymentEntries.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Entered: ₹{fmtAmount(paymentEntries[0]?.amount ?? 0)}</span>
            <span className={balance > 0.01 ? "text-destructive" : "text-emerald-600"}>
              {balance > 0.01 ? `Short ₹${fmtAmount(balance)}` : `Change ₹${fmtAmount(Math.abs(balance))}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session top bar ──────────────────────────────────────────────

function SessionTopBar({ session, sessionId, isDraft, draftOrderType, draftCovers, onSetDraftConfig }) {
  const updateInfo = useUpdateSessionInfo(sessionId);

  const currentOrderType = isDraft ? draftOrderType : session?.order_type;
  const currentCovers    = isDraft ? draftCovers    : (session?.covers ?? 1);
  const isClosed         = !isDraft && session?.session_status === "BILL_PRINTED";

  function setOrderType(ot) {
    if (isDraft) { onSetDraftConfig({ orderType: ot }); return; }
    if (!session || session.order_type === ot) return;
    updateInfo.mutate({ sessionId, orderType: ot, covers: session.covers, customerName: session.customer_name ?? null });
  }

  function adjustCovers(delta) {
    if (isDraft) { onSetDraftConfig({ covers: Math.max(1, currentCovers + delta) }); return; }
    if (!session) return;
    const next = Math.max(1, (session.covers ?? 1) + delta);
    updateInfo.mutate({ sessionId, orderType: session.order_type, covers: next, customerName: session.customer_name ?? null });
  }

  if (!isDraft && !session) {
    return <div className="shrink-0 border-b px-3 py-2"><Skeleton className="h-8 w-full rounded-md" /></div>;
  }

  return (
    <div className="shrink-0 border-b bg-card">
      {/* Order type tabs */}
      <div className="flex border-b">
        {Object.entries(ORDER_TYPE_LABELS).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            disabled={isClosed}
            onClick={() => setOrderType(k)}
            className={[
              "flex-1 py-2 text-[11px] font-semibold transition-colors",
              currentOrderType === k
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:bg-muted disabled:opacity-50",
            ].join(" ")}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Session meta row */}
      <div className="flex items-center gap-2.5 px-4 py-2 text-xs text-muted-foreground flex-wrap">
        {/* Covers */}
        {currentOrderType === ORDER_TYPE.DINE_IN && (
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
            <button
              type="button"
              onClick={() => adjustCovers(-1)}
              disabled={isClosed || currentCovers <= 1}
              className="h-4 w-4 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-30"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={7} strokeWidth={2.5} />
            </button>
            <span className="w-4 text-center font-mono font-medium tabular-nums">
              {currentCovers}
            </span>
            <button
              type="button"
              onClick={() => adjustCovers(1)}
              disabled={isClosed}
              className="h-4 w-4 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-30"
            >
              <HugeiconsIcon icon={Add01Icon} size={7} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Waiter (existing sessions only) */}
        {!isDraft && session?.waiter_name && (
          <div className="flex items-center gap-1 min-w-0">
            <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} />
            <span className="truncate max-w-80px">{session.waiter_name}</span>
          </div>
        )}

        {/* Customer (existing sessions only) */}
        {!isDraft && session?.customer_name && (
          <div className="flex items-center gap-1 min-w-0">
            <span className="truncate max-w-90px text-foreground font-medium">
              {session.customer_name}
            </span>
            {session.customer_mobile && (
              <span className="text-muted-foreground/60 text-[10px]">
                {session.customer_mobile}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Action buttons ───────────────────────────────────────────────

function ActionButtons({
  sessionId, session, items, netAmount,
  billId, onSettle, isSettling,
  onCancel,
  isDraft, onKotDraft, isKotting,
}) {
  const { clearSession, paymentEntries } = useBillingContext();
  const generateKot  = useGenerateKot(sessionId);
  const generateBill = useGenerateBill(sessionId);

  const activeItems = (items ?? []).filter((i) => i.item_status === "ACTIVE");
  const pendingKot  = activeItems.filter((i) => i.kot_status === "PENDING").length;
  const hasItems    = activeItems.length > 0;
  const isClosed    = !isDraft && session?.session_status === "BILL_PRINTED";
  const isKotSent   = !isDraft && session?.session_status === "KOT_SENT";

  // Draft: any item present enables KOT; existing: pending items required
  const canKot    = isDraft ? activeItems.length > 0 : (pendingKot > 0 && !isClosed);
  const canBill   = !isDraft && hasItems && (isKotSent || session?.session_status === "OPEN") && !isClosed;
  const canSettle = !isDraft && isClosed && !!billId && (netAmount ?? 0) > 0 && !isSettling;

  const kotPending = isDraft ? isKotting : generateKot.isPending;

  function handleKot() {
    if (isDraft) { onKotDraft(); return; }
    generateKot.mutate({}, { onSuccess: clearSession });
  }

  function handleBill() {
    generateBill.mutate(undefined, { onSuccess: clearSession });
  }

  function handleSettle() {
    const enteredTotal = paymentEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const useEntries = paymentEntries.length > 0
      ? paymentEntries
      : [{ payment_mode: PAYMENT_TYPE.CASH, amount: enteredTotal > 0 ? enteredTotal : (netAmount ?? 0), reference_no: null }];
    onSettle(useEntries);
  }

  return (
    <>
      <div className="shrink-0 border-t bg-card px-3 py-2.5 grid grid-cols-3 gap-2">
        {/* Row 1 */}
        <Button
          type="button"
          size="sm"
          className="h-9 flex-col gap-0.5 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white border-0 col-span-1"
          disabled={!canKot || kotPending}
          onClick={handleKot}
          title={isDraft
            ? (activeItems.length === 0 ? "Add items first" : "Send KOT")
            : (pendingKot > 0 ? `Send ${pendingKot} pending item${pendingKot > 1 ? "s" : ""}` : "No pending items")}
        >
          <HugeiconsIcon icon={SendingOrderIcon} size={14} strokeWidth={2} />
          {kotPending ? "Sending…" : `KOT${!isDraft && pendingKot > 0 ? ` (${pendingKot})` : ""}`}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 flex-col gap-0.5 text-[11px]"
          disabled={!canKot || kotPending}
          onClick={handleKot}
          title="KOT + Print"
        >
          <HugeiconsIcon icon={PrinterIcon} size={13} strokeWidth={2} />
          KOT+P
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 flex-col gap-0.5 text-[11px] text-muted-foreground"
          disabled={isDraft}
          title="Hold order"
        >
          <HugeiconsIcon icon={Hold01Icon} size={13} strokeWidth={2} />
          Hold
        </Button>

        {/* Row 2 */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 flex-col gap-0.5 text-[11px]"
          disabled={!canBill || generateBill.isPending}
          onClick={handleBill}
          title="Generate bill"
        >
          <HugeiconsIcon icon={ReceiptIndianRupeeIcon} size={13} strokeWidth={2} />
          Bill
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 flex-col gap-0.5 text-[11px]"
          disabled={!canBill || generateBill.isPending}
          onClick={handleBill}
          title="Bill + Print"
        >
          <HugeiconsIcon icon={PrinterIcon} size={13} strokeWidth={2} />
          Bill+P
        </Button>

        <Button
          type="button"
          size="sm"
          className="h-9 flex-col gap-0.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-0"
          disabled={!canSettle}
          onClick={handleSettle}
          title={!isClosed ? "Generate bill first" : "Settle payment"}
        >
          <HugeiconsIcon icon={CashIcon} size={14} strokeWidth={2} />
          Settle
        </Button>
      </div>

      {/* Cancel link */}
      <div className="shrink-0 px-3 pb-2.5 flex justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors"
        >
          {isDraft ? "Discard Draft" : "Cancel Order"}
        </button>
      </div>
    </>
  );
}

// ─── Main right panel ─────────────────────────────────────────────

export default function OrderRightPanel({
  session, sessionId,
  isDraft, draftItems, draftOrderType, draftCovers,
  onSetDraftConfig, onKotDraft, isKotting,
  onCancelSession,
}) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const { clearSession } = useBillingContext();

  const itemsQuery  = useOrderItems(sessionId);
  const billSummary = useBillSummary(sessionId);
  const settleBill  = useSettleBill(sessionId);

  // In draft mode, use context items; otherwise DB query items
  const items  = isDraft ? (draftItems ?? []) : (itemsQuery.data ?? []);
  const billId = billSummary.data?.bill_id ?? null;

  const totals    = useMemo(() => calcBillTotals(items), [items]);
  const billDisc  = Math.round((totals.finalAmount * (Number(discountPercent) || 0)) / 100 * 100) / 100;
  const afterDisc = Math.round((totals.finalAmount - billDisc) * 100) / 100;
  const roundOff  = Math.round(afterDisc) - afterDisc;
  const netAmount = afterDisc + roundOff;

  const isClosed = !isDraft && session?.session_status === "BILL_PRINTED";

  function handleSettle(entries) {
    if (!billId || !entries.length) return;
    const isPartPayment = entries.length > 1;
    const paymentType   = isPartPayment ? PAYMENT_TYPE.PART : entries[0].payment_mode;
    const paymentAmount = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const referenceNo   = isPartPayment ? null : (entries[0]?.reference_no ?? null);
    const partPayments  = isPartPayment ? entries : [];
    settleBill.mutate(
      { sessionId, billId, paymentType, paymentAmount, referenceNo, partPayments, writeOffAmount: 0 },
      { onSuccess: clearSession },
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Session type + meta bar */}
      <SessionTopBar
        session={session}
        sessionId={sessionId}
        isDraft={isDraft}
        draftOrderType={draftOrderType}
        draftCovers={draftCovers}
        onSetDraftConfig={onSetDraftConfig}
      />

      {/* Order items (scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <OrderItemsArea
          sessionId={sessionId}
          items={items}
          isLoading={!isDraft && itemsQuery.isLoading}
          isDraft={isDraft}
        />
      </div>

      {/* Bill totals */}
      <BillTotals
        items={items}
        discountPercent={discountPercent}
        onDiscountChange={setDiscountPercent}
      />

      {/* Payment — only shown once bill is printed */}
      {!isDraft && (
        <PaymentSection
          netAmount={netAmount}
          isClosed={isClosed}
          onSettle={handleSettle}
          isSettling={settleBill.isPending}
        />
      )}

      {/* Action buttons */}
      <ActionButtons
        sessionId={sessionId}
        session={session}
        items={items}
        netAmount={netAmount}
        billId={billId}
        onSettle={handleSettle}
        isSettling={settleBill.isPending}
        onCancel={onCancelSession}
        isDraft={isDraft}
        onKotDraft={onKotDraft}
        isKotting={isKotting}
      />
    </div>
  );
}
