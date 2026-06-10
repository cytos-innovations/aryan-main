import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Exchange01Icon,
  ArrowRight01Icon,
  Search01Icon,
  UnfoldMoreIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
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

import { useOrderItems, useShiftTable, useTransferItemsWithQty } from "../hooks/use-billing-queries";

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

function TablePicker({ value, onChange, options, placeholder, disabled, emptyText, triggerRef, onEnter }) {
  const [open, setOpen]       = useState(false);
  const [q, setQ]             = useState("");
  const [cursor, setCursor]   = useState(-1);
  const listRef               = useRef(null);
  const itemRefs              = useRef([]);

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

  // Reset query and cursor each time the popover opens
  useEffect(() => {
    if (open) { setQ(""); setCursor(-1); }
  }, [open]);

  // Reset cursor when filtered list changes
  useEffect(() => { setCursor(-1); }, [filtered]);

  // Scroll the highlighted item into view
  useEffect(() => {
    if (cursor >= 0 && itemRefs.current[cursor]) {
      itemRefs.current[cursor].scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) {
        onChange(filtered[cursor].value);
        setOpen(false);
        onEnter?.();
      } else if (value != null) {
        setOpen(false);
        onEnter?.();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function pick(val) { onChange(val); setOpen(false); }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          ref={triggerRef}
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

      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0 gap-0">
        {/* Search box */}
        <div className="flex items-center gap-2 border-b px-3">
          <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} className="shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or code…"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Options */}
        <div
          ref={listRef}
          className="max-h-60 overflow-y-auto p-1"
          onWheel={(e) => {
            e.stopPropagation();
            listRef.current.scrollTop += e.deltaY;
          }}
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              {emptyText ?? "No tables found."}
            </div>
          ) : (
            filtered.map((o, idx) => {
              const active      = o.value === value;
              const highlighted = idx === cursor;
              return (
                <button
                  type="button"
                  key={o.value}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onClick={() => pick(o.value)}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm",
                    highlighted ? "bg-accent text-accent-foreground" : active ? "bg-muted" : "hover:bg-muted/50",
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
  // Map<itemId, qty> — qty is how many units to move (defaults to full qty when checked)
  const [selectedQtys,    setSelectedQtys]    = useState(() => new Map());

  const destPickerRef = useRef(null);

  const shiftMut    = useShiftTable();
  const transferMut = useTransferItemsWithQty();
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
      setSelectedQtys(new Map());
    }
  }, [open, defaultSessionId]);

  // Reset item selection when the source or mode changes — but keep the
  // chosen destination across mode switches.
  useEffect(() => { setSelectedQtys(new Map()); }, [sourceSessionId, mode]);

  // Drop the destination only if it is no longer an eligible option
  // (e.g. switching back to "All items" after picking a busy table).
  useEffect(() => {
    if (targetTableId != null && !destOptions.some((o) => o.value === targetTableId)) {
      setTargetTableId(null);
    }
  }, [destOptions, targetTableId]);

  function toggleItem(item) {
    setSelectedQtys((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item.quantity ?? 1);
      }
      return next;
    });
  }

  function setItemQty(itemId, fullQty, val) {
    const parsed = parseFloat(val);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    const clamped = Math.min(parsed, fullQty);
    setSelectedQtys((prev) => {
      const next = new Map(prev);
      next.set(itemId, clamped);
      return next;
    });
  }

  const selectedTotal = useMemo(() => {
    return activeItems.reduce((s, item) => {
      if (!selectedQtys.has(item.id)) return s;
      const moveQty  = selectedQtys.get(item.id);
      const fullQty  = item.quantity ?? 1;
      const ratio    = moveQty / fullQty;
      return s + (item.final_amount ?? 0) * ratio;
    }, 0);
  }, [activeItems, selectedQtys]);

  // Validation
  const sameTable = sourceTable && targetTableId === sourceTable.id;
  const canSubmit =
    !busy &&
    sourceSessionId != null &&
    targetTableId != null &&
    !sameTable &&
    (mode === "all"
      ? (!destRunning || activeItems.length > 0)
      : selectedQtys.size > 0);

  function handleSubmit() {
    if (!canSubmit) return;
    const close = { onSuccess: () => onOpenChange(false) };

    // All items → free table: clean whole-session shift (keeps session/order no).
    if (mode === "all" && !destRunning) {
      shiftMut.mutate({ sessionId: sourceSessionId, targetTableId }, close);
      return;
    }

    // Build items array with qty for the new command
    const items = mode === "all"
      ? activeItems.map((i) => ({ item_id: i.id, qty: i.quantity ?? 1 }))
      : activeItems
          .filter((i) => selectedQtys.has(i.id))
          .map((i) => ({ item_id: i.id, qty: selectedQtys.get(i.id) }));

    transferMut.mutate({ sourceSessionId, targetTableId, items }, close);
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
              onEnter={() => destPickerRef.current?.focus()}
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
              triggerRef={destPickerRef}
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
                {activeItems.map((item) => {
                  const isChecked = selectedQtys.has(item.id);
                  const fullQty   = item.quantity ?? 1;
                  const moveQty   = selectedQtys.get(item.id) ?? fullQty;
                  return (
                    <div key={item.id} className="flex items-center gap-2.5 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleItem(item)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:bg-muted/50 rounded"
                      >
                        <Checkbox checked={isChecked} className="pointer-events-none shrink-0" />
                        <span className="flex-1 text-sm truncate">{item.item_name}</span>
                      </button>

                      {isChecked && fullQty > 1 ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setItemQty(item.id, fullQty, moveQty - 1)}
                            className="size-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted text-base leading-none"
                          >−</button>
                          <input
                            type="number"
                            min={1}
                            max={fullQty}
                            step={1}
                            value={moveQty}
                            onChange={(e) => setItemQty(item.id, fullQty, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 text-center text-xs tabular-nums bg-muted rounded border-0 outline-none focus:ring-1 focus:ring-ring py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => setItemQty(item.id, fullQty, moveQty + 1)}
                            className="size-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted text-base leading-none"
                          >+</button>
                          <span className="text-[10px] text-muted-foreground">/{fullQty}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">x{fullQty}</span>
                      )}

                      <span className="text-xs font-medium tabular-nums w-16 text-right shrink-0">
                        ₹{((item.final_amount ?? 0) * (isChecked ? moveQty / fullQty : 1)).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
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
            selectedQtys.size > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Moving {selectedQtys.size} of {activeItems.length} items · ₹{selectedTotal.toFixed(2)}
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
