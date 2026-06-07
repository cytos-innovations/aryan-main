import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Layers01Icon,
  LogoutIcon,
  Store01Icon,
  PaintBrushIcon,
  Add01Icon,
} from "@hugeicons/core-free-icons";

import { useAuth, Can } from "@/lib/auth";
import { flatRoutes, homePath, registry } from "@/lib/registry";
import { useTheme, THEMES } from "@/lib/theme";
import { UpdateBell } from "@/components/update-notification";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((t) => t.id === theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-3">
          <HugeiconsIcon icon={PaintBrushIcon} size={15} strokeWidth={2} />
          <span className="text-xs font-medium">{current?.label ?? "Theme"}</span>
          {/* Color swatch dot */}
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-white/20"
            style={{ background: current?.color }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-xs">Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id} className="gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded-full border border-border"
                style={{ background: t.color }}
              />
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function isFolder(item) {
  return Array.isArray(item.items);
}

// Maps registry application names → DB application IDs
const APP_ID = { lodge: 1, restaurant: 2, material: 3, account: 4 };

function appMatches(item, appId) {
  if (!item.application) return true;
  if (!appId) return true;
  const ids = item.application.split(",").map((s) => APP_ID[s.trim()]).filter(Boolean);
  return ids.includes(appId);
}

function filterItems(items, can, appId) {
  const result = [];
  for (const item of items) {
    if (!appMatches(item, appId)) continue;
    if (isFolder(item)) {
      const children = filterItems(item.items, can, appId);
      if (children.length > 0) result.push({ ...item, items: children });
    } else {
      if (can(item.perm)) result.push(item);
    }
  }
  return result;
}

function pathContains(currentPath, items) {
  return items.some((i) =>
    isFolder(i) ? pathContains(currentPath, i.items) : currentPath === i.path,
  );
}

function FolderItem({ item }) {
  const { pathname } = useLocation();
  const defaultOpen = pathContains(pathname, item.items);
  return (
    <Collapsible
      asChild
      defaultOpen={defaultOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.label}>
            {item.icon && <HugeiconsIcon icon={item.icon} strokeWidth={2} />}
            <span>{item.label}</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((child) =>
              isFolder(child) ? (
                <FolderItem key={child.label} item={child} />
              ) : (
                <LeafSubItem key={child.path} item={child} />
              ),
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function LeafItem({ item }) {
  return (
    <SidebarMenuItem>
      <NavLink to={item.path}>
        {({ isActive }) => (
          <SidebarMenuButton tooltip={item.label} isActive={isActive} asChild>
            <span>
              {item.icon && <HugeiconsIcon icon={item.icon} strokeWidth={2} />}
              <span>{item.label}</span>
            </span>
          </SidebarMenuButton>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}

function LeafSubItem({ item }) {
  return (
    <SidebarMenuSubItem>
      <NavLink to={item.path}>
        {({ isActive }) => (
          <SidebarMenuSubButton isActive={isActive} asChild>
            <span>
              {item.icon && <HugeiconsIcon icon={item.icon} strokeWidth={2} />}
              <span>{item.label}</span>
            </span>
          </SidebarMenuSubButton>
        )}
      </NavLink>
    </SidebarMenuSubItem>
  );
}

function NavMain() {
  const { can, auth } = useAuth();
  const appId = auth?.application?.id ?? null;
  const groups = registry
    .map((g) => ({ ...g, items: filterItems(g.items, can, appId) }))
    .filter((g) => g.items.length > 0);

  return groups.map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) =>
          isFolder(item) ? (
            <FolderItem key={item.label} item={item} />
          ) : (
            <LeafItem key={item.path} item={item} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  ));
}

function AppSwitcher() {
  const { auth, switchApplication } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);

  useEffect(() => {
    if (!auth) return;
    const isSuper = auth.user.is_super;
    (isSuper
      ? invoke("get_all_applications")
      : invoke("get_applications_for_user", { userId: auth.user.id })
    )
      .then(setApps)
      .catch(() => {});
  }, [auth?.user?.id]);

  if (!auth || apps.length <= 1) return null;

  async function handleSwitch(appId) {
    const app = apps.find((a) => String(a.id) === appId);
    if (!app || app.id === auth.application.id) return;
    await switchApplication(app.id, app.code, app.application_name);
    navigate(homePath, { replace: true });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={Layers01Icon} size={18} strokeWidth={2} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {auth.application?.application_name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Switch application
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">Applications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={String(auth.application?.id)}
              onValueChange={handleSwitch}
            >
              {apps.map((app) => (
                <DropdownMenuRadioItem
                  key={app.id}
                  value={String(app.id)}
                  className="text-sm"
                >
                  {app.application_name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavUser() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  if (!auth) return null;

  const initials = auth.user.username.slice(0, 2).toUpperCase();
  const rolesText = auth.application?.application_name ?? "POS App";

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="pointer-events-none">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{auth.user.username}</span>
            <span className="truncate text-xs">{rolesText}</span>
          </div>
        </SidebarMenuButton>
        <SidebarMenuAction
          onClick={handleLogout}
          title="Log out"
          className="mt-1"
        >
          <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
          <span className="sr-only">Log out</span>
        </SidebarMenuAction>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function AppSidebar(props) {
  const [appVersion, setAppVersion] = useState("");
  useEffect(() => { getVersion().then(setAppVersion).catch(() => {}); }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon icon={Store01Icon} strokeWidth={2} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">POS App</span>
                <span className="truncate text-xs">Aryan NxtGen</span>
              </div>
              {appVersion && (
                <div className="text-right text-xs text-muted-foreground leading-tight shrink-0">
                  <div className="font-medium">v{appVersion}</div>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <AppSwitcher />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { auth, refreshPermissions } = useAuth();
  const isRestaurant = auth?.application?.id === APP_ID.restaurant;
  const current = flatRoutes.find((r) => r.path === pathname);

  // Refresh permissions from DB on every mount so stale localStorage
  // sessions pick up any changes made in User Access without re-login.
  useEffect(() => {
    refreshPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true} className="h-svh overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4 my-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{current?.label ?? "POS App"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              {isRestaurant && (
                <Can perm="billing:new-order">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 px-3 text-xs"
                    onClick={() => navigate("/billing", { state: { newOrder: Date.now() } })}
                  >
                    <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
                    New Order
                  </Button>
                </Can>
              )}
              <UpdateBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-auto relative">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
