import { useMemo, useState, useRef, useEffect } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit01Icon, Delete01Icon, FilterHorizontalIcon } from "@hugeicons/core-free-icons";

import { Can } from "@/lib/auth";
import { DataTable, DataTableColumnHeader, DEFAULT_QUERY_STATE } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QK = ["menu-cards"];

const EMPTY = {
  code: "",
  name: "",
  menu_group_id: "",
  food_type_id: "",
  item_barcode: "",
  menu_alias: "",
  kitchen_section_id: "__none__",
  rate_1: "0",
  rate_2: "0",
  rate_3: "0",
  rate_4: "0",
  rate_5: "0",
  consume_quantity: "0",
  excise_rate: "0",
  comments: "",
};

function IngredientInput({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value.trim()) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await invoke("search_ingredient_items", { query: value });
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        maxLength={255}
        onChange={(e) => { onChange(e.target.value); }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.name);
                setOpen(false);
              }}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MenuCardPage() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "code", sortDir: "asc" });
  const [groupFilter, setGroupFilter] = useState("__all__");
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [recipeRows, setRecipeRows] = useState([]);

  const query = useQuery({
    queryKey: [...QK, qs, groupFilter, typeFilter],
    queryFn: () =>
      invoke("get_menu_cards", {
        qs,
        menuGroupId: groupFilter !== "__all__" ? Number(groupFilter) : null,
        foodTypeId: typeFilter !== "__all__" ? Number(typeFilter) : null,
      }),
    placeholderData: (prev) => prev,
  });

  const groupsQuery = useQuery({
    queryKey: ["all-menu-groups"],
    queryFn: () => invoke("get_all_menu_groups"),
  });

  const foodTypesQuery = useQuery({
    queryKey: ["all-food-types"],
    queryFn: () => invoke("get_all_food_types"),
  });

  const kitchenSectionsQuery = useQuery({
    queryKey: ["all-kitchen-sections"],
    queryFn: () => invoke("get_kitchen_sections"),
  });

  const unitsQuery = useQuery({
    queryKey: ["all-units-for-recipe"],
    queryFn: () => invoke("get_all_units_for_recipe"),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const allGroups = groupsQuery.data ?? [];
  const allFoodTypes = foodTypesQuery.data ?? [];
  const allKitchenSections = kitchenSectionsQuery.data ?? [];
  const allUnits = unitsQuery.data ?? [];

  // Derive selected group (category name + recipe flag)
  const selectedGroup = useMemo(
    () => (form.menu_group_id ? allGroups.find((g) => String(g.id) === form.menu_group_id) ?? null : null),
    [form.menu_group_id, allGroups],
  );
  const selectedGroupCategory = selectedGroup?.category_name ?? null;
  const showRecipe = selectedGroup?.multiple_recipe === "Y";

  function buildPayload(f) {
    return {
      name: f.name,
      menuGroupId: Number(f.menu_group_id),
      foodTypeId: Number(f.food_type_id),
      itemBarcode: f.item_barcode || null,
      menuAlias: f.menu_alias || null,
      kitchenSectionId: f.kitchen_section_id && f.kitchen_section_id !== "__none__" ? Number(f.kitchen_section_id) : null,
      liquorGroupId: null,
      rate1: parseFloat(f.rate_1) || 0,
      rate2: parseFloat(f.rate_2) || 0,
      rate3: parseFloat(f.rate_3) || 0,
      rate4: parseFloat(f.rate_4) || 0,
      rate5: parseFloat(f.rate_5) || 0,
      consumeQuantity: parseFloat(f.consume_quantity) || 0,
      exciseRate: parseFloat(f.excise_rate) || 0,
      comments: f.comments || null,
    };
  }

  const createMut = useMutation({
    mutationFn: async ({ f, recipes }) => {
      const newId = await invoke("create_menu_card", {
        code: f.code ? Number(f.code) : null,
        ...buildPayload(f),
      });
      await invoke("save_menu_recipes", { menuId: newId, recipes });
    },
    onSuccess: () => { toast.success("Menu card created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: async ({ f, recipes }) => {
      await invoke("update_menu_card", { id: f.id, ...buildPayload(f) });
      await invoke("save_menu_recipes", { menuId: f.id, recipes });
    },
    onSuccess: () => { toast.success("Menu card updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_menu_card_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_menu_card", { id }),
    onSuccess: () => { toast.success("Menu card deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() {
    setForm(EMPTY);
    setRecipeRows([]);
    setDialog({ open: true, mode: "create", data: null });
  }
  async function openEdit(row) {
    setForm({
      id: row.id,
      code: String(row.code),
      name: row.name,
      menu_group_id: String(row.menu_group_id),
      food_type_id: String(row.food_type_id),
      item_barcode: row.item_barcode ?? "",
      menu_alias: row.menu_alias ?? "",
      kitchen_section_id: row.kitchen_section_id ? String(row.kitchen_section_id) : "__none__",
      rate_1: String(row.rate_1 ?? 0),
      rate_2: String(row.rate_2 ?? 0),
      rate_3: String(row.rate_3 ?? 0),
      rate_4: String(row.rate_4 ?? 0),
      rate_5: String(row.rate_5 ?? 0),
      consume_quantity: String(row.consume_quantity ?? 0),
      excise_rate: String(row.excise_rate ?? 0),
      comments: row.comments ?? "",
    });
    setRecipeRows([]);
    setDialog({ open: true, mode: "edit", data: row });

    const group = allGroups.find((g) => g.id === row.menu_group_id);
    if (group?.multiple_recipe === "Y") {
      try {
        const existing = await invoke("get_menu_recipes", { menuId: row.id });
        setRecipeRows(existing.map((r) => ({
          ingredient_name: r.ingredient_name,
          quantity: String(r.quantity),
          unit_id: r.unit_id ? String(r.unit_id) : "",
        })));
      } catch {
        setRecipeRows([]);
      }
    }
  }
  function closeDialog() { setDialog((d) => ({ ...d, open: false })); setRecipeRows([]); }

  function addRecipeRow() {
    setRecipeRows((rows) => [...rows, { ingredient_name: "", quantity: "1", unit_id: "" }]);
  }
  function removeRecipeRow(idx) {
    setRecipeRows((rows) => rows.filter((_, i) => i !== idx));
  }
  function updateRecipeRow(idx, key, value) {
    setRecipeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (!form.menu_group_id) { toast.error("Menu Group is required"); return; }
    if (!form.food_type_id) { toast.error("Food Type is required"); return; }
    if (!(parseFloat(form.rate_1) > 0)) { toast.error("Rate 1 is required and must be greater than 0"); return; }

    const recipes = showRecipe
      ? recipeRows
          .filter((r) => r.ingredient_name.trim() && parseFloat(r.quantity) > 0)
          .map((r) => ({
            ingredientName: r.ingredient_name.trim(),
            quantity: parseFloat(r.quantity),
            unitId: r.unit_id ? Number(r.unit_id) : null,
          }))
      : [];

    if (dialog.mode === "create") createMut.mutate({ f: form, recipes });
    else updateMut.mutate({ f: { id: dialog.data.id, ...form }, recipes });
  }

  const isPending = createMut.isPending || updateMut.isPending;

  const columns = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <div className="text-center">
          <DataTableColumnHeader column={column} title="Code" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {row.original.code}
          </span>
        </div>
      ),
      size: 70,
      meta: { label: "Code" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      meta: { label: "Item Name" },
    },
    {
      accessorKey: "menu_alias",
      header: "Alias",
      cell: ({ row }) =>
        row.original.menu_alias
          ? <span className="text-sm">{row.original.menu_alias}</span>
          : <span className="text-muted-foreground text-xs">—</span>,
      size: 120,
      meta: { label: "Alias" },
    },
    {
      accessorKey: "food_type_name",
      header: "Food Type",
      cell: ({ row }) =>
        row.original.food_type_name
          ? <span className="text-sm">{row.original.food_type_name}</span>
          : <span className="text-muted-foreground text-xs">—</span>,
      size: 120,
      meta: { label: "Food Type" },
    },
    {
      accessorKey: "menu_group_name",
      header: "Group",
      cell: ({ row }) =>
        row.original.menu_group_name
          ? <span className="text-sm">{row.original.menu_group_name}</span>
          : <span className="text-muted-foreground text-xs">—</span>,
      size: 130,
      meta: { label: "Group" },
    },
    {
      accessorKey: "rate_1",
      header: () => <div className="text-right pr-1">Rate 1</div>,
      size: 90,
      cell: ({ row }) => (
        <div className="text-right pr-1 font-mono text-sm tabular-nums">
          {row.original.rate_1.toFixed(2)}
        </div>
      ),
      meta: { label: "Rate 1" },
    },
    {
      accessorKey: "rate_2",
      header: () => <div className="text-right pr-1">Rate 2</div>,
      size: 90,
      cell: ({ row }) => (
        <div className="text-right pr-1 font-mono text-sm tabular-nums">
          {row.original.rate_2 > 0
            ? row.original.rate_2.toFixed(2)
            : <span className="text-muted-foreground text-xs">—</span>}
        </div>
      ),
      meta: { label: "Rate 2" },
    },
    {
      accessorKey: "rate_3",
      header: () => <div className="text-right pr-1">Rate 3</div>,
      size: 90,
      cell: ({ row }) => (
        <div className="text-right pr-1 font-mono text-sm tabular-nums">
          {row.original.rate_3 > 0
            ? row.original.rate_3.toFixed(2)
            : <span className="text-muted-foreground text-xs">—</span>}
        </div>
      ),
      meta: { label: "Rate 3" },
    },
    {
      accessorKey: "rate_4",
      header: () => <div className="text-right pr-1">Rate 4</div>,
      size: 90,
      cell: ({ row }) => (
        <div className="text-right pr-1 font-mono text-sm tabular-nums">
          {row.original.rate_4 > 0
            ? row.original.rate_4.toFixed(2)
            : <span className="text-muted-foreground text-xs">—</span>}
        </div>
      ),
      meta: { label: "Rate 4" },
    },
    {
      accessorKey: "rate_5",
      header: () => <div className="text-right pr-1">Rate 5</div>,
      size: 90,
      cell: ({ row }) => (
        <div className="text-right pr-1 font-mono text-sm tabular-nums">
          {row.original.rate_5 > 0
            ? row.original.rate_5.toFixed(2)
            : <span className="text-muted-foreground text-xs">—</span>}
        </div>
      ),
      meta: { label: "Rate 5" },
    },
    {
      accessorKey: "is_active",
      header: () => <div className="text-center">Active</div>,
      size: 80,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Switch size="sm" checked={row.original.is_active}
            onCheckedChange={() => toggleMut.mutate(row.original)}
            disabled={toggleMut.isPending} />
        </div>
      ),
      meta: { label: "Active" },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      size: 90,
      cell: ({ row }) => (
        <div className="flex justify-center items-center gap-0.5">
          <Can perm="menu-card:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="menu-card:delete">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}>
                  <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </Can>
        </div>
      ),
    },
  ], [toggleMut.isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader><CardTitle>Menu Card</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns} data={query.data?.data ?? []} total={query.data?.total ?? 0}
              state={qs} onStateChange={setQs} loading={query.isLoading}
              initialColumnVisibility={{
                menu_alias: false,
                menu_group_name: false,
                rate_4: false,
                rate_5: false,
              }}
              searchPlaceholder="Search by item name…" emptyText="No menu items found."
              toolbar={
                <>
                  {(() => {
                    const activeCount =
                      (groupFilter !== "__all__" ? 1 : 0) +
                      (typeFilter !== "__all__" ? 1 : 0);
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5">
                            <HugeiconsIcon icon={FilterHorizontalIcon} strokeWidth={2} className="size-3.5" />
                            Filters
                            {activeCount > 0 && (
                              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                                {activeCount}
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-3 space-y-3" align="start">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Group</p>
                            <Select value={groupFilter} onValueChange={setGroupFilter}>
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="All Groups" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">All Groups</SelectItem>
                                {allGroups.map((g) => (
                                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Food Type</p>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="All Types" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">All Types</SelectItem>
                                {allFoodTypes.map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {activeCount > 0 && (
                            <Button variant="ghost" size="sm"
                              className="h-7 w-full text-xs text-muted-foreground"
                              onClick={() => { setGroupFilter("__all__"); setTypeFilter("__all__"); }}>
                              Clear filters
                            </Button>
                          )}
                        </PopoverContent>
                      </Popover>
                    );
                  })()}
                  <Can perm="menu-card:add">
                    <Button size="sm" onClick={openCreate}>
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                      New Item
                    </Button>
                  </Can>
                </>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "New Menu Card Item" : "Edit Menu Card Item"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Add a new item. Leave Code blank to auto-generate. Rate 1 is required."
                : "Update this menu item."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              {/* Row 1 — Code | Item Name */}
              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel>Code</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={form.code}
                    onChange={(e) => setF("code", e.target.value)}
                    placeholder={dialog.mode === "create" ? "Auto" : ""}
                    readOnly={dialog.mode === "edit"}
                    className={dialog.mode === "edit" ? "bg-muted cursor-not-allowed" : ""}
                  />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>
                    Item Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    value={form.name}
                    maxLength={250}
                    onChange={(e) => setF("name", e.target.value)}
                    placeholder="Item name"
                    required
                  />
                </Field>
              </div>

              {/* Row 2 — Menu Group | Category (auto-derived, read-only) */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>
                    Menu Group <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={form.menu_group_id}
                    onValueChange={(v) => { setF("menu_group_id", v); setRecipeRows([]); }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a group…" />
                    </SelectTrigger>
                    <SelectContent>
                      {allGroups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <Input
                    value={selectedGroupCategory ?? ""}
                    readOnly
                    className="bg-muted"
                    placeholder="Auto-filled from group"
                  />
                </Field>
              </div>

              {/* Row 3 — Food Type | Kitchen Section */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>
                    Food Type <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={form.food_type_id}
                    onValueChange={(v) => setF("food_type_id", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFoodTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>
                    Kitchen Section{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <Select
                    value={form.kitchen_section_id}
                    onValueChange={(v) => setF("kitchen_section_id", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select section…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {allKitchenSections.map((k) => (
                        <SelectItem key={k.id} value={String(k.id)}>{k.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Row 4 — Alias | Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>
                    Menu Alias{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <Input
                    value={form.menu_alias}
                    maxLength={250}
                    onChange={(e) => setF("menu_alias", e.target.value)}
                    placeholder="Display alias"
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    Barcode{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <Input
                    value={form.item_barcode}
                    maxLength={100}
                    onChange={(e) => setF("item_barcode", e.target.value)}
                    placeholder="Item barcode"
                  />
                </Field>
              </div>

              {/* Row 5 — Rates (Rate 1 required) */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: "rate_1", label: "Rate 1 *", required: true },
                  { key: "rate_2", label: "Rate 2", required: false },
                  { key: "rate_3", label: "Rate 3", required: false },
                  { key: "rate_4", label: "Rate 4", required: false },
                  { key: "rate_5", label: "Rate 5", required: false },
                ].map(({ key, label, required }) => (
                  <Field key={key}>
                    <FieldLabel>
                      {required
                        ? <>{label.replace(" *", "")} <span className="text-destructive">*</span></>
                        : label}
                    </FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[key]}
                      onChange={(e) => setF(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>

              {/* Row 6 — Consume (Cost Rate) | Excise Rate */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Consume (Cost Rate)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.consume_quantity}
                    onChange={(e) => setF("consume_quantity", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Excise Rate</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.excise_rate}
                    onChange={(e) => setF("excise_rate", e.target.value)}
                  />
                </Field>
              </div>

              {/* Row 7 — Comments */}
              <Field>
                <FieldLabel>
                  Comments{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FieldLabel>
                <Input
                  value={form.comments}
                  onChange={(e) => setF("comments", e.target.value)}
                  placeholder="Optional comments"
                />
              </Field>
            </FieldGroup>

            {/* Recipe Section — shown only when the selected group allows recipes */}
            {showRecipe && (
              <div className="mt-5 border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Menu Recipe</p>
                  <Button type="button" variant="outline" size="sm" onClick={addRecipeRow}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-3.5" />
                    Add Ingredient
                  </Button>
                </div>

                {recipeRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3 border rounded-md">
                    No ingredients added. Click "Add Ingredient" to start.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_90px_140px_32px] gap-2 px-0.5">
                      <span className="text-xs font-medium text-muted-foreground">Ingredient</span>
                      <span className="text-xs font-medium text-muted-foreground">Quantity</span>
                      <span className="text-xs font-medium text-muted-foreground">Unit</span>
                      <span />
                    </div>
                    {recipeRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_90px_140px_32px] gap-2 items-center">
                        <IngredientInput
                          placeholder="Ingredient name"
                          value={row.ingredient_name}
                          onChange={(v) => updateRecipeRow(idx, "ingredient_name", v)}
                        />
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) => updateRecipeRow(idx, "quantity", e.target.value)}
                        />
                        <Select
                          value={row.unit_id}
                          onValueChange={(v) => updateRecipeRow(idx, "unit_id", v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select unit…" />
                          </SelectTrigger>
                          <SelectContent>
                            {allUnits.map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeRecipeRow(idx)}
                        >
                          <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : dialog.mode === "create" ? "Create" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate(deleteTarget.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
