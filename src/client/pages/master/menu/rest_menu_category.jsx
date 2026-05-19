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
import { Checkbox } from "@/components/ui/checkbox";
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

const QK = ["menu-categories"];
const CATEGORY_TYPES = [
  { value: "F", label: "Food" },
  { value: "B", label: "Beverage" },
  { value: "L", label: "Liquor" },
  { value: "O", label: "Other" },
];
const EMPTY = {
  name: "",
  category_type: "__none__",
  allow_discount: false,
  max_discount_percent: "0",
  auto_discount_percent: "0",
  tally_code: "",
  unit_id: "",
};

export default function MenuCategory() {
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_menu_categories", { qs }),
    placeholderData: (prev) => prev,
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_menu_category", {
      name: d.name,
      categoryType: d.category_type !== "__none__" ? d.category_type : null,
      allowDiscount: d.allow_discount,
      maxDiscountPercent: parseFloat(d.max_discount_percent) || 0,
      autoDiscountPercent: parseFloat(d.auto_discount_percent) || 0,
      tallyCode: d.tally_code ? parseInt(d.tally_code) : null,
      unitId: d.unit_id ? parseInt(d.unit_id) : null,
    }),
    onSuccess: () => { toast.success("Category created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_menu_category", {
      id: d.id,
      name: d.name,
      categoryType: d.category_type !== "__none__" ? d.category_type : null,
      allowDiscount: d.allow_discount,
      maxDiscountPercent: parseFloat(d.max_discount_percent) || 0,
      autoDiscountPercent: parseFloat(d.auto_discount_percent) || 0,
      tallyCode: d.tally_code ? parseInt(d.tally_code) : null,
      unitId: d.unit_id ? parseInt(d.unit_id) : null,
    }),
    onSuccess: () => { toast.success("Category updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_menu_category_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_menu_category", { id }),
    onSuccess: () => { toast.success("Category deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() { setForm(EMPTY); setDialog({ open: true, mode: "create", data: null }); }
  function openEdit(row) {
    setForm({
      name: row.name,
      category_type: row.category_type ?? "__none__",
      allow_discount: row.allow_discount,
      max_discount_percent: String(row.max_discount_percent ?? 0),
      auto_discount_percent: String(row.auto_discount_percent ?? 0),
      tally_code: row.tally_code ? String(row.tally_code) : "",
      unit_id: row.unit_id ? String(row.unit_id) : "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }
  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

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
      accessorKey: "category_type",
      header: "Type",
      size: 80,
      cell: ({ row }) => {
        const t = CATEGORY_TYPES.find((x) => x.value === row.original.category_type);
        return t ? t.label : <span className="text-muted-foreground text-xs">—</span>;
      },
      meta: { label: "Type" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category Name" />,
      meta: { label: "Category Name" },
    },
    {
      accessorKey: "allow_discount",
      header: "Discount",
      size: 80,
      cell: ({ row }) => (
        <span className={row.original.allow_discount ? "text-green-600 text-xs font-medium" : "text-muted-foreground text-xs"}>
          {row.original.allow_discount ? "Yes" : "No"}
        </span>
      ),
      meta: { label: "Discount" },
    },
    {
      accessorKey: "max_discount_percent",
      header: "Max %",
      size: 80,
      cell: ({ row }) => row.original.max_discount_percent > 0
        ? `${row.original.max_discount_percent.toFixed(2)}%`
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Max %" },
    },
    {
      accessorKey: "auto_discount_percent",
      header: "Auto %",
      size: 80,
      cell: ({ row }) => row.original.auto_discount_percent > 0
        ? `${row.original.auto_discount_percent.toFixed(2)}%`
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Auto %" },
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
          <Can perm="menu-category:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="menu-category:delete">
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
          <CardHeader><CardTitle>Menu Categories</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns} data={query.data?.data ?? []} total={query.data?.total ?? 0}
              state={qs} onStateChange={setQs} loading={query.isLoading}
              searchPlaceholder="Search by category name…" emptyText="No categories found."
              toolbar={
                <Can perm="menu-category:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Category
                  </Button>
                </Can>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "New Category" : "Edit Category"}</DialogTitle>
            <DialogDescription>
              {dialog.mode === "create" ? "Create a new menu category." : "Update this category."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Category Name <span className="text-destructive">*</span></FieldLabel>
                <Input
                  value={form.name} maxLength={30}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Category name (max 30 chars)" required />
              </Field>
              <Field>
                <FieldLabel>Category Type <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                <Select value={form.category_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {CATEGORY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="allow_discount"
                    checked={form.allow_discount}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, allow_discount: !!v }))} />
                  <FieldLabel htmlFor="allow_discount" className="cursor-pointer">Allow Discount</FieldLabel>
                </div>
              </Field>
              {form.allow_discount && (
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Max Discount %</FieldLabel>
                    <Input type="number" min="0" max="100" step="0.01"
                      value={form.max_discount_percent}
                      onChange={(e) => setForm((f) => ({ ...f, max_discount_percent: e.target.value }))} />
                  </Field>
                  <Field>
                    <FieldLabel>Auto Discount %</FieldLabel>
                    <Input type="number" min="0" max="100" step="0.01"
                      value={form.auto_discount_percent}
                      onChange={(e) => setForm((f) => ({ ...f, auto_discount_percent: e.target.value }))} />
                  </Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Tally Code <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                  <Input type="number" value={form.tally_code}
                    onChange={(e) => setForm((f) => ({ ...f, tally_code: e.target.value }))}
                    placeholder="Tally ID" />
                </Field>
                <Field>
                  <FieldLabel>Unit ID <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                  <Input type="number" value={form.unit_id}
                    onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
                    placeholder="Unit ID" />
                </Field>
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
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
