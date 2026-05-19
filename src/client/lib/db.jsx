import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

const DbContext = createContext(null);

async function connectFromConfig(config) {
  const url = await invoke("db_url_from_config", { config });
  return await Database.load(url);
}

export function DbProvider({ children, fallback, setup }) {
  const [status, setStatus] = useState("loading");
  const [db, setDb] = useState(null);
  const [error, setError] = useState(null);

  const attempt = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const config = await invoke("get_db_config");
      if (!config) {
        setStatus("setup");
        return;
      }
      const instance = await connectFromConfig(config);
      setDb(instance);
      setStatus("ready");
    } catch (e) {
      setError(String(e?.message || e));
      setStatus("setup");
    }
  }, []);

  useEffect(() => {
    attempt();
  }, [attempt]);

  const saveAndConnect = useCallback(async (config) => {
    const instance = await connectFromConfig(config);
    await invoke("save_db_config", { config });
    setDb(instance);
    setError(null);
    setStatus("ready");
    return instance;
  }, []);

  const testConnection = useCallback(async (config) => {
    const instance = await connectFromConfig(config);
    try {
      await instance.select("SELECT 1");
    } finally {
      try {
        await instance.close();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const reset = useCallback(async () => {
    await invoke("clear_db_config");
    setDb(null);
    setStatus("setup");
  }, []);

  const value = useMemo(
    () => ({ db, status, error, saveAndConnect, testConnection, reset, retry: attempt }),
    [db, status, error, saveAndConnect, testConnection, reset, attempt],
  );

  if (status === "loading") return fallback ?? null;

  if (status === "setup") {
    return <DbContext.Provider value={value}>{setup}</DbContext.Provider>;
  }

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be used inside DbProvider");
  return ctx;
}
