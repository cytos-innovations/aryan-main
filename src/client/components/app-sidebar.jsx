import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  useSidebar,
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

// ── Sidebar keyboard-navigation coordination ─────────────────────
// Lets other screens (e.g. the billing floor grid) hand keyboard focus to the
// sidebar and know when the sidebar currently owns arrow-key navigation, so the
// two zones don't fight over the same key events.
const SidebarNavContext = createContext(null);

export function useSidebarNav() {
  return useContext(SidebarNavContext) ?? null;
}

function SidebarNavProvider({ children }) {
  // Whether the sidebar currently owns arrow-key navigation.
  const [sidebarFocused, setSidebarFocused] = useState(false);
  // Bumped on each focus request so NavMain re-runs its focus effect even when
  // sidebarFocused is already true (e.g. repeated Left presses from a screen).
  const [focusVersion, setFocusVersion] = useState(0);
  // Optional callback a screen registers so the sidebar can hand focus back to
  // it (e.g. return to the billing table grid).
  const returnFocusRef = useRef(null);

  const focusSidebar = useCallback(() => {
    setSidebarFocused(true);
    setFocusVersion((v) => v + 1);
  }, []);

  const blurSidebar = useCallback(() => {
    setSidebarFocused(false);
    // Drop the lingering DOM focus ring on whatever sidebar row was active.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    returnFocusRef.current?.();
  }, []);

  const registerReturnFocus = useCallback((fn) => {
    returnFocusRef.current = fn;
    return () => {
      if (returnFocusRef.current === fn) returnFocusRef.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({
      sidebarFocused,
      setSidebarFocused,
      focusSidebar,
      blurSidebar,
      registerReturnFocus,
      focusVersion,
    }),
    [sidebarFocused, focusSidebar, blurSidebar, registerReturnFocus, focusVersion],
  );

  return (
    <SidebarNavContext.Provider value={value}>
      {children}
    </SidebarNavContext.Provider>
  );
}

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

// Stable key for a registry node (folders have no path, leaves have no items).
function nodeKey(item, parentKey = "") {
  return isFolder(item) ? `${parentKey}folder:${item.label}` : `${parentKey}leaf:${item.path}`;
}

// Flatten the filtered registry into the ordered list of keyboard-navigable rows.
// A folder is always a row; its children are included only while the folder is
// open. Each row carries enough info to render + act on it.
function flattenRows(groups, openMap, parentKey = "", depth = 0) {
  const rows = [];
  for (const group of groups) {
    for (const item of group.items ?? group) {
      const key = nodeKey(item, parentKey);
      if (isFolder(item)) {
        const open = openMap[key] ?? false;
        rows.push({ key, item, depth, isFolder: true, open });
        if (open) {
          rows.push(
            ...flattenRows([{ items: item.items }], openMap, `${key}/`, depth + 1),
          );
        }
      } else {
        rows.push({ key, item, depth, isFolder: false });
      }
    }
  }
  return rows;
}

// Each navigable row carries data-nav-key on its focusable element so the
// keyboard handler can move DOM focus by key lookup (works regardless of how the
// underlying sidebar component forwards refs).
function FolderRow({ row, navKey, isOpen, onActivate }) {
  const { item } = row;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-nav-key={navKey}
        tooltip={item.label}
        data-state={isOpen ? "open" : "closed"}
        onClick={onActivate}
      >
        {item.icon && <HugeiconsIcon icon={item.icon} strokeWidth={2} />}
        <span>{item.label}</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          className={`ml-auto transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function LeafRow({ row, navKey }) {
  const { item, depth } = row;
  const Wrapper = depth > 0 ? SidebarMenuSubItem : SidebarMenuItem;
  const Btn = depth > 0 ? SidebarMenuSubButton : SidebarMenuButton;
  return (
    <Wrapper>
      <NavLink to={item.path} data-nav-key={navKey}>
        {({ isActive }) => (
          <Btn tooltip={item.label} isActive={isActive} asChild>
            <span>
              {item.icon && <HugeiconsIcon icon={item.icon} strokeWidth={2} />}
              <span>{item.label}</span>
            </span>
          </Btn>
        )}
      </NavLink>
    </Wrapper>
  );
}

function NavMain() {
  const { can, auth } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const { sidebarFocused, setSidebarFocused, focusSidebar, blurSidebar, focusVersion } =
    useSidebarNav();
  const appId = auth?.application?.id ?? null;

  const groups = useMemo(
    () =>
      registry
        .map((g) => ({ ...g, items: filterItems(g.items, can, appId) }))
        .filter((g) => g.items.length > 0),
    [can, appId],
  );

  // Per-folder open/closed state. Folders containing the active route start open.
  const [openMap, setOpenMap] = useState(() => {
    const map = {};
    const seed = (items, parentKey) => {
      for (const item of items) {
        if (!isFolder(item)) continue;
        const key = nodeKey(item, parentKey);
        if (pathContains(pathname, item.items)) map[key] = true;
        seed(item.items, `${key}/`);
      }
    };
    groups.forEach((g) => seed(g.items, ""));
    return map;
  });

  const setFolderOpen = useCallback((key, value) => {
    setOpenMap((m) => ({ ...m, [key]: typeof value === "function" ? value(m[key] ?? false) : value }));
  }, []);

  const rows = useMemo(() => flattenRows(groups, openMap), [groups, openMap]);

  const containerRef = useRef(null);

  // Latest rows kept in a ref so deferred (rAF) focus callbacks resolve against
  // the post-expand row list rather than a stale snapshot.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // Index of the currently keyboard-focused row (only meaningful while the
  // sidebar owns focus).
  const [activeIndex, setActiveIndex] = useState(0);

  // Move DOM focus to a row by index, locating its focusable element via the
  // data-nav-key attribute set on each rendered row.
  const focusRow = useCallback((index) => {
    const list = rowsRef.current;
    if (index < 0 || index >= list.length) return;
    setActiveIndex(index);
    const key = list[index].key;
    const el = containerRef.current?.querySelector(
      `[data-nav-key="${CSS.escape(key)}"]`,
    );
    el?.focus();
  }, []);

  // When a screen hands focus to the sidebar, ensure it's open and focus the
  // row matching the current route (falling back to the first row).
  useEffect(() => {
    if (!sidebarFocused) return;
    if (!sidebarOpen) setSidebarOpen(true);
    const activePath = pathname;
    let idx = rows.findIndex((r) => !r.isFolder && r.item.path === activePath);
    if (idx < 0) idx = activeIndex < rows.length ? activeIndex : 0;
    // Defer to let the sidebar expand / refs attach.
    const id = requestAnimationFrame(() => focusRow(idx));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarFocused, focusVersion]);

  // Navigating to a new route always releases the sidebar back to the screen,
  // so arrow keys stop being captured by the sidebar once a page opens.
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (sidebarFocused) setSidebarFocused(false);
    }
  }, [pathname, sidebarFocused, setSidebarFocused]);

  const activateRow = useCallback(
    (index) => {
      const row = rows[index];
      if (!row) return;
      if (row.isFolder) {
        const wasOpen = openMap[row.key] ?? false;
        if (!wasOpen) {
          // Closed → expand and step into its first child.
          setFolderOpen(row.key, true);
          requestAnimationFrame(() => focusRow(index + 1));
        } else {
          // Open → Enter collapses it again (toggle), keeping focus on the folder.
          setFolderOpen(row.key, false);
        }
      } else {
        // Leaf → navigate and release the sidebar back to the screen.
        navigate(row.item.path);
        blurSidebar();
      }
    },
    [rows, openMap, setFolderOpen, focusRow, navigate, blurSidebar],
  );

  // Keyboard handling while the sidebar owns navigation.
  useEffect(() => {
    if (!sidebarFocused) return;
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusRow(Math.min(activeIndex + 1, rows.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          focusRow(Math.max(activeIndex - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          activateRow(activeIndex);
          break;
        case "ArrowLeft": {
          e.preventDefault();
          const row = rows[activeIndex];
          // On an open folder, Left collapses it. Otherwise step out to the
          // parent folder row (if nested), else stay put.
          if (row?.isFolder && (openMap[row.key] ?? false)) {
            setFolderOpen(row.key, false);
          } else if (row && row.depth > 0) {
            const parentIdx = rows
              .slice(0, activeIndex)
              .map((r, i) => ({ r, i }))
              .reverse()
              .find(({ r }) => r.depth < row.depth)?.i;
            if (parentIdx != null) focusRow(parentIdx);
          }
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const row = rows[activeIndex];
          if (row?.isFolder) {
            // Expand collapsed folder; if already open, step into first child.
            if (!(openMap[row.key] ?? false)) {
              setFolderOpen(row.key, true);
              requestAnimationFrame(() => focusRow(activeIndex + 1));
            } else {
              focusRow(activeIndex + 1);
            }
          } else {
            // On a leaf, Right hands focus back to the main screen.
            blurSidebar();
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          blurSidebar();
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarFocused, activeIndex, rows, openMap, focusRow, activateRow, setFolderOpen, blurSidebar]);

  // If the user clicks/tabs away from the sidebar, release navigation ownership.
  useEffect(() => {
    if (!sidebarFocused) return;
    function onFocusIn(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSidebarFocused(false);
      }
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [sidebarFocused, setSidebarFocused]);

  // Global entry point: pressing Left from anywhere (when not already in the
  // sidebar and not typing into a field, and no other handler claimed it) hands
  // keyboard navigation to the sidebar. Screens that manage Left themselves
  // (e.g. the billing grid) call preventDefault first, which we respect here.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "ArrowLeft") return;
      if (sidebarFocused) return;
      if (e.defaultPrevented) return; // a screen already handled this Left
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      focusSidebar();
    }
    // Bubble phase: screens that own Left (e.g. the billing grid) register a
    // capture-phase listener and call stopPropagation, so this never fires there.
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarFocused, focusSidebar]);

  // Render rows grouped under their section labels. Folder children are nested
  // inside a SidebarMenuSub for the correct indentation/guides.
  const handleActivateKey = useCallback(
    (k) => {
      const idx = rows.findIndex((r) => r.key === k);
      if (idx >= 0) activateRow(idx);
    },
    [rows, activateRow],
  );

  return (
    <div ref={containerRef}>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <RenderNode
                key={nodeKey(item, "")}
                item={item}
                parentKey=""
                rows={rows}
                openMap={openMap}
                onActivate={handleActivateKey}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  );
}

// Recursively render a registry node (folder or leaf) with its current
// open-state. Each row's focusable element is tagged with data-nav-key so the
// keyboard handler can move focus by key.
function RenderNode({ item, parentKey, rows, openMap, onActivate }) {
  const key = nodeKey(item, parentKey);
  const row = rows.find((r) => r.key === key);
  if (!row) return null;

  if (row.isFolder) {
    const isOpen = openMap[key] ?? false;
    return (
      <>
        <FolderRow
          row={row}
          navKey={key}
          isOpen={isOpen}
          onActivate={() => onActivate(key)}
        />
        {isOpen && (
          <SidebarMenuSub>
            {item.items.map((child) => (
              <RenderNode
                key={nodeKey(child, `${key}/`)}
                item={child}
                parentKey={`${key}/`}
                rows={rows}
                openMap={openMap}
                onActivate={onActivate}
              />
            ))}
          </SidebarMenuSub>
        )}
      </>
    );
  }

  return <LeafRow row={row} navKey={key} />;
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
        <SidebarNavProvider>
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
        </SidebarNavProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
