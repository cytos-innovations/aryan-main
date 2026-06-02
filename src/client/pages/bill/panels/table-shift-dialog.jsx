import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Exchange01Icon,
  ArrowRight01Icon,
  Search01Icon,
  UnfoldMoreIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useOrderItems, useShiftTable, useTransferItems } from "../hooks/use-billing-queries";

// Visual status label + dot for a running session
const STATUS_LABEL = {
  OPEN:         "Open",
  KOT_SENT:     "KOT Sent",
  BILL_PRINTED: "Bill Out",
};

const STATUS_DOT = {
  OPEN:         "bg-muted-foreground/40",
  KOT_SENT:     "bg-amber-400 dark:bg-amber-500",
  BILL_PRINTED: "bg-emerald-500",
};

// ─── Searchable table picker ─────────────────────────────────────
// Trigger button + popover with a search box (name / code) and a
// scrollable, filterable option list.

function TablePicker({ value, onChange, options, placeholder, disabled, emptyText }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(s) ||
        String(o.code ?? "").toLowerCase().includes(s) ||
        (o.group ?? "").toLowerCase().includes(s),
    );
  }, [options, q]);

  // Reset the query each time the popover opens
  useEffect(() => { if (open) setQ(""); }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={[
            "flex h-11 w-full items-center gap-2.5 rounded-lg border bg-card px-3 text-left text-sm transition-colors",
            "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
        >
          {selected ? (
            <>
              {selected.dot && <span className={`size-2 shrink-0 rounded-full ${selected.dot}`} />}
              <span className="font-medium truncate">{selected.primary}</span>
              {selected.secondary && (
                <span className="text-xs text-muted-foreground truncate">· {selected.secondary}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <HugeiconsIcon icon={UnfoldMoreIcon} size={15} strokeWidth={2} className="ml-auto shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0 gap-0 overflow-hidden">
        {/* Search box */}
        <div className="flex items-center gap-2 border-b px-3">
          <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} className="shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or code…"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Options */}
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              {emptyText ?? "No tables found."}
            </div>
          ) : (
            filtered.map((o) => {
              const active = o.value === value;
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm",
                    active ? "bg-muted" : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  {o.dot && <span className={`size-2 shrink-0 rounded-full ${o.dot}`} />}
                  <span className="font-medium truncate">{o.primary}</span>
                  {o.code != null && (
                    <span className="text-[10px] font-mono text-muted-foreground">#{o.code}</span>
                  )}
                  {o.secondary && (
                    <span className="ml-auto text-xs text-muted-foreground truncate">{o.secondary}</span>
                  )}
                  {active && (
                    <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} className="shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Table Shift dialog — vertical stepped flow.
 *   1. Source table (running tables only)
 *   2. Destination table (free tables for a full shift, any table for a merge)
 *   3. All items (full shift) / Select items (partial transfer)
 *
 * @param {boolean}  open
 * @param {Function} onOpenChange
 * @param {Array}    tables          floor-view rows
 * @param {number}   [defaultSessionId]  pre-select this session as the source
 */
export default function TableShiftDialog({ open, onOpenChange, tables = [], defaultSessionId }) {
  const [sourceSessionId, setSourceSessionId] = useState(null);
  const [targetTableId,   setTargetTableId]   = useState(null);
  const [mode,            setMode]            = useState("all"); // "all" | "select"
  const [selectedIds,     setSelectedIds]     = useState(() => new Set());

  const shiftMut    = useShiftTable();
  const transferMut = useTransferItems();
  const busy = shiftMut.isPending || transferMut.isPending;

  // Running tables that can be a source
  const sourceTables = useMemo(
    () => tables.filter((t) => t.session_id != null),
    [tables],
  );

  const sourceTable = useMemo(
    () => sourceTables.find((t) => t.session_id === sourceSessionId) ?? null,
    [sourceTables, sourceSessionId],
  );

  // Picker options ────────────────────────────────────────────────
  const sourceOptions = useMemo(
    () => sourceTables.map((t) => ({
      value:     t.session_id,
      primary:   t.table_name,
      secondary: `${STATUS_LABEL[t.session_status] ?? "Running"}${t.running_total > 0 ? ` · ₹${t.running_total.toFixed(0)}` : ""}`,
      code:      t.code,
      group:     t.table_group_name,
      dot:       STATUS_DOT[t.session_status] ?? STATUS_DOT.OPEN,
    })),
    [sourceTables],
  );

  // Destination options — any table except the source. Free tables receive a
  // fresh/whole session; running tables merge the incoming items into their
  // existing order (handles misplaced orders between two busy tables).
  const destOptions = useMemo(() => {
    return tables
      .filter((t) => !(sourceTable && t.id === sourceTable.id))
      .map((t) => ({
        value:     t.id,
        primary:   t.table_name,
        secondary: t.session_id != null ? "Running · merge" : "Available",
        code:      t.code,
        group:     t.table_group_name,
        dot:       t.session_id != null ? (STATUS_DOT[t.session_status] ?? STATUS_DOT.KOT_SENT) : "bg-muted-foreground/25",
      }));
  }, [tables, sourceTable]);

  // Destination table row (to tell a free table from a running one)
  const destTable   = useMemo(() => tables.find((t) => t.id === targetTableId) ?? null, [tables, targetTableId]);
  const destRunning = destTable?.session_id != null;

  // Live items for the chosen source — needed for "Select items" and for an
  // "All items" move into a running table (merge sends every item across).
  const itemsQuery = useOrderItems(sourceSessionId);
  const activeItems = useMemo(
    () => (itemsQuery.data ?? []).filter((i) => i.item_status === "ACTIVE"),
    [itemsQuery.data],
  );

  // Reset everything when the dialog opens
  useEffect(() => {
    if (open) {
      setSourceSessionId(defaultSessionId ?? null);
      setTargetTableId(null);
      setMode("all");
      setSelectedIds(new Set());
    }
  }, [open, defaultSessionId]);

  // Reset item selection when the source or mode changes — but keep the
  // chosen destination across mode switches.
  useEffect(() => { setSelectedIds(new Set()); }, [sourceSessionId, mode]);

  // Drop the destination only if it is no longer an eligible option
  // (e.g. switching back to "All items" after picking a busy table).
  useEffect(() => {
    if (targetTableId != null && !destOptions.some((o) => o.value === targetTableId)) {
      setTargetTableId(null);
    }
  }, [destOptions, targetTableId]);

  function toggleItem(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedTotal = useMemo(
    () => activeItems.filter((i) => selectedIds.has(i.id)).reduce((s, i) => s + (i.final_amount ?? 0), 0),
    [activeItems, selectedIds],
  );

  // Validation
  const sameTable = sourceTable && targetTableId === sourceTable.id;
  const canSubmit =
    !busy &&
    sourceSessionId != null &&
    targetTableId != null &&
    !sameTable &&
    (mode === "all"
      // Full shift onto a free table needs nothing extra; merging all items
      // into a running table needs at least one item to move.
      ? (!destRunning || activeItems.length > 0)
      : selectedIds.size > 0);

  function handleSubmit() {
    if (!canSubmit) return;
    const close = { onSuccess: () => onOpenChange(false) };

    // All items → free table: clean whole-session shift (keeps session/order no).
    if (mode === "all" && !destRunning) {
      shiftMut.mutate({ sessionId: sourceSessionId, targetTableId }, close);
      return;
    }

    // Otherwise transfer items: all of them (All items → running table merge)
    // or just the picked ones (Select items).
    const itemIds = mode === "all" ? activeItems.map((i) => i.id) : [...selectedIds];
    transferMut.mutate({ sourceSessionId, targetTableId, itemIds }, close);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Exchange01Icon} size={16} strokeWidth={2} className="text-primary shrink-0" />
            <DialogTitle className="text-sm font-semibold">Table Shift</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Source */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Source table</span>
            <TablePicker
              value={sourceSessionId}
              onChange={setSourceSessionId}
              options={sourceOptions}
              placeholder="Choose a running table…"
              emptyText="No running tables."
            />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Destination table</span>
            <TablePicker
              value={targetTableId}
              onChange={setTargetTableId}
              options={destOptions}
              placeholder="Choose a destination…"
              emptyText="No eligible tables."
              disabled={sourceSessionId == null}
            />
          </div>

          {/* Mode toggle */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">What to move</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "all" ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setMode("all")}
              >
                All items
              </Button>
              <Button
                type="button"
                variant={mode === "select" ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setMode("select")}
              >
                Select items
              </Button>
            </div>
          </div>

          {/* Item checklist (select mode) */}
          {mode === "select" && sourceSessionId != null && (
            itemsQuery.isLoading ? (
              <div className="text-xs text-muted-foreground text-center py-3">Loading items…</div>
            ) : activeItems.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No active items.</div>
            ) : (
              <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
                {activeItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <Checkbox checked={selectedIds.has(item.id)} className="pointer-events-none" />
                    <span className="flex-1 text-sm truncate">{item.item_name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">x{item.quantity}</span>
                    <span className="text-xs font-medium tabular-nums w-16 text-right">
                      ₹{(item.final_amount ?? 0).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Helper / summary line */}
          {mode === "all" ? (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {destRunning
                ? "All items (with their KOTs) merge into the destination's running order. The source table becomes free."
                : "Everything — items, KOTs, occupied time and state — moves to the destination. The source table becomes free."}
            </p>
          ) : (
            selectedIds.size > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Moving {selectedIds.size} of {activeItems.length} items · ₹{selectedTotal.toFixed(2)}
              </p>
            )
          )}

          {/* Inline guard */}
          {sameTable && (
            <p className="text-[11px] text-destructive">Pick a different destination table.</p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="flex-1 gap-1.5" onClick={handleSubmit} disabled={!canSubmit}>
            {mode === "all" ? "Shift Table" : "Move Items"}
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
