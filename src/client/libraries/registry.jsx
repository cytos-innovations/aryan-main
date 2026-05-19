import {
  DashboardSquare01Icon,
  UserGroupIcon,
  Building04Icon,
  Key01Icon,
  UserStar01Icon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons";

import Dashboard from "@/pages/dashboard";
import UserMain from "@/pages/utility/user-main";
import ApplicationMain from "@/pages/utility/application-main";
import PermissionMain from "@/pages/utility/permission-main";
import UserApplicationMain from "@/pages/utility/user-application-main";
import UserPermissionMain from "@/pages/utility/user-permission-main";

// ── Registry ─────────────────────────────────────────────────
// Each leaf must have: path, label, perm, icon, element
// Folders have: label, icon, items[]
// ─────────────────────────────────────────────────────────────

export const registry = [
  {
    label: "Operations",
    items: [
      {
        path: "/dashboard",
        label: "Dashboard",
        perm: "dashboard:view",
        icon: DashboardSquare01Icon,
        element: <Dashboard />,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users",
        icon: UserGroupIcon,
        items: [
          {
            path: "/admin/users",
            label: "User Accounts",
            perm: "admin:users:view",
            icon: UserGroupIcon,
            element: <UserMain />,
          },
          {
            path: "/admin/user-applications",
            label: "Application Access",
            perm: "admin:user-applications:view",
            icon: UserStar01Icon,
            element: <UserApplicationMain />,
          },
          {
            path: "/admin/user-permissions",
            label: "User Permissions",
            perm: "admin:user-permissions:view",
            icon: UserShield01Icon,
            element: <UserPermissionMain />,
          },
        ],
      },
      {
        path: "/admin/applications",
        label: "Applications",
        perm: "admin:applications:view",
        icon: Building04Icon,
        element: <ApplicationMain />,
      },
      {
        path: "/admin/permissions",
        label: "Permissions",
        perm: "admin:permissions:view",
        icon: Key01Icon,
        element: <PermissionMain />,
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────

function flatten(items) {
  return items.flatMap((i) => (i.items ? flatten(i.items) : [i]));
}

export const flatRoutes = registry.flatMap((g) => flatten(g.items));

export const homePath = "/dashboard";

export function firstAccessiblePath(permissions) {
  if (!Array.isArray(permissions)) return null;
  const allowed = (perm) =>
    !perm || permissions.includes("*") || permissions.includes(perm);
  const home = flatRoutes.find((r) => r.path === homePath);
  if (home && allowed(home.perm)) return homePath;
  const route = flatRoutes.find((r) => allowed(r.perm));
  return route?.path ?? null;
}
