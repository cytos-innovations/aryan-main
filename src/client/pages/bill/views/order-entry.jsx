import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  PencilEdit01Icon,
  Clock01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

import { useBillingContext } from "../state/billing-context";
import {
  useSessionDetail,
  useMenuForBilling,
  useFloorView,
  useAddOrderItem,
  useCancelOrderSession,
  useUpdateSessionInfo,
  useOrderItems,
  useBillSummary,
  useSettleBill,
} from "../hooks/use-billing-queries";
import { billingService } from "../services/billing-service";
import { ORDER_TYPE, ORDER_TYPE_LABELS, BILLING_VIEW, BQK, PAYMENT_TYPE } from "../constants/billing";
import { selectItemRate, getReservationPhase, calcBillTotals } from "../utils/billing-calc";

import MenuCenterPanel, { pushRecentId } from "../panels/menu-center";
import OrderRightPanel from "../panels/order-right";
import BottomActionBar from "../panels/bottom-action-bar";
import SettleDialog    from "../panels/settle-dialog";

// ─── Helpers ──────────────────────────────────────────────────

function toUtcDate(since) {
  if (!since) return null;
  return new Date(since.replace(" ", "T") + "Z");
}

function calcElapsed(since, now) {
  const d = toUtcDate(since);
  if (!d) return null;
  const diff = now - d.getTime();
  if (diff < 0) return "0m";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 > 0 ? `${h}h ${m % 60}m` : `${h}h`;
}

function fmtTime(since) {
  const d = toUtcDate(since);
  if (!d) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Session status config ────────────────────────────────────

const SESSION_STATUS_CFG = {
  OPEN:         { label: "Open",         cls: "bg-amber-100  text-amber-700  dark:bg-amber-900/50  dark:text-amber-300"  },
  KOT_SENT:     { label: "KOT Sent",     cls: "bg-blue-100   text-blue-700   dark:bg-blue-900/50   dark:text-blue-300"   },
  BILL_PRINTED: { label: "Bill Printed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
};

const ORDER_TYPE_CFG = {
  DINE_IN:  { label: "Dine In",  cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  DELIVERY: { label: "Delivery", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  PICKUP:   { label: "Pickup",   cls: "bg-sky-100    text-sky-700    dark:bg-sky-900/50    dark:text-sky-300"    },
};

// ─── Edit Session Dialog ──────────────────────────────────────

function EditSessionDialog({ session, sessionId, open, onOpenChange }) {
  const [form, setForm] = useState({ orderType: ORDER_TYPE.DINE_IN, covers: "1", customerName: "" });
  const updateMut = useUpdateSessionInfo(sessionId);

  useEffect(() => {
    if (open && session) {
      setForm({
        orderType:    session.order_type    ?? ORDER_TYPE.DINE_IN,
        covers:       String(session.covers ?? 1),
        customerName: session.customer_name ?? "",
      });
    }
  }, [open, session]);

  function handleSubmit(e) {
    e.preventDefault();
    const covers = parseInt(form.covers, 10);
    if (!covers || covers < 1) { toast.error("Covers must be ≥ 1"); return; }
    updateMut.mutate(
      { sessionId, orderType: form.orderType, covers, customerName: form.customerName.trim() || null },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Session — {session?.order_no}</DialogTitle>
          <DialogDescription>Update order type, covers, or guest name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Order Type</FieldLabel>
              <Select value={form.orderType} onValueChange={(v) => setForm((f) => ({ ...f, orderType: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_TYPE_LABELS).map(([k, lbl]) => (
                    <SelectItem key={k} value={k}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Covers</FieldLabel>
                <Input type="number" min="1" max="99" value={form.covers}
                  onChange={(e) => setForm((f) => ({ ...f, covers: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>
                  Guest Name{" "}
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </FieldLabel>
                <Input value={form.customerName} maxLength={100}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="Guest / company" />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Session header bar ───────────────────────────────────────

function SessionHeader({ session, isDraft, selectedTableName, onBack, onEdit }) {
  const now        = useNow();
  const elapsed    = useMemo(() => calcElapsed(session?.opened_at, now), [session?.opened_at, now]);
  const openedTime = useMemo(() => fmtTime(session?.opened_at),          [session?.opened_at]);

  const statusCfg = SESSION_STATUS_CFG[session?.session_status] ?? SESSION_STATUS_CFG.OPEN;
  const orderCfg  = session?.order_type ? ORDER_TYPE_CFG[session.order_type] : null;
  const isClosed  = session?.session_status === "BILL_PRINTED";

  const tableName = session?.table_name ?? selectedTableName ?? "No Table";

  return (
    <div className={[
      "shrink-0 border-b px-3 py-2",
      isClosed ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-card",
    ].join(" ")}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Back */}
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2 -ml-1.5" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={13} strokeWidth={2} />
          Tables
        </Button>

        <Separator orientation="vertical" className="h-4" />

        {/* Table name */}
        <span className="font-semibold text-sm">{tableName}</span>
        {session?.order_no && (
          <span className="text-xs text-muted-foreground font-mono">{session.order_no}</span>
        )}

        {/* Status pills */}
        {isDraft ? (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Draft
          </span>
        ) : (
          <>
            {orderCfg && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${orderCfg.cls}`}>
                {orderCfg.label}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          </>
        )}

        <div className="flex-1" />

        {/* Timer */}
        {!isDraft && elapsed && openedTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
            <span>{openedTime} · {elapsed}</span>
          </div>
        )}

        {/* Edit */}
        {!isDraft && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs px-2"
            onClick={onEdit}
            disabled={isClosed || !session}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Error / recovery ─────────────────────────────────────────

function SessionError({ message, onBack }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground p-8">
      <HugeiconsIcon icon={AlertCircleIcon} size={40} strokeWidth={1.5} className="text-destructive/50" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Session unavailable</p>
        <p className="text-xs mt-1 max-w-xs">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} className="mr-1" />
        Back to Tables
      </Button>
    </div>
  );
}

// ─── Main workspace ───────────────────────────────────────────

export default function OrderEntryView() {
  const {
    activeSessionId,
    selectedTableId,
    selectedTableName,
    draftItems,
    draftOrderType,
    draftCovers,
    draftApplicableRate,
    draftCustomerName,
    draftCustomerId,
    draftWaiterId,
    addDraftItem,
    updateDraftQty,
    removeDraftItem,
    setDraftConfig,
    clearSession,
    setView,
    paymentEntries,
  } = useBillingContext();

  const qc  = useQueryClient();
  const now = useNow();

  const [editOpen,        setEditOpen]        = useState(false);
  const [cancelOpen,      setCancelOpen]      = useState(false);
  const [settleOpen,      setSettleOpen]      = useState(false);
  const [addingId,        setAddingId]        = useState(null);
  const [isKotting,       setIsKotting]       = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  const isDraft = !activeSessionId;

  // ── Queries ───────────────────────────────────────────────
  const sessionQuery = useSessionDetail(activeSessionId);
  const menuQuery    = useMenuForBilling();
  const floorQuery   = useFloorView();
  const cancelMut    = useCancelOrderSession();
  const addItemMut   = useAddOrderItem(activeSessionId);

  // Lifted from OrderRightPanel
  const itemsQuery   = useOrderItems(activeSessionId);
  const billSummary  = useBillSummary(activeSessionId);
  const settleBillMut = useSettleBill(activeSessionId);

  // Reservation guard
  const isNearReservation = useMemo(() => {
    if (!selectedTableId) return false;
    const table = (floorQuery.data ?? []).find((t) => t.id === selectedTableId);
    if (!table) return false;
    return getReservationPhase(table, now) === "NEAR";
  }, [floorQuery.data, selectedTableId, now]);

  const session        = sessionQuery.data;
  const menu           = menuQuery.data ?? [];
  const isMenuLoading  = menuQuery.isLoading;
  const applicableRate = isDraft ? draftApplicableRate : (session?.applicable_rate ?? 1);

  // Resolved items (draft uses context, session uses DB query)
  const items          = isDraft ? (draftItems ?? []) : (itemsQuery.data ?? []);
  const isLoadingItems = !isDraft && itemsQuery.isLoading;
  const billId         = billSummary.data?.bill_id ?? null;

  // Net amount calculation (needed by BottomActionBar + passed to right panel)
  const totals    = useMemo(() => calcBillTotals(items), [items]);
  const billDisc  = Math.round((totals.finalAmount * (Number(discountPercent) || 0)) / 100 * 100) / 100;
  const afterDisc = Math.round((totals.finalAmount - billDisc) * 100) / 100;
  const roundOff  = Math.round(afterDisc) - afterDisc;
  const netAmount = afterDisc + roundOff;

  // ── Actions ───────────────────────────────────────────────

  function handleBack() {
    clearSession();
    setView(BILLING_VIEW.TABLE_SELECT);
  }

  function handleConfirmCancel() {
    if (isDraft) {
      setCancelOpen(false);
      clearSession();
      setView(BILLING_VIEW.TABLE_SELECT);
      return;
    }
    if (!activeSessionId) return;
    cancelMut.mutate(
      { sessionId: activeSessionId, remarks: "Cancelled from order screen" },
      {
        onSuccess: () => {
          setCancelOpen(false);
          clearSession();
          setView(BILLING_VIEW.TABLE_SELECT);
        },
      },
    );
  }

  function handleAddItem(menuItem) {
    if (isDraft) {
      const rate = selectItemRate(menuItem, applicableRate);
      addDraftItem(menuItem, rate);
      pushRecentId(menuItem.id);
      return;
    }
    if (!activeSessionId || !session) return;
    setAddingId(menuItem.id);
    addItemMut.mutate(
      { sessionId: activeSessionId, menuId: menuItem.id, quantity: 1, specialInstruction: null },
      {
        onSuccess: () => { pushRecentId(menuItem.id); setAddingId(null); },
        onError:   () => setAddingId(null),
      },
    );
  }

  function handleSettle(entries, customer, writeOffAmount = 0) {
    if (!billId || !entries.length) return;
    const isPartPayment = entries.length > 1;
    const paymentType   = isPartPayment ? PAYMENT_TYPE.PART : entries[0].payment_mode;
    const paymentAmount = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const referenceNo   = isPartPayment ? null : (entries[0]?.reference_no ?? null);
    const partPayments  = isPartPayment ? entries : [];
    settleBillMut.mutate(
      {
        sessionId: activeSessionId, billId, paymentType, paymentAmount,
        referenceNo, partPayments, writeOffAmount: writeOffAmount ?? 0,
        customerName:    customer?.name    ?? null,
        customerMobile:  customer?.mobile  ?? null,
        customerAddress: customer?.address ?? null,
      },
      { onSuccess: clearSession },
    );
  }

  // KOT for draft mode: create session → add items → generate KOT → back to floor
  async function handleKotDraft() {
    if (draftItems.length === 0) {
      toast.error("Add at least one item before sending KOT");
      return;
    }
    if (isNearReservation) {
      toast.error("This table has an upcoming reservation. KOT cannot be created before reservation time.");
      return;
    }

    const tableData      = (floorQuery.data ?? []).find((t) => t.id === selectedTableId);
    const resPhase       = tableData ? getReservationPhase(tableData, now) : null;
    const reservationId  = resPhase === "ARRIVED" ? (tableData?.reservation_id ?? null)   : null;
    const reservWaiterId = resPhase === "ARRIVED" ? (tableData?.reservation_preferred_waiter ?? null) : null;

    setIsKotting(true);
    try {
      const sessionId = await billingService.openOrderSession({
        tableId:       selectedTableId ?? null,
        orderType:     draftOrderType,
        covers:        draftCovers,
        customerId:    draftCustomerId ?? null,
        // Manually assigned waiter takes priority over reservation's preferred waiter
        waiterId:      draftWaiterId ?? reservWaiterId,
        reservationId,
        customerName:  draftCustomerName ?? null,
      });

      // Add each item; capture the new order_item id so KOT messages can be attached
      const newItemIds = await Promise.all(draftItems.map((item) =>
        billingService.addOrderItem({
          sessionId,
          menuId:             item.menu_id,
          quantity:           item.quantity,
          specialInstruction: item.special_instruction ?? null,
        }),
      ));

      // Persist any draft KOT messages into order_item_modifier
      await Promise.all(draftItems.map((item, idx) =>
        item.kot_message
          ? billingService.addOrderItemModifier(newItemIds[idx], item.kot_message)
          : null,
      ).filter(Boolean));

      await billingService.generateKot(sessionId, null);

      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });

      toast.success("KOT generated");
      clearSession();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsKotting(false);
    }
  }

  // Guards
  useEffect(() => {
    if (!selectedTableId && !activeSessionId) handleBack();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId, activeSessionId]);

  useEffect(() => {
    if (!isDraft && sessionQuery.isError && !sessionQuery.isFetching) {
      toast.error("Session could not be loaded. Returning to floor view.");
    }
  }, [isDraft, sessionQuery.isError, sessionQuery.isFetching]);

  if (!isDraft && !activeSessionId) return null;

  if (!isDraft && sessionQuery.isError) {
    return (
      <div className="flex flex-col h-full">
        <SessionError
          message={String(sessionQuery.error ?? "Session not found or was deleted.")}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top header bar ── */}
      <SessionHeader
        session={session}
        isDraft={isDraft}
        selectedTableName={selectedTableName}
        onBack={handleBack}
        onEdit={() => setEditOpen(true)}
      />

      {/* ── Main body: center+right workspace ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* CENTER + RIGHT + BOTTOM ACTION BAR */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Top panels: center (menu) + right (order) */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* CENTER — item grid */}
            <div className="flex-1 overflow-hidden bg-background h-full">
              <MenuCenterPanel
                menu={menu}
                isLoading={isMenuLoading}
                onAddItem={handleAddItem}
                applicableRate={applicableRate}
                addingId={addingId}
              />
            </div>

            {/* RIGHT — order panel */}
            <div className="shrink-0 w-[42%] max-w-150 min-w-105 border-l overflow-hidden h-full">
              <OrderRightPanel
                session={session}
                sessionId={activeSessionId}
                isDraft={isDraft}
                draftOrderType={draftOrderType}
                draftCovers={draftCovers}
                onSetDraftConfig={setDraftConfig}
                items={items}
                isLoadingItems={isLoadingItems}
                discountPercent={discountPercent}
              />
            </div>
          </div>

          {/* BOTTOM ACTION BAR — spans center + right */}
          <BottomActionBar
            sessionId={activeSessionId}
            session={session}
            items={items}
            isDraft={isDraft}
            isKotting={isKotting}
            isNearReservation={isNearReservation}
            netAmount={netAmount}
            billId={billId}
            isSettling={settleBillMut.isPending}
            onRequestSettle={() => setSettleOpen(true)}
            settleDialogOpen={settleOpen}
            onKotDraft={handleKotDraft}
            onCancel={() => setCancelOpen(true)}
            discountPercent={discountPercent}
            onDiscountChange={setDiscountPercent}
          />
        </div>
      </div>

      {/* ── Settle dialog ── */}
      {!isDraft && (
        <SettleDialog
          open={settleOpen}
          onOpenChange={setSettleOpen}
          session={session}
          netAmount={netAmount}
          onSettle={handleSettle}
          isSettling={settleBillMut.isPending}
        />
      )}

      {/* ── Edit dialog ── */}
      {!isDraft && (
        <EditSessionDialog
          session={session}
          sessionId={activeSessionId}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {/* ── Cancel confirm ── */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isDraft ? "Discard Draft?" : "Cancel Order?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isDraft
                ? "This will discard all draft items. Nothing has been saved to the database."
                : (session?.item_count ?? 0) > 0
                  ? `This will void all ${session.item_count} item${session.item_count !== 1 ? "s" : ""} and release the table. This cannot be undone.`
                  : "This will close the session and release the table."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isDraft ? "Keep Draft" : "Keep Order"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmCancel}
              disabled={cancelMut.isPending}
            >
              {isDraft ? "Discard" : cancelMut.isPending ? "Cancelling…" : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
