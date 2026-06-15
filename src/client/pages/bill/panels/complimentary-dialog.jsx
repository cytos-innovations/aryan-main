import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  GiftIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  ChefHatIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodTypeDot } from "./menu-center";

// ─────────────────────────────────────────────────────────────
// Complimentary item picker.
//
// Mirrors the middle-panel menu search exactly (same name/code/initials
// matching + ranking), shows the matching items as a scrollable list
// (~10 visible, rest scroll), supports ↑/↓ keyboard navigation, and lets
// the user pick several items. Selected items are listed at the bottom.
// Picked items are added to the order as complimentary (no charge, no tax).
// ─────────────────────────────────────────────────────────────

const VISIBLE_ROWS = 10;
const ROW_PX       = 40; // approx height of one list row

export default function ComplimentaryDialog({ menu = [], onConfirm, onClose }) {
  const [search, setSearch]       = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  // selected: Map(menu_id → menu item)
  const [selected, setSelected]   = useState(() => new Map());

  const searchRef = useRef(null);
  const listRef   = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // ── Same filter + ranking as the menu-center search bar ──────
  const results = useMemo(() => {
    const raw = search.trim();
    if (!raw) return menu;
    const q = raw.toLowerCase();
    const initials = q.replace(/\s+/g, "");

    function matchesInitials(name) {
      const words = (name ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      return words.map((w) => w[0]).join("").startsWith(initials);
    }

    const matched = menu.filter((i) => {
      const name = (i.item_name ?? "").toLowerCase();
      const code = String(i.code ?? "");
      return name.includes(q) || code.includes(q) || matchesInitials(i.item_name ?? "");
    });

    matched.sort((a, b) => {
      const score = (i) => {
        const name = (i.item_name ?? "").toLowerCase();
        const code = String(i.code ?? "").toLowerCase();
        if (code === q)          return 0;
        if (name.startsWith(q))  return 1;
        if (matchesInitials(i.item_name ?? "")) return 2;
        return 3;
      };
      return score(a) - score(b);
    });

    return matched;
  }, [menu, search]);

  // Reset highlight when the result set changes.
  useEffect(() => { setActiveIdx(0); }, [search]);

  // Keep the highlighted row in view as the user arrows through.
  useEffect(() => {
    listRef.current?.querySelector(`[data-row-idx="${activeIdx}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function toggle(item) {
    if (!item) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }

  function handleSearchKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const raw = search.trim();
      // Priority 1: exact item code → toggle directly
      if (raw) {
        const byCode = menu.find(
          (i) => String(i.code ?? "").toLowerCase() === raw.toLowerCase(),
        );
        if (byCode) { toggle(byCode); setSearch(""); return; }
      }
      // Otherwise toggle the highlighted row. Keep the search query so the user can
      // keep arrowing + Enter-ing through the same filtered list to pick several.
      if (results[activeIdx]) toggle(results[activeIdx]);
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  function handleConfirm() {
    onConfirm([...selected.values()]);
  }

  const selectedList = [...selected.values()];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
    >
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-emerald-50/60 dark:bg-emerald-950/20">
          <HugeiconsIcon icon={GiftIcon} size={16} strokeWidth={2} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Complimentary Items</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Added free of charge — no rate or tax. Marked complimentary on the bill.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon} size={13} strokeWidth={2}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search item name or code…"
              className="h-8 pl-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px] font-medium"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Item list — ~10 visible, rest scroll */}
        <div
          ref={listRef}
          className="overflow-y-auto px-2 pb-2"
          style={{ maxHeight: VISIBLE_ROWS * ROW_PX }}
        >
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <HugeiconsIcon icon={ChefHatIcon} size={32} strokeWidth={1.5} className="opacity-25" />
              <p className="text-xs">No items match your search.</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const on = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  data-row-idx={idx}
                  onClick={() => { setActiveIdx(idx); toggle(item); }}
                  className={[
                    "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    // Keyboard cursor: a clear ring + bg so ↑/↓ movement is obvious
                    idx === activeIdx
                      ? "bg-accent ring-2 ring-primary ring-inset"
                      : "hover:bg-accent/60",
                    on && idx !== activeIdx ? "ring-1 ring-emerald-400/60" : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      on ? "bg-emerald-600 border-emerald-600 text-white" : "border-muted-foreground/40",
                    ].join(" ")}
                  >
                    {on && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} strokeWidth={2.5} />}
                  </span>
                  <FoodTypeDot type={item.food_type} size={10} />
                  <span className="flex-1 min-w-0 text-xs font-medium truncate">{item.item_name}</span>
                  {item.code != null && (
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">#{item.code}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Selected items */}
        {selectedList.length > 0 && (
          <div className="shrink-0 border-t bg-muted/20 px-3 py-2 max-h-32 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
              Selected ({selectedList.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedList.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 pl-2 pr-1 py-0.5 text-[11px] font-medium"
                >
                  <span className="truncate max-w-40">{item.item_name}</span>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    className="rounded-full hover:bg-emerald-200/60 dark:hover:bg-emerald-800/60 p-0.5"
                    title="Remove"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/20">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 px-4 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={selectedList.length === 0}
            className="h-8 px-4 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0 disabled:opacity-40"
          >
            <HugeiconsIcon icon={GiftIcon} size={12} strokeWidth={2} />
            Add{selectedList.length > 0 ? ` (${selectedList.length})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
