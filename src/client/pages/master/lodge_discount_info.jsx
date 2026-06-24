import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toTitleCase } from "@/lib/utils";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { useEnterNav } from "@/hooks/use-enter-nav";

import { Can } from "@/lib/auth";
import { DataTable, DataTableColumnHeader, DEFAULT_QUERY_STATE } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QK = ["discount-details"];
const EMPTY = {
  code: "",
  name: "",
  discount_percent: "0",
  ledger_id: "",
};

export default function LodgeDiscountInfo() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_discount_details", { qs }),
    placeholderData: (prev) => prev,
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_discount_detail", {
      code: d.code ? parseInt(d.code) : null,
      name: d.name,
      discountPercent: parseFloat(d.discount_percent) || 0,
      ledgerId: d.ledger_id ? parseInt(d.ledger_id) : null,
    }),
    onSuccess: () => { toast.success("Discount detail created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_discount_detail", {
      id: d.id,
      name: d.name,
      discountPercent: parseFloat(d.discount_percent) || 0,
      ledgerId: d.ledger_id ? parseInt(d.ledger_id) : null,
    }),
    onSuccess: () => { toast.success("Discount detail updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_discount_detail_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_discount_detail", { id }),
    onSuccess: () => { toast.success("Discount detail deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  async function openCreate() {
    setForm(EMPTY);
    setDialog({ open: true, mode: "create", data: null });
    try {
      const next = await invoke("get_next_master_code", { table: "discount_detail" });
      setForm((f) => ({ ...f, code: String(next) }));
    } catch { /* leave code blank — backend will auto-assign */ }
  }
  function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name,
      discount_percent: String(row.discount_percent ?? 0),
      ledger_id: row.ledger_id ? String(row.ledger_id) : "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }
  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const pct = parseFloat(form.discount_percent);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Discount percent must be between 0 and 100");
      return;
    }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const columns = useMemo(() => [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      size: 60,
      meta: { label: "#" },
    },
    {
      accessorKey: "code",
      header: "Code",
      size: 90,
      meta: { label: "Code" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Discount Name" />,
      meta: { label: "Discount Name" },
    },
    {
      accessorKey: "discount_percent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Discount %" />,
      size: 110,
      cell: ({ row }) => `${(row.original.discount_percent ?? 0).toFixed(2)}%`,
      meta: { label: "Discount %" },
    },
    {
      accessorKey: "ledger_id",
      header: "GL Code",
      size: 100,
      cell: ({ row }) =>
        row.original.ledger_id != null
          ? row.original.ledger_id
          : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "GL Code" },
    },
    {
      accessorKey: "is_active",
      header: "Active",
      size: 80,
      cell: ({ row }) => (
        <Switch
          size="sm"
          checked={row.original.is_active}
          onCheckedChange={() => toggleMut.mutate(row.original)}
          disabled={toggleMut.isPending}
        />
      ),
      meta: { label: "Active" },
    },
    {
      id: "actions",
      header: "Actions",
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Can perm="lodge-discount:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="lodge-discount:delete">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                >
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
          <CardHeader><CardTitle>Discount Information</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              total={query.data?.total ?? 0}
              state={qs}
              onStateChange={setQs}
              loading={query.isLoading}
              searchPlaceholder="Search by discount name…"
              emptyText="No discount details found."
              toolbar={
                <Can perm="lodge-discount:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Discount
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
            <DialogTitle>
              {dialog.mode === "create" ? "New Discount Detail" : "Edit Discount Detail"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Create a new lodge discount entry."
                : "Update this discount detail."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              <Field>
                <FieldLabel>
                  Code{" "}
                  <span className="text-muted-foreground font-normal">(optional — auto-generated if blank)</span>
                </FieldLabel>
                <Input
                  type="number"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder={dialog.mode === "create" ? "Auto-generated" : ""}
                  readOnly={dialog.mode === "edit"}
                  className={dialog.mode === "edit" ? "bg-muted cursor-not-allowed" : ""}
                />
              </Field>
              <Field>
                <FieldLabel>
                  Discount Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.name}
                  maxLength={50}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onBlur={(e) => setForm((f) => ({ ...f, name: toTitleCase(e.target.value) }))}
                  placeholder="e.g. Corporate Discount"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>
                  Discount % <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.discount_percent}
                  onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel>
                  GL Code{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FieldLabel>
                <Input
                  type="number"
                  value={form.ledger_id}
                  onChange={(e) => setForm((f) => ({ ...f, ledger_id: e.target.value }))}
                  placeholder="General ledger code"
                />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
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
            <AlertDialogTitle>Delete Discount Detail</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
