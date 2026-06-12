import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, CheckmarkCircle02Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectItemRate } from "../utils/billing-calc";
import { FoodTypeDot } from "./menu-center";

export default function AddonDialog({
  item,
  mode = "add",   // "add" = from menu grid | "edit" = clicked existing item name
  applicableRate,
  allAddons = [],
  initialSelected = [],
  onConfirm,
  onCreateCustom,
  onClose,
}) {
  const suggested = useMemo(
    () =>
      (item?.addons ?? []).map((a) => ({
        menuId: a.menu_id,
        name:   a.name,
        rate:   selectItemRate(a, applicableRate),
      })),
    [item, applicableRate],
  );

  const [selectedMap, setSelectedMap] = useState(() => new Map());
  const [query, setQuery]             = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx, setActiveIdx]     = useState(0);
  const [customName, setCustomName]   = useState("");
  const [customRate, setCustomRate]   = useState("");
  const [creating, setCreating]       = useState(false);

  // focusable row index within the suggested/added list (-1 = none focused)
  const [rowFocus, setRowFocus]       = useState(-1);

  const searchRef      = useRef(null);
  const dropdownRef    = useRef(null);
  const customNameRef  = useRef(null);
  const customRateRef  = useRef(null);
  const applyBtnRef    = useRef(null);
  // refs for suggested + added rows (rebuilt each render)
  const rowRefs        = useRef([]);

  // Reset whenever dialog opens for a different item/line.
  useEffect(() => {
    const m = new Map();
    for (const a of initialSelected) m.set(a.menuId, a);
    setSelectedMap(m);
    setQuery(""); setCustomName(""); setCustomRate("");
    setDropdownOpen(false); setActiveIdx(0); setRowFocus(-1);
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

  // Focus the row element whenever rowFocus changes (setTimeout lets the DOM settle first).
  useEffect(() => {
    if (rowFocus >= 0) setTimeout(() => rowRefs.current[rowFocus]?.focus(), 0);
  }, [rowFocus]);

  const baseRate   = selectItemRate(item, applicableRate);
  const addonTotal = [...selectedMap.values()].reduce((s, a) => s + (Number(a.rate) || 0), 0);
  const lineRate   = Math.round((baseRate + addonTotal) * 100) / 100;

  function masterRate(a) { return selectItemRate(a, applicableRate); }

  const searchResults = useMemo(() => {
    const available = allAddons.filter((a) => !selectedMap.has(a.menu_id));
    const q = query.trim().toLowerCase();
    if (!q) return available;

    const initials = q.replace(/\s+/g, "");
    function matchesInitials(name) {
      const words = name.toLowerCase().split(/\s+/).filter(Boolean);
      return words.map((w) => w[0]).join("").startsWith(initials);
    }

    const results = available.filter((a) => {
      const name = (a.name ?? "").toLowerCase();
      const code = String(a.code ?? a.menu_id ?? "");
      return name.includes(q) || code.includes(q) || matchesInitials(a.name ?? "");
    });

    results.sort((a, b) => {
      const score = (i) => {
        const name = (i.name ?? "").toLowerCase();
        const code = String(i.code ?? i.menu_id ?? "").toLowerCase();
        if (code === q)                    return 0;
        if (name.startsWith(q))            return 1;
        if (matchesInitials(i.name ?? "")) return 2;
        return 3;
      };
      return score(a) - score(b);
    });

    return results;
  }, [query, allAddons, selectedMap]);

  useEffect(() => { setActiveIdx(0); }, [query, dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const list = dropdownRef.current?.querySelector("[data-addon-list]");
    list?.children[activeIdx]?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, dropdownOpen]);

  // All togglable rows in order: suggested first, then extras (Added section).
  // We build the same list as the JSX renders to keep indices in sync.
  const suggestedIds = useMemo(() => new Set(suggested.map((s) => s.menuId)), [suggested]);
  const extraRows    = useMemo(
    () => [...selectedMap.values()].filter((a) => !suggestedIds.has(a.menuId)),
    [selectedMap, suggestedIds],
  );
  const allRows = useMemo(() => [...suggested, ...extraRows], [suggested, extraRows]);

  function onSearchKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (query.trim()) {
        setDropdownOpen(true);
        setActiveIdx((i) => Math.min(i + 1, searchResults.length - 1));
      } else if (allRows.length > 0) {
        // no query → navigate into suggested/added rows
        setRowFocus(-1);
        setTimeout(() => setRowFocus(0), 0);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (dropdownOpen) setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      // Dropdown open + has result → pick it
      if (dropdownOpen && searchResults[activeIdx]) { addFromMaster(searchResults[activeIdx]); return; }
      if (!query.trim()) {
        if (mode === "add") {
          // Add mode: Enter = focus the Apply/No add-ons button (second Enter confirms)
          applyBtnRef.current?.focus();
        } else {
          // Edit mode: Enter = go to custom name
          customNameRef.current?.focus();
        }
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setDropdownOpen(false); }
  }

  function onRowKeyDown(e, idx) {
    if (e.key === "Enter") {
      e.preventDefault();
      toggleByIndex(idx);
      // move to next row; after last suggested row go to custom name
      const nextIdx = idx + 1;
      if (nextIdx < allRows.length) {
        setRowFocus(-1);
        setTimeout(() => setRowFocus(nextIdx), 0);
      } else {
        customNameRef.current?.focus();
      }
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      toggleByIndex(idx);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (idx < allRows.length - 1) { setRowFocus(-1); setTimeout(() => setRowFocus(idx + 1), 0); }
      else customNameRef.current?.focus();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx > 0) { setRowFocus(-1); setTimeout(() => setRowFocus(idx - 1), 0); }
      else searchRef.current?.focus();
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); searchRef.current?.focus(); }
  }

  function toggleByIndex(idx) {
    const a = allRows[idx];
    if (!a) return;
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(a.menuId)) next.delete(a.menuId);
      else next.set(a.menuId, a);
      return next;
    });
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
    setDropdownOpen(false);
    searchRef.current?.focus();
  }

  function onCustomNameKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (customName.trim()) { customRateRef.current?.focus(); return; }
      // Empty name → go straight to Apply
      applyBtnRef.current?.focus();
    }
    if (e.key === "ArrowUp") { e.preventDefault(); searchRef.current?.focus(); }
  }

  function onCustomRateKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (customName.trim()) { handleAddCustom().then(() => applyBtnRef.current?.focus()); return; }
      applyBtnRef.current?.focus();
    }
  }

  async function handleAddCustom() {
    const name = customName.trim();
    const rate = parseFloat(customRate) || 0;
    if (!name) return;
    if (!onCreateCustom) return;
    setCreating(true);
    try {
      const created = await onCreateCustom({ name, rate });
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

  function handleConfirm() { onConfirm([...selectedMap.values()]); }
  function handleKey(e) { if (e.key === "Escape") onClose(); }

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
          {/* Search */}
          <div className="relative" ref={dropdownRef}>
            <HugeiconsIcon
              icon={Search01Icon} size={13} strokeWidth={2}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
            />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDropdownOpen(!!e.target.value.trim()); }}
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
                      : query.trim() ? "No matching add-ons." : "All add-ons already selected."}
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
              {suggested.map((a, i) => {
                const on = selectedMap.has(a.menuId);
                const globalIdx = i;
                return (
                  <AddonRow
                    key={a.menuId}
                    rowRef={(el) => { rowRefs.current[globalIdx] = el; }}
                    name={a.name} rate={a.rate} on={on}
                    onClick={() => toggle(a)}
                    onKeyDown={(e) => onRowKeyDown(e, globalIdx)}
                  />
                );
              })}
            </div>
          )}

          {/* Added (from search/custom) */}
          {extraRows.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Added</p>
              {extraRows.map((a, i) => {
                const globalIdx = suggested.length + i;
                return (
                  <AddonRow
                    key={a.menuId}
                    rowRef={(el) => { rowRefs.current[globalIdx] = el; }}
                    name={a.name} rate={a.rate} on
                    onClick={() => toggle(a)}
                    onKeyDown={(e) => onRowKeyDown(e, globalIdx)}
                  />
                );
              })}
            </div>
          )}

          {/* Custom add-on */}
          <div className="rounded-lg border border-dashed px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Custom add-on</p>
            <div className="flex items-center gap-2">
              <Input
                ref={customNameRef}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={onCustomNameKeyDown}
                placeholder="Add-on name"
                className="h-8 text-xs flex-1"
              />
              <Input
                ref={customRateRef}
                type="number" min="0" step="0.01"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                onKeyDown={onCustomRateKeyDown}
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
            <Button
              ref={applyBtnRef}
              type="button" size="sm" onClick={handleConfirm}
              className="h-8 px-4 text-xs gap-1"
            >
              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.5} />
              {selectedMap.size > 0 ? "Apply" : "No add-ons"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddonRow({ rowRef, name, rate, on, onClick, onKeyDown }) {
  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={[
        "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
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
