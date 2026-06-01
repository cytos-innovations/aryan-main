import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  MinusSignIcon,
  Delete01Icon,
  ChefHatIcon,
  UserGroupIcon,
  PercentIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  StickyNote01Icon,
  Discount01Icon,
  Comment01Icon,
} from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingContext } from "../state/billing-context";
import {
  useUpdateOrderItemQty,
  useCancelOrderItem,
  useUpdateSessionInfo,
  useUpdateSessionParty,
} from "../hooks/use-billing-queries";
import { ORDER_TYPE } from "../constants/billing";
import { calcBillTotals, calcTaxBreakdown, fmtAmount } from "../utils/billing-calc";
import { FoodTypeDot } from "./menu-center";
import { CustomerPicker, WaiterPicker } from "./party-pickers";
import KotMessagePicker from "./kot-message-picker";

// ─── KOT status config ────────────────────────────────────────

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

// ─── Order item row ───────────────────────────────────────────

function OrderItemRow({ item, sessionId, isDraft }) {
  const updateQty  = useUpdateOrderItemQty(sessionId);
  const cancelItem = useCancelOrderItem(sessionId);
  const {
    updateDraftQty, removeDraftItem,
    setDraftItemKotMsg, setPendingItemKotMsg, pendingItemKotMsgs,
  } = useBillingContext();

  if (item.item_status === "CANCELLED") return null;

  const canEdit = isDraft || (item.kot_status === "PENDING" && item.item_status === "ACTIVE");

  // KOT message resolution (all UI-only until KOT is punched):
  //  • draft items         → stored on the draft item
  //  • existing pending     → local pending map overrides the DB value
  //  • already-saved (DB)   → kot_messages aggregate
  const hasPending = !isDraft && Object.prototype.hasOwnProperty.call(pendingItemKotMsgs, item.id);
  const kotMessage = isDraft
    ? (item.kot_message ?? null)
    : (hasPending ? pendingItemKotMsgs[item.id] : (item.kot_messages ?? null));

  function handleKotMsg(message) {
    if (isDraft) setDraftItemKotMsg(item.menu_id, message);
    else setPendingItemKotMsg(item.id, message);  // UI only — persisted on KOT
  }

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

        {/* KOT message + Remove */}
        <div className="flex items-center gap-0.5 shrink-0">
          <KotMessagePicker
            value={kotMessage}
            disabled={!canEdit}
            onSelect={handleKotMsg}
          />
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
      </div>

      {/* KOT message */}
      {kotMessage && (
        <div className="flex items-start gap-1 px-3 pb-1.5 -mt-0.5">
          <HugeiconsIcon icon={Comment01Icon} size={9} strokeWidth={2} className="text-primary/60 mt-0.5 shrink-0" />
          <p className="text-[10px] text-primary/80 font-medium leading-snug">
            {kotMessage}
          </p>
        </div>
      )}

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

// ─── Order items area ─────────────────────────────────────────

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
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-11 text-center">Msg</span>
      </div>
      {activeItems.map((item) => (
        <OrderItemRow key={item.id} item={item} sessionId={sessionId} isDraft={isDraft} />
      ))}
    </div>
  );
}

// ─── Bill totals section ──────────────────────────────────────

function BillTotals({ items, discountPercent }) {
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
      <div className="px-4 py-2.5 space-y-1.5">
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

        {/* Bill discount — read-only row; input lives in the bottom panel */}
        {billDiscountAmt > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
              Discount ({discountPercent}%)
            </span>
            <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
              -₹{fmtAmount(billDiscountAmt)}
            </span>
          </div>
        )}

        {roundOff !== 0 && (
          <TotalsRow label="Round Off" value={roundOff} small />
        )}
      </div>

      {/* Compact net total */}
      <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Net Total</span>
        <span className="text-sm font-bold tabular-nums tracking-tight">
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

// ─── Session top bar ──────────────────────────────────────────

function SessionTopBar({ session, sessionId, isDraft, draftOrderType, draftCovers, onSetDraftConfig }) {
  const updateInfo  = useUpdateSessionInfo(sessionId);
  const updateParty = useUpdateSessionParty(sessionId);
  const {
    draftCustomerId, draftCustomerName, draftCustomerMobile, draftWaiterName,
  } = useBillingContext();

  const currentOrderType = isDraft ? draftOrderType : session?.order_type;
  const currentCovers    = isDraft ? draftCovers    : (session?.covers ?? 1);
  const isClosed         = !isDraft && session?.session_status === "BILL_PRINTED";

  // Resolve current party values (draft vs DB session)
  const customerId     = isDraft ? draftCustomerId     : session?.customer_id;
  const customerName   = isDraft ? draftCustomerName   : session?.customer_name;
  const customerMobile = isDraft ? draftCustomerMobile : session?.customer_mobile;
  const waiterName     = isDraft ? draftWaiterName     : session?.waiter_name;

  function adjustCovers(delta) {
    if (isDraft) { onSetDraftConfig({ covers: Math.max(1, currentCovers + delta) }); return; }
    if (!session) return;
    const next = Math.max(1, (session.covers ?? 1) + delta);
    updateInfo.mutate({ sessionId, orderType: session.order_type, covers: next, customerName: session.customer_name ?? null });
  }

  function handleSelectCustomer(c) {
    if (isDraft) {
      onSetDraftConfig({ customerId: c.id, customerName: c.name, customerMobile: c.mobile });
    } else {
      updateParty.mutate({ sessionId, customerId: c.id, customerName: c.name, customerMobile: c.mobile });
    }
  }

  function handleSelectWaiter(w) {
    if (isDraft) {
      onSetDraftConfig({ waiterId: w.id, waiterName: w.name });
    } else {
      updateParty.mutate({ sessionId, waiterId: w.id });
    }
  }

  if (!isDraft && !session) {
    return <div className="shrink-0 border-b px-3 py-2"><Skeleton className="h-8 w-full rounded-md" /></div>;
  }

  return (
    <div className="shrink-0 border-b bg-card">
      {/* Party + covers row */}
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        <CustomerPicker
          customerId={customerId}
          customerName={customerName}
          customerMobile={customerMobile}
          disabled={isClosed}
          onSelect={handleSelectCustomer}
        />
        <WaiterPicker
          waiterName={waiterName}
          disabled={isClosed}
          onSelect={handleSelectWaiter}
        />

        {/* Covers — DINE_IN only */}
        {currentOrderType === ORDER_TYPE.DINE_IN && (
          <div className="flex items-center gap-1 ml-auto">
            <HugeiconsIcon icon={UserGroupIcon} size={13} strokeWidth={2} className="text-muted-foreground" />
            <button
              type="button"
              onClick={() => adjustCovers(-1)}
              disabled={isClosed || currentCovers <= 1}
              className="h-5 w-5 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-30"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={8} strokeWidth={2.5} />
            </button>
            <span className="w-5 text-center text-xs font-mono font-medium tabular-nums">
              {currentCovers}
            </span>
            <button
              type="button"
              onClick={() => adjustCovers(1)}
              disabled={isClosed}
              className="h-5 w-5 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-30"
            >
              <HugeiconsIcon icon={Add01Icon} size={8} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main right panel ─────────────────────────────────────────

export default function OrderRightPanel({
  session, sessionId,
  isDraft, draftOrderType, draftCovers,
  onSetDraftConfig,
  // Lifted from OrderEntryView:
  items, isLoadingItems,
  discountPercent,
}) {
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
          isLoading={isLoadingItems}
          isDraft={isDraft}
        />
      </div>

      {/* Bill totals */}
      <BillTotals
        items={items}
        discountPercent={discountPercent}
      />
    </div>
  );
}
