import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Store01Icon,
  Sun01Icon,
  Moon02Icon,
  DropletIcon,
  TreeIcon,
} from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { firstAccessiblePath } from "@/lib/registry";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// ── Theme icons map ──────────────────────────────────────────
const THEME_OPTIONS = [
  { value: "light",  label: "Light",  icon: Sun01Icon },
  { value: "dark",   label: "Dark",   icon: Moon02Icon },
  { value: "ocean",  label: "Ocean",  icon: DropletIcon },
  { value: "forest", label: "Forest", icon: TreeIcon },
];

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = THEME_OPTIONS.find((t) => t.value === theme) ?? THEME_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HugeiconsIcon icon={current.icon} strokeWidth={2} className="size-4" />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={theme === opt.value ? "bg-accent" : ""}
          >
            <HugeiconsIcon icon={opt.icon} strokeWidth={2} className="mr-2 size-4" />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Login Form ────────────────────────────────────────────────
function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [users, setUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [password, setPassword] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    invoke("get_all_users")
      .then((list) => setUsers(list ?? []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const filteredUsers = username.trim()
    ? users.filter((u) => u.user_name.toLowerCase().includes(username.toLowerCase()))
    : users;

  const fetchApps = useCallback(async (uname) => {
    const trimmed = uname.trim();
    if (!trimmed) {
      setApplications([]);
      setApplicationId("");
      return;
    }
    setAppsLoading(true);
    try {
      const apps = await invoke("get_accessible_applications", { username: trimmed });
      setApplications(apps ?? []);
      setApplicationId("");
    } catch (e) {
      setApplications([]);
      setApplicationId("");
      toast.error("Database error", { description: String(e) });
    } finally {
      setAppsLoading(false);
    }
  }, []);

  function handleUsernameChange(e) {
    const val = e.target.value;
    setUsername(val);
    setApplications([]);
    setApplicationId("");
    setShowSuggestions(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchApps(val), 400);
  }

  function selectUser(name) {
    setUsername(name);
    setShowSuggestions(false);
    fetchApps(name);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim()) { toast.error("Username is required"); return; }
    if (!applicationId) { toast.error("Please select an application"); return; }
    if (!password) { toast.error("Password is required"); return; }

    setLoginBusy(true);
    try {
      const result = await login(username.trim(), password, applicationId);
      const path = firstAccessiblePath(result.permissions);
      navigate(path ?? "/forbidden", { replace: true });
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoginBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-username">Username</Label>
            <div ref={wrapperRef} className="relative">
              <Input
                id="login-username"
                value={username}
                onChange={handleUsernameChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Enter username"
                autoComplete="off"
                required
              />
              {showSuggestions && filteredUsers.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-48 overflow-auto">
                  {filteredUsers.map((u) => (
                    <li
                      key={u.id}
                      onMouseDown={(e) => { e.preventDefault(); selectUser(u.user_name); }}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {u.user_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-app">Application</Label>
            <Select
              value={applicationId}
              onValueChange={setApplicationId}
              disabled={appsLoading || applications.length === 0}
            >
              <SelectTrigger id="login-app" className="w-full">
                <SelectValue
                  placeholder={
                    appsLoading
                      ? "Loading applications…"
                      : username.trim()
                      ? applications.length === 0
                        ? "No accessible applications"
                        : "Select application"
                      : "Enter username first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {applications.map((app) => (
                  <SelectItem key={app.id} value={String(app.id)}>
                    {app.application_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={!applicationId}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginBusy || !applicationId}
          >
            {loginBusy ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function Login() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth) {
      const path = firstAccessiblePath(auth.permissions);
      navigate(path ?? "/forbidden", { replace: true });
    }
  }, [auth, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon icon={Store01Icon} strokeWidth={2} className="size-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">POS App</p>
            <p className="text-xs text-muted-foreground">Aryan NxtGen</p>
          </div>
        </div>
        <ThemeSwitcher />
      </header>

      <Separator />

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Aryan NxtGen. All rights reserved.
      </footer>
    </div>
  );
}
