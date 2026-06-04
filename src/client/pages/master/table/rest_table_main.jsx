import { useEffect, useMemo, useState } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
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

const QK = ["restaurant-tables"];

const RATE_OPTIONS = [
  { value: "1", label: "Rate 1" },
  { value: "2", label: "Rate 2" },
  { value: "3", label: "Rate 3" },
  { value: "4", label: "Rate 4" },
  { value: "5", label: "Rate 5" },
];

const EMPTY = {
  code: "",
  table_name: "",
  table_group_id: "__none__",
  applicable_rate: "1",
};

export default function RestaurantTable() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const { state: navState } = useLocation();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (navState?.openAdd) setDialog({ open: true, mode: "create", data: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_restaurant_tables", { qs }),
    placeholderData: (prev) => prev,
  });

  const groupsQuery = useQuery({
    queryKey: ["all-table-groups"],
    queryFn: () => invoke("get_all_table_groups"),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_restaurant_table", {
      code: d.code ? parseInt(d.code) : null,
      tableName: d.table_name,
      tableGroupId: d.table_group_id !== "__none__" ? parseInt(d.table_group_id) : null,
      applicableRate: parseInt(d.applicable_rate),
    }),
    onSuccess: () => { toast.success("Table created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_restaurant_table", {
      id: d.id,
      code: d.code ? parseInt(d.code) : null,
      tableName: d.table_name,
      tableGroupId: d.table_group_id !== "__none__" ? parseInt(d.table_group_id) : null,
      applicableRate: parseInt(d.applicable_rate),
    }),
    onSuccess: () => { toast.success("Table updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_restaurant_table_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_restaurant_table", { id }),
    onSuccess: () => { toast.success("Table deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() {
    setForm(EMPTY);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      code: row.code ? String(row.code) : "",
      table_name: row.table_name,
      table_group_id: row.table_group_id ? String(row.table_group_id) : "__none__",
      applicable_rate: String(row.applicable_rate ?? 1),
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleGroupChange(groupId) {
    const allGroups = groupsQuery.data ?? [];
    const group = allGroups.find((g) => String(g.id) === groupId);
    setForm((f) => ({
      ...f,
      table_group_id: groupId,
      applicable_rate: group ? String(group.applicable_rate) : "1",
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.table_name.trim()) { toast.error("Table name is required"); return; }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const allGroups = groupsQuery.data ?? [];
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
      accessorKey: "table_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Table Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.table_name}</span>,
      meta: { label: "Table Name" },
    },
    {
      accessorKey: "group_name",
      header: "Group",
      size: 160,
      cell: ({ row }) => row.original.group_name
        ? <span className="text-sm">{row.original.group_name}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
      meta: { label: "Group" },
    },
    {
      accessorKey: "applicable_rate",
      header: () => <div className="text-center">Rate</div>,
      size: 90,
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
          <Can perm="restaurant-table:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="restaurant-table:delete">
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
          <CardHeader><CardTitle>Restaurant Tables</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns} data={query.data?.data ?? []} total={query.data?.total ?? 0}
              state={qs} onStateChange={setQs} loading={query.isLoading}
              searchPlaceholder="Search by table name…" emptyText="No tables found."
              toolbar={
                <Can perm="restaurant-table:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Table
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
            <DialogTitle>{dialog.mode === "create" ? "New Table" : "Edit Table"}</DialogTitle>
            <DialogDescription>
              {dialog.mode === "create" ? "Create a new restaurant table." : "Update this table."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Table Name <span className="text-destructive">*</span></FieldLabel>
                  <Input value={form.table_name} maxLength={50}
                    onChange={(e) => setForm((f) => ({ ...f, table_name: e.target.value }))}
                    placeholder="Table name" required />
                </Field>
                <Field>
                  <FieldLabel>Code <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                  <Input
                    type="number" min="1" value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder={dialog.mode === "create" ? "Auto" : ""}
                    readOnly={dialog.mode === "edit"}
                    className={dialog.mode === "edit" ? "bg-muted cursor-not-allowed" : ""} />
                </Field>
              </div>

              <Field>
                <FieldLabel>Table Group</FieldLabel>
                <Select
                  value={form.table_group_id}
                  onValueChange={handleGroupChange}
                  disabled={dialog.mode === "edit" && form.table_group_id !== "__none__"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select group…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {allGroups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dialog.mode === "edit" && form.table_group_id !== "__none__" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Group cannot be changed after assignment.
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel>Rate Apply</FieldLabel>
                <Select value={form.applicable_rate}
                  onValueChange={(v) => setForm((f) => ({ ...f, applicable_rate: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RATE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.table_group_id !== "__none__" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-filled from group. You may override.
                  </p>
                )}
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
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.table_name}</strong>? This cannot be undone.
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
