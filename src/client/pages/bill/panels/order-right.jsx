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
  AlertCircleIcon,
  PrinterIcon,
} from "@hugeicons/core-free-icons";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useBillingContext } from "../state/billing-context";
import {
  useUpdateOrderItemQty,
  useCancelOrderItem,
  useCancelOrderItemWithReason,
  useUpdateSessionInfo,
  useUpdateSessionParty,
  useSearchKotMessages,
} from "../hooks/use-billing-queries";
import { ORDER_TYPE } from "../constants/billing";
import { calcBillTotals, calcDiscountedTotals, calcTaxBreakdown, recalcSessionDisc, fmtAmount } from "../utils/billing-calc";
import { FoodTypeDot } from "./menu-center";
import { CustomerPicker, WaiterPicker } from "./party-pickers";
import KotMessagePicker from "./kot-message-picker";

// ─── Void reason dialog ───────────────────────────────────────

const QUICK_REASONS = [
  "Customer changed mind",
  "Wrong item ordered",
  "Item not available",
  "Customer left",
  "Duplicate entry",
];

function fmtKotTime(ts) {
  if (!ts) return null;
  const d = new Date(ts.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// kotBatches: array of { item (order_item row), qty (number) }
// onConfirm: (reason, voids) where voids = [{ orderItemId, qty }, ...]
function VoidReasonDialog({ itemName, kotBatches, onConfirm, onClose }) {
  // qtys keyed by order_item id — how many to remove from each batch
  const [qtys, setQtys] = useState(() => {
    const init = {};
    for (const b of kotBatches) init[b.item.id] = b.qty;
    return init;
  });
  const [reason, setReason] = useState("");
  const qtyRef    = useRef(null);
  const reasonRef = useRef(null);

  useEffect(() => { setTimeout(() => qtyRef.current?.focus(), 60); }, []);

  const totalToRemove = Object.values(qtys).reduce((s, v) => s + v, 0);
  const totalQty = kotBatches.reduce((s, b) => s + Number(b.item.quantity), 0);
  const isFullRemove = totalToRemove >= totalQty;

  function setKotQty(id, val, max) {
    const v = Math.min(max, Math.max(0, val));
    setQtys((prev) => ({ ...prev, [id]: v }));
  }

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed || totalToRemove === 0) return;
    const voids = kotBatches
      .filter((b) => qtys[b.item.id] > 0)
      .map((b) => ({ orderItemId: b.item.id, qty: qtys[b.item.id] }));
    onConfirm(trimmed, voids);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConfirm(); }
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-destructive/10 border-b border-destructive/20">
          <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} className="text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">Void KOT Item</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{itemName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Select qty to remove per KOT, then provide a reason.
          </p>

          {/* Per-KOT rows */}
          <div className="space-y-1.5">
            {kotBatches.map((b) => {
              const maxQ = Number(b.item.quantity);
              const curQ = qtys[b.item.id] ?? 0;
              const kotLabel = b.item.kot_no ?? (b.item.kot_id ? `KOT-${b.item.kot_id}` : "KOT");
              const kotTime  = fmtKotTime(b.item.kot_created_at);
              return (
                <div key={b.item.id} className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                  {/* KOT info */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <HugeiconsIcon icon={PrinterIcon} size={11} strokeWidth={2} className="text-blue-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 shrink-0">{kotLabel}</span>
                    {kotTime && <span className="text-[10px] text-muted-foreground">· {kotTime}</span>}
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">of {maxQ}</span>
                  </div>
                  {/* Qty stepper */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setKotQty(b.item.id, curQ - 1, maxQ)}
                      disabled={curQ <= 0}
                      className="h-6 w-6 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <HugeiconsIcon icon={MinusSignIcon} size={9} strokeWidth={2.5} />
                    </button>
                    <input
                      ref={b.item.id === kotBatches[0].item.id ? qtyRef : undefined}
                      type="text"
                      inputMode="numeric"
                      value={curQ}
                      onChange={(e) => {
                        const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                        setKotQty(b.item.id, isNaN(v) ? 0 : v, maxQ);
                      }}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); reasonRef.current?.focus(); } }}
                      className="w-10 h-6 text-center text-xs font-mono font-semibold tabular-nums border rounded bg-background focus:outline-none focus:ring-1 focus:ring-destructive px-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setKotQty(b.item.id, curQ + 1, maxQ)}
                      disabled={curQ >= maxQ}
                      className="h-6 w-6 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={9} strokeWidth={2.5} />
                    </button>
                    {/* All */}
                    {curQ < maxQ && (
                      <button
                        type="button"
                        onClick={() => setKotQty(b.item.id, maxQ, maxQ)}
                        className="ml-1 text-[9px] px-1.5 py-0.5 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        All
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick pick */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={[
                  "text-[10px] px-2 py-1 rounded-full border transition-colors",
                  reason === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-border/60 hover:bg-muted text-foreground",
                ].join(" ")}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Free-text */}
          <textarea
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Or type a custom reason…"
            rows={2}
            className="w-full text-xs rounded border border-border/60 bg-muted/30 px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/20">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 px-4 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!reason.trim() || totalToRemove === 0}
            className="h-8 px-4 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 disabled:opacity-40"
          >
            {isFullRemove ? "Remove Item" : `Void (−${totalToRemove})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

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

// ─── Merged order item row (groups same menu_id across KOTs) ──

function MergedOrderItemRow({ group, sessionId, isDraft, isBillPrinted, isF6Active, onF6Close, isActive, onQtyEnter, onEditAddons, blockRemove }) {
  const { auth } = useAuth();
  const updateQty        = useUpdateOrderItemQty(sessionId);
  const cancelItem       = useCancelOrderItem(sessionId);
  const cancelWithReason = useCancelOrderItemWithReason(sessionId);
  const {
    updateDraftQty, removeDraftItem,
    setDraftItemKotMsg, setPendingItemKotMsg, pendingItemKotMsgs,
  } = useBillingContext();

  const [qtyEditing,   setQtyEditing]   = useState(false);
  const [qtyInput,     setQtyInput]     = useState("");
  const [kotInput,     setKotInput]     = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx,    setActiveIdx]    = useState(-1);
  // void dialog: null = closed, true = open
  const [voidOpen,     setVoidOpen]     = useState(false);
  const kotInputRef  = useRef(null);
  const qtyInputRef  = useRef(null);
  const dropdownRef  = useRef(null);

  // Draft uses a single synthetic item; session uses the first item's metadata
  const representative = group[0];
  // Key used to address this draft line in the billing context (menu_id for normal
  // lines, the line's own id for complimentary lines — see draftLineKey in context).
  const draftKey = representative.is_complimentary ? representative.id : representative.menu_id;
  const isComp   = !!representative.is_complimentary;

  // Totals across the group
  const totalQty    = isDraft
    ? representative.quantity
    : group.reduce((s, i) => s + Number(i.quantity), 0);
  // Show the pre-tax (taxable) amount per line — tax is added separately in the
  // bill totals below, not baked into each line's displayed amount.
  const totalAmount = group.reduce((s, i) => s + Number(i.taxable_amount), 0);

  // Pending (editable) items vs KOT-sent items
  const pendingItems = isDraft ? group : group.filter((i) => i.kot_status === "PENDING");
  const sentItems    = isDraft ? []    : group.filter((i) => i.kot_status !== "PENDING");

  const hasPendingQty = pendingItems.length > 0;
  const hasSentQty    = sentItems.length > 0;

  // For display: highest-priority KOT status in the group
  const kotStatusPriority = ["SERVED", "READY", "PREPARING", "SENT", "PENDING"];
  const groupStatus = isDraft ? "PENDING" : (
    kotStatusPriority.find((s) => group.some((i) => i.kot_status === s)) ?? "PENDING"
  );

  // Complimentary lines are fixed at qty 1 — to give more, the user adds the item
  // again from the Complimentary picker (each free item is its own line).
  const canEdit   = !isBillPrinted && hasPendingQty && !isComp;
  const canRemove = !isBillPrinted && (hasPendingQty || hasSentQty);

  // KOT message: use last item in group (most recent KOT or draft item)
  const lastItem = group[group.length - 1];
  const hasPending = !isDraft && Object.prototype.hasOwnProperty.call(pendingItemKotMsgs, lastItem.id);
  const kotMessage = isDraft
    ? (representative.kot_message ?? null)
    : (hasPending ? pendingItemKotMsgs[lastItem.id] : (lastItem.kot_messages ?? null));

  const kotSearch  = useSearchKotMessages(kotInput, isF6Active);
  const kotResults = kotSearch.data ?? [];

  // Auto-focus qty when row freshly added — show only the pending item's qty, not the merged total.
  // Complimentary lines are fixed at qty 1, so never enter the editable qty box.
  useEffect(() => {
    if (isActive && !isF6Active && !isComp) {
      const pendingQty = isDraft
        ? representative.quantity
        : (pendingItems[pendingItems.length - 1]?.quantity ?? 1);
      setQtyInput(String(pendingQty));
      setQtyEditing(true);
      setTimeout(() => { qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }, 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

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
    if (isDraft) setDraftItemKotMsg(draftKey, message);
    else setPendingItemKotMsg(lastItem.id, message);
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
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, kotResults.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && kotResults[activeIdx]) {
        pickSuggestion(kotResults[activeIdx].message);
      } else {
        const q = kotInput.trim();
        const exactCode = q ? kotResults.find((m) => String(m.code ?? "") === q) : null;
        if (exactCode) pickSuggestion(exactCode.message);
        else if (kotResults.length === 1) pickSuggestion(kotResults[0].message);
        else commitKotInput();
      }
      return;
    }
    if (e.key === "Escape") { onF6Close?.(); }
  }

  // Returns true (and warns) when removing/zeroing this line is blocked because it
  // is the last paid line and complimentary lines would be left orphaned.
  function guardLastPaidRemoval() {
    if (blockRemove) {
      toast.error("Remove the complimentary items first — an order can't have only complimentary items.");
      return true;
    }
    return false;
  }

  function handleDecrement() {
    // Decrement that would drop the last paid line to 0 is blocked.
    if (blockRemove && totalQty <= 1 && guardLastPaidRemoval()) return;
    if (isDraft) { updateDraftQty(draftKey, representative.quantity - 1); return; }
    // If there are pending (unsent) items, decrement those first
    if (hasPendingQty) {
      const target = pendingItems[pendingItems.length - 1];
      if (target.quantity <= 1) cancelItem.mutate(target.id);
      else updateQty.mutate({ id: target.id, qty: target.quantity - 1 });
      return;
    }
    // All sent — open KOT-wise void dialog
    setVoidOpen(true);
  }

  function handleIncrement() {
    if (!canEdit) return;
    if (isDraft) { updateDraftQty(draftKey, representative.quantity + 1); return; }
    // Increment the last pending item
    const target = pendingItems[pendingItems.length - 1];
    updateQty.mutate({ id: target.id, qty: target.quantity + 1 });
  }

  function handleRemove() {
    if (guardLastPaidRemoval()) return;
    if (isDraft) { removeDraftItem(draftKey); return; }
    if (hasPendingQty && !hasSentQty) {
      // All items are still pending — cancel them directly
      for (const p of pendingItems) cancelItem.mutate(p.id);
      return;
    }
    // Has sent items (with or without pending) — open void dialog for all
    setVoidOpen(true);
  }

  function handleVoidConfirm(reason, voids) {
    // Block voiding the entire last paid line while comp lines remain.
    if (blockRemove) {
      const totalVoid = voids.reduce((s, v) => s + Number(v.qty), 0);
      if (totalVoid >= totalQty) { guardLastPaidRemoval(); setVoidOpen(false); return; }
    }
    for (const v of voids) {
      cancelWithReason.mutate({
        orderItemId:    v.orderItemId,
        quantityToVoid: v.qty,
        voidReason:     reason,
        userId:         auth?.user?.id ?? null,
        voidedBy:       auth?.user?.username ?? null,
      });
    }
    setVoidOpen(false);
  }

  function startQtyEdit() {
    if (!canEdit || isBillPrinted) return;
    const pendingQty = isDraft
      ? representative.quantity
      : (pendingItems[pendingItems.length - 1]?.quantity ?? 1);
    setQtyInput(String(pendingQty));
    setQtyEditing(true);
    setTimeout(() => { qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }, 30);
  }

  function commitQtyEdit(returnToSearch = false) {
    const parsed = parseInt(qtyInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (isDraft) { updateDraftQty(draftKey, parsed); }
      else if (pendingItems.length > 0) {
        const target = pendingItems[pendingItems.length - 1];
        updateQty.mutate({ id: target.id, qty: parsed });
      }
    }
    setQtyEditing(false);
    if (returnToSearch) onQtyEnter?.();
  }

  function handleQtyKeyDown(e) {
    if (e.key === "Enter")  { e.preventDefault(); commitQtyEdit(true); }
    if (e.key === "Escape") { setQtyEditing(false); onQtyEnter?.(); }
  }

  const isMutating  = cancelItem.isPending || cancelWithReason.isPending || updateQty.isPending;
  const showTrashLeft = totalQty === 1;
  const decDisabled = !canRemove || (totalQty <= 1 && !hasSentQty) || isMutating;
  const incDisabled = !canEdit || updateQty.isPending;
  const delDisabled = !canRemove || isMutating;

  // KOT batches passed to void dialog — only sent items (pending are cancelled directly)
  const kotBatchesForDialog = sentItems.map((i) => ({ item: i, qty: Number(i.quantity) }));

  return (
    <div className="group flex flex-col border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Type dot + KOT status */}
        <div className="flex items-center gap-1 shrink-0">
          <FoodTypeDot type={representative.food_type} size={9} />
          <KotDot status={groupStatus} />
        </div>

        {/* Name — click to add / edit add-ons (draft, or pending session lines).
            Complimentary lines can't carry add-ons, so they render as static text. */}
        {!isComp && onEditAddons && (isDraft || (!isBillPrinted && hasPendingQty)) ? (
          <button
            type="button"
            onClick={() => onEditAddons(representative)}
            title="Click to add / edit add-ons"
            className="flex-1 min-w-0 text-xs leading-snug truncate font-medium text-left hover:text-primary hover:underline decoration-dotted underline-offset-2 transition-colors"
          >
            {representative.item_name}
          </button>
        ) : (
          <span className="flex-1 min-w-0 flex items-center gap-1.5 text-xs leading-snug truncate font-medium">
            <span className="truncate">{representative.item_name}</span>
            {isComp && (
              <span className="shrink-0 rounded-sm bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide leading-none">
                Comp
              </span>
            )}
          </span>
        )}

        {/* Qty controls: [trash/minus] [qty] [+] */}
        <div className="flex items-center gap-0.5 shrink-0">
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

          {qtyEditing ? (
            <input
              ref={qtyInputRef}
              type="text"
              inputMode="numeric"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value.replace(/[^0-9]/g, ""))}
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
              {totalQty}
            </button>
          )}

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
          ₹{fmtAmount(totalAmount)}
        </span>

        {/* KOT message picker */}
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
          {dropdownOpen && (
            <div className="absolute left-3 right-3 top-full z-50 rounded border bg-popover shadow-md overflow-hidden">
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
          <p className="text-[10px] text-primary/80 font-medium leading-snug">{kotMessage}</p>
        </div>
      )}

      {/* Add-ons (chargeable modifiers attached to this line) */}
      {Array.isArray(representative.addons) && representative.addons.length > 0 && (
        <div className="px-3 pb-1.5 -mt-0.5 space-y-0.5">
          {representative.addons.map((a, idx) => (
            <div key={a.id ?? idx} className="flex items-center gap-1 pl-3.5">
              <span className="text-[10px] text-muted-foreground/50">+</span>
              <span className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate">{a.name}</span>
              {Number(a.rate) > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  ₹{fmtAmount(Number(a.rate))}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Special instruction (from representative) */}
      {representative.special_instruction && (
        <div className="flex items-start gap-1 px-3 pb-2 -mt-0.5">
          <HugeiconsIcon icon={StickyNote01Icon} size={9} strokeWidth={2} className="text-muted-foreground/50 mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground italic leading-snug">
            {representative.special_instruction}
          </p>
        </div>
      )}

      {/* KOT-wise void dialog */}
      {voidOpen && kotBatchesForDialog.length > 0 && (
        <VoidReasonDialog
          itemName={representative.item_name}
          kotBatches={kotBatchesForDialog}
          onConfirm={handleVoidConfirm}
          onClose={() => setVoidOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Order items area ─────────────────────────────────────────

function OrderItemsArea({ sessionId, items, isLoading, isDraft, isBillPrinted, lastAddedKey, onQtyEnter, onEditAddons }) {
  const [f6ItemKey, setF6ItemKey] = useState(null);

  const activeItems = (items ?? []).filter((i) => i.item_status !== "CANCELLED");

  // For the "can't leave an order with only complimentary items" guard:
  // how many active paid (non-comp) lines exist, and are there any comp lines.
  const hasCompLines  = activeItems.some((i) => i.is_complimentary);
  const paidLineCount = activeItems.filter((i) => !i.is_complimentary).length;

  // Group by menu_id, but split pending vs sent into separate rows when both exist.
  // Draft: always one group per menu_id.
  // Session: if an item has both sent and pending DB rows, show pending as its own
  // row (yellow dot) so the waiter can see what's not yet KOT'd. After KOT is sent
  // the pending row disappears and everything merges back into one sent row.
  const groups = useMemo(() => {
    if (isDraft) {
      const map = new Map();
      for (const item of activeItems) {
        // Complimentary draft lines key by their own id so a free line never
        // merges visually with a paid line of the same menu_id.
        const key = item.is_complimentary ? `comp:${item.id}` : (item.menu_id ?? item.id);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
      }
      return Array.from(map.entries());
    }

    // For real sessions: group by menu_id first, then split pending from sent
    const byMenu = new Map();
    for (const item of activeItems) {
      const key = item.menu_id ?? item.id;
      if (!byMenu.has(key)) byMenu.set(key, []);
      byMenu.get(key).push(item);
    }

    const sentRows    = [];
    const pendingRows = [];
    for (const [menuId, menuItems] of byMenu) {
      const sent    = menuItems.filter((i) => i.kot_status !== "PENDING");
      const pending = menuItems.filter((i) => i.kot_status === "PENDING");
      if (sent.length > 0)    sentRows.push([menuId,              sent]);
      else                    pendingRows.push([menuId,            pending]); // all-pending item (never been sent)
      if (sent.length > 0 && pending.length > 0) pendingRows.push([`${menuId}:pending`, pending]);
    }
    return [...sentRows, ...pendingRows];
  }, [activeItems, isDraft]);

  // F6 — target last-added group's key (pending row uses `menuId:pending` suffix)
  const lastItem    = activeItems.length > 0 ? activeItems[activeItems.length - 1] : null;
  const lastMenuId  = lastAddedKey ?? (lastItem?.menu_id ?? null);
  // If the last added item is pending and there are also sent items for the same menu,
  // point F6 at the pending row key so it targets the right row.
  const lastItemKey = useMemo(() => {
    if (!lastMenuId || isDraft) return lastMenuId;
    const hasSentForLastMenu = activeItems.some(
      (i) => (i.menu_id ?? i.id) === lastMenuId && i.kot_status !== "PENDING"
    );
    const hasPendingForLastMenu = activeItems.some(
      (i) => (i.menu_id ?? i.id) === lastMenuId && i.kot_status === "PENDING"
    );
    if (hasSentForLastMenu && hasPendingForLastMenu) return `${lastMenuId}:pending`;
    return lastMenuId;
  }, [lastMenuId, isDraft, activeItems]);

  const prevCountRef = useRef(activeItems.length);
  useEffect(() => {
    if (activeItems.length > prevCountRef.current) setF6ItemKey(null);
    prevCountRef.current = activeItems.length;
  }, [activeItems.length]);

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
      {groups.map(([groupKey, groupItems]) => {
        // Guard: an order can't be left with only complimentary (₹0) lines — it
        // would net ₹0 and couldn't be settled. So when comp lines exist, block
        // removing the last remaining paid line.
        const isCompGroup    = groupItems.some((i) => i.is_complimentary);
        const isLastPaidLine = !isCompGroup && hasCompLines && paidLineCount <= 1;
        return (
          <MergedOrderItemRow
            key={groupKey}
            group={groupItems}
            sessionId={sessionId}
            isDraft={isDraft}
            isBillPrinted={isBillPrinted}
            isActive={lastItemKey === groupKey}
            isF6Active={f6ItemKey === groupKey}
            onF6Close={() => setF6ItemKey(null)}
            onQtyEnter={onQtyEnter}
            onEditAddons={onEditAddons}
            blockRemove={isLastPaidLine}
          />
        );
      })}
    </div>
  );
}

// ─── Bill totals section ──────────────────────────────────────

function BillTotals({ items, sessionDisc, menu }) {
  const [taxExpanded, setTaxExpanded] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [discExpanded, setDiscExpanded] = useState(false);

  const totals = useMemo(() => calcBillTotals(items ?? []), [items]);
  // Re-derive the discount amounts from the saved intent against the CURRENT
  // items so the totals stay live as items are added/removed (the saved
  // sessionDisc.catDiscAmts/billDiscAmt may be a stale snapshot).
  const liveDisc = useMemo(
    () => recalcSessionDisc(items ?? [], sessionDisc, menu) ?? sessionDisc,
    [items, sessionDisc, menu],
  );
  // Discount-before-tax engine: spreads the bill-level discount across items,
  // reduces each taxable base and recomputes tax at the item's own GST rate.
  const discTotals = useMemo(
    () => calcDiscountedTotals(items ?? [], liveDisc),
    [items, liveDisc],
  );

  // Per-category subtotals — ordered by first appearance
  const categoryTotals = useMemo(() => {
    const map = new Map(); // catId → { name, total }
    for (const item of items ?? []) {
      if (item.item_status !== "ACTIVE") continue;
      const catId   = item.category_id ?? "__none__";
      const catName = item.category_name ?? "Other";
      // Pre-tax amount — tax is shown separately in its own row below.
      const amt     = Number(item.taxable_amount) || 0;
      if (!map.has(catId)) map.set(catId, { name: catName, total: 0 });
      map.get(catId).total += amt;
    }
    return Array.from(map.values()).map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }));
  }, [items]);

  // Tax breakdown reflects the post-discount (GST-on-net) figures.
  const taxBreakdown = useMemo(
    () => calcTaxBreakdown(items ?? [], discTotals.perItem),
    [items, discTotals],
  );

  // Build catId → category name: from menu master first (covers draft items), then from order items
  const catNameMap = useMemo(() => {
    const map = {};
    for (const m of menu ?? []) {
      if (m.category_id != null && m.category_name) map[m.category_id] = m.category_name;
    }
    for (const item of items ?? []) {
      if (item.category_id != null && item.category_name) map[item.category_id] = item.category_name;
    }
    return map;
  }, [menu, items]);

  // Build per-category discount rows from the LIVE recomputed discount.
  const catDiscRows = useMemo(() => {
    if (!liveDisc?.catDiscAmts) return [];
    return Object.entries(liveDisc.catDiscAmts)
      .filter(([, amt]) => Number(amt) > 0)
      .map(([catId, amt]) => {
        const pctVal  = liveDisc.catRows?.[catId]?.value;
        const pct     = pctVal !== undefined ? Number(pctVal) : null;
        const name    = catNameMap[catId] ?? `Category ${catId}`;
        return { catId, amt: Number(amt), pct, name };
      });
  }, [liveDisc, catNameMap]);

  // Fallback to old shape fields so existing saved sessionDisc still renders
  const legacyDiscAmt = (liveDisc?.discAmt || 0) + (liveDisc?.foodDiscAmt || 0) + (liveDisc?.liquorDiscAmt || 0);
  const totalDiscAmt  = liveDisc
    ? ((liveDisc.totalCatDisc || 0) + (liveDisc.billDiscAmt || 0) || legacyDiscAmt)
    : 0;
  // Always use the LIVE net (recomputed from current items) so totals update as
  // items are added/removed — never the frozen sessionDisc.netAmt snapshot.
  const netAmount = discTotals.netAmount;
  const roundOff  = discTotals.roundOff;

  return (
    <div className="shrink-0 border-t bg-card">
      <div className="px-4 py-2.5 space-y-1.5">
        {/* Category subtotals — shown whenever there are items */}
        {categoryTotals.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setCatExpanded((p) => !p)}
              className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={StickyNote01Icon} size={10} strokeWidth={2} />
                Categories
              </span>
              <div className="flex items-center gap-1">
                <span className="tabular-nums text-foreground font-medium">
                  ₹{fmtAmount(totals.taxableAmount)}
                </span>
                <HugeiconsIcon icon={catExpanded ? ArrowUp01Icon : ArrowDown01Icon} size={10} strokeWidth={2} />
              </div>
            </button>
            {catExpanded && (
              <div className="pl-2 space-y-0.5">
                {categoryTotals.map((c) => (
                  <div key={c.name} className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{c.name}</span>
                    <span className="tabular-nums">₹{fmtAmount(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {totals.discountAmount > 0 && (
          <>
            <button
              type="button"
              onClick={() => setDiscExpanded((p) => !p)}
              className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
                Item Discounts
              </span>
              <div className="flex items-center gap-1">
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  -₹{fmtAmount(totals.discountAmount)}
                </span>
                <HugeiconsIcon icon={discExpanded ? ArrowUp01Icon : ArrowDown01Icon} size={10} strokeWidth={2} />
              </div>
            </button>
            {discExpanded && (
              <div className="pl-2 space-y-0.5">
                {(items ?? []).filter((i) => i.item_status === "ACTIVE" && Number(i.discount_amount) > 0).map((i) => (
                  <div key={i.id} className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{i.item_name}{i.discount_percent > 0 ? ` (${i.discount_percent}%)` : ""}</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(Number(i.discount_amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {discTotals.taxAmount > 0 && (
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
                  ₹{fmtAmount(discTotals.taxAmount)}
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
                    <span>{t.tax_name}{t.tax_percentage > 0 ? ` (${t.tax_percentage}%)` : ""}</span>
                    <span className="tabular-nums">₹{fmtAmount(t.tax_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Bill discount breakdown from the live recomputed discount */}
        {liveDisc && totalDiscAmt > 0 && (
          <>
            <button
              type="button"
              onClick={() => setDiscExpanded((p) => !p)}
              className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Discount01Icon} size={10} strokeWidth={2} />
                Discount
              </span>
              <div className="flex items-center gap-1">
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  -₹{fmtAmount(totalDiscAmt)}
                </span>
                <HugeiconsIcon icon={discExpanded ? ArrowUp01Icon : ArrowDown01Icon} size={10} strokeWidth={2} />
              </div>
            </button>
            {discExpanded && (
              <div className="pl-2 space-y-0.5">
                {/* New shape: per-category rows */}
                {catDiscRows.map(({ catId, amt, pct, name }) => (
                  <div key={catId} className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{name} Disc{pct != null && pct > 0 ? ` (${pct}%)` : ""}</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(amt)}</span>
                  </div>
                ))}
                {/* Legacy shape fallback */}
                {!liveDisc.catDiscAmts && liveDisc.foodDiscAmt > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Food Disc ({liveDisc.foodPct}%)</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(liveDisc.foodDiscAmt)}</span>
                  </div>
                )}
                {!liveDisc.catDiscAmts && liveDisc.liquorDiscAmt > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Liquor Disc ({liveDisc.liquorPct}%)</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(liveDisc.liquorDiscAmt)}</span>
                  </div>
                )}
                {liveDisc.billDiscAmt > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Bill Disc{liveDisc.billDiscPct > 0 ? ` (${liveDisc.billDiscPct}%)` : ""}</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(liveDisc.billDiscAmt)}</span>
                  </div>
                )}
                {liveDisc.sCharge > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Service Charge</span>
                    <span className="tabular-nums">+₹{fmtAmount(liveDisc.sCharge)}</span>
                  </div>
                )}
                {liveDisc.miscMinus > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Misc Deduct</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">-₹{fmtAmount(liveDisc.miscMinus)}</span>
                  </div>
                )}
                {liveDisc.misc > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Misc Add</span>
                    <span className="tabular-nums">+₹{fmtAmount(liveDisc.misc)}</span>
                  </div>
                )}
              </div>
            )}
          </>
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

function SessionTopBar({ session, sessionId, isDraft, draftOrderType, draftCovers, onSetDraftConfig, tableName }) {
  const updateInfo  = useUpdateSessionInfo(sessionId);
  const updateParty = useUpdateSessionParty(sessionId);
  const {
    draftCustomerId, draftCustomerName, draftCustomerMobile, draftWaiterName,
  } = useBillingContext();

  const currentOrderType = isDraft ? draftOrderType : session?.order_type;
  const currentCovers    = isDraft ? draftCovers    : (session?.covers ?? 1);
  const isClosed         = !isDraft && session?.session_status === "BILL_PRINTED";
  // Customer/waiter can still be assigned after bill is printed (until settled)
  const isPartyLocked    = !isDraft && session?.session_status === "SETTLED";

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
      <div className="flex items-center gap-2 px-3 py-2 min-w-0">
        <CustomerPicker
          customerId={customerId}
          customerName={customerName}
          customerMobile={customerMobile}
          disabled={isPartyLocked}
          onSelect={handleSelectCustomer}
        />
        <WaiterPicker
          waiterName={waiterName}
          disabled={isPartyLocked}
          onSelect={handleSelectWaiter}
        />
        {tableName && (
          <span className="text-sm font-bold tracking-tight shrink-0">{tableName}</span>
        )}

        {/* Covers — pushed to the right, never wraps */}
        {currentOrderType === ORDER_TYPE.DINE_IN && (
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <HugeiconsIcon icon={UserGroupIcon} size={13} strokeWidth={2} className="text-muted-foreground" />
            <button
              type="button"
              onClick={() => adjustCovers(-1)}
              disabled={isClosed || currentCovers <= 1}
              className="h-5 w-5 rounded border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-30"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={8} strokeWidth={2.5} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={currentCovers}
              disabled={isClosed}
              onChange={(e) => {
                const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                if (!isNaN(v) && v >= 1) {
                  if (isDraft) onSetDraftConfig({ covers: v });
                  else if (session) updateInfo.mutate({ sessionId, orderType: session.order_type, covers: v, customerName: session.customer_name ?? null });
                }
              }}
              className="w-8 h-5 text-center text-xs font-mono font-semibold tabular-nums border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary px-0.5 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
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
  items, billedItems, isLoadingItems,
  discountPercent,
  sessionDisc,
  menu,
  lastAddedKey,
  onQtyEnter,
  selectedTableName,
  onEditAddons,
}) {
  const tableName     = session?.table_name ?? selectedTableName ?? null;
  const isBillPrinted = !isDraft && session?.session_status === "BILL_PRINTED";
  // Totals widget shows only KOT-sent items (what will actually appear on the bill)
  const totalsItems   = billedItems ?? items;

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
        tableName={tableName}
      />

      {/* Order items (scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <OrderItemsArea
          sessionId={sessionId}
          items={items}
          isLoading={isLoadingItems}
          isDraft={isDraft}
          isBillPrinted={isBillPrinted}
          lastAddedKey={lastAddedKey}
          onQtyEnter={onQtyEnter}
          onEditAddons={onEditAddons}
        />
      </div>

      {/* Bill totals — based on KOT-sent items only */}
      <BillTotals
        items={totalsItems}
        discountPercent={discountPercent}
        sessionDisc={sessionDisc}
        menu={menu}
      />
    </div>
  );
}
