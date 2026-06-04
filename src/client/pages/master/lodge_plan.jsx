import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
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

const QK = ["plan-masters"];
const EMPTY = {
  code: "",
  name: "",
  tariff: "0",
  plan_details: "",
};

export default function LodgePlan() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_plan_masters", { qs }),
    placeholderData: (prev) => prev,
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_plan_master", {
      code: d.code ? parseInt(d.code) : null,
      name: d.name,
      tariff: parseFloat(d.tariff) || 0,
      planDetails: d.plan_details.trim() || null,
    }),
    onSuccess: () => { toast.success("Plan created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_plan_master", {
      id: d.id,
      name: d.name,
      tariff: parseFloat(d.tariff) || 0,
      planDetails: d.plan_details.trim() || null,
    }),
    onSuccess: () => { toast.success("Plan updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_plan_master_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_plan_master", { id }),
    onSuccess: () => { toast.success("Plan deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() { setForm(EMPTY); setDialog({ open: true, mode: "create", data: null }); }
  function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name,
      tariff: String(row.tariff ?? 0),
      plan_details: row.plan_details ?? "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }
  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }
    const tariff = parseFloat(form.tariff);
    if (isNaN(tariff) || tariff < 0) {
      toast.error("Tariff must be a non-negative value");
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
      meta: { label: "Plan Name" },
    },
    {
      accessorKey: "tariff",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tariff" />,
      size: 110,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {(row.original.tariff ?? 0).toFixed(2)}
        </span>
      ),
      meta: { label: "Tariff" },
    },
    {
      accessorKey: "plan_details",
      header: "Details",
      cell: ({ row }) => {
        const txt = row.original.plan_details;
        if (!txt) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="text-xs text-muted-foreground line-clamp-1 max-w-50" title={txt}>
            {txt}
          </span>
        );
      },
      meta: { label: "Details" },
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
          <Can perm="lodge-plan:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="lodge-plan:delete">
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
          <CardHeader><CardTitle>Plan Master</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              total={query.data?.total ?? 0}
              state={qs}
              onStateChange={setQs}
              loading={query.isLoading}
              searchPlaceholder="Search by plan name…"
              emptyText="No plans found."
              toolbar={
                <Can perm="lodge-plan:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Plan
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
              {dialog.mode === "create" ? "New Plan" : "Edit Plan"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Create a new lodge plan with tariff details."
                : "Update this plan."}
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
                  Plan Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.name}
                  maxLength={50}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. EP, MAP, AP, CP"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>
                  Tariff <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tariff}
                  onChange={(e) => setForm((f) => ({ ...f, tariff: e.target.value }))}
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel>
                  Plan Details{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FieldLabel>
                <textarea
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.plan_details}
                  onChange={(e) => setForm((f) => ({ ...f, plan_details: e.target.value }))}
                  placeholder="Describe what this plan includes…"
                  rows={3}
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
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
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
