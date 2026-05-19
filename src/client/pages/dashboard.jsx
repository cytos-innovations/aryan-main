import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Building04Icon,
  Key01Icon,
  UserStar01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

import { useAuth, Can } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ── Stat card ────────────────────────────────────────────────
function StatCard({ title, value, icon, description, loading }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{value ?? "—"}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Quick-action card ────────────────────────────────────────
function QuickAction({ title, description, icon, to }) {
  const navigate = useNavigate();
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={() => navigate(to)}
    >
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          className="size-4 text-muted-foreground shrink-0"
        />
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function Dashboard() {
  const { auth } = useAuth();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => invoke("get_dashboard_stats"),
    staleTime: 30_000,
  });

  const stats = statsQuery.data;
  const loading = statsQuery.isLoading;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {auth?.user?.username}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {auth?.application?.application_name ?? "Dashboard"} · Overview
        </p>
      </div>

      <Separator />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          System Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Can perm="users:view">
            <StatCard
              title="Active Users"
              value={stats?.users}
              icon={UserGroupIcon}
              description="Users with access"
              loading={loading}
            />
          </Can>
          <Can perm="user-access:view">
            <StatCard
              title="Applications"
              value={stats?.applications}
              icon={Building04Icon}
              description="Registered applications"
              loading={loading}
            />
          </Can>
          <Can perm="user-access:view">
            <StatCard
              title="Permissions"
              value={stats?.permissions}
              icon={Key01Icon}
              description="Defined permissions"
              loading={loading}
            />
          </Can>
          <Can perm="user-access:view">
            <StatCard
              title="User Permissions"
              value={stats?.user_permissions}
              icon={UserStar01Icon}
              description="Active assignments"
              loading={loading}
            />
          </Can>
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Can perm="users:view">
            <QuickAction
              title="Manage Users"
              description="Create and manage user accounts"
              icon={UserGroupIcon}
              to="/admin/users"
            />
          </Can>
          <Can perm="user-access:view">
            <QuickAction
              title="User Access"
              description="Assign permissions to users"
              icon={UserStar01Icon}
              to="/admin/user-access"
            />
          </Can>
        </div>
      </div>
    </div>
  );
}
