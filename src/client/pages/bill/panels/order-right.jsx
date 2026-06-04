import { useEffect, useMemo, useRef, useState } from "react";
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
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingContext } from "../state/billing-context";
import {
  useUpdateOrderItemQty,
  useCancelOrderItem,
  useUpdateSessionInfo,
  useUpdateSessionParty,
  useSearchKotMessages,
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

function OrderItemRow({ item, sessionId, isDraft, isF6Active, onF6Close, isActive, onQtyEnter }) {
  const updateQty  = useUpdateOrderItemQty(sessionId);
  const cancelItem = useCancelOrderItem(sessionId);
  const {
    updateDraftQty, removeDraftItem,
    setDraftItemKotMsg, setPendingItemKotMsg, pendingItemKotMsgs,
  } = useBillingContext();

  const [qtyEditing,    setQtyEditing]    = useState(false);
  const [qtyInput,      setQtyInput]      = useState("");
  const [kotInput,      setKotInput]      = useState("");
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(-1);
  const kotInputRef                       = useRef(null);
  const qtyInputRef                       = useRef(null);
  const dropdownRef                       = useRef(null);

  if (item.item_status === "CANCELLED") return null;

  const canEdit = isDraft || (item.kot_status === "PENDING" && item.item_status === "ACTIVE");

  const hasPending = !isDraft && Object.prototype.hasOwnProperty.call(pendingItemKotMsgs, item.id);
  const kotMessage = isDraft
    ? (item.kot_message ?? null)
    : (hasPending ? pendingItemKotMsgs[item.id] : (item.kot_messages ?? null));

  // Live search against KOT message master
  const kotSearch  = useSearchKotMessages(kotInput, isF6Active);
  const kotResults = kotSearch.data ?? [];

  // Auto-focus and pre-select qty when this row is freshly added
  useEffect(() => {
    if (isActive && !isF6Active) {
      setQtyInput(String(item.quantity));
      setQtyEditing(true);
      setTimeout(() => { qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }, 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Focus the KOT inline input when F6 activates for this item
  useEffect(() => {
    if (isF6Active) {
      setKotInput(kotMessage ?? "");
      setDropdownOpen(true);
      setActiveIdx(-1);
      setTimeout(() => kotInputRef.current?.focus(), 50);
    } else {
      setDropdownOpen(false);
      setActiveIdx(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isF6Active]);

  function handleKotMsg(message) {
    if (isDraft) setDraftItemKotMsg(item.menu_id, message);
    else setPendingItemKotMsg(item.id, message);
  }

  function commitKotInput(text) {
    const val = (text ?? kotInput).trim();
    handleKotMsg(val || null);
    onF6Close?.();
  }

  function pickSuggestion(msg) {
    setKotInput(msg);
    handleKotMsg(msg || null);
    onF6Close?.();
  }

  function handleKotKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, kotResults.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && kotResults[activeIdx]) {
        // User navigated with arrow keys — pick highlighted
        pickSuggestion(kotResults[activeIdx].message);
      } else {
        // Auto-match: exact code match takes priority
        const q = kotInput.trim();
        const exactCode = q ? kotResults.find((m) => String(m.code ?? "") === q) : null;
        if (exactCode) {
          pickSuggestion(exactCode.message);
        } else if (kotResults.length === 1) {
          // Only one result — pick it automatically
          pickSuggestion(kotResults[0].message);
        } else {
          // Save whatever the user typed as a custom message
          commitKotInput();
        }
      }
      return;
    }
    if (e.key === "Escape") { onF6Close?.(); }
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

  function startQtyEdit() {
    if (!canEdit) return;
    setQtyInput(String(item.quantity));
    setQtyEditing(true);
    setTimeout(() => { qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }, 30);
  }

  function commitQtyEdit(returnToSearch = false) {
    const parsed = parseInt(qtyInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (isDraft) updateDraftQty(item.menu_id, parsed);
      else updateQty.mutate({ id: item.id, qty: parsed });
    }
    setQtyEditing(false);
    if (returnToSearch) onQtyEnter?.();
  }

  function handleQtyKeyDown(e) {
    if (e.key === "Enter")  { e.preventDefault(); commitQtyEdit(true); }
    if (e.key === "Escape") { setQtyEditing(false); onQtyEnter?.(); }
  }

  const decDisabled = isDraft ? item.quantity <= 1 : (!canEdit || item.quantity <= 1 || updateQty.isPending);
  const incDisabled = isDraft ? false : (!canEdit || updateQty.isPending);
  const delDisabled = isDraft ? false : (!canEdit || cancelItem.isPending);

  // qty=1: show trash on left instead of minus
  const showTrashLeft = item.quantity === 1;

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

        {/* Qty controls: [trash/minus] [qty] [+] */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Left button: trash when qty=1, minus otherwise */}
          {showTrashLeft ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={delDisabled}
              className="h-6 w-6 rounded border bg-background flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-25 transition-colors"
              title="Remove item"
            >
              <HugeiconsIcon icon={Delete01Icon} size={10} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDecrement}
              disabled={decDisabled}
              className="h-6 w-6 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-25 transition-colors"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={9} strokeWidth={2.5} />
            </button>
          )}

          {/* Qty — click to edit */}
          {qtyEditing ? (
            <input
              ref={qtyInputRef}
              type="number"
              min="1"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={commitQtyEdit}
              onKeyDown={handleQtyKeyDown}
              className="w-8 h-6 text-center text-xs font-mono font-semibold tabular-nums border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary px-0.5"
            />
          ) : (
            <button
              type="button"
              onClick={startQtyEdit}
              title="Click to edit quantity"
              className="w-7 h-6 text-center text-xs font-mono font-semibold tabular-nums rounded hover:bg-muted transition-colors"
            >
              {item.quantity}
            </button>
          )}

          {/* Plus */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={incDisabled}
            className="h-6 w-6 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-25 transition-colors"
          >
            <HugeiconsIcon icon={Add01Icon} size={9} strokeWidth={2.5} />
          </button>
        </div>

        {/* Amount */}
        <span className="text-xs font-semibold tabular-nums shrink-0 w-14 text-right">
          ₹{fmtAmount(item.final_amount)}
        </span>

        {/* KOT message picker — popover (click) or F6 (keyboard) */}
        <div className="flex items-center gap-0.5 shrink-0" title="KOT message — press F6">
          <KotMessagePicker
            value={kotMessage}
            disabled={!canEdit}
            onSelect={handleKotMsg}
          />
        </div>
      </div>

      {/* F6 inline KOT message input + live dropdown */}
      {isF6Active && canEdit && (
        <div className="px-3 pb-2 -mt-0.5 relative" ref={dropdownRef}>
          {/* Input row */}
          <div className="flex items-center gap-1.5 rounded border border-primary/40 bg-primary/5 px-2 py-1">
            <HugeiconsIcon icon={Comment01Icon} size={10} strokeWidth={2} className="text-primary/60 shrink-0" />
            <input
              ref={kotInputRef}
              type="text"
              value={kotInput}
              onChange={(e) => { setKotInput(e.target.value); setActiveIdx(-1); setDropdownOpen(true); }}
              onKeyDown={handleKotKeyDown}
              placeholder="Type message or search by name / code…"
              className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
            />
            {kotInput && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setKotInput(""); kotInputRef.current?.focus(); }}
                className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Dropdown suggestions */}
          {dropdownOpen && (
            <div className="absolute left-3 right-3 top-full z-50 rounded border bg-popover shadow-md overflow-hidden">
              {/* Master results first */}
              {kotSearch.isLoading ? (
                <div className="p-2 space-y-1">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 rounded" />)}
                </div>
              ) : kotResults.length === 0 && !kotInput.trim() ? (
                <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">Type to search KOT messages…</p>
              ) : kotResults.length > 0 ? (
                <div className="max-h-40 overflow-y-auto">
                  {kotResults.map((m, idx) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); pickSuggestion(m.message); }}
                      className={[
                        "w-full flex items-center justify-between gap-2 px-3 py-2 text-left border-b last:border-b-0 transition-colors",
                        activeIdx === idx ? "bg-primary/10 text-primary" : "hover:bg-muted",
                      ].join(" ")}
                    >
                      <span className="text-[11px] font-medium truncate">{m.message}</span>
                      {m.code != null && (
                        <span className="text-[10px] text-muted-foreground shrink-0">#{m.code}</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Custom free-text option — below master results */}
              {kotInput.trim() && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); commitKotInput(kotInput.trim()); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left border-t hover:bg-muted transition-colors"
                >
                  <HugeiconsIcon icon={Comment01Icon} size={10} strokeWidth={2} className="text-muted-foreground/60 shrink-0" />
                  <span className="text-[11px] truncate text-muted-foreground">{kotInput.trim()}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">custom</span>
                </button>
              )}

              {/* Clear current message if one is set */}
              {kotMessage && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(""); }}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-[11px] text-destructive hover:bg-destructive/5 border-t transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
                  Clear message
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* KOT message display */}
      {!isF6Active && kotMessage && (
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

function OrderItemsArea({ sessionId, items, isLoading, isDraft, lastAddedKey, onQtyEnter }) {
  const [f6ItemKey, setF6ItemKey] = useState(null);

  const activeItems = (items ?? []).filter((i) => i.item_status !== "CANCELLED");

  // F6 target = lastAddedKey (menu_id of the item just added, controlled by parent)
  // Falls back to the last active item's menu_id when nothing freshly added
  const lastItem    = activeItems.length > 0 ? activeItems[activeItems.length - 1] : null;
  const lastItemKey = lastAddedKey ?? (lastItem?.menu_id ?? null);

  // Clear any open F6 panel when a new item is added
  const prevCountRef = useRef(activeItems.length);
  useEffect(() => {
    if (activeItems.length > prevCountRef.current) {
      setF6ItemKey(null);
    }
    prevCountRef.current = activeItems.length;
  }, [activeItems.length]);

  // Global F6 — opens KOT message input on the active (last-added) item by menu_id
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "F6") return;
      if (!lastItemKey) return;
      e.preventDefault();
      setF6ItemKey((prev) => (prev === lastItemKey ? null : lastItemKey));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastItemKey]);

  if (isLoading) {
    return (
      <div className="p-2 space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-md" />
        ))}
      </div>
    );
  }

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
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 text-center flex items-center gap-1">
          Msg
          <kbd className="rounded bg-muted px-0.5 text-[8px] font-mono text-muted-foreground/50 leading-tight">F6</kbd>
        </span>
      </div>
      {activeItems.map((item) => (
        <OrderItemRow
          key={item.id}
          item={item}
          sessionId={sessionId}
          isDraft={isDraft}
          isActive={lastAddedKey === item.menu_id}
          isF6Active={f6ItemKey === item.menu_id}
          onF6Close={() => setF6ItemKey(null)}
          onQtyEnter={onQtyEnter}
        />
      ))}
    </div>
  );
}

// ─── Bill totals section ──────────────────────────────────────

function BillTotals({ items, sessionDisc }) {
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

  // Use saved discount from sessionDisc when available for accurate display
  const totalDiscAmt = sessionDisc
    ? Math.round(((sessionDisc.discAmt || 0) + (sessionDisc.foodDiscAmt || 0) + (sessionDisc.liquorDiscAmt || 0) + (sessionDisc.tDisc || 0)) * 100) / 100
    : 0;
  const netAmount = sessionDisc?.netAmt ?? totals.finalAmount;
  const roundOff  = Math.round(netAmount) - netAmount;

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

        {/* Bill discount breakdown from saved sessionDisc */}
        {sessionDisc && totalDiscAmt > 0 && (
          <div className="space-y-0.5">
            {sessionDisc.foodDiscAmt > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
                  Food Disc ({sessionDisc.foodPct}%)
                </span>
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(sessionDisc.foodDiscAmt)}</span>
              </div>
            )}
            {sessionDisc.liquorDiscAmt > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
                  Liquor Disc ({sessionDisc.liquorPct}%)
                </span>
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(sessionDisc.liquorDiscAmt)}</span>
              </div>
            )}
            {sessionDisc.discAmt > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
                  Discount
                </span>
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(sessionDisc.discAmt)}</span>
              </div>
            )}
            {sessionDisc.sCharge > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
                  Service Charge
                </span>
                <span className="tabular-nums font-medium">+₹{fmtAmount(sessionDisc.sCharge)}</span>
              </div>
            )}
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
  items, isLoadingItems,
  discountPercent,
  sessionDisc,
  lastAddedKey,
  onQtyEnter,
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
          lastAddedKey={lastAddedKey}
          onQtyEnter={onQtyEnter}
        />
      </div>

      {/* Bill totals */}
      <BillTotals
        items={items}
        discountPercent={discountPercent}
        sessionDisc={sessionDisc}
      />
    </div>
  );
}
