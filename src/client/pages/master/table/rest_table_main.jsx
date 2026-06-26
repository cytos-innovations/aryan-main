import { useEffect, useMemo, useState, useRef } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
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
  table_group_id: "",
  applicable_rate: "1",
};

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

export default function RestaurantTable() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const codeRef = useRef(null); // Focus target after each successful create.

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
    mutationFn: async (d) => {
      await invoke("create_restaurant_table", {
        code: d.code ? parseInt(d.code) : null,
        tableGroupId: parseInt(d.table_group_id),
        applicableRate: parseInt(d.applicable_rate),
      });
      return d.code ? String(d.code).trim() : "";
    },
    onSuccess: async (savedCode) => {
      toast.success(savedCode ? `Table ${savedCode} added` : "Table added");
      inv();
      // Keep the dialog open but reset to a fresh, blank form for the next table.
      setForm(EMPTY);
      try {
        const next = await invoke("get_next_master_code", { table: "restaurant_table" });
        setForm((f) => ({ ...f, code: String(next) }));
      } catch { /* leave code blank — backend will auto-assign */ }
      // Return focus to Code for the next entry.
      codeRef.current?.focus();
    },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) => invoke("update_restaurant_table", {
      id: d.id,
      code: d.code ? parseInt(d.code) : null,
      tableGroupId: d.table_group_id ? parseInt(d.table_group_id) : null,
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

  async function openCreate() {
    setForm(EMPTY);
    setDialog({ open: true, mode: "create", data: null });
    try {
      const next = await invoke("get_next_master_code", { table: "restaurant_table" });
      setForm((f) => ({ ...f, code: String(next) }));
    } catch { /* leave code blank — backend will auto-assign */ }
  }

  function openEdit(row) {
    setForm({
      code: row.code ? String(row.code) : "",
      table_group_id: row.table_group_id ? String(row.table_group_id) : "",
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
    if (!form.table_group_id) { toast.error("Table Group is required"); return; }
    if (dialog.mode === "create" && form.code && parseInt(form.code) < 1) {
      toast.error("Code must be a positive number"); return;
    }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const allGroups = groupsQuery.data ?? [];
  const isPending = createMut.isPending || updateMut.isPending;

  const columns = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Table Code" />,
      size: 120,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold">
          {row.original.code ?? "—"}
        </span>
      ),
      meta: { label: "Table Code" },
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
              searchPlaceholder="Search by table code…" emptyText="No tables found."
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
              {dialog.mode === "create"
                ? "Create a new restaurant table. The table is identified by its code."
                : "Update this table."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              <Field>
                <FieldLabel>Table Code <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                <Input
                  ref={codeRef} autoFocus
                  type="number" min="1" value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder={dialog.mode === "create" ? "Auto" : ""}
                  readOnly={dialog.mode === "edit"}
                  className={dialog.mode === "edit" ? "bg-muted cursor-not-allowed" : ""} />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to auto-assign the next code.
                </p>
              </Field>

              <Field>
                <FieldLabel>Table Group <span className="text-destructive">*</span></FieldLabel>
                <SearchableSelect
                  options={allGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                  value={form.table_group_id}
                  onSelect={handleGroupChange}
                  placeholder="Type to search group…"
                />
                {dialog.mode === "edit" && form.table_group_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Group cannot be changed after assignment.
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel>Rate Apply</FieldLabel>
                <SearchableSelect
                  options={RATE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
                  value={form.applicable_rate}
                  onSelect={(v) => setForm((f) => ({ ...f, applicable_rate: v }))}
                  placeholder="Select rate…"
                />
                {form.table_group_id && (
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
              Delete table <strong>{deleteTarget?.code}</strong>? This cannot be undone.
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
