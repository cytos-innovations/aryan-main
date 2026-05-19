import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "pos-app:auth";
const AuthContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored);

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(STORAGE_KEY);
  }, [auth]);

  // username + password + applicationId → { user, application, permissions }
  const login = useCallback(async (username, password, applicationId) => {
    const result = await invoke("login", {
      username,
      password,
      applicationId: Number(applicationId),
    });
    setAuth(result);
    return result;
  }, []);

  const logout = useCallback(() => setAuth(null), []);

  const refreshPermissions = useCallback(async () => {
    if (!auth) return;
    const permissions = await invoke("current_permissions", {
      userId: auth.user.id,
      applicationId: auth.application.id,
    });
    setAuth((a) => (a ? { ...a, permissions } : a));
  }, [auth]);

  // can("perm") | can(["perm1","perm2"]) | can("*")
  const can = useCallback(
    (perm) => {
      if (!auth) return false;
      if (!perm) return true;
      const perms = auth.permissions ?? [];
      if (perms.includes("*")) return true;
      const list = Array.isArray(perm) ? perm : [perm];
      return list.some((p) => perms.includes(p));
    },
    [auth],
  );

  const value = useMemo(
    () => ({ auth, login, logout, can, refreshPermissions }),
    [auth, login, logout, can, refreshPermissions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Render children only when user has the permission
export function Can({ perm, children, fallback = null }) {
  const { can } = useAuth();
  return can(perm) ? children : fallback;
}

// Route guard – redirects to "/" when not logged in, to /forbidden when no perm
export function ProtectedRoute({ perm, children }) {
  const { auth, can } = useAuth();
  const location = useLocation();

  if (!auth) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (perm && !can(perm)) {
    return <Navigate to="/forbidden" replace />;
  }
  return children;
}
