import { useState, useRef, useCallback } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";

import { Can } from "@/lib/auth";
import {
  DataTable,
  DataTableColumnHeader,
  DEFAULT_QUERY_STATE,
} from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const QK = ["menu-categories"];

const EMPTY_FORM = {
  code: "",
  name: "",
  tallyInput: "",
  tallyId: null,
  tallyName: "",
  allowDiscount: "0",
  maxDiscountPercent: "0",
  autoDiscountPercent: "0",
  unitId: null,
};

const EMPTY_TAX_ROW = {
  taxCodeInput: "",
  taxId: null,
  taxName: "",
  taxPercentage: "",
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function MenuCategory() {
  const enterNav = useEnterNav();
  const qc = useQueryClient();
  const [qs, setQs] = useState(DEFAULT_QUERY_STATE);
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [taxRows, setTaxRows] = useState([{ ...EMPTY_TAX_ROW }]);
  const taxPctRefs = useRef([]);

  function setF(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleDiscountChange(key, val) {
    if (val !== "" && parseFloat(val) >= 100) {
      toast.error("Discount is not allowed more than 99");
      return;
    }
    setF(key, val);
  }

  // ── Queries ───────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_menu_categories", { qs }),
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units-for-menu-category"],
    queryFn: () => invoke("get_all_units_for_menu_category"),
  });

  const { data: allTaxes = [] } = useQuery({
    queryKey: ["all-taxes-for-menu-category"],
    queryFn: () => invoke("get_all_taxes_for_item"),
  });

  function inv() {
    qc.invalidateQueries({ queryKey: QK });
  }

  // ── Tally code lookup ─────────────────────────────────────

  async function handleTallyLookup() {
    if (!form.tallyInput) {
      setF("tallyId", null);
      setF("tallyName", "");
      return;
    }
    try {
      const result = await invoke("lookup_tally_for_menu_category", {
        code: Number(form.tallyInput),
      });
      if (result) {
        setForm((f) => ({ ...f, tallyId: result.id, tallyName: result.name }));
      } else {
        toast.error("Tally code not found");
        setForm((f) => ({ ...f, tallyId: null, tallyName: "" }));
      }
    } catch (e) {
      toast.error(String(e));
    }
  }

  // ── Tax row helpers ───────────────────────────────────────

  const updateTaxRow = useCallback((index, field, value) => {
    setTaxRows((rows) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  function handleTaxSelect(taxId) {
    const tax = allTaxes.find((t) => String(t.id) === taxId);
    if (!tax) return;
    if (taxRows.some((r) => r.taxId === tax.id)) {
      toast.error(`"${tax.name}" is already added`);
      return;
    }
    const newRow = { taxCodeInput: String(tax.code), taxId: tax.id, taxName: tax.name, taxPercentage: "" };
    setTaxRows((rows) => {
      const hasOnlyEmptyRow = rows.length === 1 && !rows[0].taxId;
      return hasOnlyEmptyRow ? [newRow] : [...rows, newRow];
    });
    setTimeout(() => taxPctRefs.current[taxRows.length === 1 && !taxRows[0].taxId ? 0 : taxRows.length]?.focus(), 50);
  }

  function removeTaxRow(index) {
    setTaxRows((rows) =>
      rows.length === 1
        ? [{ ...EMPTY_TAX_ROW }]
        : rows.filter((_, i) => i !== index)
    );
  }

  // ── Mutations ─────────────────────────────────────────────

  function buildTaxDetails() {
    return taxRows
      .filter((r) => r.taxId && r.taxPercentage !== "")
      .map((r) => ({ taxId: r.taxId, taxPercentage: Number(r.taxPercentage) }));
  }

  function buildBase(f) {
    return {
      name: f.name,
      allowDiscount: f.allowDiscount === "1",
      maxDiscountPercent:
        f.maxDiscountPercent !== "" ? Number(f.maxDiscountPercent) : 0,
      autoDiscountPercent:
        f.autoDiscountPercent !== "" ? Number(f.autoDiscountPercent) : 0,
      tallyCode: f.tallyId || null,
      unitId: f.unitId ? Number(f.unitId) : null,
      taxDetails: buildTaxDetails(),
    };
  }

  const createMut = useMutation({
    mutationFn: (f) =>
      invoke("create_menu_category", {
        ...buildBase(f),
        code: f.code ? Number(f.code) : null,
      }),
    onSuccess: () => {
      toast.success("Menu category created");
      inv();
      closeDialog();
    },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) =>
      invoke("update_menu_category", {
        id: f.id,
        code: Number(f.code),
        ...buildBase(f),
      }),
    onSuccess: () => {
      toast.success("Menu category updated");
      inv();
      closeDialog();
    },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_menu_category_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_menu_category", { id }),
    onSuccess: () => {
      toast.success("Menu category deleted");
      inv();
      setDeleteTarget(null);
    },
    onError: (e) => {
      toast.error(String(e));
      setDeleteTarget(null);
    },
  });

  // ── Dialog helpers ────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setTaxRows([{ ...EMPTY_TAX_ROW }]);
    setDialog({ open: true, mode: "create", data: null });
  }

  async function openEdit(row) {
    setForm({
      code: String(row.code ?? ""),
      name: row.name ?? "",
      tallyInput: row.tally_master_code ? String(row.tally_master_code) : "",
      tallyId: row.tally_code || null,
      tallyName: row.tally_name ?? "",
      allowDiscount: row.allow_discount ? "1" : "0",
      maxDiscountPercent:
        row.max_discount_percent != null ? String(row.max_discount_percent) : "0",
      autoDiscountPercent:
        row.auto_discount_percent != null ? String(row.auto_discount_percent) : "0",
      unitId: row.unit_id ? String(row.unit_id) : null,
    });
    try {
      const detail = await invoke("get_menu_category_detail", { id: row.id });
      const loaded =
        detail.taxes.length > 0
          ? detail.taxes.map((t) => ({
              taxCodeInput: String(t.tax_code),
              taxId: t.tax_id,
              taxName: t.tax_name,
              taxPercentage: String(t.tax_percentage),
            }))
          : [{ ...EMPTY_TAX_ROW }];
      setTaxRows(loaded);
    } catch (e) {
      toast.error(`Failed to load tax details: ${String(e)}`);
      setTaxRows([{ ...EMPTY_TAX_ROW }]);
    }
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() {
    setDialog((d) => ({ ...d, open: false }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (isEditMode && !form.code) {
      toast.error("Category code is required");
      return;
    }
    const maxPct = Number(form.maxDiscountPercent);
    if (isNaN(maxPct) || maxPct < 0 || maxPct >= 100) {
      toast.error("Discount is not allowed more than 99");
      return;
    }
    const autoPct = Number(form.autoDiscountPercent);
    if (isNaN(autoPct) || autoPct < 0 || autoPct >= 100) {
      toast.error("Discount is not allowed more than 99");
      return;
    }
    const payload = { ...form, id: dialog.data?.id };
    if (dialog.mode === "create") createMut.mutate(payload);
    else updateMut.mutate(payload);
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const isEditMode = dialog.mode === "edit";
  const discountEnabled = form.allowDiscount === "1";

  // ── List columns ──────────────────────────────────────────

  const columns = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <div className="text-center">
          <DataTableColumnHeader column={column} title="Code" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {row.original.code}
          </span>
        </div>
      ),
      size: 70,
      meta: { label: "Code" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      meta: { label: "Category Name" },
    },
    {
      accessorKey: "unit_name",
      header: "Unit",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.unit_name || (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
      size: 100,
      meta: { label: "Unit" },
    },
    {
      accessorKey: "tally_name",
      header: "Tally",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.tally_name || (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
      size: 130,
      meta: { label: "Tally" },
    },
    {
      accessorKey: "allow_discount",
      header: () => <div className="text-center">Discount</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span
            className={
              row.original.allow_discount
                ? "text-green-600 text-xs font-semibold"
                : "text-muted-foreground text-xs"
            }
          >
            {row.original.allow_discount ? "Yes" : "No"}
          </span>
        </div>
      ),
      size: 90,
      meta: { label: "Discount" },
    },
    {
      accessorKey: "max_discount_percent",
      header: () => <div className="text-right pr-1">Max %</div>,
      cell: ({ row }) => (
        <div className="text-right pr-1">
          {row.original.max_discount_percent > 0 ? (
            <span className="font-mono text-sm tabular-nums">
              {Number(row.original.max_discount_percent).toFixed(2)}%
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      ),
      size: 100,
      meta: { label: "Max %" },
    },
    {
      accessorKey: "auto_discount_percent",
      header: () => <div className="text-right pr-1">Auto %</div>,
      cell: ({ row }) => (
        <div className="text-right pr-1">
          {row.original.auto_discount_percent > 0 ? (
            <span className="font-mono text-sm tabular-nums">
              {Number(row.original.auto_discount_percent).toFixed(2)}%
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      ),
      size: 100,
      meta: { label: "Auto %" },
    },
    {
      accessorKey: "is_active",
      header: () => <div className="text-center">Active</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Can perm="menu-category:update">
            <Switch
              checked={row.original.is_active}
              onCheckedChange={() => toggleMut.mutate(row.original)}
              disabled={toggleMut.isPending}
            />
          </Can>
        </div>
      ),
      size: 80,
      meta: { label: "Active" },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-1">
          <TooltipProvider>
            <Can perm="menu-category:update">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openEdit(row.original)}
                  >
                    <HugeiconsIcon
                      icon={PencilEdit01Icon}
                      size={14}
                      strokeWidth={2}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </Can>
            <Can perm="menu-category:delete">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(row.original)}
                  >
                    <HugeiconsIcon
                      icon={Delete01Icon}
                      size={14}
                      strokeWidth={2}
                    />
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
      {/* ── List table ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Menu Category Master</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            total={data?.total ?? 0}
            loading={isLoading}
            state={qs}
            onStateChange={setQs}
            searchPlaceholder="Search by category name…"
            emptyText="No categories found."
            initialColumnVisibility={{
              unit_name: false,
              tally_name: false,
              allow_discount: false,
            }}
            toolbar={
              <Can perm="menu-category:add">
                <Button size="sm" onClick={openCreate}>
                  <HugeiconsIcon
                    icon={Add01Icon}
                    size={14}
                    strokeWidth={2}
                    className="mr-1"
                  />
                  Add Category
                </Button>
              </Can>
            }
          />
        </CardContent>
      </Card>

      {/* ── Create / Edit dialog ─────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Menu Category" : "Add Menu Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav} className="space-y-4">
            {/* ── Row 1: Code | Category Name ─────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>
                  Code
                  {isEditMode && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
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
                  Category Name{" "}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => setF("name", e.target.value)}
                  placeholder="e.g. Food"
                  maxLength={30}
                />
              </Field>
            </div>

            {/* ── Row 2: Unit | Tally Code ─────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Unit</FieldLabel>
                <Select
                  value={form.unitId ? String(form.unitId) : ""}
                  onValueChange={(v) => setF("unitId", v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Tally Code</FieldLabel>
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={form.tallyInput}
                    onChange={(e) => {
                      setF("tallyInput", e.target.value);
                      setF("tallyId", null);
                      setF("tallyName", "");
                    }}
                    onBlur={handleTallyLookup}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleTallyLookup();
                      }
                    }}
                    placeholder="Enter tally code"
                  />
                  {form.tallyName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {form.tallyName}
                    </p>
                  )}
                </div>
              </Field>
            </div>

            {/* ── Row 3: Allow Discount | Max % | Auto % ──────── */}
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Allow Discount</FieldLabel>
                <Select
                  value={form.allowDiscount}
                  onValueChange={(v) => setF("allowDiscount", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No</SelectItem>
                    <SelectItem value="1">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Max Discount %</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  value={form.maxDiscountPercent}
                  onChange={(e) => handleDiscountChange("maxDiscountPercent", e.target.value)}
                  disabled={!discountEnabled}
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel>Auto Discount %</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  value={form.autoDiscountPercent}
                  onChange={(e) => handleDiscountChange("autoDiscountPercent", e.target.value)}
                  disabled={!discountEnabled}
                  placeholder="0.00"
                />
              </Field>
            </div>

            {/* ── Tax Chart Grid ───────────────────────────────── */}
            <div data-enter-skip>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel className="mb-0">Tax Chart</FieldLabel>
                <Select
                  value=""
                  onValueChange={handleTaxSelect}
                  disabled={allTaxes.filter((t) => !taxRows.some((r) => r.taxId === t.id)).length === 0}
                >
                  <SelectTrigger className="h-8 w-48 text-xs">
                    <SelectValue placeholder="+ Add Tax" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTaxes
                      .filter((t) => !taxRows.some((r) => r.taxId === t.id))
                      .map((t) => (
                        <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                          {t.code} — {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">Sr</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Tax Code</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tax Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">Tax %</th>
                      <th className="px-2 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {taxRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground text-xs">{i + 1}</td>

                        {/* Tax Code — read-only display */}
                        <td className="px-3 py-1.5">
                          {row.taxCodeInput ? (
                            <span className="font-mono text-xs font-semibold text-muted-foreground">
                              {row.taxCodeInput}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Tax Name */}
                        <td className="px-3 py-1.5">
                          {row.taxName ? (
                            <span className="text-xs">{row.taxName}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Tax % input */}
                        <td className="px-2 py-1.5">
                          <Input
                            ref={(el) => { taxPctRefs.current[i] = el; }}
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-7 text-xs"
                            value={row.taxPercentage}
                            onChange={(e) => updateTaxRow(i, "taxPercentage", e.target.value)}
                            placeholder="0.00"
                            disabled={!row.taxId}
                          />
                        </td>

                        {/* Remove row */}
                        <td className="px-1 py-1.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeTaxRow(i)}
                          >
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
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : isEditMode
                  ? "Save Changes"
                  : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? This will also
              remove all linked tax details and cannot be undone.
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
