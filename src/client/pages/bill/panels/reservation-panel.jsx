import { useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Add01Icon,
  Search01Icon,
  UserGroupIcon,
  Clock01Icon,
  TableRoundIcon,
  UserAccountIcon,
  SmartPhone01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Refresh01Icon,
  PencilEdit01Icon,
  EyeIcon,
  Invoice03Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useReservations,
  useCreateReservation,
  useUpdateReservation,
  useUpdateReservationStatus,
  useCancelReservation,
  useEmployeesForBilling,
} from "../hooks/use-billing-queries";
import { useFloorView } from "../hooks/use-billing-queries";

// ─── Status config ────────────────────────────────────────────

const RES_STATUS_CFG = {
  RESERVED: {
    dot:   "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    label: "Reserved",
  },
  ARRIVED: {
    dot:   "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    label: "Arrived",
  },
  NO_SHOW: {
    dot:   "bg-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    label: "No Show",
  },
  COMPLETED: {
    dot:   "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
    label: "Completed",
  },
};

// ─── Date helpers ─────────────────────────────────────────────

// Returns YYYY-MM-DD in the browser's LOCAL timezone (not UTC).
// Using toISOString() would give the UTC date which is wrong for IST and
// other timezones that are hours ahead of UTC.
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  return dateStr === getTodayStr();
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  return `${dd}/${mm}/${yyyy} ${weekday}`;
}

function fmtTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

// ─── Form helper UI ───────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
      {children}
    </p>
  );
}

function OptLabel() {
  return (
    <span className="text-muted-foreground font-normal text-[10px] ml-1">optional</span>
  );
}

function FieldError({ children }) {
  return (
    <p className="text-[11px] text-destructive mt-0.5 flex items-center gap-1">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
      {children}
    </p>
  );
}

// ─── Guest Count Stepper ──────────────────────────────────────

function GuestCountStepper({ value, onChange, error }) {
  // Empty string is allowed (no default). Stepper math falls back to 0.
  const count = parseInt(value, 10) || 0;
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        tabIndex={-1}
        onClick={() => onChange(String(Math.max(1, count - 1)))}
        disabled={count <= 1}
      >
        <span className="text-base font-medium leading-none select-none">−</span>
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        required
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
        placeholder="No. of guests"
        className={cn(
          "flex-1 h-9 text-center text-sm font-semibold",
          error && "border-destructive text-destructive focus-visible:ring-destructive/30",
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        tabIndex={-1}
        onClick={() => onChange(String(Math.min(999, Math.max(1, count) + 1)))}
        disabled={count >= 999}
      >
        <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.5} />
      </Button>
    </div>
  );
}

// ─── Table Status Picker ──────────────────────────────────────

const TABLE_STATUS_STYLE = {
  available: {
    dot:      "bg-emerald-500",
    card:     "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600",
    selected: "border-primary bg-primary/10 text-primary",
    hint:     "text-emerald-600 dark:text-emerald-400",
    hintText: "Available",
  },
  reserved: {
    dot:      "bg-amber-500",
    card:     "border-amber-200 dark:border-amber-800 hover:border-amber-400",
    selected: "border-primary bg-primary/10 text-primary",
    hint:     "text-amber-600 dark:text-amber-400",
    hintText: "Reserved",
  },
  occupied: {
    dot:      "bg-red-500",
    card:     "border-red-100 dark:border-red-900 opacity-50 cursor-not-allowed pointer-events-none",
    selected: "",
    hint:     "text-red-500",
    hintText: "Occupied",
  },
};

function getTableDisplayStatus(table) {
  const cs = table.current_status ?? "AVAILABLE";
  if (cs === "OCCUPIED" || cs === "BILL_PRINTED") return "occupied";
  if (cs === "RESERVED") return "reserved";
  return "available";
}

function TableStatusPicker({ tables, value, onChange }) {
  const groups = useMemo(() => {
    const g = {};
    for (const t of tables) {
      const key = t.table_group_name ?? "Tables";
      if (!g[key]) g[key] = [];
      g[key].push(t);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [tables]);

  const hasMultipleGroups = groups.length > 1;

  return (
    <div className="space-y-2">
      {/* Any table option */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onChange("none")}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-xs text-left transition-all",
          value === "none"
            ? "border-primary bg-primary/10 text-primary font-medium"
            : "border-dashed border-border bg-muted/20 hover:border-primary/40 text-muted-foreground",
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
          Any table — assign on arrival
        </div>
      </button>

      {/* Scrollable table grid */}
      {tables.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2 space-y-2.5">
          {groups.map(([groupName, groupTables]) => (
            <div key={groupName}>
              {hasMultipleGroups && (
                <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-0.5 mb-1.5">
                  {groupName}
                </p>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {groupTables.map((t) => {
                  const status = getTableDisplayStatus(t);
                  const cfg = TABLE_STATUS_STYLE[status];
                  const isSelected = value === String(t.id);
                  const isOccupied = status === "occupied";

                  return (
                    <button
                      key={t.id}
                      type="button"
                      tabIndex={-1}
                      disabled={isOccupied}
                      onClick={() => !isOccupied && onChange(String(t.id))}
                      className={cn(
                        "rounded-md border p-2 text-left transition-all",
                        isSelected ? cfg.selected : cfg.card,
                      )}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                        <span className="text-[11px] font-semibold truncate">{t.table_name}</span>
                      </div>
                      <p
                        className={cn(
                          "text-[9px] leading-tight truncate",
                          isSelected ? "text-primary/70" : cfg.hint,
                        )}
                      >
                        {status === "reserved" && t.reservation_time
                          ? `Res. ${fmtTime(t.reservation_time)}`
                          : cfg.hintText}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
        {Object.entries(TABLE_STATUS_STYLE).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {cfg.hintText}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Duration options ─────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: "30",  label: "30 minutes" },
  { value: "60",  label: "1 hour" },
  { value: "90",  label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
];

// ─── New Reservation Form ─────────────────────────────────────

const EMPTY_FORM = {
  tableId:           "none",
  customerName:      "",
  customerMobile:    "",
  guestCount:        "",
  reservationDate:   getTodayStr(),
  reservationTime:   "",
  durationMinutes:   "120",
  preferredWaiterId: "none",
  notes:             "",
};

function NewReservationForm({ tables, employees, onClose, onSaved }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const createMut           = useCreateReservation();
  const enterNav            = useEnterNav({ arrows: true });
  const cancelRef           = useRef(null);
  const saveRef             = useRef(null);
  const notesRef            = useRef(null);

  // Notes is the last field: Enter / Down / Right move focus onto the action
  // buttons (Save) instead of submitting directly. stopPropagation keeps the
  // form-level enterNav handler from also acting (which would submit on Enter).
  function handleNotesKeyDown(e) {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      saveRef.current?.focus();
    } else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      e.stopPropagation();
      saveRef.current?.focus();
    }
  }

  // Left/Right move between the two action buttons; Up goes back to Notes.
  function handleFooterKeyDown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      cancelRef.current?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      saveRef.current?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      notesRef.current?.focus();
    }
  }

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.customerName.trim())  errs.customerName    = "Customer name is required";
    if (!form.reservationDate)      errs.reservationDate = "Date is required";
    if (!form.reservationTime)      errs.reservationTime = "Time is required";
    const gc = parseInt(form.guestCount, 10);
    if (!gc || gc < 1 || gc > 999) errs.guestCount = "Must be between 1 and 999";
    if (!form.customerMobile.trim()) {
      errs.customerMobile = "Mobile number is required";
    } else if (form.customerMobile.replace(/\D/g, "").length !== 10) {
      errs.customerMobile = "Must be exactly 10 digits";
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    createMut.mutate(
      {
        tableId:           form.tableId !== "none" ? parseInt(form.tableId, 10) : null,
        customerName:      form.customerName.trim(),
        customerMobile:    form.customerMobile.trim() || null,
        guestCount:        parseInt(form.guestCount, 10),
        reservationDate:   form.reservationDate,
        reservationTime:   form.reservationTime,
        durationMinutes:   parseInt(form.durationMinutes, 10),
        preferredWaiterId: form.preferredWaiterId !== "none" ? parseInt(form.preferredWaiterId, 10) : null,
        notes:             form.notes.trim() || null,
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setErrors({});
          onSaved?.();
        },
      },
    );
  }

  const pending = createMut.isPending;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-card">
        <span className="font-semibold text-sm">New Reservation</span>
        <Button variant="outline" size="icon-sm" onClick={onClose} disabled={pending} title="Close">
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <form id="reservation-form" onSubmit={handleSubmit} onKeyDown={enterNav} className="p-4 space-y-5">

          {/* ── Guest Info ── */}
          <div className="space-y-3">
            <SectionLabel>Guest Information</SectionLabel>

            <Field>
              <FieldLabel>
                Customer Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder="Guest name or company"
                maxLength={100}
                autoFocus
                required
                className={cn(errors.customerName && "border-destructive focus-visible:ring-destructive/30")}
              />
              {errors.customerName && <FieldError>{errors.customerName}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Mobile <span className="text-destructive">*</span></FieldLabel>
              <Input
                value={form.customerMobile}
                onChange={(e) => set("customerMobile", e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                maxLength={10}
                inputMode="numeric"
                required
                className={cn(errors.customerMobile && "border-destructive focus-visible:ring-destructive/30")}
              />
              {errors.customerMobile && <FieldError>{errors.customerMobile}</FieldError>}
            </Field>
          </div>

          <Separator />

          {/* ── Date & Time ── */}
          <div className="space-y-3">
            <SectionLabel>Date & Time</SectionLabel>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Date <span className="text-destructive">*</span></FieldLabel>
                <DateInput
                  value={form.reservationDate}
                  onChange={(e) => set("reservationDate", e.target.value)}
                  className={cn(errors.reservationDate && "border-destructive")}
                />
                {errors.reservationDate && <FieldError>{errors.reservationDate}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Time <span className="text-destructive">*</span></FieldLabel>
                <Input
                  type="time"
                  value={form.reservationTime}
                  onChange={(e) => set("reservationTime", e.target.value)}
                  required
                  className={cn(errors.reservationTime && "border-destructive")}
                />
                {errors.reservationTime && <FieldError>{errors.reservationTime}</FieldError>}
              </Field>
            </div>

            <Field data-enter-skip>
              <FieldLabel>Duration <OptLabel /></FieldLabel>
              <Select value={form.durationMinutes} onValueChange={(v) => set("durationMinutes", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          {/* ── Table & Covers ── */}
          <div className="space-y-3">
            <SectionLabel>Table & Covers</SectionLabel>

            <Field>
              <FieldLabel>Guests <span className="text-destructive">*</span></FieldLabel>
              <GuestCountStepper
                value={form.guestCount}
                onChange={(v) => set("guestCount", v)}
                error={errors.guestCount}
              />
              {errors.guestCount && <FieldError>{errors.guestCount}</FieldError>}
            </Field>

            <Field data-enter-skip>
              <FieldLabel>Table <OptLabel /></FieldLabel>
              <TableStatusPicker
                tables={tables}
                value={form.tableId}
                onChange={(v) => set("tableId", v)}
              />
            </Field>
          </div>

          <Separator />

          {/* ── Staff & Notes ── */}
          <div className="space-y-3">
            <SectionLabel>Staff & Notes</SectionLabel>

            {employees.length > 0 && (
              <Field data-enter-skip>
                <FieldLabel>Preferred Waiter <OptLabel /></FieldLabel>
                <Select
                  value={form.preferredWaiterId}
                  onValueChange={(v) => set("preferredWaiterId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign on arrival" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Assign on arrival</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel>Notes <OptLabel /></FieldLabel>
              <Input
                ref={notesRef}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                onKeyDown={handleNotesKeyDown}
                placeholder="Special requests, allergies, seating preferences…"
                maxLength={500}
              />
            </Field>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t flex gap-2">
        <Button
          ref={cancelRef}
          type="button"
          variant="outline"
          className="flex-1"
          onKeyDown={handleFooterKeyDown}
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          ref={saveRef}
          type="submit"
          form="reservation-form"
          className="flex-1 gap-2"
          onKeyDown={handleFooterKeyDown}
          disabled={pending}
        >
          {pending && (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          )}
          {pending ? "Saving…" : "Save Reservation"}
        </Button>
      </div>
    </div>
  );
}

// ─── Edit Reservation Form ────────────────────────────────────

function EditReservationForm({ reservation, tables, employees, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    tableId:           reservation.table_id ? String(reservation.table_id) : "none",
    customerName:      reservation.customer_name      ?? "",
    customerMobile:    reservation.customer_mobile    ?? "",
    guestCount:        String(reservation.guest_count ?? 2),
    reservationDate:   reservation.reservation_date   ?? getTodayStr(),
    reservationTime:   reservation.reservation_time   ?? "19:00",
    durationMinutes:   String(reservation.duration_minutes ?? 120),
    preferredWaiterId: reservation.preferred_waiter_id ? String(reservation.preferred_waiter_id) : "none",
    notes:             reservation.notes              ?? "",
  }));
  const [errors, setErrors] = useState({});
  const updateMut = useUpdateReservation();
  const enterNav  = useEnterNav({ arrows: true });
  const cancelRef = useRef(null);
  const saveRef   = useRef(null);
  const notesRef  = useRef(null);

  function handleNotesKeyDown(e) {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      saveRef.current?.focus();
    } else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      e.stopPropagation();
      saveRef.current?.focus();
    }
  }

  function handleFooterKeyDown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      cancelRef.current?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      saveRef.current?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      notesRef.current?.focus();
    }
  }

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.customerName.trim())  errs.customerName    = "Customer name is required";
    if (!form.reservationDate)      errs.reservationDate = "Date is required";
    if (!form.reservationTime)      errs.reservationTime = "Time is required";
    const gc = parseInt(form.guestCount, 10);
    if (!gc || gc < 1 || gc > 999) errs.guestCount = "Must be between 1 and 999";
    if (!form.customerMobile.trim()) {
      errs.customerMobile = "Mobile number is required";
    } else if (form.customerMobile.replace(/\D/g, "").length !== 10) {
      errs.customerMobile = "Must be exactly 10 digits";
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    updateMut.mutate(
      {
        reservationId:     reservation.id,
        tableId:           form.tableId !== "none" ? parseInt(form.tableId, 10) : null,
        customerName:      form.customerName.trim(),
        customerMobile:    form.customerMobile.trim() || null,
        guestCount:        parseInt(form.guestCount, 10),
        reservationDate:   form.reservationDate,
        reservationTime:   form.reservationTime,
        durationMinutes:   parseInt(form.durationMinutes, 10),
        preferredWaiterId: form.preferredWaiterId !== "none" ? parseInt(form.preferredWaiterId, 10) : null,
        notes:             form.notes.trim() || null,
      },
      { onSuccess: () => onSaved?.() },
    );
  }

  const pending = updateMut.isPending;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={2} className="text-muted-foreground" />
          <span className="font-semibold text-sm">Edit Reservation</span>
        </div>
        <Button variant="outline" size="icon-sm" onClick={onClose} disabled={pending} title="Close">
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form id="edit-reservation-form" onSubmit={handleSubmit} onKeyDown={enterNav} className="p-4 space-y-5">

          <div className="space-y-3">
            <SectionLabel>Guest Information</SectionLabel>
            <Field>
              <FieldLabel>Customer Name <span className="text-destructive">*</span></FieldLabel>
              <Input
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder="Guest name or company"
                maxLength={100}
                autoFocus
                required
                className={cn(errors.customerName && "border-destructive focus-visible:ring-destructive/30")}
              />
              {errors.customerName && <FieldError>{errors.customerName}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Mobile <span className="text-destructive">*</span></FieldLabel>
              <Input
                value={form.customerMobile}
                onChange={(e) => set("customerMobile", e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                maxLength={10}
                inputMode="numeric"
                required
                className={cn(errors.customerMobile && "border-destructive focus-visible:ring-destructive/30")}
              />
              {errors.customerMobile && <FieldError>{errors.customerMobile}</FieldError>}
            </Field>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionLabel>Date & Time</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Date <span className="text-destructive">*</span></FieldLabel>
                <DateInput
                  value={form.reservationDate}
                  onChange={(e) => set("reservationDate", e.target.value)}
                  className={cn(errors.reservationDate && "border-destructive")}
                />
                {errors.reservationDate && <FieldError>{errors.reservationDate}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Time <span className="text-destructive">*</span></FieldLabel>
                <Input
                  type="time"
                  value={form.reservationTime}
                  onChange={(e) => set("reservationTime", e.target.value)}
                  required
                  className={cn(errors.reservationTime && "border-destructive")}
                />
                {errors.reservationTime && <FieldError>{errors.reservationTime}</FieldError>}
              </Field>
            </div>
            <Field data-enter-skip>
              <FieldLabel>Duration <OptLabel /></FieldLabel>
              <Select value={form.durationMinutes} onValueChange={(v) => set("durationMinutes", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionLabel>Table & Covers</SectionLabel>
            <Field>
              <FieldLabel>Guests <span className="text-destructive">*</span></FieldLabel>
              <GuestCountStepper value={form.guestCount} onChange={(v) => set("guestCount", v)} error={errors.guestCount} />
              {errors.guestCount && <FieldError>{errors.guestCount}</FieldError>}
            </Field>
            <Field data-enter-skip>
              <FieldLabel>Table <OptLabel /></FieldLabel>
              <TableStatusPicker tables={tables} value={form.tableId} onChange={(v) => set("tableId", v)} />
            </Field>
          </div>

          <Separator />

          <div className="space-y-3">
            <SectionLabel>Staff & Notes</SectionLabel>
            {employees.length > 0 && (
              <Field data-enter-skip>
                <FieldLabel>Preferred Waiter <OptLabel /></FieldLabel>
                <Select value={form.preferredWaiterId} onValueChange={(v) => set("preferredWaiterId", v)}>
                  <SelectTrigger><SelectValue placeholder="Assign on arrival" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Assign on arrival</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel>Notes <OptLabel /></FieldLabel>
              <Input
                ref={notesRef}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                onKeyDown={handleNotesKeyDown}
                placeholder="Special requests, allergies, seating preferences…"
                maxLength={500}
              />
            </Field>
          </div>
        </form>
      </div>

      <div className="shrink-0 px-4 py-3 border-t flex gap-2">
        <Button ref={cancelRef} type="button" variant="outline" className="flex-1" onKeyDown={handleFooterKeyDown} onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button ref={saveRef} type="submit" form="edit-reservation-form" className="flex-1 gap-2" onKeyDown={handleFooterKeyDown} disabled={pending}>
          {pending && <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
          {pending ? "Saving…" : "Update Reservation"}
        </Button>
      </div>
    </div>
  );
}

// ─── Bill View Dialog ─────────────────────────────────────────

function BillViewDialog({ reservation, onClose }) {
  if (!reservation) return null;

  const isPaid    = reservation.bill_status === "PAID";
  const isDue     = reservation.bill_status === "DUE";
  const netAmount = Number(reservation.bill_net_amount ?? 0);

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0">

        {/* ── Receipt Header ── */}
        <div className="bg-primary/5 border-b px-5 py-4 text-center space-y-0.5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-tight">
              Bill Receipt
            </DialogTitle>
          </DialogHeader>
          {(reservation.bill_no || reservation.bill_id) && (
            <p className="text-[11px] text-muted-foreground font-mono">
              #{reservation.bill_no ?? reservation.bill_id}
            </p>
          )}
          {reservation.reservation_date && (
            <p className="text-[11px] text-muted-foreground">
              {fmtDate(reservation.reservation_date)}
              {reservation.reservation_time ? ` · ${fmtTime(reservation.reservation_time)}` : ""}
            </p>
          )}
        </div>

        {/* ── Guest & Table Info ── */}
        <div className="px-5 py-3 border-b space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} />
              Guest
            </div>
            <span className="font-medium text-sm">{reservation.customer_name ?? "Walk-in"}</span>
          </div>
          {reservation.table_name && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <HugeiconsIcon icon={TableRoundIcon} size={11} strokeWidth={2} />
                Table
              </div>
              <span className="font-medium text-sm">{reservation.table_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
              Covers
            </div>
            <span className="font-medium text-sm">{reservation.guest_count} {reservation.guest_count === 1 ? "Guest" : "Guests"}</span>
          </div>
          {reservation.preferred_waiter_name && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} />
                Waiter
              </div>
              <span className="font-medium text-sm">{reservation.preferred_waiter_name}</span>
            </div>
          )}
        </div>

        {/* ── Dashed divider ── */}
        <div className="px-5 py-2">
          <div className="border-t border-dashed border-border" />
        </div>

        {/* ── Amount Block ── */}
        <div className="px-5 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Bill Total</span>
            <span className="text-2xl font-bold tabular-nums tracking-tight">
              ₹{netAmount.toFixed(2)}
            </span>
          </div>

          {/* Payment status pill */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              isPaid
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                : isDue
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  : "bg-muted text-muted-foreground",
            )}>
              {isPaid ? "✓ Paid" : isDue ? "Due" : reservation.bill_status ?? "—"}
            </span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-4 pt-1 border-t bg-muted/20">
          <Button variant="outline" className="w-full h-8 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// ─── Reservation Card ─────────────────────────────────────────

function ReservationCard({ res, onStatusChange, onCancel, onEdit, onViewBill }) {
  const cfg   = RES_STATUS_CFG[res.reservation_status] ?? RES_STATUS_CFG.RESERVED;
  const today = isToday(res.reservation_date);

  return (
    <div className="rounded-xl border bg-card px-3.5 py-3 space-y-2 hover:shadow-xs transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", cfg.dot)} />
          <span className="font-semibold text-sm truncate">
            {res.customer_name ?? "Walk-in"}
          </span>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", cfg.badge)}>
          {cfg.label}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
          <span>
            {today ? "Today" : fmtDate(res.reservation_date)}
            {res.reservation_time ? ` · ${fmtTime(res.reservation_time)}` : ""}
          </span>
        </div>
        {res.table_name && (
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={TableRoundIcon} size={11} strokeWidth={2} />
            <span>{res.table_name}</span>
          </div>
        )}
        {res.customer_mobile && (
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={SmartPhone01Icon} size={11} strokeWidth={2} />
            <span>{res.customer_mobile}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <HugeiconsIcon icon={UserGroupIcon} size={11} strokeWidth={2} />
          <span>{res.guest_count}</span>
        </div>
        {res.preferred_waiter_name && (
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={UserAccountIcon} size={11} strokeWidth={2} />
            <span className="italic">{res.preferred_waiter_name}</span>
          </div>
        )}
      </div>

      {res.notes && (
        <p className="text-[11px] text-muted-foreground/80 italic truncate">{res.notes}</p>
      )}

      {/* Actions */}
      {res.reservation_status === "RESERVED" && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1 gap-1"
            onClick={() => onStatusChange(res.id, "ARRIVED")}
          >
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} strokeWidth={2} />
            Arrived
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1 gap-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/30"
            onClick={() => onStatusChange(res.id, "NO_SHOW")}
          >
            <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={2} />
            No Show
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => onEdit?.(res)}
            title="Edit reservation"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={12} strokeWidth={2} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={() => onCancel(res)}
            title="Cancel reservation"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
          </Button>
        </div>
      )}

      {res.reservation_status === "ARRIVED" && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => onCancel(res)}
          >
            Cancel
          </Button>
        </div>
      )}

      {res.reservation_status === "COMPLETED" && res.bill_id && (
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50 mt-0.5">
          <div className="flex items-center gap-2 text-[11px]">
            {res.bill_no && (
              <span className="text-muted-foreground font-mono">#{res.bill_no}</span>
            )}
            {res.bill_net_amount != null && (
              <span className="font-bold text-foreground tabular-nums">
                ₹{Number(res.bill_net_amount).toFixed(2)}
              </span>
            )}
            {res.bill_status && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                res.bill_status === "PAID"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
              )}>
                {res.bill_status === "PAID" ? "Paid" : res.bill_status}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
            onClick={() => onViewBill?.(res)}
            title="View bill"
          >
            <HugeiconsIcon icon={EyeIcon} size={13} strokeWidth={2} />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Reservation List ─────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "ALL",       label: "All Statuses" },
  { value: "RESERVED",  label: "Reserved" },
  { value: "ARRIVED",   label: "Arrived" },
  { value: "NO_SHOW",   label: "No Show" },
  { value: "COMPLETED", label: "Completed" },
];

const DATE_FILTERS = [
  { value: "ALL",      label: "All Dates" },
  { value: "TODAY",    label: "Today" },
  { value: "UPCOMING", label: "Upcoming" },
];

function ReservationList({ reservations, isLoading, onStatusChange, onCancel, onEdit, onViewBill }) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter,   setDateFilter]   = useState("ALL");

  const filtered = useMemo(() => {
    let list = reservations;
    const todayStr = getTodayStr();

    if (dateFilter === "TODAY")         list = list.filter((r) => r.reservation_date === todayStr);
    else if (dateFilter === "UPCOMING") list = list.filter((r) => r.reservation_date > todayStr);

    if (statusFilter !== "ALL") list = list.filter((r) => r.reservation_status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.customer_name   ?? "").toLowerCase().includes(q) ||
          (r.table_name      ?? "").toLowerCase().includes(q) ||
          (r.customer_mobile ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [reservations, search, statusFilter, dateFilter]);

  const { past, today, upcoming } = useMemo(() => {
    const p = [], t = [], u = [];
    const todayStr = getTodayStr();
    for (const r of filtered) {
      if (r.reservation_date < todayStr) p.push(r);
      else if (r.reservation_date === todayStr) t.push(r);
      else u.push(r);
    }
    return { past: p, today: t, upcoming: u };
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="shrink-0 px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={2}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, table, mobile…"
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <HugeiconsIcon icon={Calendar01Icon} size={40} strokeWidth={1.5} className="opacity-30" />
            <p className="text-sm">
              {search || statusFilter !== "ALL" || dateFilter !== "ALL"
                ? "No reservations match your filters."
                : "No upcoming reservations."}
            </p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Today
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">({today.length})</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {today.map((r) => (
                  <ReservationCard key={r.id} res={r} onStatusChange={onStatusChange} onCancel={onCancel} onEdit={onEdit} onViewBill={onViewBill} />
                ))}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Upcoming
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">({upcoming.length})</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {upcoming.map((r) => (
                  <ReservationCard key={r.id} res={r} onStatusChange={onStatusChange} onCancel={onCancel} onEdit={onEdit} onViewBill={onViewBill} />
                ))}
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                    Past
                  </span>
                  <span className="text-[11px] text-muted-foreground/40">({past.length})</span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                {[...past].reverse().map((r) => (
                  <ReservationCard key={r.id} res={r} onStatusChange={onStatusChange} onCancel={onCancel} onEdit={onEdit} onViewBill={onViewBill} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────

export default function ReservationPanel({ open, onOpenChange }) {
  const [showForm, setShowForm]           = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const [cancelTarget, setCancelTarget]   = useState(null);
  const [billViewTarget, setBillViewTarget] = useState(null);

  const resQuery       = useReservations();
  const floorQuery     = useFloorView();
  const employeesQuery = useEmployeesForBilling();
  const updateStatus   = useUpdateReservationStatus();
  const cancelMut      = useCancelReservation();

  const reservations = resQuery.data     ?? [];
  const tables       = floorQuery.data   ?? [];
  const employees    = employeesQuery.data ?? [];

  function handleStatusChange(reservationId, status) {
    updateStatus.mutate({ reservationId, status });
  }

  function handleConfirmCancel() {
    if (!cancelTarget) return;
    cancelMut.mutate(cancelTarget.id, {
      onSuccess: () => setCancelTarget(null),
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-md p-0 flex flex-col gap-0"
        >
          {/* Panel header */}
          <SheetHeader className="shrink-0 border-b flex-row items-center justify-between gap-2 pl-4 pr-3 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <HugeiconsIcon icon={Calendar01Icon} size={16} strokeWidth={2} className="text-blue-500 shrink-0" />
              <SheetTitle className="text-sm font-semibold truncate">Reservations</SheetTitle>
              {reservations.length > 0 && (
                <span className="shrink-0 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 text-[10px] font-semibold">
                  {reservations.length}
                </span>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => resQuery.refetch()}
                disabled={resQuery.isFetching}
                title="Refresh"
              >
                <HugeiconsIcon
                  icon={Refresh01Icon}
                  size={14}
                  strokeWidth={2}
                  className={resQuery.isFetching ? "animate-spin" : ""}
                />
              </Button>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setShowForm(true)}
              >
                <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.5} />
                New Reservation
              </Button>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onOpenChange(false)}
                title="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
              </Button>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            {showForm ? (
              <NewReservationForm
                tables={tables}
                employees={employees}
                onClose={() => setShowForm(false)}
                onSaved={() => setShowForm(false)}
              />
            ) : editTarget ? (
              <EditReservationForm
                reservation={editTarget}
                tables={tables}
                employees={employees}
                onClose={() => setEditTarget(null)}
                onSaved={() => setEditTarget(null)}
              />
            ) : (
              <ReservationList
                reservations={reservations}
                isLoading={resQuery.isLoading}
                onStatusChange={handleStatusChange}
                onCancel={(res) => setCancelTarget(res)}
                onEdit={(res) => setEditTarget(res)}
                onViewBill={(res) => setBillViewTarget(res)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Bill view dialog */}
      <BillViewDialog reservation={billViewTarget} onClose={() => setBillViewTarget(null)} />

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel the reservation for{" "}
              <span className="font-medium text-foreground">
                {cancelTarget?.customer_name ?? "this guest"}
              </span>
              {cancelTarget?.table_name ? ` at ${cancelTarget.table_name}` : ""}
              {cancelTarget?.reservation_date ? ` on ${fmtDate(cancelTarget.reservation_date)}` : ""}?
              The table will be released back to available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmCancel}
              disabled={cancelMut.isPending}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel Reservation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
