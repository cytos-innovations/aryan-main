import { useEffect, useMemo, useState, useRef } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toTitleCase } from "@/lib/utils";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const QK = ["general-ledgers"];
const EMPTY_FORM = {
  code: "",
  name: "",
  grpCode: null,
  subLed: "N",
  openBal: "",
  openCrdr: "D",
  prevBal: "",
  prevCrdr: "D",
  closeBal: "",
  closeCrdr: "D",
};

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────

function BalanceField({ label, balKey, crdrKey, form, setF, required }) {
  return (
    <Field>
      <FieldLabel>
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          className="flex-1"
          value={form[balKey]}
          onChange={(e) => setF(balKey, e.target.value)}
          placeholder="0.00"
        />
        <SearchableSelect
          options={[{ value: "D", label: "Debit" }, { value: "C", label: "Credit" }]}
          value={form[crdrKey]}
          onSelect={(v) => setF(crdrKey, v)}
          placeholder="D/C"
          className="w-24"
        />
      </div>
    </Field>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

function SearchableSelect({ options, value, onSelect, placeholder = "Select…", className = "" }) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);
  const containerRef        = useRef(null);
  const listRef             = useRef(null);
  const inputRef            = useRef(null);
  const selected = options.find((o) => o.value === value) ?? null;
  const displayText = open ? query : (selected?.label ?? "");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);
  useEffect(() => { setActive(0); }, [filtered.length]);
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  useEffect(() => {
    function onDown(e) { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  function focusNext() {
    const input = inputRef.current; if (!input) return;
    const all = Array.from(document.querySelectorAll('input:not([disabled]):not([readonly]),textarea:not([disabled]):not([readonly]),button:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => !el.closest("[data-radix-popper-content-wrapper]"));
    const idx = all.indexOf(input); if (idx !== -1 && all[idx + 1]) all[idx + 1].focus();
  }
  function pick(opt) { onSelect(opt.value); setOpen(false); setQuery(""); setTimeout(focusNext, 0); }
  function onKeyDown(e) {
    if (!open) { if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); setQuery(""); setOpen(true); setActive(0); } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input ref={inputRef} type="text" value={displayText} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => { setQuery(""); setOpen(true); setActive(0); }} onKeyDown={onKeyDown} placeholder={placeholder} autoComplete="off" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground" />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <div ref={listRef} className="max-h-52 overflow-y-auto">
            {filtered.map((opt, i) => (
              <div key={opt.value} onMouseDown={(e) => { e.preventDefault(); pick(opt); }} onMouseEnter={() => setActive(i)} className={["cursor-pointer px-3 py-2 text-sm", i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent"].join(" ")}>{opt.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccGeneralLedger() {
  const enterNav = useEnterNav();
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_general_ledgers", { qs }),
  });

  const { data: accountGroups = [] } = useQuery({
    queryKey: ["account-groups-all"],
    queryFn: () => invoke("get_all_account_groups"),
  });

  function inv() { qc.invalidateQueries({ queryKey: QK }); }

  // ── Payload builder ───────────────────────────────────────

  function buildPayload(f) {
    return {
      name: f.name,
      code: f.code ? Number(f.code) : null,
      grpCode: f.grpCode ? Number(f.grpCode) : null,
      subLed: f.subLed || null,
      openBal: f.openBal !== "" ? Number(f.openBal) : null,
      openCrdr: f.openBal !== "" ? f.openCrdr : null,
      prevBal: f.prevBal !== "" ? Number(f.prevBal) : null,
      prevCrdr: f.prevBal !== "" ? f.prevCrdr : null,
      closeBal: f.closeBal !== "" ? Number(f.closeBal) : null,
      closeCrdr: f.closeBal !== "" ? f.closeCrdr : null,
    };
  }

  // ── Mutations ─────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (f) => invoke("create_general_ledger", buildPayload(f)),
    onSuccess: () => { toast.success("General ledger created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) =>
      invoke("update_general_ledger", { id: f.id, code: Number(f.code), ...buildPayload(f) }),
    onSuccess: () => { toast.success("General ledger updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_general_ledger_active", { id, isActive: is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_general_ledger", { id }),
    onSuccess: () => { toast.success("General ledger deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => { toast.error(String(e)); setDeleteTarget(null); },
  });

  // ── Dialog helpers ────────────────────────────────────────

  async function openCreate() {
    setForm(EMPTY_FORM);
    setDialog({ open: true, mode: "create", data: null });
    try {
      const next = await invoke("get_next_master_code", { table: "general_ledger" });
      setForm((f) => ({ ...f, code: String(next) }));
    } catch { /* leave code blank — backend will auto-assign */ }
  }

  function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name ?? "",
      grpCode: row.grp_code ? String(row.grp_code) : null,
      subLed: row.sub_led ?? "N",
      openBal: row.open_bal != null ? String(row.open_bal) : "",
      openCrdr: row.open_crdr ?? "D",
      prevBal: row.prev_bal != null ? String(row.prev_bal) : "",
      prevCrdr: row.prev_crdr ?? "D",
      closeBal: row.close_bal != null ? String(row.close_bal) : "",
      closeCrdr: row.close_crdr ?? "D",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (isEditMode && !form.code) { toast.error("Ledger code is required"); return; }
    if (!form.name.trim()) { toast.error("Ledger name is required"); return; }
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ledger Name" />,
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
      accessorKey: "sub_led",
      header: "Sub Ledger",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.sub_led === "Y" ? "Yes" : "No"}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: "open_bal",
      header: "Opening Bal.",
      cell: ({ row }) => {
        const { open_bal, open_crdr } = row.original;
        if (open_bal == null) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-sm font-mono">
            {Number(open_bal).toFixed(2)}{" "}
            <span className="text-xs text-muted-foreground">{open_crdr}</span>
          </span>
        );
      },
      size: 130,
    },
    {
      accessorKey: "prev_bal",
      header: "Prev. Year Bal.",
      cell: ({ row }) => {
        const { prev_bal, prev_crdr } = row.original;
        if (prev_bal == null) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-sm font-mono">
            {Number(prev_bal).toFixed(2)}{" "}
            <span className="text-xs text-muted-foreground">{prev_crdr}</span>
          </span>
        );
      },
      size: 130,
    },
    {
      accessorKey: "close_bal",
      header: "Closing Bal.",
      cell: ({ row }) => {
        const { close_bal, close_crdr } = row.original;
        if (close_bal == null) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-sm font-mono">
            {Number(close_bal).toFixed(2)}{" "}
            <span className="text-xs text-muted-foreground">{close_crdr}</span>
          </span>
        );
      },
      size: 130,
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <Can perm="acc-general-ledger:update">
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
            <Can perm="acc-general-ledger:update">
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
            <Can perm="acc-general-ledger:delete">
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
          <CardTitle>General Ledger</CardTitle>
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
              <Can perm="acc-general-ledger:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                  Add Ledger
                </Button>
              </Can>
            }
          />
        </CardContent>
      </Card>

      {/* ── Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit General Ledger" : "Add General Ledger"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav} className="space-y-4">
            {/* Row 1: Code + Name */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>
                  Ledger Code {isEditMode && <span className="text-destructive">*</span>}
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
                  Ledger Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => setF("name", e.target.value)}
                  onBlur={(e) => setF("name", toTitleCase(e.target.value))}
                  placeholder="e.g. Cash Account"
                />
              </Field>
            </div>

            {/* Row 2: Account Group + Sub Ledger */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Account Group</FieldLabel>
                <SearchableSelect
                  options={accountGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                  value={form.grpCode ? String(form.grpCode) : ""}
                  onSelect={(v) => setF("grpCode", v || null)}
                  placeholder="Type to search group…"
                />
              </Field>

              <Field>
                <FieldLabel>Sub Ledger</FieldLabel>
                <SearchableSelect
                  options={[{ value: "N", label: "No" }, { value: "Y", label: "Yes" }]}
                  value={form.subLed}
                  onSelect={(v) => setF("subLed", v)}
                  placeholder="Select…"
                />
              </Field>
            </div>

            {/* Balance fields */}
            <BalanceField
              label="Opening Balance"
              balKey="openBal"
              crdrKey="openCrdr"
              form={form}
              setF={setF}
            />
            <BalanceField
              label="Previous Year Balance"
              balKey="prevBal"
              crdrKey="prevCrdr"
              form={form}
              setF={setF}
            />
            <BalanceField
              label="Closing Balance"
              balKey="closeBal"
              crdrKey="closeCrdr"
              form={form}
              setF={setF}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Create Ledger"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ───────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete General Ledger</AlertDialogTitle>
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
