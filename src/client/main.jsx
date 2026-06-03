import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { DbProvider } from "@/lib/db";
import { ThemeProvider } from "@/lib/theme";
import { flatRoutes } from "@/lib/registry";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute, Can } from "@/lib/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getCurrentWindow } from "@tauri-apps/api/window";
import "@/app.css";
import Login from "@/pages/login";
import Error from "@/pages/error";
import Forbidden from "@/pages/forbidden";
import DbSetup from "@/pages/db-setup";
import AppShell from "@/components/app-sidebar";

getCurrentWindow().maximize().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DbProvider
          fallback={
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
              Connecting to database…
            </div>
          }
          setup={<DbSetup />}
        >
          <HashRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/forbidden" element={<Forbidden />} />
                  {flatRoutes.map((r) => (
                    <Route
                      key={r.path}
                      path={r.path}
                      element={
                        <Can perm={r.perm} fallback={<Forbidden />}>
                          {r.element}
                        </Can>
                      }
                    />
                  ))}
                </Route>
                <Route path="*" element={<Error />} />
              </Routes>
            </AuthProvider>
          </HashRouter>
        </DbProvider>
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
