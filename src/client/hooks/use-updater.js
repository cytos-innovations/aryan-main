import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

// Single shared state so the bell and dialog stay in sync
let _updateInfo = null;
let _listeners = new Set();

function notify() {
  _listeners.forEach((fn) => fn(_updateInfo));
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState(_updateInfo);
  const [installing, setInstalling] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    _listeners.add(setUpdateInfo);
    return () => _listeners.delete(setUpdateInfo);
  }, []);

  // Check once on first mount of any consumer
  useEffect(() => {
    if (_updateInfo !== null) return; // already checked
    _updateInfo = undefined; // mark as "checking"
    invoke("check_for_update")
      .then((res) => {
        _updateInfo = res.available
          ? { version: res.version, body: res.body }
          : false;
        notify();
      })
      .catch(() => {
        _updateInfo = false;
        notify();
      });
  }, []);

  const installUpdate = useCallback(async () => {
    setInstalling(true);
    try {
      await invoke("install_update");
      // app restarts — this line never reached
    } catch {
      setInstalling(false);
    }
  }, []);

  const dismissPopup = useCallback(() => setPopupDismissed(true), []);

  return {
    updateInfo,                          // false | undefined | { version, body }
    hasUpdate: !!updateInfo,
    installing,
    popupDismissed,
    installUpdate,
    dismissPopup,
  };
}
