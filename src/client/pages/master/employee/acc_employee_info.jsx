import { useState } from "react";
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

const QK = ["employees"];
const EMPTY_FORM = {
  code: "",
  name: "",
  add1: "",
  add2: "",
  add3: "",
  desigId: null,
  department: "",
  esiNo: "",
  pfNo: "",
  doj: "",
  dol: "",
  slTotal: "",
  slBal: "",
  clTotal: "",
  clBal: "",
  splTotal: "",
  splBal: "",
  conPersonNo: "",
  emerPhNo: "",
  resiPhNo: "",
  advanceTot: "",
  target: "",
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function AccEmployeeInfo() {
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_employees", { qs }),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["designations-all"],
    queryFn: () => invoke("get_all_designations"),
  });

  function inv() { qc.invalidateQueries({ queryKey: QK }); }

  function buildPayload(f) {
    return {
      name: f.name,
      code: f.code || null,
      add1: f.add1 || null,
      add2: f.add2 || null,
      add3: f.add3 || null,
      desigId: f.desigId ? Number(f.desigId) : null,
      department: f.department || null,
      esiNo: f.esiNo || null,
      pfNo: f.pfNo || null,
      doj: f.doj || null,
      dol: f.dol || null,
      slTotal: Number(f.slTotal) || 0,
      slBal: Number(f.slBal) || 0,
      clTotal: Number(f.clTotal) || 0,
      clBal: Number(f.clBal) || 0,
      splTotal: Number(f.splTotal) || 0,
      splBal: Number(f.splBal) || 0,
      conPersonNo: f.conPersonNo || null,
      emerPhNo: f.emerPhNo || null,
      resiPhNo: f.resiPhNo || null,
      advanceTot: Number(f.advanceTot) || 0,
      target: Number(f.target) || 0,
    };
  }

  // ── Mutations ─────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (f) => invoke("create_employee", buildPayload(f)),
    onSuccess: () => { toast.success("Employee created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) =>
      invoke("update_employee", { id: f.id, ...buildPayload(f) }),
    onSuccess: () => { toast.success("Employee updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_employee_active", { id, isActive: is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_employee", { id }),
    onSuccess: () => { toast.success("Employee deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => { toast.error(String(e)); setDeleteTarget(null); },
  });

  // ── Dialog helpers ────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      code: row.code ?? "",
      name: row.name ?? "",
      add1: row.add1 ?? "",
      add2: row.add2 ?? "",
      add3: row.add3 ?? "",
      desigId: row.desig_id ? String(row.desig_id) : null,
      department: row.department ?? "",
      esiNo: row.esi_no ?? "",
      pfNo: row.pf_no ?? "",
      doj: row.doj ?? "",
      dol: row.dol ?? "",
      slTotal: row.sl_total != null ? String(row.sl_total) : "",
      slBal: row.sl_bal != null ? String(row.sl_bal) : "",
      clTotal: row.cl_total != null ? String(row.cl_total) : "",
      clBal: row.cl_bal != null ? String(row.cl_bal) : "",
      splTotal: row.spl_total != null ? String(row.spl_total) : "",
      splBal: row.spl_bal != null ? String(row.spl_bal) : "",
      conPersonNo: row.con_person_no ?? "",
      emerPhNo: row.emer_ph_no ?? "",
      resiPhNo: row.resi_ph_no ?? "",
      advanceTot: row.advance_tot != null ? String(row.advance_tot) : "",
      target: row.target != null ? String(row.target) : "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Employee name is required"); return; }
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
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.code || <span className="text-muted-foreground">—</span>}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employee Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "desig_name",
      header: "Designation",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.desig_name || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.department || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      accessorKey: "doj",
      header: "Date of Joining",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.doj || <span className="text-muted-foreground">—</span>}</span>
      ),
      size: 120,
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <Can perm="employee-info:update">
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
            <Can perm="employee-info:update">
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
            <Can perm="employee-info:delete">
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

  // ── Section label helper ──────────────────────────────────

  const SectionLabel = ({ children }) => (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{children}</p>
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Employee Information</CardTitle>
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
              <Can perm="employee-info:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                  Add Employee
                </Button>
              </Can>
            }
          />
        </CardContent>
      </Card>

      {/* ── Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Identification ─────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Code</FieldLabel>
                <Input
                  value={form.code}
                  onChange={(e) => setF("code", e.target.value)}
                  placeholder="e.g. EMP001"
                  maxLength={20}
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel>
                  Employee Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => setF("name", e.target.value)}
                  placeholder="Full name"
                />
              </Field>
            </div>

            {/* ── Address ───────────────────────────────── */}
            <div className="border-t pt-3">
              <SectionLabel>Address</SectionLabel>
              <div className="space-y-3">
                <Field>
                  <FieldLabel>Address Line 1</FieldLabel>
                  <Input value={form.add1} onChange={(e) => setF("add1", e.target.value)} placeholder="Address line 1" />
                </Field>
                <Field>
                  <FieldLabel>Address Line 2</FieldLabel>
                  <Input value={form.add2} onChange={(e) => setF("add2", e.target.value)} placeholder="Address line 2" />
                </Field>
                <Field>
                  <FieldLabel>Address Line 3</FieldLabel>
                  <Input value={form.add3} onChange={(e) => setF("add3", e.target.value)} placeholder="Address line 3" />
                </Field>
              </div>
            </div>

            {/* ── Employment ────────────────────────────── */}
            <div className="border-t pt-3">
              <SectionLabel>Employment Details</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Designation</FieldLabel>
                  <Select
                    value={form.desigId ? String(form.desigId) : ""}
                    onValueChange={(v) => setF("desigId", v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Department</FieldLabel>
                  <Input value={form.department} onChange={(e) => setF("department", e.target.value)} placeholder="e.g. F&B, Kitchen" />
                </Field>
                <Field>
                  <FieldLabel>Date of Joining</FieldLabel>
                  <Input type="date" value={form.doj} onChange={(e) => setF("doj", e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Date of Leaving</FieldLabel>
                  <Input type="date" value={form.dol} onChange={(e) => setF("dol", e.target.value)} />
                </Field>
              </div>
            </div>

            {/* ── ESI / PF ──────────────────────────────── */}
            <div className="border-t pt-3">
              <SectionLabel>ESI / PF Details</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>ESI Number</FieldLabel>
                  <Input value={form.esiNo} onChange={(e) => setF("esiNo", e.target.value)} placeholder="ESI No." maxLength={50} />
                </Field>
                <Field>
                  <FieldLabel>PF Number</FieldLabel>
                  <Input value={form.pfNo} onChange={(e) => setF("pfNo", e.target.value)} placeholder="PF No." maxLength={50} />
                </Field>
              </div>
            </div>

            {/* ── Contact ───────────────────────────────── */}
            <div className="border-t pt-3">
              <SectionLabel>Contact Information</SectionLabel>
              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel>Contact Person No.</FieldLabel>
                  <Input value={form.conPersonNo} onChange={(e) => setF("conPersonNo", e.target.value)} placeholder="Contact no." maxLength={20} />
                </Field>
                <Field>
                  <FieldLabel>Emergency Phone</FieldLabel>
                  <Input value={form.emerPhNo} onChange={(e) => setF("emerPhNo", e.target.value)} placeholder="Emergency no." maxLength={20} />
                </Field>
                <Field>
                  <FieldLabel>Residential Phone</FieldLabel>
                  <Input value={form.resiPhNo} onChange={(e) => setF("resiPhNo", e.target.value)} placeholder="Residential no." maxLength={20} />
                </Field>
              </div>
            </div>

            {/* ── Leave Balance ─────────────────────────── */}
            <div className="border-t pt-3">
              <SectionLabel>Leave Balance</SectionLabel>
              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel>SL Total</FieldLabel>
                  <Input type="number" value={form.slTotal} onChange={(e) => setF("slTotal", e.target.value)} placeholder="0" min={0} step={0.5} />
                </Field>
                <Field>
                  <FieldLabel>SL Balance</FieldLabel>
                  <Input type="number" value={form.slBal} onChange={(e) => setF("slBal", e.target.value)} placeholder="0" min={0} step={0.5} />
                </Field>
                <div />
                <Field>
                  <FieldLabel>CL Total</FieldLabel>
                  <Input type="number" value={form.clTotal} onChange={(e) => setF("clTotal", e.target.value)} placeholder="0" min={0} step={0.5} />
                </Field>
                <Field>
                  <FieldLabel>CL Balance</FieldLabel>
                  <Input type="number" value={form.clBal} onChange={(e) => setF("clBal", e.target.value)} placeholder="0" min={0} step={0.5} />
                </Field>
                <div />
                <Field>
                  <FieldLabel>SPL Total</FieldLabel>
                  <Input type="number" value={form.splTotal} onChange={(e) => setF("splTotal", e.target.value)} placeholder="0" min={0} step={0.5} />
                </Field>
                <Field>
                  <FieldLabel>SPL Balance</FieldLabel>
                  <Input type="number" value={form.splBal} onChange={(e) => setF("splBal", e.target.value)} placeholder="0" min={0} step={0.5} />
                </Field>
                <div />
              </div>
            </div>

            {/* ── Financial ─────────────────────────────── */}
            <div className="border-t pt-3">
              <SectionLabel>Financial</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Total Advance</FieldLabel>
                  <Input type="number" value={form.advanceTot} onChange={(e) => setF("advanceTot", e.target.value)} placeholder="0.00" min={0} step={0.01} />
                </Field>
                <Field>
                  <FieldLabel>Sales Target</FieldLabel>
                  <Input type="number" value={form.target} onChange={(e) => setF("target", e.target.value)} placeholder="0.00" min={0} step={0.01} />
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Create Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ───────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
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
