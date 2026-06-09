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
  const enterNav = useEnterNav();
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
      accessorKey: "code",
      header: ({ column }) => (
        <div className="text-center">
          <DataTableColumnHeader column={column} title="Code" />
        </div>
      ),
      size: 70,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {row.original.code ?? "—"}
          </span>
        </div>
      ),
      meta: { label: "Code" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      meta: { label: "Group Name" },
    },
    {
      accessorKey: "applicable_rate",
      header: () => <div className="text-center">Rate</div>,
      size: 80,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">
            Rate {row.original.applicable_rate}
          </span>
        </div>
      ),
      meta: { label: "Rate" },
    },
    {
      accessorKey: "service_printer_name",
      header: "Service Printer",
      size: 150,
      cell: ({ row }) => row.original.service_printer_name
        ? <span className="text-sm">{row.original.service_printer_name}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Service Printer" },
    },
    {
      accessorKey: "is_tax_applicable",
      header: () => <div className="text-center">Tax</div>,
      size: 75,
      cell: ({ row }) => (
        <div className="text-center">
          <YNBadge value={row.original.is_tax_applicable} />
        </div>
      ),
      meta: { label: "Tax" },
    },
    {
      accessorKey: "allow_incentive",
      header: () => <div className="text-center">Incentive</div>,
      size: 85,
      cell: ({ row }) => (
        <div className="text-center">
          <YNBadge value={row.original.allow_incentive} />
        </div>
      ),
      meta: { label: "Incentive" },
    },
    {
      accessorKey: "is_home_delivery",
      header: () => <div className="text-center">Home Del.</div>,
      size: 85,
      cell: ({ row }) => (
        <div className="text-center">
          <YNBadge value={row.original.is_home_delivery} />
        </div>
      ),
      meta: { label: "Home Del." },
    },
    {
      accessorKey: "is_takeaway_enabled",
      header: () => <div className="text-center">Takeaway</div>,
      size: 85,
      cell: ({ row }) => (
        <div className="text-center">
          <YNBadge value={row.original.is_takeaway_enabled} />
        </div>
      ),
      meta: { label: "Takeaway" },
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
              initialColumnVisibility={{
                allow_incentive: false,
                is_home_delivery: false,
                is_takeaway_enabled: false,
              }}
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
          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              {/* Row 1 — Group Name */}
              <div className="grid grid-cols-1 gap-3">
                {/* Code field hidden — not shown in form
                <Field>
                  <FieldLabel>Code</FieldLabel>
                  <Input type="number" min="1" value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder={dialog.mode === "create" ? "Auto-generated" : ""}
                    readOnly={dialog.mode === "edit"}
                    className={dialog.mode === "edit" ? "bg-muted cursor-not-allowed" : ""} />
                </Field>
                */}
                <Field className="col-span-2">
                  <FieldLabel>Group Name <span className="text-destructive">*</span></FieldLabel>
                  <Input value={form.name} maxLength={50} autoFocus
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Rooftop, Lounge" required />
                </Field>
              </div>

              {/* Applicable Rate */}
              <Field>
                <FieldLabel>Applicable Rate <span className="text-destructive">*</span></FieldLabel>
                <Select value={form.applicable_rate}
                  onValueChange={(v) => setForm((f) => ({ ...f, applicable_rate: v }))}>
                  <SelectTrigger className="w-full" onKeyDown={enterNav.select}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RATE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Toggle flags */}
              <div className="rounded-md border divide-y">
                {[
                  { key: "allow_incentive",    label: "Allow Incentive",  desc: "Staff incentive applies to this group" },
                  { key: "is_tax_applicable",  label: "Apply Tax",        desc: "GST / tax is applicable on orders" },
                  { key: "is_home_delivery",   label: "Home Delivery",    desc: "This group handles home delivery orders" },
                  { key: "is_takeaway_enabled",label: "Takeaway",         desc: "Allow takeaway orders for this group" },
                  { key: "is_print_enabled",   label: "Print Enabled",    desc: "Print KOT / bills for this group" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={form[key] === "Y"}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v ? "Y" : "N" }))}
                    />
                  </div>
                ))}
              </div>

              {/* Printer selects — only when print is on */}
              {form.is_print_enabled === "Y" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Service Printer</FieldLabel>
                    <Select value={form.service_printer_name}
                      onValueChange={(v) => setForm((f) => ({ ...f, service_printer_name: v }))}>
                      <SelectTrigger className="w-full" onKeyDown={enterNav.select}><SelectValue placeholder="None" /></SelectTrigger>
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
                      <SelectTrigger className="w-full" onKeyDown={enterNav.select}><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {kitchenSections.map((ks) => (
                          <SelectItem key={ks.id} value={ks.name}>{ks.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}
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
