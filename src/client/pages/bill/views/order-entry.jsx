import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Clock01Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

import { useBillingContext } from "../state/billing-context";
import {
  useSessionDetail,
  useMenuForBilling,
  useFloorView,
  useAddOrderItem,
  useCancelOrderSession,
  useOrderItems,
  useBillSummary,
  useSettleBill,
  useBillingAddons,
  useCreateCustomAddon,
  useUpdateOrderItemAddons,
  useUpdateReservationStatus,
  useCancelReservation,
  useEmployeesForBilling,
} from "../hooks/use-billing-queries";
import { billingService } from "../services/billing-service";
import { ORDER_TYPE, BILLING_VIEW, BQK, PAYMENT_TYPE } from "../constants/billing";
import { saveHold, clearHold } from "../utils/hold-storage";
import { selectItemRate, getReservationPhase, calcBillTotals, buildMenuLookups, buildCategories } from "../utils/billing-calc";

import MenuCenterPanel, { pushRecentId } from "../panels/menu-center";
import OrderRightPanel from "../panels/order-right";
import BottomActionBar from "../panels/bottom-action-bar";
import SettleDialog    from "../panels/settle-dialog";
import AddonDialog     from "../panels/addon-dialog";

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

// "HH:MM" (24h) → "h:MM AM/PM"
function fmtResTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return "";
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
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

// ─── Session header bar ───────────────────────────────────────

function SessionHeader({ session, isDraft, selectedTableName, onBack, pendingReservation, onArrivedPrefill }) {
  const now        = useNow();
  const elapsed    = useMemo(() => calcElapsed(session?.opened_at, now), [session?.opened_at, now]);
  const openedTime = useMemo(() => fmtTime(session?.opened_at),          [session?.opened_at]);

  const resStatusMut = useUpdateReservationStatus();
  const cancelResMut = useCancelReservation();
  const [confirmCancelRes, setConfirmCancelRes] = useState(false);
  const resPending   = resStatusMut.isPending || cancelResMut.isPending;

  const statusCfg = SESSION_STATUS_CFG[session?.session_status] ?? SESSION_STATUS_CFG.OPEN;
  const orderCfg  = session?.order_type ? ORDER_TYPE_CFG[session.order_type] : null;
  const isClosed  = session?.session_status === "BILL_PRINTED";

  const tableName = session?.table_name ?? selectedTableName ?? "No Table";

  function handleResStatus(status) {
    if (!pendingReservation) return;
    // Copy guest name + preferred waiter into the draft pickers on arrival.
    if (status === "ARRIVED" && isDraft) onArrivedPrefill?.(pendingReservation);
    resStatusMut.mutate({ reservationId: pendingReservation.id, status });
  }
  function handleCancelRes() {
    if (!pendingReservation) return;
    cancelResMut.mutate(pendingReservation.id, { onSuccess: () => setConfirmCancelRes(false) });
  }

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

        {/* Reservation actions — when the selected table is RESERVED */}
        {pendingReservation && (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-300 mr-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="font-medium truncate max-w-35">{pendingReservation.customerName ?? "Reserved"}</span>
              {pendingReservation.time ? <span className="text-muted-foreground">· {fmtResTime(pendingReservation.time)}</span> : null}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
              onClick={() => handleResStatus("ARRIVED")}
              disabled={resPending}
            >
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} strokeWidth={2} />
              Arrived
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/30"
              onClick={() => handleResStatus("NO_SHOW")}
              disabled={resPending}
            >
              <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
              No Show
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 shrink-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmCancelRes(true)}
              disabled={resPending}
              title="Cancel reservation"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} />
            </Button>
            <Separator orientation="vertical" className="h-4" />
          </div>
        )}

        {/* Timer */}
        {!isDraft && elapsed && openedTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
            <span>{openedTime} · {elapsed}</span>
          </div>
        )}

      </div>

      {/* Cancel reservation confirmation */}
      <AlertDialog open={confirmCancelRes} onOpenChange={(o) => { if (!o) setConfirmCancelRes(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel the reservation for{" "}
              <span className="font-medium text-foreground">{pendingReservation?.customerName ?? "this guest"}</span>
              {tableName ? ` at ${tableName}` : ""}? The table will be released back to available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelRes}
              disabled={cancelResMut.isPending}
            >
              {cancelResMut.isPending ? "Cancelling…" : "Cancel Reservation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    isRestoredFromHold,
    addDraftItem,
    updateDraftQty,
    removeDraftItem,
    setDraftItemAddons,
    setDraftConfig,
    clearSession,
    setView,
    paymentEntries,
  } = useBillingContext();

  const qc  = useQueryClient();
  const now = useNow();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [addingId,   setAddingId]   = useState(null);
  const [isKotting,  setIsKotting]  = useState(false);
  // Add-on dialog target:
  //   { mode: "add",  menuItem }            → choosing add-ons while adding an item
  //   { mode: "edit", menuItem, orderItem } → editing add-ons on an existing line
  const [addonTarget, setAddonTarget] = useState(null);

  // Discount keyed strictly by DB sessionId (never by "draft").
  // Draft orders start fresh every time — no persistence needed.
  // Real sessions persist in localStorage until settled.
  const discKey = activeSessionId ? `pos-disc:${activeSessionId}` : null;

  const [sessionDisc, setSessionDiscState] = useState(() => {
    if (!activeSessionId) return null; // draft = always fresh
    try { return JSON.parse(localStorage.getItem(`pos-disc:${activeSessionId}`)) ?? null; }
    catch { return null; }
  });

  // Re-read from localStorage when switching to a different real session
  useEffect(() => {
    if (!activeSessionId) { setSessionDiscState(null); return; }
    try { setSessionDiscState(JSON.parse(localStorage.getItem(`pos-disc:${activeSessionId}`)) ?? null); }
    catch { setSessionDiscState(null); }
  }, [activeSessionId]);

  function saveSessionDisc(disc) {
    if (activeSessionId) {
      // Real session — persist to localStorage so it survives bill generation + table switch
      try { localStorage.setItem(`pos-disc:${activeSessionId}`, JSON.stringify(disc)); }
      catch { /* storage full — silent */ }
    }
    setSessionDiscState(disc);
  }

  const discountPercent = sessionDisc?.discPct ?? 0;
  // Tracks which item row should auto-focus qty (key = menu_id for draft, item.id for session)
  const [lastAddedKey,    setLastAddedKey]    = useState(null);
  const searchRefHandle                       = useRef(null); // set by MenuCenterPanel via onSearchRef

  function focusSearch() {
    setLastAddedKey(null);
    setTimeout(() => searchRefHandle.current?.current?.focus(), 30);
  }

  const isDraft = !activeSessionId;

  // ── Queries ───────────────────────────────────────────────
  const sessionQuery = useSessionDetail(activeSessionId);
  const menuQuery    = useMenuForBilling();
  const floorQuery     = useFloorView();
  const employeesQuery = useEmployeesForBilling();
  const cancelMut    = useCancelOrderSession();
  const addItemMut   = useAddOrderItem(activeSessionId);

  // Lifted from OrderRightPanel
  const itemsQuery   = useOrderItems(activeSessionId);
  const billSummary  = useBillSummary(activeSessionId);
  const settleBillMut = useSettleBill(activeSessionId);

  // Add-ons
  const addonsQuery     = useBillingAddons();
  const createAddonMut  = useCreateCustomAddon();
  const updateAddonsMut = useUpdateOrderItemAddons(activeSessionId);
  const allAddons       = addonsQuery.data ?? [];

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

  // Active reservation on the selected table (RESERVED only) — surfaced in the
  // order header so staff can mark Arrived / No Show / Cancel without opening
  // the Reservations panel.
  const pendingReservation = useMemo(() => {
    if (!selectedTableId) return null;
    const table = (floorQuery.data ?? []).find((t) => t.id === selectedTableId);
    if (!table?.reservation_id || table.reservation_status !== "RESERVED") return null;
    return {
      id:           table.reservation_id,
      customerName: table.reservation_customer ?? null,
      time:         table.reservation_time ?? null,
      guestCount:   table.reservation_guest_count ?? null,
      waiterId:     table.reservation_preferred_waiter ?? null,
    };
  }, [floorQuery.data, selectedTableId]);

  // When a reservation guest is marked Arrived from the header, copy the
  // reservation's customer name + preferred waiter into the draft so they show
  // in the right-panel Customer / Waiter pickers (and carry into the session).
  const handleArrivedPrefill = useCallback((res) => {
    if (!res) return;
    const cfg = {};
    if (res.customerName) cfg.customerName = res.customerName;
    if (res.guestCount)   cfg.covers       = res.guestCount;
    if (res.waiterId != null) {
      const emp = (employeesQuery.data ?? []).find((e) => e.id === res.waiterId);
      cfg.waiterId   = res.waiterId;
      cfg.waiterName = emp?.name ?? null;
    }
    if (Object.keys(cfg).length > 0) setDraftConfig(cfg);
  }, [employeesQuery.data, setDraftConfig]);

  // Resolved items (draft uses context, session uses DB query)
  const items          = isDraft ? (draftItems ?? []) : (itemsQuery.data ?? []);
  const isLoadingItems = !isDraft && itemsQuery.isLoading;
  const billId         = billSummary.data?.bill_id ?? null;

  // For billing/settlement: only KOT-sent items count. Pending items stay in the order
  // but are excluded from the bill total and settle amount.
  const sentItems = useMemo(
    () => isDraft ? items : (items ?? []).filter((i) => i.kot_status !== "PENDING" && i.item_status === "ACTIVE"),
    [isDraft, items],
  );

  // Net amount calculation (needed by BottomActionBar + passed to right panel)
  // Uses sentItems so pending (un-KOT'd) items don't inflate the bill total.
  const totals    = useMemo(() => calcBillTotals(sentItems), [sentItems]);
  const billDisc  = Math.round((totals.finalAmount * (Number(discountPercent) || 0)) / 100 * 100) / 100;
  const afterDisc = Math.round((totals.finalAmount - billDisc) * 100) / 100;
  const roundOff  = Math.round(afterDisc) - afterDisc;
  // Use the full saved netAmt (incl. misc, service charge, etc.) when available
  const netAmount = sessionDisc?.netAmt ?? (afterDisc + roundOff);

  // Auto-apply category auto_discount whenever items or menu change.
  // Only updates categories that the user hasn't manually touched (their value matches auto_discount).
  useEffect(() => {
    if (!menu.length || !items.length) return;
    const { menuIdToCatId, catIdToInfo } = buildMenuLookups(menu);
    const cats = buildCategories(items, menuIdToCatId, catIdToInfo);
    const hasAuto = cats.some(c => c.auto_discount > 0 && c.allow_discount);
    if (!hasAuto) return;

    const saved = sessionDisc?.catRows ?? {};
    const catRows = {};
    for (const cat of cats) {
      const savedVal = saved[cat.id]?.value;
      // Keep user's manual value if set; otherwise use auto_discount
      catRows[cat.id] = {
        value: savedVal !== undefined ? savedVal : String(cat.auto_discount > 0 ? cat.auto_discount : 0),
      };
    }

    // Compute discount amounts and net
    let totalCatDisc = 0;
    const catDiscAmts = {};
    for (const cat of cats) {
      const val = parseFloat(catRows[cat.id]?.value) || 0;
      const catMax = cat.max_discount != null ? cat.max_discount : 100;
      const cap = cat.allow_discount ? catMax : 0;
      const disc = Math.round((cat.total * Math.min(val, cap)) / 100 * 100) / 100;
      catDiscAmts[cat.id] = disc;
      totalCatDisc += disc;
    }
    totalCatDisc = Math.round(totalCatDisc * 100) / 100;

    const misc         = Number(sessionDisc?.misc)         || 0;
    const miscMinus    = Number(sessionDisc?.miscMinus)    || 0;
    const sCharge      = Number(sessionDisc?.sCharge)      || 0;
    const billDiscPct  = Number(sessionDisc?.billDiscPct)  || 0;
    const afterCatDisc = Math.round((totals.finalAmount - totalCatDisc) * 100) / 100;
    const billDiscAmt  = Math.round(afterCatDisc * billDiscPct / 100 * 100) / 100;
    const newNet       = Math.round((afterCatDisc - billDiscAmt + misc - miscMinus + sCharge) * 100) / 100;
    const discPct      = totals.finalAmount > 0
      ? Math.round(((totalCatDisc + billDiscAmt) / totals.finalAmount) * 10000) / 100
      : 0;

    saveSessionDisc({
      ...(sessionDisc ?? {}),
      discMode:     sessionDisc?.discMode ?? "pct",
      catRows,
      catDiscAmts,
      totalCatDisc,
      billDiscAmt,
      netAmt:       newNet,
      discPct,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, menu]);

  // ── Actions ───────────────────────────────────────────────

  // Auto-hold current draft when navigating back to table view
  function handleBack() {
    if (isDraft && selectedTableId && draftItems.length > 0) {
      saveHold(selectedTableId, {
        draftItems,
        draftOrderType,
        draftCovers,
        draftApplicableRate,
        draftCustomerName,
        draftCustomerId,
        draftWaiterId,
      });
    }
    clearSession();
    setView(BILLING_VIEW.TABLE_SELECT);
  }

  // Hold button:
  // • Normal draft  → save to hold and go back (same as Back)
  // • Restored from hold → RELEASE: clear hold, go back WITHOUT re-saving
  function handleHold() {
    if (isRestoredFromHold && selectedTableId) {
      clearHold(selectedTableId);
      clearSession();
      setView(BILLING_VIEW.TABLE_SELECT);
    } else {
      handleBack();
    }
  }

  function handleConfirmCancel() {
    if (isDraft) {
      // Discard Draft: explicitly clear any saved hold state for this table
      if (selectedTableId) clearHold(selectedTableId);
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

  // Entry point from the menu grid. If the item offers add-ons, prompt for them;
  // otherwise add instantly (fast path unchanged).
  function handleAddItem(menuItem) {
    if (!isDraft && session?.session_status === "BILL_PRINTED") return;
    if (menuItem.addons?.length > 0) {
      setAddonTarget({ mode: "add", menuItem });
      return;
    }
    commitAddItem(menuItem, []);
  }

  // Open the add-on dialog to edit an EXISTING (pending) order line's add-ons.
  // group = the merged row's items; representative carries menu_id/item_name/addons.
  function handleEditAddons(orderItem) {
    if (!orderItem) return;
    // Resolve the menu master row so the dialog knows the base rate + suggested add-ons.
    const menuItem = menu.find((m) => m.id === orderItem.menu_id) ?? {
      id: orderItem.menu_id,
      item_name: orderItem.item_name,
      food_type: orderItem.food_type,
      addons: [],
      rate_1: orderItem.rate, rate_2: orderItem.rate, rate_3: orderItem.rate,
      rate_4: orderItem.rate, rate_5: orderItem.rate,
    };
    setAddonTarget({ mode: "edit", menuItem, orderItem });
  }

  // Actually add the item, optionally with chosen add-ons. addons = [{ menuId, name, rate }]
  function commitAddItem(menuItem, addons) {
    if (isDraft) {
      const rate = selectItemRate(menuItem, applicableRate);
      addDraftItem(menuItem, rate, addons);
      pushRecentId(menuItem.id);
      setLastAddedKey(menuItem.id); // menu_id for draft rows
      return;
    }
    if (!activeSessionId || !session) return;
    setAddingId(menuItem.id);
    addItemMut.mutate(
      { sessionId: activeSessionId, menuId: menuItem.id, quantity: 1, specialInstruction: null, addons },
      {
        onSuccess: () => {
          pushRecentId(menuItem.id);
          setAddingId(null);
          setLastAddedKey(menuItem.id); // use menu_id as key for both draft and session rows
        },
        onError: () => setAddingId(null),
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
      {
        onSuccess: () => {
          // Clear persisted discount after successful settlement
          if (discKey) { try { localStorage.removeItem(discKey); } catch { /* ignore */ } }
          clearSession();
        },
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
          addons:             item.addons ?? [],
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

      // Clear any hold state for this table since KOT has been committed
      if (selectedTableId) clearHold(selectedTableId);
      toast.success("KOT generated");
      clearSession();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsKotting(false);
    }
  }


  // Esc key → go back to table select from order entry
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      if (document.querySelector("[data-radix-dialog-overlay]") ||
          document.querySelector("[data-state='open'][role='dialog']")) return;
      e.preventDefault();
      handleBackRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        pendingReservation={pendingReservation}
        onArrivedPrefill={handleArrivedPrefill}
      />

      {/* ── Main body: center+right workspace ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* CENTER + RIGHT + BOTTOM ACTION BAR */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Top panels: center (menu) + right (order) */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* CENTER — item grid */}
            <div className="flex-1 min-w-0 overflow-hidden bg-background h-full">
              <MenuCenterPanel
                menu={menu}
                isLoading={isMenuLoading}
                onAddItem={handleAddItem}
                applicableRate={applicableRate}
                addingId={addingId}
                onSearchRef={(ref) => { searchRefHandle.current = ref; }}
              />
            </div>

            {/* RIGHT — order panel */}
            <div className="shrink-0 w-[38%] max-w-130 min-w-65 border-l overflow-hidden h-full">
              <OrderRightPanel
                session={session}
                sessionId={activeSessionId}
                isDraft={isDraft}
                draftOrderType={draftOrderType}
                draftCovers={draftCovers}
                onSetDraftConfig={setDraftConfig}
                items={items}
                billedItems={sentItems}
                isLoadingItems={isLoadingItems}
                discountPercent={discountPercent}
                sessionDisc={sessionDisc}
                menu={menu}
                lastAddedKey={lastAddedKey}
                onQtyEnter={focusSearch}
                selectedTableName={selectedTableName}
                onEditAddons={handleEditAddons}
                pendingReservation={pendingReservation}
              />
            </div>
          </div>

          {/* BOTTOM ACTION BAR — spans center + right */}
          <BottomActionBar
            sessionId={activeSessionId}
            session={session}
            items={items}
            menu={menu}
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
            onHold={handleHold}
            isRestoredFromHold={isRestoredFromHold}
            discountPercent={discountPercent}
            sessionDisc={sessionDisc}
            onDiscountChange={saveSessionDisc}
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
          billTotals={totals}
          items={items}
          menu={menu}
          sessionDisc={sessionDisc}
          onSettle={handleSettle}
          isSettling={settleBillMut.isPending}
        />
      )}

      {/* ── Add-on selection ── */}
      {addonTarget && (
        <AddonDialog
          item={addonTarget.menuItem}
          mode={addonTarget.mode}
          applicableRate={applicableRate}
          allAddons={allAddons}
          initialSelected={
            addonTarget.mode === "edit"
              ? (addonTarget.orderItem?.addons ?? []).map((a) => ({
                  menuId: a.menu_id, name: a.name, rate: Number(a.rate) || 0,
                }))
              : []
          }
          onCreateCustom={(payload) => createAddonMut.mutateAsync(payload)}
          onConfirm={(chosen) => {
            const target = addonTarget;
            setAddonTarget(null);
            if (target.mode === "edit") {
              if (isDraft) {
                // Draft line — update add-ons in local context, keyed by menu_id.
                setDraftItemAddons(target.orderItem.menu_id, chosen);
              } else if (target.orderItem?.id) {
                // Session line — persist + recompute on the backend.
                updateAddonsMut.mutate({ orderItemId: target.orderItem.id, addons: chosen });
              }
            } else {
              commitAddItem(target.menuItem, chosen);
            }
          }}
          onClose={() => setAddonTarget(null)}
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
