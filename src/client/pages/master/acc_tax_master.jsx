import { useState, useRef } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  Cancel01Icon,
  Tick01Icon,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const QK = ["tax-masters"];
const EMPTY_FORM = { code: "", name: "", tallyCode: "", tallyName: "", glCode: "", glName: "", tallyId: null, glId: null };
const EMPTY_SLAB = { slabFrom: "", slabTo: "", taxPercentage: "" };

// ─────────────────────────────────────────────────────────────
// Lookup input — enters a numeric code, auto-fetches name
// ─────────────────────────────────────────────────────────────

function LookupInput({ label, codeValue, nameValue, onCodeChange, onResolved, lookupCmd, placeholder = "Enter code", required = false }) {
  const timerRef = useRef(null);

  function handleCodeChange(e) {
    const val = e.target.value;
    onCodeChange(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { onResolved(null, ""); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const result = await invoke(lookupCmd, { code: Number(val) });
        if (result) {
          onResolved(result.id, result.name);
        } else {
          onResolved(null, "");
          toast.error(`${label} code not found`);
        }
      } catch { onResolved(null, ""); }
    }, 500);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel>
          {label} Code {required && <span className="text-destructive">*</span>}
        </FieldLabel>
        <Input
          type="number"
          value={codeValue}
          onChange={handleCodeChange}
          placeholder={placeholder}
          min={0}
        />
      </Field>
      <Field>
        <FieldLabel>{label} Name</FieldLabel>
        <Input value={nameValue} readOnly placeholder="Auto-fetched" className="bg-muted/50 cursor-default" />
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tax Slab local editor (create mode — no DB yet)
// ─────────────────────────────────────────────────────────────

function SlabEditorLocal({ slabs, onChange }) {
  const [addForm, setAddForm] = useState({ ...EMPTY_SLAB });
  const [editIdx, setEditIdx] = useState(null);
  const [editData, setEditData] = useState(null);

  function validate(d) {
    if (d.slabFrom === "" || d.slabTo === "") { toast.error("Slab From and To are required"); return false; }
    if (Number(d.slabTo) < Number(d.slabFrom)) { toast.error("Slab 'To' must be ≥ 'From'"); return false; }
    const pct = Number(d.taxPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Tax % must be 0–100"); return false; }
    return true;
  }

  function addSlab() {
    if (!validate(addForm)) return;
    onChange([...slabs, addForm]);
    setAddForm({ ...EMPTY_SLAB });
  }

  function startEdit(i) { setEditIdx(i); setEditData({ ...slabs[i] }); }
  function cancelEdit() { setEditIdx(null); setEditData(null); }
  function confirmEdit() {
    if (!validate(editData)) return;
    onChange(slabs.map((s, i) => (i === editIdx ? editData : s)));
    setEditIdx(null); setEditData(null);
  }
  function deleteSlab(i) { onChange(slabs.filter((_, j) => j !== i)); }

  const numCell = (val, setter, key) => (
    <Input type="number" value={val} onChange={(e) => setter((d) => ({ ...d, [key]: e.target.value }))}
      className="h-7 text-xs text-right" min={0} step={0.01} placeholder="0.00" />
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold tracking-tight mb-1">Tax Slabs</h4>

      {/* Slab list */}
      <div className="rounded-lg border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center text-muted-foreground font-medium text-xs">Sr.</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs whitespace-nowrap">Slab Amt. From</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs whitespace-nowrap">Slab Amt. To</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs whitespace-nowrap w-24">Tax %</th>
              <th className="w-16 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {slabs.map((slab, i) =>
              editIdx === i ? (
                <tr key={i} className="bg-accent/20">
                  <td className="px-3 py-1.5 text-center text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-3 py-1.5">{numCell(editData.slabFrom, setEditData, "slabFrom")}</td>
                  <td className="px-3 py-1.5">{numCell(editData.slabTo, setEditData, "slabTo")}</td>
                  <td className="px-3 py-1.5">{numCell(editData.taxPercentage, setEditData, "taxPercentage")}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1 justify-end">
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={confirmEdit}>
                        <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2} />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-center text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{slab.slabFrom}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{slab.slabTo}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{slab.taxPercentage}%</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(i)}>
                        <HugeiconsIcon icon={PencilEdit01Icon} size={12} strokeWidth={2} />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteSlab(i)}>
                        <HugeiconsIcon icon={Delete01Icon} size={12} strokeWidth={2} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {/* Always-visible add row */}
            <tr className="bg-muted/20">
              <td className="px-3 py-1.5 text-center text-muted-foreground text-xs">—</td>
              <td className="px-3 py-1.5">{numCell(addForm.slabFrom, setAddForm, "slabFrom")}</td>
              <td className="px-3 py-1.5">{numCell(addForm.slabTo, setAddForm, "slabTo")}</td>
              <td className="px-3 py-1.5">{numCell(addForm.taxPercentage, setAddForm, "taxPercentage")}</td>
              <td className="px-3 py-1.5 text-right">
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={addSlab}>
                  <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.5} />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tax Slab inline editor (edit mode — live DB)
// ─────────────────────────────────────────────────────────────

function SlabTable({ taxMasterId }) {
  const qc = useQueryClient();
  const QKS = ["tax-slabs", taxMasterId];

  const { data: slabs = [], isLoading } = useQuery({
    queryKey: QKS,
    queryFn: () => invoke("get_tax_slabs", { taxMasterId }),
    enabled: !!taxMasterId,
  });

  const [editRow, setEditRow] = useState(null);

  const saveMut = useMutation({
    mutationFn: (d) =>
      invoke("save_tax_slab", {
        id: d.id ?? null,
        taxMasterId,
        slabFrom: Number(d.slabFrom) || 0,
        slabTo: Number(d.slabTo) || 0,
        taxPercentage: Number(d.taxPercentage) || 0,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QKS }); setEditRow(null); },
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_tax_slab", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QKS }),
    onError: (e) => toast.error(String(e)),
  });

  const [addForm, setAddForm] = useState({ ...EMPTY_SLAB });

  function startEdit(slab) {
    setEditRow({
      id: slab.id,
      slabFrom: String(slab.slab_from ?? ""),
      slabTo: String(slab.slab_to ?? ""),
      taxPercentage: String(slab.tax_percentage ?? ""),
    });
  }
  function cancelEdit() { setEditRow(null); }

  function validateSlab(d) {
    if (d.slabFrom === "" || d.slabTo === "") { toast.error("Slab From and To are required"); return false; }
    if (Number(d.slabTo) < Number(d.slabFrom)) { toast.error("Slab 'To' must be ≥ 'From'"); return false; }
    const pct = Number(d.taxPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Tax % must be 0–100"); return false; }
    return true;
  }

  function addSlab() {
    if (!validateSlab(addForm)) return;
    saveMut.mutate({ ...addForm, id: null });
    setAddForm({ ...EMPTY_SLAB });
  }

  const numInput = (val, setter, key) => (
    <Input type="number" value={val}
      onChange={(e) => setter((r) => ({ ...r, [key]: e.target.value }))}
      className="h-7 text-xs text-right" min={0} step={0.01} placeholder="0.00" />
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold tracking-tight mb-1">Tax Slabs</h4>

      <div className="rounded-lg border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center text-muted-foreground font-medium text-xs">Sr.</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs whitespace-nowrap">Slab Amt. From</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs whitespace-nowrap">Slab Amt. To</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs whitespace-nowrap w-24">Tax %</th>
              <th className="w-16 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">Loading…</td></tr>
            )}
            {!isLoading && slabs.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">No slabs added yet.</td></tr>
            )}
            {slabs.map((slab, i) =>
              editRow?.id === slab.id ? (
                <tr key={slab.id} className="bg-accent/20">
                  <td className="px-3 py-1.5 text-center text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-3 py-1.5">{numInput(editRow.slabFrom, setEditRow, "slabFrom")}</td>
                  <td className="px-3 py-1.5">{numInput(editRow.slabTo, setEditRow, "slabTo")}</td>
                  <td className="px-3 py-1.5">{numInput(editRow.taxPercentage, setEditRow, "taxPercentage")}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1 justify-end">
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-primary"
                        onClick={() => { if (validateSlab(editRow)) saveMut.mutate(editRow); }}>
                        <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2} />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={slab.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-center text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{slab.slab_from}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{slab.slab_to}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{slab.tax_percentage}%</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Can perm="acc-tax-master:update">
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(slab)}>
                          <HugeiconsIcon icon={PencilEdit01Icon} size={12} strokeWidth={2} />
                        </Button>
                      </Can>
                      <Can perm="acc-tax-master:delete">
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => deleteMut.mutate(slab.id)}>
                          <HugeiconsIcon icon={Delete01Icon} size={12} strokeWidth={2} />
                        </Button>
                      </Can>
                    </div>
                  </td>
                </tr>
              )
            )}
            {/* Always-visible add row */}
            <Can perm="acc-tax-master:add">
              <tr className="bg-muted/20">
                <td className="px-3 py-1.5 text-center text-muted-foreground text-xs">—</td>
                <td className="px-3 py-1.5">{numInput(addForm.slabFrom, setAddForm, "slabFrom")}</td>
                <td className="px-3 py-1.5">{numInput(addForm.slabTo, setAddForm, "slabTo")}</td>
                <td className="px-3 py-1.5">{numInput(addForm.taxPercentage, setAddForm, "taxPercentage")}</td>
                <td className="px-3 py-1.5 text-right">
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-primary"
                    onClick={addSlab} disabled={saveMut.isPending}>
                    <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.5} />
                  </Button>
                </td>
              </tr>
            </Can>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function AccTaxMaster() {
  const enterNav = useEnterNav();
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingSlabs, setPendingSlabs] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_tax_masters", { qs }),
  });

  function inv() { qc.invalidateQueries({ queryKey: QK }); }
  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // ── Mutations ───────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: async (d) => {
      const newId = await invoke("create_tax_master", {
        name: d.name,
        code: d.code ? Number(d.code) : null,
        tallyId: d.tallyId ?? null,
        glId: d.glId ?? null,
      });
      for (const slab of d.slabs) {
        await invoke("save_tax_slab", {
          id: null,
          taxMasterId: newId,
          slabFrom: Number(slab.slabFrom) || 0,
          slabTo: Number(slab.slabTo) || 0,
          taxPercentage: Number(slab.taxPercentage) || 0,
        });
      }
      return newId;
    },
    onSuccess: () => {
      toast.success("Tax master created");
      inv();
      setPendingSlabs([]);
      closeDialog();
    },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) =>
      invoke("update_tax_master", {
        id: d.id,
        code: Number(d.code),
        name: d.name,
        tallyId: d.tallyId ?? null,
        glId: d.glId ?? null,
      }),
    onSuccess: () => { toast.success("Tax master updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_tax_master_active", { id, isActive: is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_tax_master", { id }),
    onSuccess: () => { toast.success("Tax master deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => { toast.error(String(e)); setDeleteTarget(null); },
  });

  // ── Dialog helpers ──────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setPendingSlabs([]);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name ?? "",
      tallyCode: row.tally_code ? String(row.tally_code) : "",
      tallyName: row.tally_name ?? "",
      tallyId: row.tally_id ?? null,
      glCode: row.gl_code ? String(row.gl_code) : "",
      glName: row.gl_name ?? "",
      glId: row.gl_id ?? null,
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() {
    setDialog((d) => ({ ...d, open: false }));
  }

  // ── Submit ──────────────────────────────────────────────────

  function handleSubmit(e) {
    e.preventDefault();
    if (isEditMode && !form.code) { toast.error("Tax code is required"); return; }
    if (!form.name.trim()) { toast.error("Tax name is required"); return; }
    if (!form.tallyId) { toast.error("Tally Ledger is required"); return; }
    if (!form.glId) { toast.error("GL Ledger is required"); return; }
    const payload = { ...form, id: dialog.data?.id };
    if (dialog.mode === "create") createMut.mutate({ ...payload, slabs: pendingSlabs });
    else updateMut.mutate(payload);
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const isEditMode = dialog.mode === "edit";
  const editId = dialog.data?.id ?? null;

  // ── Columns ─────────────────────────────────────────────────

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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tax Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "tally_name",
      header: "Tally Ledger",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.tally_name
            ? `${row.original.tally_name} (${row.original.tally_code})`
            : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "gl_name",
      header: "GL Ledger",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.gl_name
            ? `${row.original.gl_name} (${row.original.gl_code})`
            : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <Can perm="acc-tax-master:update">
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
            <Can perm="acc-tax-master:update">
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
            <Can perm="acc-tax-master:delete">
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

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Tax Master</CardTitle>
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
              <Can perm="acc-tax-master:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                  Add Tax
                </Button>
              </Can>
            }
          />
        </CardContent>
      </Card>

      {/* ── Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Tax Master" : "Add Tax Master"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav} className="space-y-5">
            {/* Code */}
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
                readOnly={isEditMode}
                className={isEditMode ? "bg-muted cursor-not-allowed" : ""}
              />
            </Field>

            {/* Tax Name */}
            <Field>
              <FieldLabel>
                Tax Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                placeholder="Enter tax name"
                autoFocus
              />
            </Field>

            {/* Tally Ledger */}
            <LookupInput
              label="Tally Ledger"
              codeValue={form.tallyCode}
              nameValue={form.tallyName}
              onCodeChange={(v) => setF("tallyCode", v)}
              onResolved={(id, name) => setForm((f) => ({ ...f, tallyId: id, tallyName: name }))}
              lookupCmd="lookup_tally_by_code"
              required
            />

            {/* GL Ledger */}
            <LookupInput
              label="GL Ledger"
              codeValue={form.glCode}
              nameValue={form.glName}
              onCodeChange={(v) => setF("glCode", v)}
              onResolved={(id, name) => setForm((f) => ({ ...f, glId: id, glName: name }))}
              lookupCmd="lookup_gl_by_code"
              required
            />

            {/* Tax Slabs */}
            <div className="border-t pt-2" data-enter-skip>
              {isEditMode && editId ? (
                <SlabTable taxMasterId={editId} />
              ) : (
                <SlabEditorLocal slabs={pendingSlabs} onChange={setPendingSlabs} />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Create Tax"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ──────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tax Master</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? All tax slabs linked to it will also be
              removed. This cannot be undone.
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
