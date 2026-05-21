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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const QK = ["kitchen-sections"];

const EMPTY = {
  code: "",
  name: "",
  isPrintEnabled: "1",
  printerName: "",
  printerType: "",
};

export default function KitchenSection() {
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "code", sortDir: "asc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_kitchen_section_list", { qs }),
    placeholderData: (prev) => prev,
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: (f) =>
      invoke("create_kitchen_section", {
        name: f.name.trim(),
        code: f.code ? Number(f.code) : null,
        isPrintEnabled: f.isPrintEnabled === "1",
        printerName: f.printerName.trim() || null,
        printerType: f.printerType.trim() || null,
      }),
    onSuccess: () => { toast.success("Kitchen section created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) =>
      invoke("update_kitchen_section", {
        id: f.id,
        code: Number(f.code),
        name: f.name.trim(),
        isPrintEnabled: f.isPrintEnabled === "1",
        printerName: f.printerName.trim() || null,
        printerType: f.printerType.trim() || null,
      }),
    onSuccess: () => { toast.success("Kitchen section updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_kitchen_section_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_kitchen_section", { id }),
    onSuccess: () => { toast.success("Kitchen section deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() {
    setForm(EMPTY);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      id: row.id,
      code: String(row.code),
      name: row.name,
      isPrintEnabled: row.is_print_enabled ? "1" : "0",
      printerName: row.printer_name ?? "",
      printerType: row.printer_type ?? "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Section name is required"); return; }
    if (dialog.mode === "edit" && !Number(form.code)) {
      toast.error("Section code is required");
      return;
    }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate(form);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  const columns = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      size: 90,
      meta: { label: "Code" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      meta: { label: "Name" },
    },
    {
      accessorKey: "is_print_enabled",
      header: "Print Enabled",
      size: 110,
      cell: ({ row }) => (
        <span className={row.original.is_print_enabled ? "text-green-600" : "text-muted-foreground"}>
          {row.original.is_print_enabled ? "Yes" : "No"}
        </span>
      ),
      meta: { label: "Print Enabled" },
    },
    {
      accessorKey: "printer_name",
      header: "Printer Name",
      size: 140,
      cell: ({ row }) =>
        row.original.printer_name ?? (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      meta: { label: "Printer Name" },
    },
    {
      accessorKey: "printer_type",
      header: "Printer Type",
      size: 120,
      cell: ({ row }) =>
        row.original.printer_type ?? (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      meta: { label: "Printer Type" },
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
          <Can perm="kitchen-section:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="kitchen-section:delete">
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

  return (
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Kitchen Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              total={query.data?.total ?? 0}
              state={qs}
              onStateChange={setQs}
              loading={query.isLoading}
              searchPlaceholder="Search by name…"
              emptyText="No kitchen sections found."
              toolbar={
                <Can perm="kitchen-section:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Section
                  </Button>
                </Can>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "New Kitchen Section" : "Edit Kitchen Section"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Create a new kitchen section. Leave Code blank to auto-generate."
                : "Update this kitchen section."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Row 1 — Code | Name */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Code</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={form.code}
                    onChange={(e) => setF("code", e.target.value)}
                    placeholder={dialog.mode === "create" ? "Auto" : ""}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    Section Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    value={form.name}
                    maxLength={50}
                    onChange={(e) => setF("name", e.target.value)}
                    placeholder="e.g. Main Kitchen"
                    required
                  />
                </Field>
              </div>

              {/* Row 2 — Print Enabled | Printer Name | Printer Type */}
              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel>Print Enabled</FieldLabel>
                  <Select value={form.isPrintEnabled} onValueChange={(v) => setF("isPrintEnabled", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Yes</SelectItem>
                      <SelectItem value="0">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Printer Name</FieldLabel>
                  <Input
                    value={form.printerName}
                    maxLength={50}
                    onChange={(e) => setF("printerName", e.target.value)}
                    placeholder="e.g. Kitchen_LP1"
                    disabled={form.isPrintEnabled === "0"}
                  />
                </Field>
                <Field>
                  <FieldLabel>Printer Type</FieldLabel>
                  <Input
                    value={form.printerType}
                    maxLength={20}
                    onChange={(e) => setF("printerType", e.target.value)}
                    placeholder="e.g. Thermal"
                    disabled={form.isPrintEnabled === "0"}
                  />
                </Field>
              </div>
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
            <AlertDialogTitle>Delete Kitchen Section</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
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
