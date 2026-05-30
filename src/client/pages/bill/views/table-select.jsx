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
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

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

import { useBillingContext } from "../state/billing-context";
import { useFloorView } from "../hooks/use-billing-queries";
import { ORDER_TYPE } from "../constants/billing";
import { minsUntilReservation, getReservationPhase } from "../utils/billing-calc";
import {
  getReminderSettings,
  saveReminderSettings,
  playReminderChime,
} from "../hooks/use-reservation-reminder";
import ReservationPanel from "../panels/reservation-panel";

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
};

const STATUS_BG = {
  AVAILABLE:        "bg-card hover:bg-muted/50",
  OCCUPIED:         "bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-950/60",
  BILL_PRINTED:     "bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60",
  RESERVED:         "bg-blue-50/60 dark:bg-blue-950/30",
  NEAR_RESERVATION: "bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-950/60",
};

const STATUS_ACCENT = {
  AVAILABLE:        "bg-transparent",
  OCCUPIED:         "bg-amber-400 dark:bg-amber-500",
  BILL_PRINTED:     "bg-emerald-500",
  RESERVED:         "bg-blue-500",
  NEAR_RESERVATION: "bg-blue-500",
};

const STATUS_LABEL = {
  AVAILABLE:        { text: "Available",     cls: "text-muted-foreground" },
  OCCUPIED:         { text: "KOT Sent",      cls: "text-amber-700 dark:text-amber-400" },
  BILL_PRINTED:     { text: "Bill Out",      cls: "text-emerald-700 dark:text-emerald-400" },
  RESERVED:         { text: "Reserved",      cls: "text-blue-700 dark:text-blue-400" },
  NEAR_RESERVATION: { text: "Reserved Soon", cls: "text-blue-700 dark:text-blue-400" },
};

const ORDER_TYPE_PILL = {
  DINE_IN:  { label: "Dine In",   cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  DELIVERY: { label: "Delivery",  cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  PICKUP:   { label: "Pickup",    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" },
};

// ─── Occupancy timer ─────────────────────────────────────────────

function calcElapsed(since, now) {
  if (!since) return null;
  const diff = now - new Date(since.replace(" ", "T") + "Z").getTime();
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

function TableCard({ table, onClick, now }) {
  const status      = getTableStatus(table, now);
  const phase       = getReservationPhase(table, now);
  const isOccupied  = status === "OCCUPIED" || status === "BILL_PRINTED";
  const isReserved  = status === "RESERVED";           // permanently blocked (no timing)
  const isNear      = status === "NEAR_RESERVATION";   // near-reservation blue state
  const elapsed     = calcElapsed(table.occupied_since, now);
  const orderPill   = isOccupied && table.order_type ? ORDER_TYPE_PILL[table.order_type] : null;
  const statusLabel = STATUS_LABEL[status];

  // Countdown: positive = minutes until reservation, negative = minutes overdue
  const minsUntil   = isNear ? minsUntilReservation(table.reservation_time, now) : null;
  const isOverdue   = minsUntil !== null && minsUntil < 0;
  const minsLeft    = minsUntil !== null && minsUntil > 0 ? Math.ceil(minsUntil) : null;
  const minsLate    = isOverdue ? Math.floor(Math.abs(minsUntil)) : null;

  return (
    <button
      type="button"
      onClick={() => onClick(table, status, phase)}
      disabled={isReserved}
      className={[
        "relative flex flex-col rounded-xl p-3.5 text-left select-none transition-all duration-150",
        "ring-1 shadow-xs overflow-hidden",
        STATUS_RING[status],
        STATUS_BG[status],
        isReserved ? "cursor-not-allowed opacity-70" : "cursor-pointer active:scale-[0.98]",
      ].join(" ")}
    >
      {/* Top accent strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${STATUS_ACCENT[status]}`} />

      {/* Header: table name + pills */}
      <div className="flex items-start justify-between gap-1.5 mt-0.5">
        <span className="font-semibold text-sm leading-snug truncate">{table.table_name}</span>
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

      {/* Status text */}
      <span className={`text-[11px] font-medium mt-1 ${statusLabel.cls}`}>
        {isNear && phase === "ARRIVED"
          ? "Guest Arrived"
          : isNear && isOverdue
            ? "Awaiting Guest"
            : statusLabel.text}
      </span>

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
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {table.waiter_name && (
              <div className="flex items-center gap-1 min-w-0">
                <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{table.waiter_name}</span>
              </div>
            )}
            {table.covers != null && (
              <div className="flex items-center gap-1 shrink-0 ml-auto">
                <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
                <span>{table.covers}</span>
              </div>
            )}
          </div>
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

function TableGroupSection({ groupName, tables, onTableClick, now }) {
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
          <TableCard key={t.id} table={t} onClick={onTableClick} now={now} />
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

export default function TableSelectView() {
  const navigate = useNavigate();
  const { setSession } = useBillingContext();
  const [search, setSearch] = useState("");
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const searchRef = useRef(null);

  // Auto-focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  const floorQuery = useFloorView();
  const tables = floorQuery.data ?? [];

  // Use a shorter tick interval when any table has an active reservation today
  // so countdown pills and phase transitions stay visually responsive.
  const hasActiveReservation = useMemo(
    () => tables.some((t) => t.reservation_id != null),
    [tables],
  );
  const now = useNow(hasActiveReservation ? 30_000 : 60_000);

  const filtered = useMemo(() => {
    if (!search.trim()) return tables;
    const q = search.toLowerCase();
    return tables.filter(
      (t) =>
        t.table_name.toLowerCase().includes(q) ||
        (t.table_group_name ?? "Ungrouped").toLowerCase().includes(q) ||
        String(t.code ?? "").toLowerCase().includes(q),
    );
  }, [tables, search]);


  const groups = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      const g = t.table_group_name ?? "Ungrouped";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  const stats = useMemo(() => {
    let available = 0, occupied = 0, billPrinted = 0, reserved = 0;
    for (const t of tables) {
      const s = getTableStatus(t, now);
      if (s === "AVAILABLE" || s === "NEAR_RESERVATION") available++;
      else if (s === "OCCUPIED")     occupied++;
      else if (s === "BILL_PRINTED") billPrinted++;
      else if (s === "RESERVED")     reserved++;
    }
    return { available, occupied, billPrinted, reserved };
  }, [tables, now]);

  // Clicking any table opens the billing screen — no DB writes at this point.
  // Session is only created when the user sends a KOT.
  const handleTableClick = useCallback(
    (table, status, phase) => {
      // Permanently blocked (no timing data)
      if (status === "RESERVED") {
        toast.info("This table is reserved.");
        return;
      }

      // NEAR_RESERVATION: two sub-cases based on phase
      if (status === "NEAR_RESERVATION") {
        if (phase === "NEAR") {
          // Guest not yet arrived — KOT will be blocked
          const mins = Math.max(0, Math.ceil(minsUntilReservation(table.reservation_time, Date.now())));
          toast.warning(
            `Reserved in ${mins} minute${mins !== 1 ? "s" : ""}. KOT is blocked until reservation time.`,
            { duration: 4000 },
          );
        }
        // ARRIVED phase → no toast, navigate normally
        // fall through to navigate in both cases
      }

      // WARNING phase: table looks available but has a near reservation
      if (phase === "WARNING") {
        const mins = Math.max(0, Math.ceil(minsUntilReservation(table.reservation_time, Date.now())));
        toast.info(`This table has a reservation in ${mins} minutes.`);
        // fall through — navigation is allowed, no visual change
      }

      // Navigate to order entry (all non-blocked statuses land here)
      if (status === "AVAILABLE" || status === "NEAR_RESERVATION") {
        if (table.session_id) {
          setSession(table.session_id, table.id, table.table_name);
        } else {
          // For ARRIVED guests: pre-fill covers + customer name from reservation
          const opts = phase === "ARRIVED" ? {
            draftCovers:       table.reservation_guest_count ?? 2,
            draftCustomerName: table.reservation_customer   ?? null,
          } : {};
          setSession(null, table.id, table.table_name, undefined, table.applicable_rate ?? 1, undefined, opts);
        }
        return;
      }

      // OCCUPIED or BILL_PRINTED — resume existing session
      if (table.session_id) {
        setSession(table.session_id, table.id, table.table_name);
      }
    },
    [setSession],
  );

  // Direct-open on Enter: if search is purely numeric and matches a table code, open it
  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      const q = search.trim();
      if (!q || !/^\d+$/.test(q) || tables.length === 0) return;
      const match = tables.find((t) => String(t.code ?? "") === q);
      if (!match) return;
      const status = getTableStatus(match, Date.now());
      const phase  = getReservationPhase(match, Date.now());
      setSearch("");
      handleTableClick(match, status, phase);
    },
    [search, tables, handleTableClick],
  );

  // Pickup: also enters draft mode, no table
  function handlePickup() {
    setSession(null, null, "Pickup", undefined, 1, ORDER_TYPE.PICKUP);
  }

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b bg-card px-4 py-2 flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setReservationOpen(true)}
        >
          <HugeiconsIcon icon={Calendar01Icon} size={14} strokeWidth={2} />
          Reserve
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handlePickup}
        >
          <HugeiconsIcon icon={ShoppingBag01Icon} size={14} strokeWidth={2} />
          Pickup
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => navigate("/master/table/tables", { state: { openAdd: true } })}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
          Add Table
        </Button>

        {/* Reminder settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setReminderOpen(true)}
          title="Reservation reminder settings"
        >
          <HugeiconsIcon icon={HotelBellIcon} size={15} strokeWidth={2} />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Stats */}
        <StatPill count={stats.available}  label="free"     colorClass="text-foreground" />
        <StatPill count={stats.occupied}   label="kot sent" colorClass="text-amber-600 dark:text-amber-400" />
        {stats.billPrinted > 0 && (
          <StatPill count={stats.billPrinted} label="bill out" colorClass="text-emerald-600 dark:text-emerald-400" />
        )}
        {stats.reserved > 0 && (
          <StatPill count={stats.reserved} label="reserved" colorClass="text-blue-600 dark:text-blue-400" />
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={2}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by name or code…"
            className="h-8 pl-8 w-52 text-xs"
          />
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => floorQuery.refetch()}
          disabled={floorQuery.isFetching}
          title="Refresh"
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            size={14}
            strokeWidth={2}
            className={floorQuery.isFetching ? "animate-spin" : ""}
          />
        </Button>
      </div>

      {/* ── Color legend ── */}
      <div className="shrink-0 border-b bg-muted/20 px-4 py-1.5 flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Legend</span>
        {[
          { dot: "bg-border ring-1 ring-border",   label: "Available"     },
          { dot: "bg-amber-400 dark:bg-amber-500",  label: "KOT Sent"     },
          { dot: "bg-emerald-500",                  label: "Bill Out"     },
          { dot: "bg-blue-500",                     label: "Reserved Soon" },
          { dot: "bg-blue-400 opacity-50",          label: "Reserved"     },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm shrink-0 ${dot}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

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
                {search ? "No tables match your search." : "No tables configured."}
              </p>
              {!search && (
                <p className="text-xs mt-1 text-muted-foreground/70">
                  Add tables in Master Data → Table Management.
                </p>
              )}
            </div>
            {!search && (
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
    </>
  );
}
