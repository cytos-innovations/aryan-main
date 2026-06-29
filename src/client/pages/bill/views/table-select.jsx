import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  ShoppingBag01Icon,
  Add01Icon,
  Refresh01Icon,
  Search01Icon,
  Clock01Icon,
  UserAccountIcon,
  TableIcon,
  UserGroupIcon,
  HotelBellIcon,
  PrinterIcon,
  Exchange01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useSidebarNav } from "@/components/app-sidebar";
import { useBillingContext } from "../state/billing-context";
import { useFloorView, useLastKot } from "../hooks/use-billing-queries";
import { ORDER_TYPE } from "../constants/billing";
import { loadHold, clearHold, saveHold, getHeldTableIds } from "../utils/hold-storage";
import { minsUntilReservation, getReservationPhase } from "../utils/billing-calc";
import {
  getReminderSettings,
  saveReminderSettings,
  playReminderChime,
} from "../hooks/use-reservation-reminder";
import ReservationPanel from "../panels/reservation-panel";
import TableShiftDialog from "../panels/table-shift-dialog";

// ─── Status helpers ──────────────────────────────────────────────

/**
 * Compute display status from floor-view table data + current time.
 * Reservation timing overrides the DB current_status for AVAILABLE/RESERVED tables.
 */
function getTableStatus(table, nowMs) {
  const cs = table.current_status ?? "AVAILABLE";
  const ss = table.session_status;

  // Occupied tables: trust DB session state entirely
  if (cs === "OCCUPIED") {
    if (ss === "BILL_PRINTED") return "BILL_PRINTED";
    if (ss === "OPEN") return "AVAILABLE"; // pre-KOT session → still free visually
    return "OCCUPIED";                      // KOT_SENT
  }

  // Available/Reserved: override with reservation timing phase
  const phase = getReservationPhase(table, nowMs);
  if (phase === "NEAR" || phase === "ARRIVED") return "NEAR_RESERVATION"; // blue, clickable
  if (phase === "NORMAL" || phase === "WARNING" || phase === "PAST") return "AVAILABLE";

  // No timed reservation data — fall back to raw DB status
  if (cs === "RESERVED") return "RESERVED"; // permanently blocked (no timing info)
  return "AVAILABLE";
}

/** Format reservation time string "HH:MM[:SS]" → "H:MM AM/PM" */
function fmtResTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const STATUS_RING = {
  AVAILABLE:        "ring-border",
  OCCUPIED:         "ring-amber-300 dark:ring-amber-600",
  BILL_PRINTED:     "ring-emerald-400 dark:ring-emerald-600",
  RESERVED:         "ring-blue-300 dark:ring-blue-600",
  NEAR_RESERVATION: "ring-blue-400 dark:ring-blue-500",
  ON_HOLD:          "ring-purple-300 dark:ring-purple-600",
};

const STATUS_BG = {
  AVAILABLE:        "bg-card hover:bg-muted/50",
  OCCUPIED:         "bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-950/60",
  BILL_PRINTED:     "bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60",
  RESERVED:         "bg-blue-50/60 dark:bg-blue-950/30",
  NEAR_RESERVATION: "bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-950/60",
  ON_HOLD:          "bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100/80 dark:hover:bg-purple-950/60",
};

const STATUS_ACCENT = {
  AVAILABLE:        "bg-transparent",
  OCCUPIED:         "bg-amber-400 dark:bg-amber-500",
  BILL_PRINTED:     "bg-emerald-500",
  RESERVED:         "bg-blue-500",
  NEAR_RESERVATION: "bg-blue-500",
  ON_HOLD:          "bg-purple-500",
};

const STATUS_LABEL = {
  AVAILABLE:        { text: "Available",     cls: "text-muted-foreground" },
  OCCUPIED:         { text: "KOT Sent",      cls: "text-amber-700 dark:text-amber-400" },
  BILL_PRINTED:     { text: "Bill Out",      cls: "text-emerald-700 dark:text-emerald-400" },
  RESERVED:         { text: "Reserved",      cls: "text-blue-700 dark:text-blue-400" },
  NEAR_RESERVATION: { text: "Reserved Soon", cls: "text-blue-700 dark:text-blue-400" },
  ON_HOLD:          { text: "On Hold",       cls: "text-purple-700 dark:text-purple-400" },
};

const ORDER_TYPE_PILL = {
  DINE_IN:  { label: "Dine In",   cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  DELIVERY: { label: "Delivery",  cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  PICKUP:   { label: "Pickup",    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
};

// ─── Occupancy timer ─────────────────────────────────────────────

// Parse the DB timestamp ("YYYY-MM-DD HH:MM:SS") as LOCAL time — it's a tz-naive
// value that already matches the device clock, so forcing "Z" (UTC) would shift it.
function parseLocal(since) {
  if (!since) return null;
  const [datePart, timePart = "00:00:00"] = since.trim().split(/[ T]/);
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi, s = 0] = timePart.split(":").map(Number);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d, h || 0, mi || 0, s || 0);
}

function calcElapsed(since, now) {
  const d = parseLocal(since);
  if (!d) return null;
  const diff = now - d.getTime();
  if (diff < 0) return "0m";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── Table Card ──────────────────────────────────────────────────

function TableCard({ table, onClick, now, isOnHold, isFocused, cardRef }) {
  const status      = isOnHold ? "ON_HOLD" : getTableStatus(table, now);
  const phase       = getReservationPhase(table, now);
  const isOccupied  = status === "OCCUPIED" || status === "BILL_PRINTED";
  const isNear      = status === "NEAR_RESERVATION";   // near-reservation blue state
  const elapsed     = calcElapsed(table.occupied_since, now);
  const orderPill   = isOccupied && table.order_type ? ORDER_TYPE_PILL[table.order_type] : null;
  const statusLabel = STATUS_LABEL[status] ?? STATUS_LABEL.AVAILABLE;

  // Countdown: positive = minutes until reservation, negative = minutes overdue
  const minsUntil   = isNear ? minsUntilReservation(table.reservation_time, now) : null;
  const isOverdue   = minsUntil !== null && minsUntil < 0;
  const minsLeft    = minsUntil !== null && minsUntil > 0 ? Math.ceil(minsUntil) : null;
  const minsLate    = isOverdue ? Math.floor(Math.abs(minsUntil)) : null;

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onClick(table, status, phase)}
      className={[
        "relative flex flex-col min-h-27 rounded-xl p-3.5 text-left select-none transition-all duration-150",
        "ring-1 shadow-xs overflow-hidden cursor-pointer active:scale-[0.98]",
        STATUS_RING[status],
        STATUS_BG[status],
        isFocused ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-10" : "",
      ].join(" ")}
    >
      {/* Top accent strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${STATUS_ACCENT[status]}`} />

      {/* Header: table code (+ group) + pills */}
      <div className="flex items-start justify-between gap-1.5 mt-0.5">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-semibold text-sm leading-snug truncate">{table.table_name}</span>
          {table.table_group_name && (
            <span className="text-[10px] text-muted-foreground truncate">{table.table_group_name}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isNear && phase !== "ARRIVED" && minsLeft !== null && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {minsLeft}m
            </span>
          )}
          {isNear && phase !== "ARRIVED" && isOverdue && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
              +{minsLate}m
            </span>
          )}
          {orderPill && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${orderPill.cls}`}>
              {orderPill.label}
            </span>
          )}
        </div>
      </div>

      {/* Status text + covers */}
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`text-[11px] font-medium ${statusLabel.cls}`}>
          {isNear && phase === "ARRIVED"
            ? "Guest Arrived"
            : isNear && isOverdue
              ? "Awaiting Guest"
              : statusLabel.text}
        </span>
        {isOccupied && table.covers != null && (
          <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground ml-auto shrink-0">
            <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
            <span>{table.covers}</span>
          </div>
        )}
      </div>

      {/* On Hold details */}
      {isOnHold && (() => {
        const held = loadHold(table.id);
        const itemCount = held?.draftItems?.length ?? 0;
        if (itemCount === 0) return null;
        return (
          <div className="mt-2.5 border-t border-purple-200/60 dark:border-purple-800/40 pt-2">
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
              {itemCount} item{itemCount !== 1 ? "s" : ""} held · tap to resume
            </span>
          </div>
        );
      })()}

      {/* Occupied details */}
      {isOccupied && (
        <div className="mt-2.5 space-y-1.5 border-t border-black/5 dark:border-white/5 pt-2">
          <div className="flex items-center justify-between gap-2">
            {elapsed && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
                <span>{elapsed}</span>
              </div>
            )}
            {table.running_total > 0 && (
              <span className="text-xs font-semibold tabular-nums ml-auto">
                ₹{table.running_total.toFixed(2)}
              </span>
            )}
          </div>
          {table.session_customer && (
            <div className="flex items-center gap-1 text-[11px] text-foreground/80 min-w-0">
              <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate font-medium">{table.session_customer}</span>
            </div>
          )}
          {table.waiter_name && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
              <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{table.waiter_name}</span>
            </div>
          )}
        </div>
      )}

      {/* Near-reservation overlay details (both NEAR and ARRIVED phases) */}
      {isNear && (
        <div className="mt-2.5 space-y-1 border-t border-blue-200/60 dark:border-blue-800/40 pt-2">
          {table.reservation_customer && (
            <div className="flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300">
              <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate font-medium">{table.reservation_customer}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-[11px] text-blue-600/70 dark:text-blue-400/70">
            {/* Show time / overdue / arrived hint */}
            {phase === "ARRIVED" ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready to order</span>
            ) : isOverdue ? (
              <span className="text-orange-500 dark:text-orange-400 font-medium">
                {minsLate}m overdue · waiting
              </span>
            ) : (
              table.reservation_time && (
                <div className="flex items-center gap-1">
                  <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
                  <span>{fmtResTime(table.reservation_time)}</span>
                </div>
              )
            )}
            {table.reservation_guest_count != null && (
              <div className="flex items-center gap-1 ml-auto">
                <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
                <span>{table.reservation_guest_count}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

// ─── Table Group Section ──────────────────────────────────────────

function TableGroupSection({ groupName, tables, onTableClick, now, heldTableIds, focusedId, registerCardRef }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          {groupName}
        </span>
        <span className="text-[11px] text-muted-foreground/60">({tables.length})</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
        {tables.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            onClick={onTableClick}
            now={now}
            isOnHold={heldTableIds?.has(t.id)}
            isFocused={focusedId === t.id}
            cardRef={(el) => registerCardRef(t.id, el)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────

function FloorSkeleton() {
  return (
    <div className="space-y-6">
      {[5, 3].map((count, gi) => (
        <div key={gi}>
          <Skeleton className="h-3.5 w-28 mb-2.5" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stats pill ───────────────────────────────────────────────────

function StatPill({ count, label, colorClass }) {
  return (
    <span className="text-xs text-muted-foreground">
      <span className={`font-semibold ${colorClass}`}>{count}</span>
      {" "}{label}
    </span>
  );
}

// ─── Reminder Settings Dialog ────────────────────────────────────────

const MINUTE_OPTIONS = [
  { value: "5",  label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
];

function ReminderSettingsDialog({ open, onOpenChange }) {
  const [cfg, setCfg] = useState(() => getReminderSettings());

  function handleSave() {
    saveReminderSettings(cfg);
    toast.success("Reminder settings saved");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={HotelBellIcon} size={16} strokeWidth={2} className="text-primary shrink-0" />
            <DialogTitle className="text-sm font-semibold">Reservation Reminders</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            A gentle 3-note bell chime plays before upcoming reservations. The tone
            uses inharmonic overtones — sounds like a real restaurant bell, not a
            delivery-app alert.
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Enable / disable */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="reminder-toggle" className="text-sm font-medium">
                Enable reminders
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Play chime for upcoming reservations
              </p>
            </div>
            <Switch
              id="reminder-toggle"
              checked={cfg.enabled}
              onCheckedChange={(v) => setCfg((s) => ({ ...s, enabled: v }))}
            />
          </div>

          {/* How early */}
          <div className={cfg.enabled ? "" : "opacity-40 pointer-events-none"}>
            <Label className="text-sm font-medium">Remind me before</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
              How far ahead to play the alert
            </p>
            <Select
              value={String(cfg.minutesBefore)}
              onValueChange={(v) => setCfg((s) => ({ ...s, minutesBefore: parseInt(v, 10) }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 gap-1.5 text-xs"
            onClick={playReminderChime}
          >
            <HugeiconsIcon icon={HotelBellIcon} size={13} strokeWidth={2} />
            Preview Chime
          </Button>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main View ────────────────────────────────────────────────────

export default function TableSelectView({ onOpenReprint }) {
  const navigate = useNavigate();
  const { setSession, modifyModeOn, setModifyModeOn } = useBillingContext();
  const sidebarNav = useSidebarNav();
  const { can } = useAuth();
  const canModifyBill = can("modify-bill:view");

  const [search,          setSearch]          = useState("");
  const [groupFilter,     setGroupFilter]     = useState("__all__");
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reminderOpen,    setReminderOpen]    = useState(false);
  const [tableShiftOpen,  setTableShiftOpen]  = useState(false);
  // Modify Bill — when ON, only bill-printed tables are shown and clicking one
  // opens it in modify mode for corrections. Lives in billing-context so it
  // persists across the floor → order-entry → floor view swap.
  const modifyMode = modifyModeOn;
  const setModifyMode = setModifyModeOn;
  // Re-render trigger when hold state changes
  const [holdVersion, setHoldVersion] = useState(0);
  // Keyboard navigation: id of the currently focused table card (null = none / search has focus)
  const [focusedId, setFocusedId] = useState(null);
  const searchRef = useRef(null);
  // Map of table id → card DOM node, used for geometry-based arrow navigation
  const cardRefs = useRef(new Map());
  const registerCardRef = useCallback((id, el) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // Auto-focus search on mount; also refresh held-table snapshot when this view becomes active
  useEffect(() => {
    searchRef.current?.focus();
    setHoldVersion((v) => v + 1); // force re-read of localStorage on every mount
  }, []);

  // Table Shift — open the shift dialog (shortcut F7)
  const handleTableShift = useCallback(() => {
    setTableShiftOpen(true);
  }, []);

  // Print Table — placeholder, wired up later (shortcut F9)
  const handlePrintTable = useCallback(() => {
    // TODO: implement print table functionality
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "F7") { e.preventDefault(); handleTableShift(); }
      if (e.key === "F9") { e.preventDefault(); handlePrintTable(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleTableShift, handlePrintTable]);

  const floorQuery = useFloorView();
  const lastKotQuery = useLastKot();
  const tables = floorQuery.data ?? [];

  // Use a shorter tick interval when any table has an active reservation today
  // so countdown pills and phase transitions stay visually responsive.
  const hasActiveReservation = useMemo(
    () => tables.some((t) => t.reservation_id != null),
    [tables],
  );
  const now = useNow(hasActiveReservation ? 30_000 : 60_000);

  // Distinct table groups (in floor order) for the group filter dropdown.
  const groupNames = useMemo(() => {
    const seen = new Set();
    const names = [];
    for (const t of tables) {
      const g = t.table_group_name ?? "Ungrouped";
      if (!seen.has(g)) { seen.add(g); names.push(g); }
    }
    return names;
  }, [tables]);

  // Drop a stale group filter if its group disappears from the floor.
  useEffect(() => {
    if (groupFilter !== "__all__" && !groupNames.includes(groupFilter)) {
      setGroupFilter("__all__");
    }
  }, [groupNames, groupFilter]);

  // Turn modify mode off if the permission disappears (e.g. app switch).
  useEffect(() => {
    if (modifyMode && !canModifyBill) setModifyMode(false);
  }, [modifyMode, canModifyBill]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tables.filter((t) => {
      // Modify mode: only bill-printed tables are eligible for correction.
      if (modifyMode && getTableStatus(t, now) !== "BILL_PRINTED") return false;
      const group = t.table_group_name ?? "Ungrouped";
      if (groupFilter !== "__all__" && group !== groupFilter) return false;
      if (!q) return true;
      return (
        t.table_name.toLowerCase().includes(q) ||
        group.toLowerCase().includes(q) ||
        String(t.code ?? "").toLowerCase().includes(q)
      );
    });
  }, [tables, search, groupFilter, modifyMode, now]);


  const groups = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      const g = t.table_group_name ?? "Ungrouped";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  // Flat list of visible table ids in render order (across all groups)
  const orderedIds = useMemo(
    () => groups.flatMap(([, ts]) => ts.map((t) => t.id)),
    [groups],
  );

  // Drop stale focus when the focused table is filtered out / no longer visible
  useEffect(() => {
    if (focusedId != null && !orderedIds.includes(focusedId)) setFocusedId(null);
  }, [orderedIds, focusedId]);

  // Which table IDs have held drafts in localStorage
  const heldTableIds = useMemo(
    () => new Set(getHeldTableIds()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holdVersion],
  );

  const stats = useMemo(() => {
    let available = 0, occupied = 0, billPrinted = 0, onHold = 0;
    for (const t of tables) {
      const s = heldTableIds.has(t.id) ? "ON_HOLD" : getTableStatus(t, now);
      if (s === "AVAILABLE" || s === "NEAR_RESERVATION" || s === "RESERVED") available++;
      else if (s === "OCCUPIED")     occupied++;
      else if (s === "BILL_PRINTED") billPrinted++;
      else if (s === "ON_HOLD")      onHold++;
    }
    return { available, occupied, billPrinted, onHold };
  }, [tables, now, heldTableIds]);

  // Auto-hold current draft when navigating to a different table
  // (the table-select view is shown while the user is in draft mode if they press Esc or Back)
  // We save the draft here whenever the component renders with an active draft that is being "abandoned".
  // The actual save happens in order-entry handleBack / handleHold; this is just a safety net.

  // Clicking any table opens the billing screen — no DB writes at this point.
  // Session is only created when the user sends a KOT.
  const handleTableClick = useCallback(
    (table, status, phase) => {
      // NEAR_RESERVATION: two sub-cases based on phase
      if (status === "NEAR_RESERVATION") {
        if (phase === "NEAR") {
          const mins = Math.max(0, Math.ceil(minsUntilReservation(table.reservation_time, Date.now())));
          toast.warning(
            `Reserved in ${mins} minute${mins !== 1 ? "s" : ""}. KOT is blocked until reservation time.`,
            { duration: 4000 },
          );
        }
        // fall through in both cases
      }

      // WARNING phase: table looks available but has a near reservation
      if (phase === "WARNING") {
        const mins = Math.max(0, Math.ceil(minsUntilReservation(table.reservation_time, Date.now())));
        toast.info(`This table has a reservation in ${mins} minutes.`);
      }

      // ON_HOLD: restore draft and navigate
      if (status === "ON_HOLD") {
        const held = loadHold(table.id);
        if (held) {
          clearHold(table.id);
          setHoldVersion((v) => v + 1);
          setSession(null, table.id, table.table_name, undefined,
            held.draftApplicableRate ?? table.applicable_rate ?? 1,
            held.draftOrderType,
            {
              draftCovers:        held.draftCovers,
              draftCustomerName:  held.draftCustomerName  ?? null,
              draftCustomerId:    held.draftCustomerId    ?? null,
              draftWaiterId:      held.draftWaiterId      ?? null,
              draftItems:         held.draftItems         ?? [],
              isRestoredFromHold: true,
              tableGroupName:     table.table_group_name,
            },
          );
        } else {
          // Hold expired or cleared — treat as available
          setSession(null, table.id, table.table_name, undefined, table.applicable_rate ?? 1, undefined, { tableGroupName: table.table_group_name });
        }
        return;
      }

      // Navigate to order entry (all non-blocked statuses land here)
      if (status === "AVAILABLE" || status === "NEAR_RESERVATION") {
        if (table.session_id) {
          setSession(table.session_id, table.id, table.table_name, undefined, undefined, undefined, { tableGroupName: table.table_group_name });
        } else {
          // For ARRIVED guests: pre-fill covers + customer name from reservation
          const opts = phase === "ARRIVED" ? {
            draftCovers:       table.reservation_guest_count ?? 2,
            draftCustomerName: table.reservation_customer   ?? null,
          } : {};
          setSession(null, table.id, table.table_name, undefined, table.applicable_rate ?? 1, undefined, { ...opts, tableGroupName: table.table_group_name });
        }
        return;
      }

      // OCCUPIED or BILL_PRINTED — resume existing session.
      // In modify mode, only bill-printed tables reach here; flag the session so
      // order entry unlocks correction behaviours.
      if (table.session_id) {
        const enterModify = modifyMode && status === "BILL_PRINTED";
        setSession(table.session_id, table.id, table.table_name, undefined, undefined, undefined, {
          tableGroupName: table.table_group_name,
          modifyMode:     enterModify,
        });
      }
    },
    [setSession, modifyMode],
  );

  // Direct-open on Enter: if search is purely numeric and matches a table code, open it
  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      const q = search.trim();
      if (!q || !/^\d+$/.test(q) || tables.length === 0) return;
      const match = tables.find((t) => String(t.code ?? "") === q);
      if (!match) return;
      const status = heldTableIds.has(match.id) ? "ON_HOLD" : getTableStatus(match, Date.now());
      const phase  = getReservationPhase(match, Date.now());
      setSearch("");
      handleTableClick(match, status, phase);
    },
    [search, tables, handleTableClick, heldTableIds],
  );

  // ── Arrow-key navigation across table cards ──────────────────────
  // Left/Right move ±1 in flat render order; Up/Down jump to the geometrically
  // nearest card in the previous/next row (handles responsive column counts and
  // group boundaries since it works off live DOM positions).
  const moveFocus = useCallback(
    (dir) => {
      if (orderedIds.length === 0) return;

      // No current focus → entering the grid: focus the first card.
      if (focusedId == null || !orderedIds.includes(focusedId)) {
        setFocusedId(orderedIds[0]);
        return;
      }

      if (dir === "left" || dir === "right") {
        const idx = orderedIds.indexOf(focusedId);
        const next = dir === "left" ? idx - 1 : idx + 1;
        if (next >= 0 && next < orderedIds.length) setFocusedId(orderedIds[next]);
        return;
      }

      // Up / Down — geometry based.
      const curEl = cardRefs.current.get(focusedId);
      if (!curEl) return;
      const cur = curEl.getBoundingClientRect();
      const curCenterX = cur.left + cur.width / 2;
      const rowTol = cur.height / 2; // rows are "different" if vertical centers differ by > half a card

      let best = null;
      let bestScore = Infinity;
      for (const id of orderedIds) {
        if (id === focusedId) continue;
        const el = cardRefs.current.get(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const dy = (r.top + r.height / 2) - (cur.top + cur.height / 2);
        if (dir === "up" && dy >= -rowTol) continue;   // must be above
        if (dir === "down" && dy <= rowTol) continue;  // must be below
        // Prefer closest row, then closest horizontal alignment.
        const dx = Math.abs((r.left + r.width / 2) - curCenterX);
        const score = Math.abs(dy) * 4 + dx;
        if (score < bestScore) { bestScore = score; best = id; }
      }
      if (best != null) setFocusedId(best);
    },
    [orderedIds, focusedId],
  );

  // Keep the focused card visible and blur the search input while navigating.
  useEffect(() => {
    if (focusedId == null) return;
    const el = cardRefs.current.get(focusedId);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedId]);

  // When the sidebar hands keyboard focus back to this screen (Right arrow /
  // Escape from a leaf), re-focus the table that was active before — or the
  // first one if none.
  useEffect(() => {
    if (!sidebarNav?.registerReturnFocus) return;
    return sidebarNav.registerReturnFocus(() => {
      setFocusedId((prev) =>
        prev != null && orderedIds.includes(prev) ? prev : orderedIds[0] ?? null,
      );
    });
  }, [sidebarNav, orderedIds]);

  // Is the focused card the leftmost one in its row? Used to decide when Left
  // should exit the grid into the sidebar instead of moving within the row.
  const isFocusedAtLeftEdge = useCallback(() => {
    const curEl = cardRefs.current.get(focusedId);
    if (!curEl) return true;
    const cur = curEl.getBoundingClientRect();
    const rowTol = cur.height / 2;
    for (const id of orderedIds) {
      if (id === focusedId) continue;
      const el = cardRefs.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      // Same row, and clearly to the left → not at the edge.
      if (Math.abs((r.top + r.height / 2) - (cur.top + cur.height / 2)) <= rowTol
        && r.left < cur.left - 1) {
        return false;
      }
    }
    return true;
  }, [focusedId, orderedIds]);

  // Grid arrow-key + Enter handler. Runs in the capture phase so it resolves
  // Left before the sidebar's global entry handler (bubble phase) sees it.
  useEffect(() => {
    function onKey(e) {
      // Ignore when a modifier is held (don't hijack browser/OS shortcuts).
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Stand down while any modal/sheet (Bill Reprint, dialogs, etc.) is open —
      // those own their own keyboard navigation and must not move the grid.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      // While the sidebar owns keyboard navigation, stay out of its way.
      if (sidebarNav?.sidebarFocused) return;

      const arrowMap = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const dir = arrowMap[e.key];

      if (dir) {
        const active = document.activeElement;
        const inSearch = active === searchRef.current;
        // While typing in search, let Left/Right move the text cursor; only Up/Down
        // (or arrows once a card is already focused) take over grid navigation.
        if (inSearch && (dir === "left" || dir === "right") && focusedId == null) return;

        // Left at the leftmost column hands keyboard focus to the sidebar.
        if (dir === "left" && focusedId != null && isFocusedAtLeftEdge()) {
          e.preventDefault();
          e.stopPropagation();
          setFocusedId(null);
          sidebarNav?.focusSidebar?.();
          return;
        }

        e.preventDefault();
        e.stopPropagation(); // own Left/Right so the sidebar entry handler stays out
        if (inSearch) searchRef.current?.blur();
        moveFocus(dir);
        return;
      }

      if (e.key === "Enter" && focusedId != null) {
        const table = tables.find((t) => t.id === focusedId);
        if (!table) return;
        e.preventDefault();
        const status = heldTableIds.has(table.id) ? "ON_HOLD" : getTableStatus(table, Date.now());
        const phase  = getReservationPhase(table, Date.now());
        handleTableClick(table, status, phase);
        return;
      }

      // Escape returns control to the search box.
      if (e.key === "Escape" && focusedId != null) {
        e.preventDefault();
        setFocusedId(null);
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [moveFocus, focusedId, tables, heldTableIds, handleTableClick, sidebarNav, isFocusedAtLeftEdge]);

  // Pickup: also enters draft mode, no table
  function handlePickup() {
    setSession(null, null, "Pickup", undefined, 1, ORDER_TYPE.PICKUP);
  }

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b bg-card px-4 py-2 flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => setReservationOpen(true)}>
          <HugeiconsIcon icon={Calendar01Icon} size={14} strokeWidth={2} />
          Reserve
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={onOpenReprint}>
          <HugeiconsIcon icon={PrinterIcon} size={14} strokeWidth={2} />
          Bill Reprint
          <span className="text-[9px] font-mono px-1 py-px rounded bg-muted text-muted-foreground leading-none">PgUp</span>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={handleTableShift}>
          <HugeiconsIcon icon={Exchange01Icon} size={14} strokeWidth={2} />
          Table Shift
          <span className="text-[9px] font-mono px-1 py-px rounded bg-muted text-muted-foreground leading-none">F7</span>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={handlePrintTable}>
          <HugeiconsIcon icon={PrinterIcon} size={14} strokeWidth={2} />
          Print Table
          <span className="text-[9px] font-mono px-1 py-px rounded bg-muted text-muted-foreground leading-none">F9</span>
        </Button>
        {/* Modify Bill — only for users granted the permission. Toggle restricts the
            floor to bill-printed tables and opens them in correction mode. */}
        {canModifyBill && (
          <button
            type="button"
            onClick={() => setModifyMode(!modifyMode)}
            className={[
              "h-8 px-2.5 shrink-0 inline-flex items-center gap-1.5 rounded-md border text-xs font-medium transition-colors",
              modifyMode
                ? "border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200"
                : "border-border bg-card text-foreground/80 hover:bg-muted/60",
            ].join(" ")}
            title={modifyMode ? "Modify mode is ON — showing bill-printed tables only" : "Turn on Modify Bill mode"}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={2} />
            Modify Bill
            <Switch checked={modifyMode} className="ml-0.5 pointer-events-none scale-90" />
          </button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setReminderOpen(true)} title="Reservation reminder settings">
          <HugeiconsIcon icon={HotelBellIcon} size={15} strokeWidth={2} />
        </Button>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative shrink-0">
          <HugeiconsIcon icon={Search01Icon} size={13} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value.slice(0, 10))} onKeyDown={handleSearchKeyDown} placeholder="Search by name or code…" className="h-8 pl-8 w-48 text-xs" />
        </div>

        {/* Refresh */}
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => floorQuery.refetch()} disabled={floorQuery.isFetching} title="Refresh">
          <HugeiconsIcon icon={Refresh01Icon} size={14} strokeWidth={2} className={floorQuery.isFetching ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* ── Legend + live stats (single row) ── */}
      <div className="shrink-0 border-b bg-muted/20 px-4 py-1.5 flex items-center gap-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 shrink-0">Legend</span>
        {[
          { dot: "bg-border ring-1 ring-border",    label: "Available",    count: stats.available,                                countCls: "text-foreground"                              },
          { dot: "bg-amber-400 dark:bg-amber-500",  label: "KOT Sent",     count: stats.occupied,                                 countCls: "text-amber-600 dark:text-amber-400"           },
          { dot: "bg-emerald-500",                  label: "Bill Out",     count: stats.billPrinted,                              countCls: "text-emerald-600 dark:text-emerald-400"       },
          { dot: "bg-purple-500",                   label: "On Hold",      count: stats.onHold > 0 ? stats.onHold : null,         countCls: "text-purple-600 dark:text-purple-400"         },
          { dot: "bg-blue-500",                     label: "Reserved Soon",count: null,                                           countCls: ""                                             },
        ].map(({ dot, label, count, countCls }) => (
          <div key={label} className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm shrink-0 ${dot}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
            {count != null && (
              <span className={`text-[10px] font-semibold tabular-nums ${countCls}`}>{count}</span>
            )}
          </div>
        ))}

        {/* Table-group filter — pinned to the right of the legend */}
        {groupNames.length > 1 && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-medium text-muted-foreground">Group</span>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All groups</SelectItem>
                {groupNames.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Last KOT recap — pinned to the right edge of the legend row */}
        {lastKotQuery.data && (
          <div className={`${groupNames.length > 1 ? "" : "ml-auto "}flex items-center gap-3 shrink-0 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-0.5 text-amber-700 dark:text-amber-400`}>
            <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">Last KOT</span>
            <span className="text-[10px] font-bold tabular-nums">{lastKotQuery.data.kot_no ?? "—"}</span>
            {lastKotQuery.data.table_name && (
              <span className="flex items-center gap-1 text-[10px]">
                <span className="opacity-70">Table</span>
                <span className="font-bold">{lastKotQuery.data.table_name}</span>
              </span>
            )}
            {lastKotQuery.data.order_no && (
              <span className="flex items-center gap-1 text-[10px]">
                <span className="opacity-70">Order</span>
                <span className="font-bold tabular-nums">{lastKotQuery.data.order_no}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Modify-mode banner ── */}
      {modifyMode && (
        <div className="shrink-0 bg-amber-100/80 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-4 py-1.5 flex items-center gap-2">
          <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} className="text-amber-700 dark:text-amber-300 shrink-0" />
          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
            Modify Bill mode — showing bill-printed tables only. Open a table to add/remove items, change discount, customer or waiter, then Print + Save.
          </span>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {floorQuery.isLoading ? (
          <FloorSkeleton />
        ) : floorQuery.isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <span className="text-sm">Failed to load tables.</span>
            <Button variant="outline" size="sm" onClick={() => floorQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <HugeiconsIcon icon={TableIcon} size={44} strokeWidth={1.5} className="opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {modifyMode
                  ? "No bill-printed tables to modify."
                  : search || groupFilter !== "__all__"
                    ? "No tables match your filters."
                    : "No tables configured."}
              </p>
              {!search && groupFilter === "__all__" && (
                <p className="text-xs mt-1 text-muted-foreground/70">
                  Add tables in Master Data → Table Management.
                </p>
              )}
            </div>
            {!search && groupFilter === "__all__" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/master/table/tables")}
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                Add Tables
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([groupName, groupTables]) => (
              <TableGroupSection
                key={groupName}
                groupName={groupName}
                tables={groupTables}
                onTableClick={handleTableClick}
                now={now}
                heldTableIds={heldTableIds}
                focusedId={focusedId}
                registerCardRef={registerCardRef}
              />
            ))}
          </div>
        )}
      </div>
    </div>

    <ReservationPanel
      open={reservationOpen}
      onOpenChange={setReservationOpen}
    />

    <ReminderSettingsDialog
      open={reminderOpen}
      onOpenChange={setReminderOpen}
    />

    <TableShiftDialog
      open={tableShiftOpen}
      onOpenChange={setTableShiftOpen}
      tables={tables}
    />
    </>
  );
}
