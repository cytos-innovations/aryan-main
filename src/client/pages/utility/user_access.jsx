import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { useAuth, Can } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const TABS = [
  { id: "master", label: "Master" },
  { id: "transaction", label: "Transaction" },
  { id: "reports", label: "Reports" },
  { id: "utility", label: "Utility" },
  { id: "application", label: "Application" },
];

// Four sections in the Transaction tab
const TRANSACTION_MODULE_GROUPS = [
  {
    label: "Restaurant",
    modules: ["cal-incentive", "modify-bill"],
  },
];

// Four sections in the Master tab
const MASTER_MODULE_GROUPS = [
  {
    label: "Restaurant",
    modules: [
      "menu-category", "food-type", "menu-group", "menu-card", "kitchen-section",
      "table-group", "restaurant-table",
      "bill-message", "kot-message",
    ],
  },
  {
    label: "Lodge",
    modules: ["lodge-customer", "lodge-discount", "lodge-identity", "lodge-market-segment", "lodge-plan"],
  },
  {
    label: "Account",
    modules: ["acc-tax-master"],
  },
  {
    label: "Material",
    modules: [],
  },
];

const MODULE_DISPLAY_NAMES = {
  "kot-message":            "KOT Message",
  "lodge-customer":         "Customer Information",
  "lodge-discount":         "Discount Information",
  "lodge-identity":         "Identity Master",
  "lodge-market-segment":   "Market Segment",
  "lodge-plan":             "Plan Master",
  "acc-tax-master":         "Tax Master",
  "modify-bill":            "Modify Bill",
};

const TRANSACTION_MODULES = new Set(["cal-incentive", "modify-bill"]);

function getTabForPerm(permName) {
  const [module] = permName.split(":");
  if (module === "dashboard" || module === "users" || module === "user-access" || module === "company-details") return "utility";
  if (TRANSACTION_MODULES.has(module) || /^(order|payment|transaction|sale)/.test(module)) return "transaction";
  if (/^(report|analytic)/.test(module)) return "reports";
  return "master";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function moduleDisplayName(moduleKey) {
  if (MODULE_DISPLAY_NAMES[moduleKey]) return MODULE_DISPLAY_NAMES[moduleKey];
  return moduleKey.split(/[-_]/).map(capitalize).join(" ");
}

function buildTableData(perms, moduleGroups) {
  if (!perms.length) return { groups: [], actions: [] };
  const actionOrder = ["view", "add", "update", "delete", "print"];
  const actionSet = new Set(perms.map((p) => p.action));
  const actions = [
    ...actionOrder.filter((a) => actionSet.has(a)),
    ...[...actionSet].filter((a) => !actionOrder.includes(a)).sort(),
  ];

  const moduleMap = new Map();
  for (const perm of perms) {
    const parts = perm.permission_name.split(":");
    const moduleKey = parts.length > 1 ? parts.slice(0, -1).join(":") : perm.permission_name;
    if (!moduleMap.has(moduleKey)) {
      moduleMap.set(moduleKey, { key: moduleKey, name: moduleDisplayName(moduleKey), byAction: {} });
    }
    moduleMap.get(moduleKey).byAction[perm.action] = perm;
  }

  if (!moduleGroups) {
    return { groups: [{ label: null, rows: [...moduleMap.values()] }], actions };
  }

  const remaining = new Map(moduleMap);
  const groups = [];
  for (const grp of moduleGroups) {
    const rows = grp.modules.map((m) => remaining.get(m)).filter(Boolean);
    rows.forEach((r) => remaining.delete(r.key));
    if (rows.length) groups.push({ label: grp.label, rows });
  }
  if (remaining.size) groups.push({ label: "Other", rows: [...remaining.values()] });

  return { groups, actions };
}

const COL_W = 96; // fixed px width for every action column

function PermTable({ perms, selected, onToggle, onToggleColumn, moduleGroups }) {
  const { groups, actions } = useMemo(
    () => buildTableData(perms, moduleGroups),
    [perms, moduleGroups],
  );

  const allRows = groups.flatMap((g) => g.rows);

  if (!allRows.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No permissions in this section.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead>
          {/* Row 1 — column labels */}
          <tr className="border-b bg-muted/50">
            <th className="h-9 w-10 px-2 text-center align-middle font-semibold text-xs">Sr.</th>
            <th className="h-9 px-3 text-left align-middle font-semibold text-xs">Module</th>
            {actions.map((action) => (
              <th
                key={action}
                className="h-9 px-2 text-center align-middle font-semibold text-xs"
                style={{ width: COL_W, minWidth: COL_W }}
              >
                {capitalize(action)}
              </th>
            ))}
          </tr>
          {/* Row 2 — select-all checkboxes */}
          <tr className="border-b bg-muted/30">
            <th className="h-9 px-2 text-center align-middle" />
            <th className="h-9 px-3 text-left align-middle text-xs text-muted-foreground font-medium">
              Select All
            </th>
            {actions.map((action) => {
              const colPerms = allRows.map((r) => r.byAction[action]).filter(Boolean);
              const allChecked = colPerms.length > 0 && colPerms.every((p) => selected.has(p.id));
              const someChecked = !allChecked && colPerms.some((p) => selected.has(p.id));
              return (
                <th
                  key={action}
                  className="h-9 px-2 text-center align-middle"
                  style={{ width: COL_W, minWidth: COL_W }}
                >
                  <div className="flex justify-center">
                    <Checkbox
                      checked={allChecked}
                      data-state={someChecked ? "indeterminate" : undefined}
                      onCheckedChange={() => onToggleColumn(action, allRows)}
                    />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {(() => {
            let sr = 0;
            return groups.map((grp) => (
              <React.Fragment key={grp.label ?? "_ungrouped"}>
                {grp.label && (
                  <tr className="border-b bg-muted/40">
                    <td
                      colSpan={2 + actions.length}
                      className="px-3 py-1.5 text-xs text-muted-foreground uppercase tracking-wide"
                    >
                      {grp.label}
                    </td>
                  </tr>
                )}
                {grp.rows.map((row) => {
                  sr += 1;
                  const rowSr = sr;
                  return (
                    <tr key={row.key} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                      <td className="p-2 text-center align-middle text-muted-foreground text-xs font-mono">
                        {rowSr}
                      </td>
                      <td className="p-2 px-3 align-middle font-medium">{row.name}</td>
                      {actions.map((action) => {
                        const perm = row.byAction[action];
                        return (
                          <td
                            key={action}
                            className="p-2 text-center align-middle"
                            style={{ width: COL_W, minWidth: COL_W }}
                          >
                            {perm ? (
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={selected.has(perm.id)}
                                  onCheckedChange={() => onToggle(perm.id)}
                                />
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ));
          })()}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationTab({ userId }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [dirty, setDirty] = useState(false);

  const appsQuery = useQuery({
    queryKey: ["apps-with-assignment", userId],
    queryFn: () => invoke("get_all_apps_with_assignment", { userId: Number(userId) }),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!appsQuery.data) return;
    setSelected(new Set(appsQuery.data.filter((a) => a.assigned).map((a) => a.id)));
    setDirty(false);
  }, [appsQuery.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      invoke("set_user_applications", {
        userId: Number(userId),
        applicationIds: Array.from(selected),
      }),
    onSuccess: () => {
      toast.success("Application assignments saved");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["apps-with-assignment", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-apps", userId] });
    },
    onError: (e) => toast.error(String(e)),
  });

  function toggleApp(appId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
    setDirty(true);
  }

  if (appsQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const apps = appsQuery.data ?? [];

  return (
    <div className="space-y-4">
      {apps.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No applications found.
        </p>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                  {app.application_name.slice(0, 2).toUpperCase()}
                </span>
                <span className="font-medium capitalize">{app.application_name}</span>
              </div>
              <Switch
                checked={selected.has(app.id)}
                onCheckedChange={() => toggleApp(app.id)}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => saveMut.mutate()}
          disabled={!dirty || saveMut.isPending}
        >
          {saveMut.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

const DEFAULT_CAPS = { food_discount: "100", liquor_discount: "100", total_discount: "100" };

function DiscountCapDialog({ open, onClose, userId, userName }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_CAPS);

  const capsQuery = useQuery({
    queryKey: ["discount-cap", userId],
    queryFn: () => invoke("get_user_discount_cap", { userId: Number(userId) }),
    enabled: open && !!userId,
    staleTime: 0,
  });

  // Reset to defaults when dialog opens for a new user
  useEffect(() => {
    if (!open) return;
    setForm(DEFAULT_CAPS);
  }, [open, userId]);

  // Pre-fill with saved data when query finishes (data may be null = no record yet)
  useEffect(() => {
    if (capsQuery.isLoading || capsQuery.isFetching) return;
    if (capsQuery.data) {
      setForm({
        food_discount:   String(capsQuery.data.food_discount   ?? 100),
        liquor_discount: String(capsQuery.data.liquor_discount ?? 100),
        total_discount:  String(capsQuery.data.total_discount  ?? 100),
      });
    }
  }, [capsQuery.data, capsQuery.isLoading, capsQuery.isFetching]);

  const saveMut = useMutation({
    mutationFn: () =>
      invoke("save_user_discount_cap", {
        userId:         Number(userId),
        foodDiscount:   parseFloat(form.food_discount)   || 0,
        liquorDiscount: parseFloat(form.liquor_discount) || 0,
        totalDiscount:  parseFloat(form.total_discount)  || 0,
      }),
    onSuccess: () => {
      toast.success("Discount caps saved");
      queryClient.invalidateQueries({ queryKey: ["discount-cap", userId] });
      onClose();
    },
    onError: (e) => toast.error(String(e)),
  });

  function handleChange(field, val) {
    // allow only numbers and one decimal point, max 100
    if (!/^\d*\.?\d*$/.test(val)) return;
    if (parseFloat(val) > 100) return;
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bill Discount Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User — read-only */}
          <div className="space-y-1">
            <label className="text-sm font-medium">User</label>
            <Input value={userName} disabled className="bg-muted text-muted-foreground" />
          </div>

          {/* Food Discount */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Food Discount</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={form.food_discount}
                onChange={(e) => handleChange("food_discount", e.target.value)}
                className="pr-8"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Liquor Discount */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Liquor Discount</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={form.liquor_discount}
                onChange={(e) => handleChange("liquor_discount", e.target.value)}
                className="pr-8"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Total Discount */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Total Discount</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={form.total_discount}
                onChange={(e) => handleChange("total_discount", e.target.value)}
                className="pr-8"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saveMut.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UserAccess() {
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const isSuper = auth?.user?.is_super === true;

  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState("master");
  const [selected, setSelected] = useState(new Set());
  const [dirty, setDirty] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["all-users"],
    queryFn: () => invoke("get_all_users"),
  });

  const permsQuery = useQuery({
    queryKey: ["user-access", userId],
    queryFn: () => invoke("get_user_access", { userId: Number(userId) }),
    enabled: !!userId,
    staleTime: 0,
  });

  useEffect(() => {
    if (!permsQuery.data) return;
    setSelected(new Set(permsQuery.data.filter((p) => p.assigned).map((p) => p.id)));
    setDirty(false);
  }, [permsQuery.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      invoke("set_user_permissions", {
        userId: Number(userId),
        permissionIds: Array.from(selected),
      }),
    onSuccess: () => {
      toast.success("Permissions saved");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["user-access", userId] });
    },
    onError: (e) => toast.error(String(e)),
  });

  function handleUserChange(val) {
    setUserId(val);
    setSelected(new Set());
    setDirty(false);
  }

  function togglePermission(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
  }

  function toggleColumn(action, rows) {
    const colPerms = rows.map((r) => r.byAction[action]).filter(Boolean);
    const allChecked = colPerms.every((p) => selected.has(p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of colPerms) {
        if (allChecked) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
    setDirty(true);
  }

  function selectAll() {
    setSelected(new Set((permsQuery.data ?? []).map((p) => p.id)));
    setDirty(true);
  }

  function removeAll() {
    setSelected(new Set());
    setDirty(true);
  }

  const allPerms = permsQuery.data ?? [];
  const permsByTab = useMemo(() => {
    const map = { master: [], transaction: [], reports: [], utility: [] };
    for (const p of allPerms) {
      const tab = getTabForPerm(p.permission_name);
      if (map[tab]) map[tab].push(p);
    }
    return map;
  }, [allPerms]);

  const visibleTabs = isSuper ? TABS : TABS.filter((t) => t.id !== "application");
  const userSelected = !!userId;
  const showTabs = userSelected;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>User Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* User selector + action buttons */}
          <div className="flex flex-wrap items-end gap-4">
            <Field className="min-w-48 max-w-sm">
              <FieldLabel>User</FieldLabel>
              <Select
                value={userId}
                onValueChange={handleUserChange}
                disabled={usersQuery.isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {(usersQuery.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.user_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {userSelected && activeTab !== "application" && (
              <div className="ml-auto flex items-center gap-2">
                {activeTab === "utility" && (
                  <Button variant="outline" size="sm" onClick={() => setDiscountDialogOpen(true)}>
                    Bill Discount Settings
                  </Button>
                )}
                <Can perm="user-access:update">
                  <Button
                    size="sm"
                    onClick={() => saveMut.mutate()}
                    disabled={!dirty || saveMut.isPending}
                  >
                    {saveMut.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                </Can>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={removeAll}>
                  Remove All
                </Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          {showTabs && (
            <div className="space-y-4">
              {/* Custom tab bar */}
              <div className="flex gap-1 border-b">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "application" && isSuper ? (
                <ApplicationTab userId={userId} />
              ) : permsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <PermTable
                    perms={permsByTab[activeTab] ?? []}
                    selected={selected}
                    onToggle={togglePermission}
                    onToggleColumn={toggleColumn}
                    moduleGroups={
                      activeTab === "master" ? MASTER_MODULE_GROUPS :
                      activeTab === "transaction" ? TRANSACTION_MODULE_GROUPS :
                      null
                    }
                  />
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>

      <DiscountCapDialog
        open={discountDialogOpen}
        onClose={() => setDiscountDialogOpen(false)}
        userId={userId}
        userName={(usersQuery.data ?? []).find((u) => String(u.id) === userId)?.user_name ?? ""}
      />
    </div>
  );
}
