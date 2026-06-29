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

const EMPTY = {
  code: "",
  table_group_id: "",
  applicable_rate: "1",
};

// Parse the Table Code field into a numeric range. Accepts a single code
// ("16") or a range written in many shapes: "16-26", "16 - 26", "16to26",
// "16 to 26", "16 To 26", "16 26". Returns { start, end } (inclusive) or null
// when the text isn't a valid number / range. The end must be >= the start —
// a descending range like "31-1" is rejected rather than silently swapped.
function parseCodeRange(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // Split on a dash, the word "to" (any case), or whitespace between two numbers.
  const m = s.match(/^(\d+)\s*(?:-|to|\s)\s*(\d+)$/i) || s.match(/^(\d+)$/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = m[2] !== undefined ? parseInt(m[2], 10) : start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1) return null;
  if (end < start) return null; // second number must not be smaller than the first
  return { start, end };
}

// True when the text is a well-formed two-number range but written descending
// (e.g. "31-1") — used to show a precise error instead of a generic one.
function isDescendingRange(raw) {
  const m = String(raw ?? "").trim().match(/^(\d+)\s*(?:-|to|\s)\s*(\d+)$/i);
  if (!m) return false;
  return parseInt(m[2], 10) < parseInt(m[1], 10);
}

function SearchableSelect({ options, value, onSelect, placeholder = "Select…", className = "" }) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
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
  // When opening, flip the menu above the input if there isn't room below it
  // (e.g. the field sits near the bottom of the dialog) so options aren't clipped.
  useEffect(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setDropUp(spaceBelow < 240 && spaceAbove > spaceBelow);
  }, [open]);
  useEffect(() => {
    function onDown(e) { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  function focusNext() {
    const input = inputRef.current; if (!input) return;
    const form = input.closest("form");
    // Prefer the form's primary action (the submit button) so that after
    // picking a value, focus lands on "Create"/"Save" — not on "Cancel",
    // which would otherwise submit-by-Enter into a cancel. Fall back to the
    // generic next-focusable scan only when there is no submit button.
    const submitBtn = form?.querySelector('button[type="submit"]:not([disabled])');
    if (submitBtn) { submitBtn.focus(); return; }
    const all = Array.from(document.querySelectorAll('input:not([disabled]):not([readonly]),textarea:not([disabled]):not([readonly]),button:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => !el.closest("[data-radix-popper-content-wrapper]"));
    const idx = all.indexOf(input); if (idx !== -1 && all[idx + 1]) all[idx + 1].focus();
  }
  function pick(opt) { onSelect(opt.value); setOpen(false); setQuery(""); setTimeout(focusNext, 0); }
  function onKeyDown(e) {
    // Enter/arrows are handled entirely here; stop them from bubbling to the
    // form's useEnterNav handler, which would otherwise treat this custom input
    // as an unknown field, fail to advance, and submit the form with a
    // still-empty group (the spurious "Table Group is required" toast).
    if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Escape") {
      e.stopPropagation();
    }
    if (!open) {
      // Closed dropdown. ArrowDown always opens the list. Enter opens it only
      // when nothing is chosen yet; once a value is selected, Enter advances to
      // the next control (the submit button) instead of reopening the list, so
      // a second Enter confirms the form rather than getting stuck here.
      if (e.key === "ArrowDown") { e.preventDefault(); setQuery(""); setOpen(true); setActive(0); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (selected) focusNext();
        else { setQuery(""); setOpen(true); setActive(0); }
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input ref={inputRef} type="text" value={displayText} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => { setQuery(""); setOpen(true); setActive(0); }} onKeyDown={onKeyDown} placeholder={placeholder} autoComplete="off" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground" />
      {open && filtered.length > 0 && (
        <div className={`absolute z-50 w-full overflow-hidden rounded-md border bg-popover shadow-md ${dropUp ? "bottom-full mb-1" : "mt-1"}`}>
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
  const [activeWarning, setActiveWarning] = useState(null); // table the user tried to deactivate while it has an open bill
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
      const tableGroupId = parseInt(d.table_group_id);
      const applicableRate = parseInt(d.applicable_rate);

      // No code → single auto-assigned table.
      if (!String(d.code).trim()) {
        await invoke("create_restaurant_table", { code: null, tableGroupId, applicableRate });
        return { created: 1, skipped: [], range: null };
      }

      // A code (single value or range like "16-26", "16 to 26", "16 26").
      const range = parseCodeRange(d.code);
      if (!range) throw new Error("Enter a valid code or range (e.g. 16 or 16-26)");

      const skipped = [];
      let created = 0;
      // Create each code in turn; a code that already exists is skipped (not
      // fatal) so a range like 16-26 still fills in the gaps when 16 is taken.
      for (let code = range.start; code <= range.end; code++) {
        try {
          await invoke("create_restaurant_table", { code, tableGroupId, applicableRate });
          created++;
        } catch (err) {
          if (String(err).toLowerCase().includes("already exists")) skipped.push(code);
          else throw err;
        }
      }
      return { created, skipped, range };
    },
    onSuccess: async ({ created, skipped, range }) => {
      // Summarise what happened across the (possibly multi-table) create.
      if (created === 0) {
        toast.warning(
          skipped.length
            ? `No tables added — code${skipped.length > 1 ? "s" : ""} ${skipped.join(", ")} already exist.`
            : "No tables added.",
        );
      } else {
        const label = range ? `Table ${range.start}${range.end !== range.start ? `–${range.end}` : ""}` : "Table";
        let msg = created > 1 ? `${created} tables added` : `${label} added`;
        if (skipped.length) msg += ` (skipped existing: ${skipped.join(", ")})`;
        toast.success(msg);
      }
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
    onError: (e, row) => {
      const msg = String(e);
      // A table with an open bill cannot be deactivated — show a blocking popup
      // telling the user to settle it first, rather than a passing toast.
      if (msg.toLowerCase().includes("active bill")) {
        setActiveWarning(row);
      } else {
        toast.error(msg);
      }
      inv(); // revert the optimistic switch flip
    },
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
    if (dialog.mode === "create" && String(form.code).trim()) {
      const range = parseCodeRange(form.code);
      if (!range) {
        toast.error(
          isDescendingRange(form.code)
            ? "The second code must be greater than the first (e.g. 16-26)."
            : "Enter a valid code or range (e.g. 16 or 16-26).",
        );
        return;
      }
      if (range.end - range.start + 1 > 200) {
        toast.error("That range is too large — add at most 200 tables at a time."); return;
      }
    }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const allGroups = groupsQuery.data ?? [];
  const isPending = createMut.isPending || updateMut.isPending;

  // Live count of how many tables the current code entry will create. Drives the
  // badge next to the Table Code field. Null when blank/invalid (single auto code).
  const plannedCount = useMemo(() => {
    if (dialog.mode !== "create" || !String(form.code).trim()) return null;
    const range = parseCodeRange(form.code);
    return range ? range.end - range.start + 1 : null;
  }, [form.code, dialog.mode]);

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
                <FieldLabel className="flex items-center gap-2">
                  <span>Table Code <span className="text-muted-foreground font-normal">(optional)</span></span>
                  {plannedCount > 1 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground leading-none">
                      {plannedCount} tables
                    </span>
                  )}
                </FieldLabel>
                <Input
                  ref={codeRef} autoFocus
                  type={dialog.mode === "edit" ? "number" : "text"}
                  inputMode="numeric"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder={dialog.mode === "create" ? "e.g. 16  or  16-26" : ""}
                  readOnly={dialog.mode === "edit"}
                  className={dialog.mode === "edit" ? "bg-muted cursor-not-allowed" : ""} />
                {dialog.mode === "create" && (
                  String(form.code).trim() && plannedCount === null ? (
                    <p className="text-xs text-destructive mt-1">
                      {isDescendingRange(form.code)
                        ? "The second code must be greater than the first (e.g. 16-26)."
                        : "Enter a valid code or range (e.g. 16 or 16-26)."}
                    </p>
                  ) : plannedCount > 1 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Will add <span className="font-semibold text-foreground">{plannedCount}</span> tables in this group
                      {(() => { const r = parseCodeRange(form.code); return r ? ` (codes ${r.start}–${r.end})` : ""; })()}.
                      Existing codes are skipped.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter one code, or a range (16-26, 16 to 26, 16 26) to add many at once.
                      Leave blank to auto-assign the next code.
                    </p>
                  )
                )}
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

              {/* Rate is inherited from the selected table group — not editable here. */}
              {form.table_group_id && (
                <Field>
                  <FieldLabel>Rate</FieldLabel>
                  <Input
                    value={`Rate ${form.applicable_rate}`}
                    readOnly
                    className="bg-muted cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Taken from the selected table group.
                  </p>
                </Field>
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

      <AlertDialog open={!!activeWarning} onOpenChange={(o) => !o && setActiveWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Table is in use</AlertDialogTitle>
            <AlertDialogDescription>
              Table <strong>{activeWarning?.code}</strong> has an active bill running.
              Please settle it first before deactivating the table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setActiveWarning(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
