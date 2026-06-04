import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnterNav } from "@/hooks/use-enter-nav";
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

const QK = ["creditors"];
const EMPTY_FORM = {
  code: "",
  name: "",
  address1: "",
  address2: "",
  mobileNo1: "",
  mobileNo2: "",
  emailId: "",
  openingBal: "",
  openingCrdr: "D",
  closingBal: "",
  closingCrdr: "D",
  tallyCode: "",
  tallyName: "",
  tallyId: null,
  marketId: null,
  gstPercent: "",
};

// ─────────────────────────────────────────────────────────────
// Tally lookup input
// ─────────────────────────────────────────────────────────────

function TallyLookupInput({ codeValue, nameValue, onCodeChange, onResolved }) {
  const timerRef = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    onCodeChange(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { onResolved(null, ""); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const result = await invoke("lookup_tally_by_code", { code: Number(val) });
        if (result) {
          onResolved(result.id, result.name);
        } else {
          onResolved(null, "");
          toast.error("Tally Ledger code not found");
        }
      } catch { onResolved(null, ""); }
    }, 500);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel>
          Tally Ledger Code <span className="text-destructive">*</span>
        </FieldLabel>
        <Input type="number" value={codeValue} onChange={handleChange} placeholder="Enter code" min={0} />
      </Field>
      <Field>
        <FieldLabel>Tally Ledger Name</FieldLabel>
        <Input value={nameValue} readOnly placeholder="Auto-fetched" className="bg-muted/50 cursor-default" />
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function AccCreditor() {
  const enterNav = useEnterNav();
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_creditors", { qs }),
  });

  const { data: segments = [] } = useQuery({
    queryKey: ["market-segments-all"],
    queryFn: () => invoke("get_all_market_segments"),
  });

  function inv() { qc.invalidateQueries({ queryKey: QK }); }
  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // ── Mutations ───────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (d) =>
      invoke("create_creditor", {
        name: d.name,
        code: d.code ? Number(d.code) : null,
        address1: d.address1 || null,
        address2: d.address2 || null,
        mobileNo1: d.mobileNo1 || null,
        mobileNo2: d.mobileNo2 || null,
        emailId: d.emailId || null,
        openingBal: Number(d.openingBal) || 0,
        openingCrdr: d.openingCrdr,
        closingBal: Number(d.closingBal) || 0,
        closingCrdr: d.closingCrdr,
        tallyId: d.tallyId ?? null,
        marketId: d.marketId ? Number(d.marketId) : null,
        gstPercent: Number(d.gstPercent) || 0,
      }),
    onSuccess: () => { toast.success("Creditor created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) =>
      invoke("update_creditor", {
        id: d.id,
        code: Number(d.code),
        name: d.name,
        address1: d.address1 || null,
        address2: d.address2 || null,
        mobileNo1: d.mobileNo1 || null,
        mobileNo2: d.mobileNo2 || null,
        emailId: d.emailId || null,
        openingBal: Number(d.openingBal) || 0,
        openingCrdr: d.openingCrdr,
        closingBal: Number(d.closingBal) || 0,
        closingCrdr: d.closingCrdr,
        tallyId: d.tallyId ?? null,
        marketId: d.marketId ? Number(d.marketId) : null,
        gstPercent: Number(d.gstPercent) || 0,
      }),
    onSuccess: () => { toast.success("Creditor updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_creditor_active", { id, isActive: is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_creditor", { id }),
    onSuccess: () => { toast.success("Creditor deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => { toast.error(String(e)); setDeleteTarget(null); },
  });

  // ── Dialog helpers ──────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name ?? "",
      address1: row.address1 ?? "",
      address2: row.address2 ?? "",
      mobileNo1: row.mobile_no1 ?? "",
      mobileNo2: row.mobile_no2 ?? "",
      emailId: row.email_id ?? "",
      openingBal: row.opening_bal != null ? String(row.opening_bal) : "",
      openingCrdr: row.opening_crdr ?? "D",
      closingBal: row.closing_bal != null ? String(row.closing_bal) : "",
      closingCrdr: row.closing_crdr ?? "D",
      tallyCode: row.tally_code ? String(row.tally_code) : "",
      tallyName: row.tally_name ?? "",
      tallyId: row.tally_id ?? null,
      marketId: row.market_id ? String(row.market_id) : null,
      gstPercent: row.gst_percent != null ? String(row.gst_percent) : "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  // ── Submit ──────────────────────────────────────────────────

  function handleSubmit(e) {
    e.preventDefault();
    if (isEditMode && !form.code) { toast.error("Party code is required"); return; }
    if (!form.name.trim()) { toast.error("Party name is required"); return; }
    if (!form.tallyId) { toast.error("Tally Ledger is required"); return; }
    if (!form.mobileNo1.trim()) { toast.error("Mobile Number 1 is required"); return; }
    const payload = { ...form, id: dialog.data?.id };
    if (dialog.mode === "create") createMut.mutate(payload);
    else updateMut.mutate(payload);
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const isEditMode = dialog.mode === "edit";

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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Party Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "mobile_no1",
      header: "Mobile",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.mobile_no1 || <span className="text-muted-foreground">—</span>}</span>
      ),
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
      accessorKey: "market_name",
      header: "Market Segment",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.market_name || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      accessorKey: "opening_bal",
      header: "Opening Bal.",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.opening_bal?.toFixed(2)} {row.original.opening_crdr}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: "gst_percent",
      header: "GST %",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.gst_percent?.toFixed(2)}%</span>
      ),
      size: 80,
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <Can perm="acc-creditor:update">
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
            <Can perm="acc-creditor:update">
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
            <Can perm="acc-creditor:delete">
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
          <CardTitle>Creditor Ledger</CardTitle>
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
              <Can perm="acc-creditor:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                  Add Creditor
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
            <DialogTitle>{isEditMode ? "Edit Creditor" : "Add Creditor"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav} className="space-y-4">
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
            <Field>
              <FieldLabel>
                Party Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Enter party name" autoFocus />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Address Line 1</FieldLabel>
                <Input value={form.address1} onChange={(e) => setF("address1", e.target.value)} placeholder="Address line 1" />
              </Field>
              <Field>
                <FieldLabel>Address Line 2</FieldLabel>
                <Input value={form.address2} onChange={(e) => setF("address2", e.target.value)} placeholder="Address line 2" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>
                  Mobile Number 1 <span className="text-destructive">*</span>
                </FieldLabel>
                <Input value={form.mobileNo1} onChange={(e) => setF("mobileNo1", e.target.value)} placeholder="Mobile 1" maxLength={12} />
              </Field>
              <Field>
                <FieldLabel>Mobile Number 2</FieldLabel>
                <Input value={form.mobileNo2} onChange={(e) => setF("mobileNo2", e.target.value)} placeholder="Mobile 2" maxLength={12} />
              </Field>
            </div>

            <Field>
              <FieldLabel>Email ID</FieldLabel>
              <Input type="email" value={form.emailId} onChange={(e) => setF("emailId", e.target.value)} placeholder="email@example.com" />
            </Field>

            <TallyLookupInput
              codeValue={form.tallyCode}
              nameValue={form.tallyName}
              onCodeChange={(v) => setF("tallyCode", v)}
              onResolved={(id, name) => setForm((f) => ({ ...f, tallyId: id, tallyName: name }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Market Segment</FieldLabel>
                <Select
                  value={form.marketId ? String(form.marketId) : ""}
                  onValueChange={(v) => setF("marketId", v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>GST Percentage</FieldLabel>
                <Input type="number" value={form.gstPercent} onChange={(e) => setF("gstPercent", e.target.value)}
                  placeholder="0.00" min={0} max={100} step={0.01} />
              </Field>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Balance Details</p>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>
                    Opening Balance <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input type="number" value={form.openingBal} onChange={(e) => setF("openingBal", e.target.value)}
                    placeholder="0.00" min={0} step={0.01} />
                </Field>
                <Field>
                  <FieldLabel>
                    Opening CR/DR <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select value={form.openingCrdr} onValueChange={(v) => setF("openingCrdr", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">Credit (C)</SelectItem>
                      <SelectItem value="D">Debit (D)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Closing Balance</FieldLabel>
                  <Input type="number" value={form.closingBal} onChange={(e) => setF("closingBal", e.target.value)}
                    placeholder="0.00" min={0} step={0.01} />
                </Field>
                <Field>
                  <FieldLabel>Closing CR/DR</FieldLabel>
                  <Select value={form.closingCrdr} onValueChange={(v) => setF("closingCrdr", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">Credit (C)</SelectItem>
                      <SelectItem value="D">Debit (D)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Create Creditor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ──────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Creditor</AlertDialogTitle>
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
