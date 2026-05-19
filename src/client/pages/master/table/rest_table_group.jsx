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

const QK = ["table-groups"];

const RATE_OPTIONS = [
  { value: "1", label: "Rate 1" },
  { value: "2", label: "Rate 2" },
  { value: "3", label: "Rate 3" },
  { value: "4", label: "Rate 4" },
  { value: "5", label: "Rate 5" },
];

const YN_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const EMPTY = {
  code: "",
  name: "",
  applicable_rate: "1",
  service_printer_name: "__none__",
  allow_incentive: "N",
  is_home_delivery: "N",
  is_tax_applicable: "N",
  is_takeaway_enabled: "N",
  is_print_enabled: "N",
  printer_location: "__none__",
};

function YNBadge({ value }) {
  return value === "Y"
    ? <span className="text-green-600 text-xs font-medium">Yes</span>
    : <span className="text-muted-foreground text-xs">No</span>;
}

export default function TableGroup() {
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_table_groups", { qs }),
    placeholderData: (prev) => prev,
  });

  const kitchenQuery = useQuery({
    queryKey: ["kitchen-sections"],
    queryFn: () => invoke("get_kitchen_sections"),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_table_group", {
      code: d.code ? parseInt(d.code) : null,
      name: d.name,
      applicableRate: parseInt(d.applicable_rate),
      servicePrinterName: d.service_printer_name !== "__none__" ? d.service_printer_name : null,
      allowIncentive: d.allow_incentive,
      isHomeDelivery: d.is_home_delivery,
      isTaxApplicable: d.is_tax_applicable,
      isTakeawayEnabled: d.is_takeaway_enabled,
      isPrintEnabled: d.is_print_enabled,
      printerLocation: d.printer_location !== "__none__" ? d.printer_location : null,
    }),
    onSuccess: () => { toast.success("Table group created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_table_group", {
      id: d.id,
      code: d.code ? parseInt(d.code) : null,
      name: d.name,
      applicableRate: parseInt(d.applicable_rate),
      servicePrinterName: d.service_printer_name !== "__none__" ? d.service_printer_name : null,
      allowIncentive: d.allow_incentive,
      isHomeDelivery: d.is_home_delivery,
      isTaxApplicable: d.is_tax_applicable,
      isTakeawayEnabled: d.is_takeaway_enabled,
      isPrintEnabled: d.is_print_enabled,
      printerLocation: d.printer_location !== "__none__" ? d.printer_location : null,
    }),
    onSuccess: () => { toast.success("Table group updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_table_group_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_table_group", { id }),
    onSuccess: () => { toast.success("Table group deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() {
    setForm(EMPTY);
    setDialog({ open: true, mode: "create", data: null });
  }
  function openEdit(row) {
    setForm({
      code: row.code ? String(row.code) : "",
      name: row.name,
      applicable_rate: String(row.applicable_rate ?? 1),
      service_printer_name: row.service_printer_name ?? "__none__",
      allow_incentive: row.allow_incentive || "N",
      is_home_delivery: row.is_home_delivery || "N",
      is_tax_applicable: row.is_tax_applicable || "N",
      is_takeaway_enabled: row.is_takeaway_enabled || "N",
      is_print_enabled: row.is_print_enabled || "N",
      printer_location: row.printer_location ?? "__none__",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }
  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Group name is required"); return; }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const kitchenSections = kitchenQuery.data ?? [];
  const isPending = createMut.isPending || updateMut.isPending;

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
      accessorKey: "applicable_rate",
      header: "Rate",
      size: 70,
      cell: ({ row }) => `Rate ${row.original.applicable_rate}`,
      meta: { label: "Rate" },
    },
    {
      accessorKey: "service_printer_name",
      header: "Service Printer",
      cell: ({ row }) => row.original.service_printer_name
        ? row.original.service_printer_name
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Service Printer" },
    },
    {
      accessorKey: "allow_incentive",
      header: "Incentive",
      size: 80,
      cell: ({ row }) => <YNBadge value={row.original.allow_incentive} />,
      meta: { label: "Incentive" },
    },
    {
      accessorKey: "is_home_delivery",
      header: "Home Del.",
      size: 80,
      cell: ({ row }) => <YNBadge value={row.original.is_home_delivery} />,
      meta: { label: "Home Del." },
    },
    {
      accessorKey: "is_tax_applicable",
      header: "Tax",
      size: 70,
      cell: ({ row }) => <YNBadge value={row.original.is_tax_applicable} />,
      meta: { label: "Tax" },
    },
    {
      accessorKey: "is_takeaway_enabled",
      header: "Takeaway",
      size: 80,
      cell: ({ row }) => <YNBadge value={row.original.is_takeaway_enabled} />,
      meta: { label: "Takeaway" },
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
          <Can perm="table-group:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="table-group:delete">
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
          <CardHeader><CardTitle>Table Groups</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns} data={query.data?.data ?? []} total={query.data?.total ?? 0}
              state={qs} onStateChange={setQs} loading={query.isLoading}
              searchPlaceholder="Search by group name…" emptyText="No table groups found."
              toolbar={
                <Can perm="table-group:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Group
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
            <DialogTitle>{dialog.mode === "create" ? "New Table Group" : "Edit Table Group"}</DialogTitle>
            <DialogDescription>
              {dialog.mode === "create" ? "Create a new table group." : "Update this table group."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Group Name <span className="text-destructive">*</span></FieldLabel>
                  <Input value={form.name} maxLength={50}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Group name (max 50 chars)" required />
                </Field>
                <Field>
                  <FieldLabel>Code <span className="text-muted-foreground font-normal">(numeric)</span></FieldLabel>
                  <Input type="number" min="1" value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="Auto if empty" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Rate <span className="text-destructive">*</span></FieldLabel>
                  <Select value={form.applicable_rate}
                    onValueChange={(v) => setForm((f) => ({ ...f, applicable_rate: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RATE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Allow Incentive</FieldLabel>
                  <Select value={form.allow_incentive}
                    onValueChange={(v) => setForm((f) => ({ ...f, allow_incentive: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Home Delivery</FieldLabel>
                  <Select value={form.is_home_delivery}
                    onValueChange={(v) => setForm((f) => ({ ...f, is_home_delivery: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Apply Tax</FieldLabel>
                  <Select value={form.is_tax_applicable}
                    onValueChange={(v) => setForm((f) => ({ ...f, is_tax_applicable: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Takeaway</FieldLabel>
                  <Select value={form.is_takeaway_enabled}
                    onValueChange={(v) => setForm((f) => ({ ...f, is_takeaway_enabled: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Print</FieldLabel>
                  <Select value={form.is_print_enabled}
                    onValueChange={(v) => setForm((f) => ({ ...f, is_print_enabled: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Service Printer</FieldLabel>
                  <Select value={form.service_printer_name}
                    onValueChange={(v) => setForm((f) => ({ ...f, service_printer_name: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {kitchenSections.map((ks) => (
                        <SelectItem key={ks.id} value={ks.name}>{ks.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Printer Location</FieldLabel>
                  <Select value={form.printer_location}
                    onValueChange={(v) => setForm((f) => ({ ...f, printer_location: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {kitchenSections.map((ks) => (
                        <SelectItem key={ks.id} value={ks.name}>{ks.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            <AlertDialogTitle>Delete Table Group</AlertDialogTitle>
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
