import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingContext } from "../state/billing-context";

// ─── Derive category + group tree from flat menu array ────────────

function buildTree(menu) {
  const catMap = new Map();
  for (const item of menu) {
    const catId   = item.category_id   ?? "__none__";
    const catName = item.category_name ?? "Other";
    if (!catMap.has(catId)) {
      catMap.set(catId, { id: catId, name: catName, groups: new Map() });
    }
    const cat = catMap.get(catId);
    if (item.group_id) {
      cat.groups.set(item.group_id, {
        id:   item.group_id,
        name: item.group_name ?? "General",
      });
    }
  }
  return [...catMap.values()].map((c) => ({
    ...c,
    groups: [...c.groups.values()],
  }));
}

// ─── Nav button ───────────────────────────────────────────────────

function NavBtn({ label, active, depth = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-md transition-colors text-xs leading-snug",
        depth === 0
          ? "px-2.5 py-1.5 font-semibold"
          : "pl-5 pr-2.5 py-1 font-normal",
        active
          ? depth === 0
            ? "bg-primary text-primary-foreground"
            : "bg-primary/15 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function MenuLeftPanel({ menu, isLoading }) {
  const {
    selectedMenuCategoryId,
    selectedMenuGroupId,
    selectMenuCategory,
    selectMenuGroup,
  } = useBillingContext();

  const categories = useMemo(() => buildTree(menu), [menu]);

  const isAll = !selectedMenuCategoryId && !selectedMenuGroupId;

  if (isLoading) {
    return (
      <div className="p-1.5 space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-6 rounded-md w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-1.5 space-y-0.5">
        {/* All items */}
        <NavBtn
          label="All Items"
          active={isAll}
          depth={0}
          onClick={() => { selectMenuCategory(null); selectMenuGroup(null); }}
        />

        {/* Categories + groups */}
        {categories.map((cat) => {
          const isCatActive = selectedMenuCategoryId === cat.id && !selectedMenuGroupId;
          return (
            <div key={cat.id} className="mt-1">
              <NavBtn
                label={cat.name}
                active={isCatActive}
                depth={0}
                onClick={() => {
                  selectMenuCategory(cat.id);
                  selectMenuGroup(null);
                }}
              />
              {cat.groups.map((grp) => (
                <NavBtn
                  key={grp.id}
                  label={grp.name}
                  active={selectedMenuGroupId === grp.id}
                  depth={1}
                  onClick={() => selectMenuGroup(grp.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
