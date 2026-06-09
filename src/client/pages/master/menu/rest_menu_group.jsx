import { useMemo, useRef, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const QK = ["menu-groups"];

const EMPTY = {
  code: "",
  name: "",
  category_id: "",
  multiple_recipe: "__none__",
  as_per_size: "__none__",
  menu_grp_image: "",
};

const YN_OPTIONS = [
  { value: "__none__", label: "— Not Set —" },
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

export default function MenuGroup() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();
  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "code", sortDir: "asc" });
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const query = useQuery({
    queryKey: [...QK, qs, categoryFilter],
    queryFn: () =>
      invoke("get_menu_groups", {
        qs,
        categoryId: categoryFilter !== "__all__" ? Number(categoryFilter) : null,
      }),
    placeholderData: (prev) => prev,
  });

  const categoriesQuery = useQuery({
    queryKey: ["all-menu-categories"],
    queryFn: () => invoke("get_all_menu_categories"),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: QK });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: (f) =>
      invoke("create_menu_group", {
        name: f.name.trim(),
        code: f.code ? Number(f.code) : null,
        categoryId: f.category_id ? Number(f.category_id) : null,
        multipleRecipe: f.multiple_recipe !== "__none__" ? f.multiple_recipe : null,
        asPerSize: f.as_per_size !== "__none__" ? f.as_per_size : null,
        menuGrpImage: f.menu_grp_image.trim() || null,
      }),
    onSuccess: () => { toast.success("Menu group created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (f) =>
      invoke("update_menu_group", {
        id: f.id,
        code: Number(f.code),
        name: f.name.trim(),
        categoryId: f.category_id ? Number(f.category_id) : null,
        multipleRecipe: f.multiple_recipe !== "__none__" ? f.multiple_recipe : null,
        asPerSize: f.as_per_size !== "__none__" ? f.as_per_size : null,
        menuGrpImage: f.menu_grp_image.trim() || null,
      }),
    onSuccess: () => { toast.success("Menu group updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_menu_group_active", { id, isActive: !is_active }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_menu_group", { id }),
    onSuccess: () => { toast.success("Group deleted (and its menu cards)"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() {
    setForm(EMPTY);
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({
      id: row.id,
      code: String(row.code),
      name: row.name,
      category_id: row.category_id ? String(row.category_id) : "",
      multiple_recipe: row.multiple_recipe ?? "__none__",
      as_per_size: row.as_per_size ?? "__none__",
      menu_grp_image: row.menu_grp_image ?? "",
    });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Group name is required"); return; }
    if (dialog.mode === "edit" && !Number(form.code)) {
      toast.error("Code is required");
      return;
    }
    if (dialog.mode === "create") createMut.mutate(form);
    else updateMut.mutate(form);
  }

  const imageInputRef = useRef(null);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setF("menu_grp_image", ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const allCategories = categoriesQuery.data ?? [];
  const isPending = createMut.isPending || updateMut.isPending;

  const columns = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      size: 80,
      meta: { label: "Code" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group Name" />,
      meta: { label: "Group Name" },
    },
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) =>
        row.original.category_name ?? (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      meta: { label: "Category" },
    },
    {
      accessorKey: "multiple_recipe",
      header: "Multi Recipe",
      size: 100,
      cell: ({ row }) => {
        const v = row.original.multiple_recipe;
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className={v === "Y" ? "text-green-600 text-xs font-medium" : "text-xs"}>
            {v === "Y" ? "Yes" : "No"}
          </span>
        );
      },
      meta: { label: "Multi Recipe" },
    },
    {
      accessorKey: "as_per_size",
      header: "As Per Size",
      size: 100,
      cell: ({ row }) => {
        const v = row.original.as_per_size;
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className={v === "Y" ? "text-green-600 text-xs font-medium" : "text-xs"}>
            {v === "Y" ? "Yes" : "No"}
          </span>
        );
      },
      meta: { label: "As Per Size" },
    },
    {
      accessorKey: "menu_grp_image",
      header: "Image",
      size: 70,
      cell: ({ row }) =>
        row.original.menu_grp_image ? (
          <img
            src={row.original.menu_grp_image}
            alt="Group"
            className="h-8 w-8 rounded object-cover border"
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      meta: { label: "Image" },
    },
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
          <Can perm="menu-group:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="menu-group:delete">
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

  return (
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Menu Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              total={query.data?.total ?? 0}
              state={qs}
              onStateChange={setQs}
              loading={query.isLoading}
              initialColumnVisibility={{ menu_grp_image: false }}
              searchPlaceholder="Search by group name…"
              emptyText="No menu groups found."
              toolbar={
                <>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Categories</SelectItem>
                      {allCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Can perm="menu-group:add">
                    <Button size="sm" onClick={openCreate}>
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                      New Group
                    </Button>
                  </Can>
                </>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "New Menu Group" : "Edit Menu Group"}
            </DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Create a new menu group. Leave Code blank to auto-generate."
                : "Update this menu group."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              {/* Row 1 — Group Name */}
              <div className="grid grid-cols-1 gap-3">
                {/* Code field hidden — not shown in form
                <Field>
                  <FieldLabel>Code</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={form.code}
                    onChange={(e) => setF("code", e.target.value)}
                    placeholder={dialog.mode === "create" ? "Auto" : ""}
                    readOnly={dialog.mode === "edit"}
                    className={dialog.mode === "edit" ? "bg-muted cursor-not-allowed" : ""}
                  />
                </Field>
                */}
                <Field>
                  <FieldLabel>
                    Group Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    value={form.name}
                    maxLength={50}
                    onChange={(e) => setF("name", e.target.value)}
                    placeholder="e.g. Beverages"
                    required
                  />
                </Field>
              </div>

              {/* Row 2 — Category */}
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setF("category_id", v)}
                >
                  <SelectTrigger className="w-full" onKeyDown={enterNav.select}>
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Row 3 — Multiple Recipe | As Per Size */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Multiple Recipe</FieldLabel>
                  <Select
                    value={form.multiple_recipe}
                    onValueChange={(v) => setF("multiple_recipe", v)}
                  >
                    <SelectTrigger className="w-full" onKeyDown={enterNav.select}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {YN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>As Per Size</FieldLabel>
                  <Select
                    value={form.as_per_size}
                    onValueChange={(v) => setF("as_per_size", v)}
                  >
                    <SelectTrigger className="w-full" onKeyDown={enterNav.select}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {YN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Row 4 — Menu Group Image */}
              <Field>
                <FieldLabel>
                  Menu Group Image{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FieldLabel>
                <div className="flex items-center gap-3">
                  {form.menu_grp_image ? (
                    <img
                      src={form.menu_grp_image}
                      alt="Group"
                      className="h-16 w-16 rounded border object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded border border-dashed flex items-center justify-center bg-muted shrink-0">
                      <span className="text-muted-foreground text-[10px]">No image</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {form.menu_grp_image ? "Change Image" : "Upload Image"}
                    </Button>
                    {form.menu_grp_image && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 text-xs"
                        onClick={() => setF("menu_grp_image", "")}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
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
            <AlertDialogTitle>Delete Menu Group</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? All menu card items in this group will also
              be deleted. This cannot be undone.
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
