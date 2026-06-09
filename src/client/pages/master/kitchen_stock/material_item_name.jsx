import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnterNav } from "@/hooks/use-enter-nav";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const QK = ["item-names"];

const EMPTY_FORM = {
  code: "", name: "",
  groupCodeInput: "", itemGroupId: null, itemGroupName: "",
  itemRate1: "", itemRate2: "", itemRate3: "",
  sectionCodeInput: "", kitchenSectionId: null, kitchenSectionName: "",
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function MaterialItemName() {
  const enterNav = useEnterNav();
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // ── Queries ───────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_item_names", { qs }),
  });

  function inv() { qc.invalidateQueries({ queryKey: QK }); }

  // ── Lookup handlers ───────────────────────────────────────

  async function handleGroupLookup() {
    if (!form.groupCodeInput) {
      setForm((f) => ({ ...f, itemGroupId: null, itemGroupName: "" }));
      return;
    }
    try {
      const result = await invoke("lookup_item_group_for_name", { code: Number(form.groupCodeInput) });
      if (result) {
        setForm((f) => ({ ...f, itemGroupId: result.id, itemGroupName: result.name }));
      } else {
        toast.error("Item group code not found");
        setForm((f) => ({ ...f, itemGroupId: null, itemGroupName: "" }));
      }
    } catch (e) { toast.error(String(e)); }
  }

  async function handleSectionLookup() {
    if (!form.sectionCodeInput) {
      setForm((f) => ({ ...f, kitchenSectionId: null, kitchenSectionName: "" }));
      return;
    }
    try {
      const result = await invoke("lookup_kitchen_section_for_name", { code: Number(form.sectionCodeInput) });
      if (result) {
        setForm((f) => ({ ...f, kitchenSectionId: result.id, kitchenSectionName: result.name }));
      } else {
        toast.error("Kitchen section code not found");
        setForm((f) => ({ ...f, kitchenSectionId: null, kitchenSectionName: "" }));
      }
    } catch (e) { toast.error(String(e)); }
  }

  // ── Mutations ─────────────────────────────────────────────

  function buildPayload(f) {
    return {
      name: f.name,
      code: f.code ? Number(f.code) : null,
      itemGroupId: f.itemGroupId || null,
      itemRate1: f.itemRate1 !== "" ? Number(f.itemRate1) : null,
      itemRate2: f.itemRate2 !== "" ? Number(f.itemRate2) : null,
      itemRate3: f.itemRate3 !== "" ? Number(f.itemRate3) : null,
      kitchenSectionId: f.kitchenSectionId || null,
    };
  }

  const createMut = useMutation({
    mutationFn: (f) => invoke("create_item_name", buildPayload(f)),
    onSuccess: () => { toast.success("Item created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) => invoke("update_item_name", { id: f.id, code: Number(f.code), ...buildPayload(f) }),
    onSuccess: () => { toast.success("Item updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => invoke("toggle_item_name_active", { id, isActive: is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_item_name", { id }),
    onSuccess: () => { toast.success("Item deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => { toast.error(String(e)); setDeleteTarget(null); },
  });

  // ── Dialog helpers ────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name ?? "",
      groupCodeInput: row.item_group_code ? String(row.item_group_code) : "",
      itemGroupId: row.item_group_id || null,
      itemGroupName: row.item_group_name ?? "",
      itemRate1: row.item_rate_1 != null ? String(row.item_rate_1) : "",
      itemRate2: row.item_rate_2 != null ? String(row.item_rate_2) : "",
      itemRate3: row.item_rate_3 != null ? String(row.item_rate_3) : "",
      sectionCodeInput: row.kitchen_section_code ? String(row.kitchen_section_code) : "",
      kitchenSectionId: row.kitchen_section_id || null,
      kitchenSectionName: row.kitchen_section_name ?? "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (isEditMode && !form.code) { toast.error("Item code is required"); return; }
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    const payload = { ...form, id: dialog.data?.id };
    if (dialog.mode === "create") createMut.mutate(payload);
    else updateMut.mutate(payload);
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const isEditMode = dialog.mode === "edit";

  // ── Columns ───────────────────────────────────────────────

  const columns = [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
      size: 80,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "item_group_name",
      header: "Item Group",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.item_group_name || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      accessorKey: "item_rate_1",
      header: "Rate 1",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.item_rate_1 != null ? Number(row.original.item_rate_1).toFixed(4) : <span className="text-muted-foreground">—</span>}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: "item_rate_2",
      header: "Rate 2",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.item_rate_2 != null ? Number(row.original.item_rate_2).toFixed(4) : <span className="text-muted-foreground">—</span>}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: "item_rate_3",
      header: "Rate 3",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.item_rate_3 != null ? Number(row.original.item_rate_3).toFixed(4) : <span className="text-muted-foreground">—</span>}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: "kitchen_section_name",
      header: "Kitchen Section",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.kitchen_section_name || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <Can perm="mat-item-name:update">
          <Switch checked={row.original.is_active === 1}
            onCheckedChange={(v) => toggleMut.mutate({ id: row.original.id, is_active: v ? 1 : 0 })} />
        </Can>
      ),
      size: 70,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <TooltipProvider>
            <Can perm="mat-item-name:update">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(row.original)}>
                    <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={2} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </Can>
            <Can perm="mat-item-name:delete">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(row.original)}>
                    <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={2} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </Can>
          </TooltipProvider>
        </div>
      ),
      size: 80,
    },
  ];

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Item Name Master</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            total={data?.total ?? 0}
            loading={isLoading}
            state={qs}
            onStateChange={setQs}
            toolbar={
              <Can perm="mat-item-name:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                  Add Item
                </Button>
              </Can>
            }
          />
        </CardContent>
      </Card>

      {/* ── Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Item Name" : "Add Item Name"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-1 gap-3">
              {/* Code field hidden — not shown in form
              <Field>
                <FieldLabel>Code {isEditMode && <span className="text-destructive">*</span>}</FieldLabel>
                <Input type="number" value={form.code}
                  onChange={(e) => setF("code", e.target.value)}
                  placeholder={isEditMode ? "" : "Auto-generated"} min={1} autoFocus
                  readOnly={isEditMode}
                  className={isEditMode ? "bg-muted cursor-not-allowed" : ""} />
              </Field>
              */}
              <Field>
                <FieldLabel>Item Name <span className="text-destructive">*</span></FieldLabel>
                <Input value={form.name} onChange={(e) => setF("name", e.target.value)}
                  placeholder="e.g. Chicken Tikka" />
              </Field>
            </div>

            {/* Item Group */}
            <Field>
              <FieldLabel>Item Group Code</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="w-32"
                  value={form.groupCodeInput}
                  onChange={(e) => { setF("groupCodeInput", e.target.value); setF("itemGroupId", null); setF("itemGroupName", ""); }}
                  onBlur={handleGroupLookup}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleGroupLookup())}
                  placeholder="Code"
                />
                <Input
                  readOnly
                  value={form.itemGroupName}
                  placeholder="Group name (auto)"
                  className="flex-1 bg-muted/30 text-muted-foreground"
                />
              </div>
            </Field>

            {/* Rates */}
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Item Rate 1</FieldLabel>
                <Input type="number" step="0.0001" min="0" value={form.itemRate1}
                  onChange={(e) => setF("itemRate1", e.target.value)} placeholder="0.0000" />
              </Field>
              <Field>
                <FieldLabel>Item Rate 2</FieldLabel>
                <Input type="number" step="0.0001" min="0" value={form.itemRate2}
                  onChange={(e) => setF("itemRate2", e.target.value)} placeholder="0.0000" />
              </Field>
              <Field>
                <FieldLabel>Item Rate 3</FieldLabel>
                <Input type="number" step="0.0001" min="0" value={form.itemRate3}
                  onChange={(e) => setF("itemRate3", e.target.value)} placeholder="0.0000" />
              </Field>
            </div>

            {/* Kitchen Section */}
            <Field>
              <FieldLabel>Kitchen Section Code</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="w-32"
                  value={form.sectionCodeInput}
                  onChange={(e) => { setF("sectionCodeInput", e.target.value); setF("kitchenSectionId", null); setF("kitchenSectionName", ""); }}
                  onBlur={handleSectionLookup}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSectionLookup())}
                  placeholder="Code"
                />
                <Input
                  readOnly
                  value={form.kitchenSectionName}
                  placeholder="Section name (auto)"
                  className="flex-1 bg-muted/30 text-muted-foreground"
                />
              </div>
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ──────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item Name</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate(deleteTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
