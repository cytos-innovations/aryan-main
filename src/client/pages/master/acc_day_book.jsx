import { useState } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";

import { Can } from "@/lib/auth";
import { DataTable, DataTableColumnHeader, DEFAULT_QUERY_STATE } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const QK = ["day-books"];
const EMPTY_FORM = { code: "", name: "", groupCode: null, genLegCode: null };

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function AccDayBook() {
  const enterNav = useEnterNav();
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_day_books", { qs }),
  });

  const { data: accountGroups = [] } = useQuery({
    queryKey: ["groups-for-daybook"],
    queryFn: () => invoke("get_all_groups_for_daybook"),
  });

  const { data: ledgers = [] } = useQuery({
    queryKey: ["ledgers-for-daybook"],
    queryFn: () => invoke("get_all_ledgers_for_daybook"),
  });

  function inv() { qc.invalidateQueries({ queryKey: QK }); }

  // ── Mutations ─────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (f) =>
      invoke("create_day_book", {
        name: f.name,
        code: f.code ? Number(f.code) : null,
        groupCode: f.groupCode ? Number(f.groupCode) : null,
        genLegCode: f.genLegCode ? Number(f.genLegCode) : null,
      }),
    onSuccess: () => { toast.success("Day book created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) =>
      invoke("update_day_book", {
        id: f.id,
        code: Number(f.code),
        name: f.name,
        groupCode: f.groupCode ? Number(f.groupCode) : null,
        genLegCode: f.genLegCode ? Number(f.genLegCode) : null,
      }),
    onSuccess: () => { toast.success("Day book updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_day_book_active", { id, isActive: is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_day_book", { id }),
    onSuccess: () => { toast.success("Day book deleted"); inv(); setDeleteTarget(null); },
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
      groupCode: row.group_code ? String(row.group_code) : null,
      genLegCode: row.gen_leg_code ? String(row.gen_leg_code) : null,
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (isEditMode && !form.code) { toast.error("Day book code is required"); return; }
    if (!form.name.trim()) { toast.error("Day book name is required"); return; }
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
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>
      ),
      size: 80,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Day Book Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "group_name",
      header: "Account Group",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.group_name || <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "ledger_name",
      header: "General Ledger",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.ledger_name || <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <Can perm="acc-day-book:update">
          <Switch
            checked={row.original.is_active === 1}
            onCheckedChange={(v) =>
              toggleMut.mutate({ id: row.original.id, is_active: v ? 1 : 0 })
            }
          />
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
            <Can perm="acc-day-book:update">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => openEdit(row.original)}>
                    <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={2} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </Can>
            <Can perm="acc-day-book:delete">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
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

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Day Book</CardTitle>
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
              <Can perm="acc-day-book:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                  Add Day Book
                </Button>
              </Can>
            }
          />
        </CardContent>
      </Card>

      {/* ── Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Day Book" : "Add Day Book"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>
                  Code {isEditMode && <span className="text-destructive">*</span>}
                </FieldLabel>
                <Input
                  type="number"
                  value={form.code}
                  onChange={(e) => setF("code", e.target.value)}
                  placeholder={isEditMode ? "" : "Auto-generated"}
                  min={1}
                  autoFocus
                  readOnly={isEditMode}
                  className={isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </Field>

              <Field>
                <FieldLabel>
                  Day Book Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => setF("name", e.target.value)}
                  placeholder="e.g. Cash Book"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Account Group</FieldLabel>
              <Select
                value={form.groupCode ? String(form.groupCode) : ""}
                onValueChange={(v) => setF("groupCode", v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account group" />
                </SelectTrigger>
                <SelectContent>
                  {accountGroups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>General Ledger</FieldLabel>
              <Select
                value={form.genLegCode ? String(form.genLegCode) : ""}
                onValueChange={(v) => setF("genLegCode", v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select general ledger" />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Create Day Book"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ───────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Day Book</AlertDialogTitle>
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
    </div>
  );
}
