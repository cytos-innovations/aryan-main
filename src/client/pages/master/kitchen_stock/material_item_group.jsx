import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toTitleCase } from "@/lib/utils";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit01Icon, Delete01Icon, PlusSignIcon, MinusSignIcon } from "@hugeicons/core-free-icons";

import { Can } from "@/lib/auth";
import { DataTable, DataTableColumnHeader, DEFAULT_QUERY_STATE } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const QK = ["item-groups"];

const EMPTY_FORM = {
  code: "", name: "", payable: "1",
  tallyInput: "", tallyId: null, tallyName: "",
  itemRate: "", unitsId: null,
  appliServiceTax: "0", resSaleMode: "0",
};

const EMPTY_TAX_ROW = { taxCodeInput: "", taxId: null, taxName: "", taxPercentage: "" };

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

export default function MaterialItemGroup() {
  const enterNav = useEnterNav();
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [taxRows, setTaxRows] = useState([{ ...EMPTY_TAX_ROW }]);
  const taxCodeRefs = useRef([]);
  const taxPctRefs = useRef([]);

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // ── Queries ───────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_item_groups", { qs }),
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units-for-item"],
    queryFn: () => invoke("get_all_units_for_item"),
  });

  function inv() { qc.invalidateQueries({ queryKey: QK }); }

  // ── Tally lookup ─────────────────────────────────────────

  async function handleTallyLookup() {
    if (!form.tallyInput) { setF("tallyId", null); setF("tallyName", ""); return; }
    try {
      const result = await invoke("lookup_tally_for_item_group", { code: Number(form.tallyInput) });
      if (result) {
        setForm((f) => ({ ...f, tallyId: result.id, tallyName: result.name }));
      } else {
        toast.error("Tally code not found");
        setForm((f) => ({ ...f, tallyId: null, tallyName: "" }));
      }
    } catch (e) { toast.error(String(e)); }
  }

  // ── Tax row helpers ───────────────────────────────────────

  const updateTaxRow = useCallback((index, field, value) => {
    setTaxRows((rows) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  async function handleTaxCodeLookup(index) {
    const row = taxRows[index];
    if (!row.taxCodeInput) {
      updateTaxRow(index, "taxId", null);
      updateTaxRow(index, "taxName", "");
      return;
    }
    try {
      const result = await invoke("lookup_tax_for_item_group", { code: Number(row.taxCodeInput) });
      if (result) {
        // Prefill Tax % from the tax master's base slab unless the user
        // has already typed a value in this row (editable either way).
        const defaultPct = result.tax_percentage != null ? String(result.tax_percentage) : null;
        setTaxRows((rows) => {
          const updated = [...rows];
          updated[index] = {
            ...updated[index],
            taxId: result.id,
            taxName: result.name,
            taxPercentage:
              updated[index].taxPercentage !== "" ? updated[index].taxPercentage
                : defaultPct ?? "",
          };
          return updated;
        });
        // Focus the percentage input of the same row
        setTimeout(() => taxPctRefs.current[index]?.focus(), 50);
      } else {
        toast.error("Tax code not found");
        setTaxRows((rows) => {
          const updated = [...rows];
          updated[index] = { ...updated[index], taxId: null, taxName: "" };
          return updated;
        });
      }
    } catch (e) { toast.error(String(e)); }
  }

  function addTaxRow() {
    setTaxRows((rows) => [...rows, { ...EMPTY_TAX_ROW }]);
  }

  function removeTaxRow(index) {
    setTaxRows((rows) => rows.length === 1 ? [{ ...EMPTY_TAX_ROW }] : rows.filter((_, i) => i !== index));
  }

  // ── Mutations ─────────────────────────────────────────────

  function buildTaxDetails() {
    return taxRows
      .filter((r) => r.taxId && r.taxPercentage !== "")
      .map((r) => ({ taxId: r.taxId, taxPercentage: Number(r.taxPercentage) }));
  }

  function buildPayload(f) {
    return {
      name: f.name,
      code: f.code ? Number(f.code) : null,
      payable: Number(f.payable),
      tallyCode: f.tallyId || null,
      itemRate: f.itemRate !== "" ? Number(f.itemRate) : null,
      unitsId: f.unitsId ? Number(f.unitsId) : null,
      appliServiceTax: Number(f.appliServiceTax),
      resSaleMode: Number(f.resSaleMode),
      taxDetails: buildTaxDetails(),
    };
  }

  const createMut = useMutation({
    mutationFn: (f) => invoke("create_item_group", buildPayload(f)),
    onSuccess: () => { toast.success("Item group created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) => invoke("update_item_group", { id: f.id, code: Number(f.code), ...buildPayload(f) }),
    onSuccess: () => { toast.success("Item group updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => invoke("toggle_item_group_active", { id, isActive: is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_item_group", { id }),
    onSuccess: () => { toast.success("Item group deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => { toast.error(String(e)); setDeleteTarget(null); },
  });

  // ── Dialog helpers ────────────────────────────────────────

  async function openCreate() {
    setForm(EMPTY_FORM);
    setTaxRows([{ ...EMPTY_TAX_ROW }]);
    setDialog({ open: true, mode: "create", data: null });
    try {
      const next = await invoke("get_next_master_code", { table: "item_group" });
      setForm((f) => ({ ...f, code: String(next) }));
    } catch { /* leave code blank — backend will auto-assign */ }
  }

  async function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name ?? "",
      payable: String(row.payable ?? "1"),
      tallyInput: row.tally_master_code ? String(row.tally_master_code) : "",
      tallyId: row.tally_code || null,
      tallyName: row.tally_name ?? "",
      itemRate: row.item_rate != null ? String(row.item_rate) : "",
      unitsId: row.units_id ? String(row.units_id) : null,
      appliServiceTax: String(row.appli_service_tax ?? "0"),
      resSaleMode: String(row.res_sale_mode ?? "0"),
    });
    try {
      const detail = await invoke("get_item_group_detail", { id: row.id });
      const loaded = detail.taxes.length > 0
        ? detail.taxes.map((t) => ({
            taxCodeInput: String(t.tax_code),
            taxId: t.tax_id,
            taxName: t.tax_name,
            taxPercentage: String(t.tax_percentage),
          }))
        : [{ ...EMPTY_TAX_ROW }];
      setTaxRows(loaded);
    } catch (e) { toast.error(`Failed to load tax details: ${String(e)}`); setTaxRows([{ ...EMPTY_TAX_ROW }]); }
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (isEditMode && !form.code) { toast.error("Item group code is required"); return; }
    if (!form.name.trim()) { toast.error("Item group name is required"); return; }
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
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
      size: 80,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Group" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "payable",
      header: "Payable",
      cell: ({ row }) => <span className="text-sm">{row.original.payable === 1 ? "Yes" : "No"}</span>,
      size: 80,
    },
    {
      accessorKey: "tally_name",
      header: "Tally",
      cell: ({ row }) => <span className="text-sm">{row.original.tally_name || <span className="text-muted-foreground">—</span>}</span>,
    },
    {
      accessorKey: "item_rate",
      header: "Item Rate",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.item_rate != null ? Number(row.original.item_rate).toFixed(4) : <span className="text-muted-foreground">—</span>}
        </span>
      ),
      size: 110,
    },
    {
      accessorKey: "unit_name",
      header: "Unit",
      cell: ({ row }) => <span className="text-sm">{row.original.unit_name || <span className="text-muted-foreground">—</span>}</span>,
      size: 80,
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <Can perm="mat-item-group:update">
          <Switch checked={row.original.is_active === 1}
            onCheckedChange={(v) => toggleMut.mutate({ id: row.original.id, is_active: v ? 1 : 0 })} />
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
            <Can perm="mat-item-group:update">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(row.original)}>
                    <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={2} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </Can>
            <Can perm="mat-item-group:delete">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
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
          <CardTitle>Item Group Master</CardTitle>
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
              <Can perm="mat-item-group:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1" />
                  Add Item Group
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
            <DialogTitle>{isEditMode ? "Edit Item Group" : "Add Item Group"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav} className="space-y-4">
            {/* Row 1: Name */}
            <div className="grid grid-cols-1 gap-3">
              {/* Code field hidden — not shown in form
              <Field>
                <FieldLabel>Code {isEditMode && <span className="text-destructive">*</span>}</FieldLabel>
                <Input type="number" value={form.code}
                  onChange={(e) => setF("code", e.target.value)}
                  placeholder={isEditMode ? "" : "Auto-generated"} min={1} autoFocus
                  readOnly={isEditMode}
                  className={isEditMode ? "bg-muted cursor-not-allowed" : ""} />
              </Field>
              */}
              <Field>
                <FieldLabel>Item Group Name <span className="text-destructive">*</span></FieldLabel>
                <Input value={form.name} onChange={(e) => setF("name", e.target.value)}
                  onBlur={(e) => setF("name", toTitleCase(e.target.value))}
                  placeholder="e.g. Beverages" />
              </Field>
            </div>

            {/* Row 2: Payable + Service Tax + Sale Mode */}
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Payable</FieldLabel>
                <SearchableSelect
                  options={[{ value: "1", label: "Yes" }, { value: "0", label: "No" }]}
                  value={form.payable}
                  onSelect={(v) => setF("payable", v)}
                  placeholder="Select…"
                />
              </Field>
              <Field>
                <FieldLabel>Service Tax Applicable</FieldLabel>
                <SearchableSelect
                  options={[{ value: "0", label: "No" }, { value: "1", label: "Yes" }]}
                  value={form.appliServiceTax}
                  onSelect={(v) => setF("appliServiceTax", v)}
                  placeholder="Select…"
                />
              </Field>
              <Field>
                <FieldLabel>Restaurant Sale Mode</FieldLabel>
                <SearchableSelect
                  options={[{ value: "0", label: "No" }, { value: "1", label: "Yes" }]}
                  value={form.resSaleMode}
                  onSelect={(v) => setF("resSaleMode", v)}
                  placeholder="Select…"
                />
              </Field>
            </div>

            {/* Row 3: Tally Code + Item Rate + Units */}
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Tally Code</FieldLabel>
                <div className="space-y-1">
                  <Input type="number" value={form.tallyInput}
                    onChange={(e) => { setF("tallyInput", e.target.value); setF("tallyId", null); setF("tallyName", ""); }}
                    onBlur={handleTallyLookup}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleTallyLookup())}
                    placeholder="Enter code" />
                  {form.tallyName && (
                    <p className="text-xs text-muted-foreground truncate">{form.tallyName}</p>
                  )}
                </div>
              </Field>
              <Field>
                <FieldLabel>Item Rate</FieldLabel>
                <Input type="number" step="0.0001" min="0" value={form.itemRate}
                  onChange={(e) => setF("itemRate", e.target.value)} placeholder="0.0000" />
              </Field>
              <Field>
                <FieldLabel>Units</FieldLabel>
                <SearchableSelect
                  options={units.map((u) => ({ value: String(u.id), label: u.name }))}
                  value={form.unitsId ? String(form.unitsId) : ""}
                  onSelect={(v) => setF("unitsId", v || null)}
                  placeholder="Type to search unit…"
                />
              </Field>
            </div>

            {/* Tax Chart Grid */}
            <div data-enter-skip>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel className="mb-0">Tax Chart</FieldLabel>
                <Button type="button" size="sm" variant="outline" onClick={addTaxRow}>
                  <HugeiconsIcon icon={PlusSignIcon} size={12} strokeWidth={2} className="mr-1" />
                  Add Row
                </Button>
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">Sr</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Tax Code</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tax Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">Tax %</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <Input
                            ref={(el) => { taxCodeRefs.current[i] = el; }}
                            type="number"
                            className="h-7 text-xs"
                            value={row.taxCodeInput}
                            onChange={(e) => updateTaxRow(i, "taxCodeInput", e.target.value)}
                            onBlur={() => handleTaxCodeLookup(i)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTaxCodeLookup(i); } }}
                            placeholder="Code"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          {row.taxName
                            ? <span className="text-xs">{row.taxName}</span>
                            : <span className="text-xs text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            ref={(el) => { taxPctRefs.current[i] = el; }}
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-7 text-xs"
                            value={row.taxPercentage}
                            onChange={(e) => updateTaxRow(i, "taxPercentage", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                setTaxRows((rows) => {
                                  if (i === rows.length - 1) return [...rows, { ...EMPTY_TAX_ROW }];
                                  return rows;
                                });
                                setTimeout(() => taxCodeRefs.current[i + 1]?.focus(), 50);
                              }
                            }}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <Button type="button" size="icon" variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeTaxRow(i)}>
                            <HugeiconsIcon icon={MinusSignIcon} size={12} strokeWidth={2} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ──────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item Group</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? This will also remove all linked tax details and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate(deleteTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
