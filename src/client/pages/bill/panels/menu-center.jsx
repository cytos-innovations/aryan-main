import { useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Add01Icon, ChefHatIcon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingContext } from "../state/billing-context";
import { selectItemRate } from "../utils/billing-calc";

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

// ─── Food type indicator (Indian packaging standard) ──────────────

export function FoodTypeDot({ type, size = 10 }) {
  if (!type) return null;
  const s = size;
  const cx = s / 2;
  switch (type.toUpperCase()) {
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
          item.food_type === "VEG"     ? "bg-green-500" :
          item.food_type === "NON_VEG" ? "bg-red-600"   :
          item.food_type === "EGG"     ? "bg-yellow-500" :
          item.food_type === "VEGAN"   ? "bg-green-600"  : "bg-transparent",
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
    <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {Array.from({ length: 24 }).map((_, i) => (
        <Skeleton key={i} className="h-72px rounded-lg" />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function MenuCenterPanel({ menu, isLoading, onAddItem, applicableRate, addingId }) {
  const { selectedMenuGroupId, selectedMenuCategoryId } = useBillingContext();
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  // Read recents once on mount; don't re-sort during the session to prevent
  // card positions shifting under the user's finger between taps.
  // pushRecentId() still writes to localStorage so the next session sees updates.
  const recentIds = useMemo(() => getRecentIds(), []);

  const isFiltered = !!search.trim() || !!selectedMenuGroupId || !!selectedMenuCategoryId;

  // Items to show in filtered view
  const filteredItems = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return menu.filter(
        // Guard against null/undefined item_name from the backend
        (i) => (i.item_name ?? "").toLowerCase().includes(q) ||
               String(i.code ?? "").includes(q),
      );
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
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault(); // never let Enter propagate or trigger form submission
              // Single match → add immediately and clear search (POS shortcut)
              if (filteredItems.length === 1) {
                onAddItem(filteredItems[0]);
                setSearch("");
              }
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {showRecents && <SectionLabel>Quick Access</SectionLabel>}
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
