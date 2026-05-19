import { useMemo, useState } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QK = ["menu-cards"];
const EMPTY = {
  name: "",
  menu_group_id: "",   // required
  food_type_id: "",    // required
  item_barcode: "",
  menu_alias: "",
  kitchen_section_id: "",
  liquor_group_id: "",
  rate_1: "0",
  rate_2: "0",
  rate_3: "0",
  rate_4: "0",
  rate_5: "0",
  consume_quantity: "0",
  excise_rate: "0",
  comments: "",
};

export default function MenuCardPage() {
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [groupFilter, setGroupFilter] = useState("__all__");
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs, groupFilter, typeFilter],
    queryFn: () => invoke("get_menu_cards", {
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

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  function buildPayload(d) {
    return {
      name: d.name,
      menuGroupId: Number(d.menu_group_id),
      foodTypeId: Number(d.food_type_id),
      itemBarcode: d.item_barcode || null,
      menuAlias: d.menu_alias || null,
      kitchenSectionId: d.kitchen_section_id ? Number(d.kitchen_section_id) : null,
      liquorGroupId: d.liquor_group_id ? Number(d.liquor_group_id) : null,
      rate1: parseFloat(d.rate_1) || 0,
      rate2: parseFloat(d.rate_2) || 0,
      rate3: parseFloat(d.rate_3) || 0,
      rate4: parseFloat(d.rate_4) || 0,
      rate5: parseFloat(d.rate_5) || 0,
      consumeQuantity: parseFloat(d.consume_quantity) || 0,
      exciseRate: parseFloat(d.excise_rate) || 0,
      comments: d.comments || null,
    };
  }

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_menu_card", buildPayload(d)),
    onSuccess: () => { toast.success("Menu card created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_menu_card", { id: d.id, ...buildPayload(d) }),
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

  function openCreate() { setForm(EMPTY); setDialog({ open: true, mode: "create", data: null }); }
  function openEdit(row) {
    setForm({
      name: row.name,
      menu_group_id: String(row.menu_group_id),
      food_type_id: String(row.food_type_id),
      item_barcode: row.item_barcode ?? "",
      menu_alias: row.menu_alias ?? "",
      kitchen_section_id: row.kitchen_section_id ? String(row.kitchen_section_id) : "",
      liquor_group_id: row.liquor_group_id ? String(row.liquor_group_id) : "",
      rate_1: String(row.rate_1 ?? 0),
      rate_2: String(row.rate_2 ?? 0),
      rate_3: String(row.rate_3 ?? 0),
      rate_4: String(row.rate_4 ?? 0),
      rate_5: String(row.rate_5 ?? 0),
      consume_quantity: String(row.consume_quantity ?? 0),
      excise_rate: String(row.excise_rate ?? 0),
      comments: row.comments ?? "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }
  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.menu_group_id) { toast.error("Menu Group is required"); return; }
    if (!form.food_type_id) { toast.error("Food Type is required"); return; }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const allGroups = groupsQuery.data ?? [];
  const allFoodTypes = foodTypesQuery.data ?? [];

  const columns = useMemo(() => [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      size: 60, meta: { label: "#" },
    },
    {
      accessorKey: "code",
      header: "Code",
      size: 90,
      meta: { label: "Code" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Name" />,
      meta: { label: "Item Name" },
    },
    {
      accessorKey: "menu_alias",
      header: "Alias",
      cell: ({ row }) => row.original.menu_alias
        ? row.original.menu_alias
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Alias" },
    },
    {
      accessorKey: "food_type_name",
      header: "Food Type",
      cell: ({ row }) => row.original.food_type_name
        ? row.original.food_type_name
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Food Type" },
    },
    {
      accessorKey: "menu_group_name",
      header: "Group",
      cell: ({ row }) => row.original.menu_group_name
        ? row.original.menu_group_name
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Group" },
    },
    {
      accessorKey: "rate_1",
      header: "Rate 1",
      size: 80,
      cell: ({ row }) => row.original.rate_1.toFixed(2),
      meta: { label: "Rate 1" },
    },
    {
      accessorKey: "rate_2",
      header: "Rate 2",
      size: 80,
      cell: ({ row }) => row.original.rate_2.toFixed(2),
      meta: { label: "Rate 2" },
    },
    {
      accessorKey: "rate_3",
      header: "Rate 3",
      size: 80,
      cell: ({ row }) => row.original.rate_3.toFixed(2),
      meta: { label: "Rate 3" },
    },
    {
      accessorKey: "rate_4",
      header: "Rate 4",
      size: 80,
      cell: ({ row }) => row.original.rate_4.toFixed(2),
      meta: { label: "Rate 4" },
    },
    {
      accessorKey: "rate_5",
      header: "Rate 5",
      size: 80,
      cell: ({ row }) => row.original.rate_5.toFixed(2),
      meta: { label: "Rate 5" },
    },
    {
      accessorKey: "is_active",
      header: "Active",
      size: 80,
      cell: ({ row }) => (
        <Switch size="sm" checked={row.original.is_active}
          onCheckedChange={() => toggleMut.mutate(row.original)}
          disabled={toggleMut.isPending} />
      ),
      meta: { label: "Active" },
    },
    {
      id: "actions", header: "Actions", size: 90,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
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

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader><CardTitle>Menu Card</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns} data={query.data?.data ?? []} total={query.data?.total ?? 0}
              state={qs} onStateChange={setQs} loading={query.isLoading}
              initialColumnVisibility={{ rate_4: false, rate_5: false }}
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
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-full text-xs text-muted-foreground"
                              onClick={() => { setGroupFilter("__all__"); setTypeFilter("__all__"); }}
                            >
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
            <DialogTitle>{dialog.mode === "create" ? "New Menu Card Item" : "Edit Menu Card Item"}</DialogTitle>
            <DialogDescription>
              {dialog.mode === "create" ? "Add a new item to the menu card." : "Update this menu item."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Required fields */}
              <Field>
                <FieldLabel>Item Name <span className="text-destructive">*</span></FieldLabel>
                <Input value={form.name} maxLength={250}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Item name" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Menu Group <span className="text-destructive">*</span></FieldLabel>
                  <Select value={form.menu_group_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, menu_group_id: v }))}>
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
                  <FieldLabel>Food Type <span className="text-destructive">*</span></FieldLabel>
                  <Select value={form.food_type_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, food_type_id: v }))}>
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
              </div>
              {/* Optional identifiers */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Menu Alias <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                  <Input value={form.menu_alias} maxLength={250}
                    onChange={(e) => setForm((f) => ({ ...f, menu_alias: e.target.value }))}
                    placeholder="Display alias" />
                </Field>
                <Field>
                  <FieldLabel>Barcode <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                  <Input value={form.item_barcode} maxLength={100}
                    onChange={(e) => setForm((f) => ({ ...f, item_barcode: e.target.value }))}
                    placeholder="Item barcode" />
                </Field>
              </div>
              {/* Rates */}
              <div className="grid grid-cols-5 gap-2">
                {["rate_1", "rate_2", "rate_3", "rate_4", "rate_5"].map((key, i) => (
                  <Field key={key}>
                    <FieldLabel>Rate {i + 1}</FieldLabel>
                    <Input type="number" min="0" step="0.01"
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </Field>
                ))}
              </div>
              {/* Other numeric */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Consume Qty</FieldLabel>
                  <Input type="number" min="0" step="0.01"
                    value={form.consume_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, consume_quantity: e.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel>Excise Rate</FieldLabel>
                  <Input type="number" min="0" step="0.01"
                    value={form.excise_rate}
                    onChange={(e) => setForm((f) => ({ ...f, excise_rate: e.target.value }))} />
                </Field>
              </div>
              {/* Comments */}
              <Field>
                <FieldLabel>Comments <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                <Input value={form.comments}
                  onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                  placeholder="Optional comments" />
              </Field>
            </FieldGroup>
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
