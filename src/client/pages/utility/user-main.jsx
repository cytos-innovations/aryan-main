import { useMemo, useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export default function UserMain() {
  const enterNav = useEnterNav();
  const queryClient = useQueryClient();

  const [qs, setQs] = useState({ ...DEFAULT_QUERY_STATE, sortBy: "id", sortDir: "desc" });
  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    user_name: "",
    password: "",
    new_password: "",
    confirm_password: "",
  });

  const QK = ["users"];

  const query = useQuery({
    queryKey: [...QK, qs],
    queryFn: () => invoke("get_users", { qs }),
    placeholderData: (prev) => prev,
  });

  function inv() { queryClient.invalidateQueries({ queryKey: QK }); }

  const createMut = useMutation({
    mutationFn: (d) => invoke("create_user", { userName: d.user_name, password: d.password }),
    onSuccess: () => { toast.success("User created"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, user_name, new_password }) => {
      await invoke("update_user", { id, userName: user_name });
      if (new_password) {
        await invoke("change_user_password", { id, password: new_password });
      }
    },
    onSuccess: () => { toast.success("User updated"); inv(); closeDialog(); },
    onError: (e) => toast.error(String(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) =>
      invoke("toggle_user_active", { id, isActive: is_active ? 0 : 1 }),
    onSuccess: () => inv(),
    onError: (e) => toast.error(String(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoke("delete_user", { id }),
    onSuccess: () => { toast.success("User deleted"); inv(); setDeleteTarget(null); },
    onError: (e) => toast.error(String(e)),
  });

  function openCreate() {
    setForm({ user_name: "", password: "", new_password: "", confirm_password: "" });
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(row) {
    setForm({ user_name: row.user_name, password: "", new_password: "", confirm_password: "" });
    setDialog({ open: true, mode: "edit", data: row });
  }

  function closeDialog() { setDialog((d) => ({ ...d, open: false })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (dialog.mode === "create") {
      if (!form.user_name.trim()) { toast.error("Username required"); return; }
      if (form.password.length < 6) { toast.error("Password must be ≥ 6 characters"); return; }
      createMut.mutate(form);
    } else {
      if (form.new_password) {
        if (form.new_password.length < 6) { toast.error("New password must be ≥ 6 characters"); return; }
        if (form.new_password !== form.confirm_password) { toast.error("Passwords do not match"); return; }
      }
      updateMut.mutate({
        id: dialog.data.id,
        user_name: form.user_name,
        new_password: form.new_password || null,
      });
    }
  }

  const columns = useMemo(() => [
    {
      accessorKey: "id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      size: 60,
      meta: { label: "#" },
    },
    {
      accessorKey: "user_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Username" />,
      meta: { label: "Username" },
    },
    {
      accessorKey: "last_login",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Login" />,
      cell: ({ row }) =>
        row.original.last_login
          ? new Date(row.original.last_login).toLocaleString()
          : <span className="text-muted-foreground text-xs">Never</span>,
      meta: { label: "Last Login" },
    },
    {
      accessorKey: "is_active",
      header: "Active",
      size: 80,
      cell: ({ row }) => (
        <Switch
          size="sm"
          checked={!!row.original.is_active}
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
          <Can perm="users:update">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(row.original)}
                >
                  <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </Can>
          <Can perm="users:delete">
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

  return (
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={query.data?.data ?? []}
              total={query.data?.total ?? 0}
              state={qs}
              onStateChange={setQs}
              loading={query.isLoading}
              searchPlaceholder="Search by username…"
              emptyText="No users found."
              toolbar={
                <Can perm="users:add">
                  <Button size="sm" onClick={openCreate}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1 size-4" />
                    New User
                  </Button>
                </Can>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "New User" : "Edit User"}</DialogTitle>
            <DialogDescription>
              {dialog.mode === "create"
                ? "Create a new user account."
                : "Update the user's information. Leave password blank to keep unchanged."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} onKeyDown={enterNav}>
            <FieldGroup>
              <Field>
                <FieldLabel>Username</FieldLabel>
                <Input
                  value={form.user_name}
                  onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))}
                  placeholder="username"
                  autoComplete="off"
                  required
                />
              </Field>
              {dialog.mode === "create" ? (
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                    required
                  />
                </Field>
              ) : (
                <>
                  <Field>
                    <FieldLabel>New Password <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                    <Input
                      type="password"
                      value={form.new_password}
                      onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                      placeholder="Leave blank to keep current"
                      autoComplete="new-password"
                    />
                  </Field>
                  {form.new_password && (
                    <Field>
                      <FieldLabel>Confirm Password</FieldLabel>
                      <Input
                        type="password"
                        value={form.confirm_password}
                        onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
                        autoComplete="new-password"
                      />
                    </Field>
                  )}
                </>
              )}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.user_name}</strong>? This action cannot be undone.
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
