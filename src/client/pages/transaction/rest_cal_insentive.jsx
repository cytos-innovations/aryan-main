import { useMemo, useRef, useState } from "react";
import { useEnterNav } from "@/hooks/use-enter-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, PencilEdit01Icon, Delete01Icon,
  ArrowDown01Icon, Tick02Icon,
} from "@hugeicons/core-free-icons";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── Searchable menu-card dropdown ────────────────────────────
function MenuCardCombobox({ options, value, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  const selected = options.find((o) => String(o.id) === value);

  const filtered = search.trim()
    ? options.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          String(o.code).includes(search.trim())
      )
    : options;

  function handleSelect(opt) {
    onSelect(String(opt.id));
    setSearch("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setTimeout(() => inputRef.current?.focus(), 50);
        else setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? `${selected.name} (${selected.code})` : "Select menu card…"}
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        style={{ "--radix-popover-trigger-width": "100%" }}
      >
        <div className="p-2 border-b">
          <Input
            ref={inputRef}
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No items found.</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <HugeiconsIcon
                  icon={Tick02Icon}
                  strokeWidth={2}
                  className={`size-3.5 shrink-0 ${String(opt.id) === value ? "opacity-100 text-primary" : "opacity-0"}`}
                />
                <span className="flex-1 text-left">{opt.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{opt.code}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const QK = ["cal-incentives"];

const DAYS = [
  { key: "sunday_inc",    label: "Sunday" },
  { key: "monday_inc",    label: "Monday" },
  { key: "tuesday_inc",   label: "Tuesday" },
  { key: "wednesday_inc", label: "Wednesday" },
  { key: "thursday_inc",  label: "Thursday" },
  { key: "friday_inc",    label: "Friday" },
  { key: "saturday_inc",  label: "Saturday" },
];

const EMPTY = {
  menu_card_id: "",
  sunday_inc: "0",
  monday_inc: "0",
  tuesday_inc: "0",
  wednesday_inc: "0",
  thursday_inc: "0",
  friday_inc: "0",
  saturday_inc: "0",
};

function fmtInc(val) {
  if (val === 0 || val == null) return "—";
  return Number(val).toFixed(2);
}

export default function CalIncentive() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "code", sortDir: "asc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_cal_incentives", { qs }),
    placeholderData: (prev) => prev,
  });

  const menuCardsQuery = useQuery({
    queryKey: ["menu-cards-simple"],
    queryFn: () => invoke("get_menu_cards_simple"),
    staleTime: 5 * 60 * 1000,
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });

  const createMut = useMutation({
    mutationFn: (d) =>
      invoke("create_cal_incentive", {
        menuCardId: Number(d.menu_card_id),
        sundayInc: Number(d.sunday_inc) || 0,
        mondayInc: Number(d.monday_inc) || 0,
        tuesdayInc: Number(d.tuesday_inc) || 0,
        wednesdayInc: Number(d.wednesday_inc) || 0,
        thursdayInc: Number(d.thursday_inc) || 0,
        fridayInc: Number(d.friday_inc) || 0,
        saturdayInc: Number(d.saturday_inc) || 0,
      }),
    onSuccess: () => { toast.success("Cal incentive created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (d) =>
      invoke("update_cal_incentive", {
        id: d.id,
        sundayInc: Number(d.sunday_inc) || 0,
        mondayInc: Number(d.monday_inc) || 0,
        tuesdayInc: Number(d.tuesday_inc) || 0,
        wednesdayInc: Number(d.wednesday_inc) || 0,
        thursdayInc: Number(d.thursday_inc) || 0,
        fridayInc: Number(d.friday_inc) || 0,
        saturdayInc: Number(d.saturday_inc) || 0,
      }),
    onSuccess: () => { toast.success("Cal incentive updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_cal_incentive_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_cal_incentive", { id }),
    onSuccess: () => { toast.success("Cal incentive deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() {
    setForm(EMPTY);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      menu_card_id: String(row.menu_card_id),
      sunday_inc: String(row.sunday_inc ?? 0),
      monday_inc: String(row.monday_inc ?? 0),
      tuesday_inc: String(row.tuesday_inc ?? 0),
      wednesday_inc: String(row.wednesday_inc ?? 0),
      thursday_inc: String(row.thursday_inc ?? 0),
      friday_inc: String(row.friday_inc ?? 0),
      saturday_inc: String(row.saturday_inc ?? 0),
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.menu_card_id) { toast.error("Menu Card is required"); return; }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate({ id: dialog.data.id, ...form });
  }

  const DAY_COL_W = 68;

  const columns = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      size: 80,
      meta: { label: "Code" },
    },
    {
      accessorKey: "menu_card_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Menu Card" />,
      meta: { label: "Menu Card" },
    },
    ...DAYS.map((d) => ({
      accessorKey: d.key,
      header: d.label.slice(0, 3),
      size: DAY_COL_W,
      cell: ({ getValue }) => (
        <span className="text-xs tabular-nums">{fmtInc(getValue())}</span>
      ),
      meta: { label: d.label },
    })),
    {
      accessorKey: "is_active",
      header: "Active",
      size: 80,
      cell: ({ row }) => (
        <Switch
          size="sm"
          checked={row.original.is_active}
          onCheckedChange={() => toggleMut.mutate(row.original)}
          disabled={toggleMut.isPending}
        />
      ),
      meta: { label: "Active" },
    },
    {
      id: "actions",
      header: "Actions",
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Can perm="cal-incentive:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="cal-incentive:delete">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                >
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

  const isPending = createMut.isPending || updateMut.isPending;
  const menuCards = menuCardsQuery.data ?? [];

  return (
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Cal Incentive</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              total={query.data?.total ?? 0}
              state={qs}
              onStateChange={setQs}
              loading={query.isLoading}
              searchPlaceholder="Search by menu card name…"
              emptyText="No incentive entries found."
              toolbar={
                <Can perm="cal-incentive:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New Entry
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
            <DialogTitle>
              {dialog.mode === "create" ? "New Cal Incentive" : "Edit Cal Incentive"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Set day-wise incentive percentages for a menu item."
                : "Update the day-wise incentive percentages."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              {/* Menu Card */}
              <Field>
                <FieldLabel>
                  Menu Card <span className="text-destructive">*</span>
                </FieldLabel>
                {dialog.mode === "create" ? (
                  <MenuCardCombobox
                    options={menuCards}
                    value={form.menu_card_id}
                    onSelect={(v) => setForm((f) => ({ ...f, menu_card_id: v }))}
                  />
                ) : (
                  <Input
                    value={
                      menuCards.find((mc) => String(mc.id) === form.menu_card_id)
                        ? `${menuCards.find((mc) => String(mc.id) === form.menu_card_id).name} (${menuCards.find((mc) => String(mc.id) === form.menu_card_id).code})`
                        : "—"
                    }
                    readOnly
                    className="bg-muted"
                  />
                )}
              </Field>

              {/* Day incentive grid */}
              <div className="grid grid-cols-4 gap-3">
                {DAYS.map((d) => (
                  <Field key={d.key}>
                    <FieldLabel>{d.label.slice(0, 3)}</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[d.key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [d.key]: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </Field>
                ))}
              </div>
            </FieldGroup>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : dialog.mode === "create"
                  ? "Create"
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cal Incentive</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the incentive entry for{" "}
              <strong>{deleteTarget?.menu_card_name ?? "this item"}</strong>? This cannot be
              undone.
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
    </TooltipProvider>
  );
}
