import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, CheckmarkCircle02Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectItemRate } from "../utils/billing-calc";
import { FoodTypeDot } from "./menu-center";

// ─────────────────────────────────────────────────────────────
// Add-on selection dialog.
//
// Used in two ways:
//   • On add — when an item has pre-defined add-ons.
//   • On clicking an existing order line's name — to edit that line's add-ons.
//
// The cashier can: tick the item's suggested add-ons, search ALL add-on master
// items, or type a CUSTOM add-on (name + price). Custom add-ons are saved to the
// add-on master (via onCreateCustom) so they're reusable, but they only apply to
// THIS session line — nothing is permanently attached to the menu item.
// ─────────────────────────────────────────────────────────────

export default function AddonDialog({
  item,
  applicableRate,
  allAddons = [],          // every is_addon master item (for search)
  initialSelected = [],    // [{ menuId, name, rate }] — preselected (edit mode)
  onConfirm,               // (chosen[]) => void
  onCreateCustom,          // async ({ name, rate }) => { menuId, name, rate }
  onClose,
}) {
  // Suggested add-ons = the ones pre-linked to this item, resolved to a rate.
  const suggested = useMemo(
    () =>
      (item?.addons ?? []).map((a) => ({
        menuId: a.menu_id,
        name:   a.name,
        rate:   selectItemRate(a, applicableRate),
      })),
    [item, applicableRate],
  );

  // selectedMap: menuId → { menuId, name, rate }
  const [selectedMap, setSelectedMap] = useState(() => new Map());
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [customName, setCustomName] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [creating, setCreating] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Reset selection whenever the dialog opens for a different item/line.
  useEffect(() => {
    const m = new Map();
    for (const a of initialSelected) m.set(a.menuId, a);
    setSelectedMap(m);
    setQuery(""); setCustomName(""); setCustomRate("");
    setDropdownOpen(false); setActiveIdx(0);
    setTimeout(() => searchRef.current?.focus(), 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // Close dropdown when clicking outside the search area.
  useEffect(() => {
    function onDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const baseRate   = selectItemRate(item, applicableRate);
  const addonTotal = [...selectedMap.values()].reduce((s, a) => s + (Number(a.rate) || 0), 0);
  const lineRate   = Math.round((baseRate + addonTotal) * 100) / 100;

  // Resolve a master add-on's rate at the table's applicable rate.
  function masterRate(a) { return selectItemRate(a, applicableRate); }

  // Dropdown results from the full add-on master (excludes already-selected).
  // Empty query → show ALL available add-ons; otherwise filter by name.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAddons.filter(
      (a) => !selectedMap.has(a.menu_id) && (!q || a.name.toLowerCase().includes(q)),
    );
  }, [query, allAddons, selectedMap]);

  // Keep the active index in range as the list changes.
  useEffect(() => { setActiveIdx(0); }, [query, dropdownOpen]);

  // Scroll the active option into view.
  useEffect(() => {
    if (!dropdownOpen) return;
    const list = dropdownRef.current?.querySelector("[data-addon-list]");
    list?.children[activeIdx]?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, dropdownOpen]);

  function onSearchKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownOpen(true);
      setActiveIdx((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (dropdownOpen && searchResults[activeIdx]) addFromMaster(searchResults[activeIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDropdownOpen(false);
    }
  }

  function toggle(a) {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(a.menuId)) next.delete(a.menuId);
      else next.set(a.menuId, a);
      return next;
    });
  }

  function addFromMaster(a) {
    const entry = { menuId: a.menu_id, name: a.name, rate: masterRate(a) };
    setSelectedMap((prev) => new Map(prev).set(entry.menuId, entry));
    setQuery("");
    setActiveIdx(0);
    setDropdownOpen(true); // keep the list open so more add-ons can be picked
    searchRef.current?.focus();
  }

  async function handleAddCustom() {
    const name = customName.trim();
    const rate = parseFloat(customRate) || 0;
    if (!name) return;
    if (!onCreateCustom) return;
    setCreating(true);
    try {
      const created = await onCreateCustom({ name, rate }); // { menuId, name, rate }
      setSelectedMap((prev) => new Map(prev).set(created.menuId, {
        menuId: created.menuId, name: created.name, rate: created.rate,
      }));
      setCustomName(""); setCustomRate("");
    } catch {
      /* error toast handled by caller */
    } finally {
      setCreating(false);
    }
  }

  function handleConfirm() {
    onConfirm([...selectedMap.values()]);
  }

  function handleKey(e) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKey}
    >
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/30">
          <FoodTypeDot type={item?.food_type} size={11} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{item?.item_name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Add-ons apply to this order only — charges apply only to selected ones
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            ₹{baseRate.toFixed(2)}
          </span>
        </div>

        <div className="px-3 py-2.5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {/* Search box — opens the full add-on list on focus */}
          <div className="relative" ref={dropdownRef}>
            <HugeiconsIcon
              icon={Search01Icon} size={13} strokeWidth={2}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
            />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search add-ons…"
              className="h-8 pl-8 text-xs"
            />
            {dropdownOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-md border bg-popover shadow-md overflow-hidden">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-muted-foreground">
                    {allAddons.length === 0
                      ? "No add-ons found. Create one below."
                      : query.trim()
                        ? "No matching add-ons."
                        : "All add-ons already selected."}
                  </p>
                ) : (
                  <div data-addon-list className="max-h-52 overflow-y-auto">
                    {searchResults.map((a, i) => (
                      <button
                        key={a.menu_id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); addFromMaster(a); }}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={[
                          "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors",
                          i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                        ].join(" ")}
                      >
                        <span className="truncate">{a.name}</span>
                        <span className="text-muted-foreground shrink-0">+₹{masterRate(a).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggested (pre-linked) add-ons */}
          {suggested.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Suggested</p>
              {suggested.map((a) => {
                const on = selectedMap.has(a.menuId);
                return (
                  <AddonRow key={a.menuId} name={a.name} rate={a.rate} on={on} onClick={() => toggle(a)} />
                );
              })}
            </div>
          )}

          {/* Selected add-ons not in the suggested list (from search/custom) */}
          {(() => {
            const suggestedIds = new Set(suggested.map((s) => s.menuId));
            const extra = [...selectedMap.values()].filter((a) => !suggestedIds.has(a.menuId));
            if (extra.length === 0) return null;
            return (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Added</p>
                {extra.map((a) => (
                  <AddonRow key={a.menuId} name={a.name} rate={a.rate} on onClick={() => toggle(a)} />
                ))}
              </div>
            );
          })()}

          {/* Custom add-on */}
          <div className="rounded-lg border border-dashed px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Custom add-on</p>
            <div className="flex items-center gap-2">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustom(); } }}
                placeholder="Add-on name"
                className="h-8 text-xs flex-1"
              />
              <Input
                type="number" min="0" step="0.01"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustom(); } }}
                placeholder="₹"
                className="h-8 text-xs w-20"
              />
              <Button
                type="button" size="sm" variant="outline"
                onClick={handleAddCustom}
                disabled={!customName.trim() || creating}
                className="h-8 px-2.5 text-xs shrink-0"
              >
                <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/20">
          <div className="text-xs text-muted-foreground">
            Line rate:{" "}
            <span className="font-semibold text-foreground tabular-nums">₹{lineRate.toFixed(2)}</span>
            {selectedMap.size > 0 && (
              <span className="text-[10px] ml-1">({selectedMap.size} add-on{selectedMap.size !== 1 ? "s" : ""})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 px-3 text-xs">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleConfirm} className="h-8 px-4 text-xs gap-1">
              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.5} />
              {selectedMap.size > 0 ? "Apply" : "No add-ons"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddonRow({ name, rate, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
        on ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50",
      ].join(" ")}
    >
      <span
        className={[
          "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
          on ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40",
        ].join(" ")}
      >
        {on && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} strokeWidth={2.5} />}
      </span>
      <span className="flex-1 min-w-0 text-xs font-medium truncate">{name}</span>
      <span className={[
        "text-xs font-semibold tabular-nums shrink-0",
        on ? "text-primary" : "text-muted-foreground",
      ].join(" ")}>
        +₹{Number(rate).toFixed(2)}
      </span>
    </button>
  );
}
