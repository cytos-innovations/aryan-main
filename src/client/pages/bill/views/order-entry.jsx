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
} from "../hooks/use-billing-queries";
import { billingService } from "../services/billing-service";
import { ORDER_TYPE, ORDER_TYPE_LABELS, BILLING_VIEW, BQK } from "../constants/billing";
import { selectItemRate, getReservationPhase } from "../utils/billing-calc";

import MenuLeftPanel   from "../panels/menu-left";
import MenuCenterPanel, { pushRecentId } from "../panels/menu-center";
import OrderRightPanel from "../panels/order-right";

// ─── Helpers ──────────────────────────────────────────────────────

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

// ─── Session status config ────────────────────────────────────────

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

// ─── Edit Session Dialog ──────────────────────────────────────────

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

// ─── Session header bar ───────────────────────────────────────────

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

        {/* Timer — only when session exists */}
        {!isDraft && elapsed && openedTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
            <span>{openedTime} · {elapsed}</span>
          </div>
        )}

        {/* Edit — only for existing sessions */}
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

// ─── Error / recovery ─────────────────────────────────────────────

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

// ─── Main workspace ───────────────────────────────────────────────

export default function OrderEntryView() {
  const {
    activeSessionId,
    selectedTableId,
    selectedTableName,
    draftItems,
    draftOrderType,
    draftCovers,
    draftApplicableRate,
    addDraftItem,
    updateDraftQty,
    removeDraftItem,
    setDraftConfig,
    clearSession,
    setView,
  } = useBillingContext();

  const qc  = useQueryClient();
  const now = useNow();

  const [editOpen,   setEditOpen]   = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addingId,   setAddingId]   = useState(null);
  const [isKotting,  setIsKotting]  = useState(false);

  // true = no DB session yet; user is browsing/adding items locally
  const isDraft = !activeSessionId;

  const sessionQuery = useSessionDetail(activeSessionId);
  const menuQuery    = useMenuForBilling();
  const floorQuery   = useFloorView();
  const cancelMut    = useCancelOrderSession();
  const addItemMut   = useAddOrderItem(activeSessionId);

  // Reservation guard: true when selected table is within 10 min of its reservation time.
  // Uses cached floor view (refetches every 30 s) + 60 s now-tick for reactivity.
  const isNearReservation = useMemo(() => {
    if (!selectedTableId) return false;
    const table = (floorQuery.data ?? []).find((t) => t.id === selectedTableId);
    if (!table) return false;
    return getReservationPhase(table, now) === "NEAR";
  }, [floorQuery.data, selectedTableId, now]);

  const session         = sessionQuery.data;
  const menu            = menuQuery.data ?? [];
  const isMenuLoading   = menuQuery.isLoading;
  const applicableRate  = isDraft ? draftApplicableRate : (session?.applicable_rate ?? 1);

  function handleBack() {
    clearSession();
    setView(BILLING_VIEW.TABLE_SELECT);
  }

  function handleConfirmCancel() {
    if (isDraft) {
      // Nothing was written to DB — just discard
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
      // Store in context — no DB call
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
    setIsKotting(true);
    try {
      const sessionId = await billingService.openOrderSession({
        tableId:    selectedTableId ?? null,
        orderType:  draftOrderType,
        covers:     draftCovers,
        customerId: null,
        waiterId:   null,
      });

      // Add all draft items in parallel
      await Promise.all(draftItems.map((item) =>
        billingService.addOrderItem({
          sessionId,
          menuId:             item.menu_id,
          quantity:           item.quantity,
          specialInstruction: item.special_instruction ?? null,
        }),
      ));

      // Generate KOT
      await billingService.generateKot(sessionId, null);

      // Refresh floor view so the table turns amber immediately
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

  // Guard: if no table is selected at all, go back to floor
  useEffect(() => {
    if (!selectedTableId && !activeSessionId) handleBack();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId, activeSessionId]);

  // Auto-recover if existing session disappears
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

      {/* ── 3-panel body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT — category / group nav */}
        <div className="shrink-0 w-40 border-r overflow-hidden bg-sidebar h-full">
          <MenuLeftPanel menu={menu} isLoading={isMenuLoading} />
        </div>

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
        <div className="shrink-0 w-100 xl:w-115 border-l overflow-hidden h-full">
          <OrderRightPanel
            session={session}
            sessionId={activeSessionId}
            isDraft={isDraft}
            draftItems={draftItems}
            draftOrderType={draftOrderType}
            draftCovers={draftCovers}
            onSetDraftConfig={setDraftConfig}
            onUpdateDraftQty={updateDraftQty}
            onRemoveDraftItem={removeDraftItem}
            onKotDraft={handleKotDraft}
            isKotting={isKotting}
            isNearReservation={isNearReservation}
            onCancelSession={() => setCancelOpen(true)}
          />
        </div>
      </div>

      {/* ── Edit dialog (existing sessions only) ── */}
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
