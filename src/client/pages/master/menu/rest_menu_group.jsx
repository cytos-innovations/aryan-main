import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QK = ["menu-groups"];
const SALE_MODES = [
  { value: "D", label: "Dine In" },
  { value: "T", label: "Take Away" },
  { value: "H", label: "Home Delivery" },
];
const EMPTY = {
  name: "",
  category_id: "",       // required — stays empty string as sentinel for validation
  is_payable: true,
  item_rate: "0",
  applicable_service_tax: false,
  restaurant_sale_mode: "__none__",
  tally_id: "",
};

export default function MenuGroup() {
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs, categoryFilter],
    queryFn: () => invoke("get_menu_groups", {
      qs,
      categoryId: categoryFilter !== "__all__" ? Number(categoryFilter) : null,
    }),
    placeholderData: (prev) => prev,
  });

  const categoriesQuery = useQuery({
    queryKey: ["all-menu-categories"],
    queryFn: () => invoke("get_all_menu_categories"),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_menu_group", {
      name: d.name,
      categoryId: Number(d.category_id),
      isPayable: d.is_payable,
      itemRate: parseFloat(d.item_rate) || 0,
      applicableServiceTax: d.applicable_service_tax,
      restaurantSaleMode: d.restaurant_sale_mode !== "__none__" ? d.restaurant_sale_mode : null,
      tallyId: d.tally_id ? BigInt(d.tally_id) : null,
    }),
    onSuccess: () => { toast.success("Group created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_menu_group", {
      id: d.id,
      name: d.name,
      categoryId: Number(d.category_id),
      isPayable: d.is_payable,
      itemRate: parseFloat(d.item_rate) || 0,
      applicableServiceTax: d.applicable_service_tax,
      restaurantSaleMode: d.restaurant_sale_mode !== "__none__" ? d.restaurant_sale_mode : null,
      tallyId: d.tally_id ? BigInt(d.tally_id) : null,
    }),
    onSuccess: () => { toast.success("Group updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_menu_group_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_menu_group", { id }),
    onSuccess: () => { toast.success("Group deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() { setForm(EMPTY); setDialog({ open: true, mode: "create", data: null }); }
  function openEdit(row) {
    setForm({
      name: row.name,
      category_id: String(row.category_id),
      is_payable: row.is_payable,
      item_rate: String(row.item_rate ?? 0),
      applicable_service_tax: row.applicable_service_tax,
      restaurant_sale_mode: row.restaurant_sale_mode ?? "__none__",
      tally_id: row.tally_id ? String(row.tally_id) : "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }
  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.category_id) { toast.error("Category is required"); return; }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const allCategories = categoriesQuery.data ?? [];

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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group Name" />,
      meta: { label: "Group Name" },
    },
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) => row.original.category_name
        ? row.original.category_name
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Category" },
    },
    {
      accessorKey: "is_payable",
      header: "Payable",
      size: 80,
      cell: ({ row }) => (
        <span className={row.original.is_payable ? "text-green-600 text-xs font-medium" : "text-muted-foreground text-xs"}>
          {row.original.is_payable ? "Yes" : "No"}
        </span>
      ),
      meta: { label: "Payable" },
    },
    {
      accessorKey: "item_rate",
      header: "Item Rate",
      size: 90,
      cell: ({ row }) => row.original.item_rate > 0
        ? row.original.item_rate.toFixed(2)
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Item Rate" },
    },
    {
      accessorKey: "applicable_service_tax",
      header: "Service Tax",
      size: 90,
      cell: ({ row }) => (
        <span className={row.original.applicable_service_tax ? "text-green-600 text-xs font-medium" : "text-muted-foreground text-xs"}>
          {row.original.applicable_service_tax ? "Yes" : "No"}
        </span>
      ),
      meta: { label: "Service Tax" },
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
          <Can perm="menu-group:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="menu-group:delete">
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
          <CardHeader><CardTitle>Menu Groups</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns} data={query.data?.data ?? []} total={query.data?.total ?? 0}
              state={qs} onStateChange={setQs} loading={query.isLoading}
              searchPlaceholder="Search by group name…" emptyText="No groups found."
              toolbar={
                <>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Categories</SelectItem>
                      {allCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Can perm="menu-group:add">
                    <Button size="sm" onClick={openCreate}>
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                      New Group
                    </Button>
                  </Can>
                </>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "New Menu Group" : "Edit Menu Group"}</DialogTitle>
            <DialogDescription>
              {dialog.mode === "create" ? "Create a new menu group." : "Update this group."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Group Name <span className="text-destructive">*</span></FieldLabel>
                <Input value={form.name} maxLength={50}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Group name (max 50 chars)" required />
              </Field>
              <Field>
                <FieldLabel>Category <span className="text-destructive">*</span></FieldLabel>
                <Select value={form.category_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Item Rate</FieldLabel>
                  <Input type="number" min="0" step="0.01"
                    value={form.item_rate}
                    onChange={(e) => setForm((f) => ({ ...f, item_rate: e.target.value }))} />
                </Field>
                <Field>
                  <FieldLabel>Tally ID <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                  <Input type="number" value={form.tally_id}
                    onChange={(e) => setForm((f) => ({ ...f, tally_id: e.target.value }))}
                    placeholder="Tally ID" />
                </Field>
              </div>
              <Field>
                <FieldLabel>Sale Mode <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                <Select value={form.restaurant_sale_mode}
                  onValueChange={(v) => setForm((f) => ({ ...f, restaurant_sale_mode: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select sale mode…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {SALE_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_payable" size="sm"
                    checked={form.is_payable}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_payable: v }))} />
                  <FieldLabel htmlFor="is_payable" className="cursor-pointer">Is Payable</FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="service_tax" size="sm"
                    checked={form.applicable_service_tax}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, applicable_service_tax: v }))} />
                  <FieldLabel htmlFor="service_tax" className="cursor-pointer">Service Tax</FieldLabel>
                </div>
              </div>
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
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
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
