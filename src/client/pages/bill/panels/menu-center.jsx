import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Add01Icon, ChefHatIcon, ArrowDown01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBillingContext } from "../state/billing-context";
import { selectItemRate } from "../utils/billing-calc";

// ─── Category → group tree (derived from flat menu array) ─────────

function buildMenuTree(menu) {
  const catMap = new Map();
  for (const item of menu) {
    const catId   = item.category_id   ?? "__none__";
    const catName = item.category_name ?? "Other";
    if (!catMap.has(catId)) {
      catMap.set(catId, { id: catId, name: catName, groups: new Map() });
    }
    const cat = catMap.get(catId);
    if (item.group_id) {
      cat.groups.set(item.group_id, { id: item.group_id, name: item.group_name ?? "General" });
    }
  }
  return [...catMap.values()].map((c) => ({ ...c, groups: [...c.groups.values()] }));
}

// ─── Category chip bar (replaces the old left nav) ────────────────

function chipClass(active) {
  return [
    "flex items-center gap-1 h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 border",
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
  ].join(" ");
}

function CategoryChips({ menu }) {
  const {
    selectedMenuCategoryId,
    selectedMenuGroupId,
    selectMenuCategory,
    selectMenuGroup,
  } = useBillingContext();

  const categories = useMemo(() => buildMenuTree(menu), [menu]);
  const [openCat, setOpenCat] = useState(null);

  const isRecent = !selectedMenuCategoryId && !selectedMenuGroupId;

  return (
    <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 border-b overflow-x-auto">
      {/* Recent */}
      <button
        type="button"
        className={chipClass(isRecent)}
        onClick={() => { selectMenuCategory(null); selectMenuGroup(null); setOpenCat(null); }}
      >
        <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
        Recent
      </button>

      {categories.map((cat) => {
        const active    = selectedMenuCategoryId === cat.id;
        const hasGroups = cat.groups.length > 0;

        if (!hasGroups) {
          return (
            <button
              key={cat.id}
              type="button"
              className={chipClass(active)}
              onClick={() => { selectMenuCategory(cat.id); selectMenuGroup(null); setOpenCat(null); }}
            >
              {cat.name}
            </button>
          );
        }

        return (
          <Popover key={cat.id} open={openCat === cat.id} onOpenChange={(o) => setOpenCat(o ? cat.id : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={chipClass(active)}
                onClick={() => { selectMenuCategory(cat.id); selectMenuGroup(null); setOpenCat(openCat === cat.id ? null : cat.id); }}
              >
                {cat.name}
                <HugeiconsIcon icon={ArrowDown01Icon} size={11} strokeWidth={2} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              avoidCollisions={false}
              className="w-48 p-1 z-50"
            >
              <button
                type="button"
                onClick={() => { selectMenuCategory(cat.id); selectMenuGroup(null); setOpenCat(null); }}
                className={[
                  "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  active && !selectedMenuGroupId ? "bg-primary/10 text-primary" : "hover:bg-muted",
                ].join(" ")}
              >
                All {cat.name}
              </button>
              <div className="my-1 border-t" />
              {cat.groups.map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => { selectMenuGroup(grp.id); setOpenCat(null); }}
                  className={[
                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors",
                    selectedMenuGroupId === grp.id ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {grp.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

// ─── Recent item IDs (localStorage) ──────────────────────────────

const RECENTS_KEY = "pos-recent-menu-ids";

export function pushRecentId(id) {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    const next = [id, ...ids.filter((x) => x !== id)].slice(0, 40);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {}
}

function getRecentIds() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]"); }
  catch { return []; }
}

// ─── Food type normaliser ─────────────────────────────────────────
// food_type comes from the user-defined food_type master (free text),
// so we normalise before matching to handle "Non Veg", "Non-Veg", etc.

export function normalizeFoodType(type) {
  if (!type) return null;
  const t = type.toUpperCase().replace(/[\s\-]+/g, "_").replace(/_+/g, "_").trim();
  if (t === "NON_VEG" || t === "NONVEG") return "NON_VEG";
  if (t === "VEGAN")                      return "VEGAN";
  if (t === "VEG")                        return "VEG";
  if (t === "EGG" || t === "EGGS")        return "EGG";
  return t;
}

// ─── Food type indicator (Indian packaging standard) ──────────────

export function FoodTypeDot({ type, size = 10 }) {
  if (!type) return null;
  const s = size;
  const cx = s / 2;
  switch (normalizeFoodType(type)) {
    case "VEG":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0" aria-label="Veg">
          <rect x="0.6" y="0.6" width={s - 1.2} height={s - 1.2} rx="1"
            fill="none" stroke="#16a34a" strokeWidth="1.2" />
          <circle cx={cx} cy={cx} r={cx - 2} fill="#16a34a" />
        </svg>
      );
    case "NON_VEG":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0" aria-label="Non-veg">
          <rect x="0.6" y="0.6" width={s - 1.2} height={s - 1.2} rx="1"
            fill="none" stroke="#b91c1c" strokeWidth="1.2" />
          <polygon points={`${cx},1.8 ${s - 1.8},${s - 1.8} 1.8,${s - 1.8}`} fill="#b91c1c" />
        </svg>
      );
    case "EGG":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0" aria-label="Egg">
          <rect x="0.6" y="0.6" width={s - 1.2} height={s - 1.2} rx="1"
            fill="none" stroke="#ca8a04" strokeWidth="1.2" />
          <polygon points={`${cx},1.8 ${s - 1.8},${s - 1.8} 1.8,${s - 1.8}`} fill="#ca8a04" />
        </svg>
      );
    case "VEGAN":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0" aria-label="Vegan">
          <rect x="0.6" y="0.6" width={s - 1.2} height={s - 1.2} rx="1"
            fill="none" stroke="#16a34a" strokeWidth="1.2" />
          <ellipse cx={cx} cy={cx + 0.5} rx={cx - 1.8} ry={cx - 2.5} fill="#16a34a" />
          <line x1={cx} y1={s - 1.5} x2={cx} y2={2} stroke="#fff" strokeWidth="0.8" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Food type legend ─────────────────────────────────────────────

const FOOD_TYPE_LEGEND = [
  { type: "VEG",     label: "Veg" },
  { type: "NON_VEG", label: "Non-Veg" },
  { type: "EGG",     label: "Egg" },
  { type: "VEGAN",   label: "Vegan" },
];

function FoodTypeLegend() {
  return (
    <div className="shrink-0 flex items-center gap-3 px-2.5 py-1 border-b bg-card/60">
      {FOOD_TYPE_LEGEND.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-1">
          <FoodTypeDot type={type} size={10} />
          <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Menu Item Card ───────────────────────────────────────────────

function MenuItemCard({ item, applicableRate, onClick, isAdding }) {
  const price = selectItemRate(item, applicableRate);

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      disabled={isAdding}
      className={[
        "relative flex flex-col rounded-lg border bg-card text-left",
        "cursor-pointer select-none overflow-hidden",
        "hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm",
        "active:scale-[0.97] transition-all duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:opacity-60 disabled:pointer-events-none",
        "group p-2.5",
      ].join(" ")}
    >
      {/* Food type strip on left edge */}
      {item.food_type && (
        <div className={[
          "absolute top-0 left-0 bottom-0 w-0.5",
          normalizeFoodType(item.food_type) === "VEG"     ? "bg-green-500"  :
          normalizeFoodType(item.food_type) === "NON_VEG" ? "bg-red-600"    :
          normalizeFoodType(item.food_type) === "EGG"     ? "bg-yellow-500" :
          normalizeFoodType(item.food_type) === "VEGAN"   ? "bg-green-600"  : "bg-transparent",
        ].join(" ")} />
      )}

      {/* Header row */}
      <div className="flex items-start gap-1.5 pl-1">
        <FoodTypeDot type={item.food_type} size={10} />
        <span className="flex-1 text-xs font-medium leading-snug line-clamp-2 min-w-0">
          {item.item_name}
        </span>
      </div>


      {/* Price + add icon */}
      <div className="mt-auto pt-2 flex items-end justify-between pl-1">
        <span className="text-xs font-bold tabular-nums text-foreground">
          ₹{price.toFixed(2)}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity rounded bg-primary/10 p-0.5">
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.5} className="text-primary" />
        </div>
      </div>

      {/* Liquor badge */}
      {item.is_liquor && (
        <span className="absolute top-1.5 right-1.5 text-[8px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1 rounded-sm leading-none py-0.5">
          LIQ
        </span>
      )}
    </button>
  );
}

// ─── Section label ────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="col-span-full mt-1 mb-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
      {children}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────

function CenterSkeleton() {
  return (
    <div className="p-2 grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2">
      {Array.from({ length: 24 }).map((_, i) => (
        <Skeleton key={i} className="h-72px rounded-lg" />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function MenuCenterPanel({ menu, isLoading, onAddItem, applicableRate, addingId, onSearchRef }) {
  const { selectedMenuGroupId, selectedMenuCategoryId } = useBillingContext();
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  // Expose search ref to parent so it can refocus after qty entry
  useEffect(() => {
    onSearchRef?.(searchRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus search bar whenever the panel mounts (new order / table open)
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Read recents once on mount; don't re-sort during the session to prevent
  // card positions shifting under the user's finger between taps.
  // pushRecentId() still writes to localStorage so the next session sees updates.
  const recentIds = useMemo(() => getRecentIds(), []);

  const isFiltered = !!search.trim() || !!selectedMenuGroupId || !!selectedMenuCategoryId;

  // Items to show in filtered view
  const filteredItems = useMemo(() => {
    if (search.trim()) {
      const raw = search.trim();
      const q   = raw.toLowerCase();
      // Initials query: strip spaces → "m k s" or "mks" → "mks"
      const initials = q.replace(/\s+/g, "");

      // Helper: does item name's initials start with the query initials?
      function matchesInitials(name) {
        const words = name.toLowerCase().split(/\s+/).filter(Boolean);
        const nameInitials = words.map((w) => w[0]).join("");
        return nameInitials.startsWith(initials);
      }

      const results = menu.filter((i) => {
        const name = (i.item_name ?? "").toLowerCase();
        const code = String(i.code ?? "");
        return (
          name.includes(q) ||
          code.includes(q) ||
          matchesInitials(i.item_name ?? "")
        );
      });

      // Sort: exact code → name starts with → initials → contains
      results.sort((a, b) => {
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

      return results;
    }
    if (selectedMenuGroupId) {
      return menu.filter((i) => i.group_id === selectedMenuGroupId);
    }
    if (selectedMenuCategoryId) {
      return menu.filter((i) => i.category_id === selectedMenuCategoryId);
    }
    return menu;
  }, [menu, search, selectedMenuGroupId, selectedMenuCategoryId]);

  // Quick-access items shown when no filter is active (recents + fill to 15)
  const quickItems = useMemo(() => {
    if (isFiltered) return null;
    const recentSet = new Set(recentIds);
    const recents = recentIds
      .map((id) => menu.find((i) => i.id === id))
      .filter(Boolean);
    const extra = menu
      .filter((i) => !recentSet.has(i.id))
      .slice(0, Math.max(0, 15 - recents.length));
    return [...recents, ...extra];
  }, [menu, recentIds, isFiltered]);

  const displayItems = isFiltered ? filteredItems : quickItems ?? [];
  const showRecents  = !isFiltered;

  if (isLoading) return <CenterSkeleton />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Search ── */}
      <div className="shrink-0 px-2 py-1.5 border-b bg-card/80 backdrop-blur-sm">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={12}
            strokeWidth={2}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            ref={searchRef}
            data-pos-search
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              // POS action keys: prevent typing into search bar, let them bubble to BottomActionBar
              if (e.key === "*" || e.key === "/") { e.preventDefault(); return; }

              if (e.key === "Tab" && !e.shiftKey) {
                // Forward Tab: jump to the first enabled POS action button
                e.preventDefault();
                for (const action of ["kotprint", "billprint", "settle"]) {
                  const el = document.querySelector(`[data-pos-action="${action}"]`);
                  if (el && !el.disabled) { el.focus(); return; }
                }
                return;
              }
              if (e.key !== "Enter") return;
              e.preventDefault();
              const q = search.trim();
              if (!q) return;
              // Priority 1: exact item code match
              const byCode = menu.find(
                (i) => String(i.code ?? "").toLowerCase() === q.toLowerCase(),
              );
              if (byCode) { onAddItem(byCode); setSearch(""); return; }
              // Priority 2: exact initials match (e.g. "mks" → "Mutton Seekh Kabab")
              const initials = q.toLowerCase().replace(/\s+/g, "");
              const byInitials = menu.filter((i) => {
                const words = (i.item_name ?? "").toLowerCase().split(/\s+/).filter(Boolean);
                return words.map((w) => w[0]).join("") === initials;
              });
              if (byInitials.length === 1) { onAddItem(byInitials[0]); setSearch(""); return; }
              // Priority 3: single filtered result
              if (filteredItems.length === 1) { onAddItem(filteredItems[0]); setSearch(""); }
            }}
            placeholder="Search item name or code…"
            className="h-7 pl-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px] font-medium"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Category chip bar ── */}
      <CategoryChips menu={menu} />

      {/* ── Food type legend ── */}
      <FoodTypeLegend />

      {/* ── Items grid ── */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <HugeiconsIcon icon={ChefHatIcon} size={36} strokeWidth={1.5} className="opacity-25" />
            <p className="text-xs text-center">
              {search ? "No items match your search." : "No items in this section."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2">
            {showRecents && <SectionLabel>Recent</SectionLabel>}
            {displayItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                applicableRate={applicableRate}
                onClick={onAddItem}
                isAdding={addingId === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
