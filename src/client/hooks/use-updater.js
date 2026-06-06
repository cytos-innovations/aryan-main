import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

let _updateInfo = null;
let _listeners = new Set();

function notify() { _listeners.forEach((fn) => fn(_updateInfo)); }

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState(_updateInfo);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState(null);
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    _listeners.add(setUpdateInfo);
    return () => _listeners.delete(setUpdateInfo);
  }, []);

  useEffect(() => {
    if (_updateInfo !== null) return;
    _updateInfo = undefined;
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
    setInstallError(null);
    try {
      await invoke("download_and_install_update");
      // app restarts — never reached
    } catch (e) {
      setInstalling(false);
      setInstallError(String(e));
    }
  }, []);

  const dismissPopup = useCallback(() => setPopupDismissed(true), []);

  return {
    updateInfo,
    hasUpdate: !!updateInfo,
    installing,
    installError,
    popupDismissed,
    installUpdate,
    dismissPopup,
  };
}
