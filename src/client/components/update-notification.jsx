import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification01Icon,
  Download04Icon,
  CheckmarkBadge01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUpdater } from "@/hooks/use-updater";

// ── Top banner (replaces AlertDialog) ────────────────────────────────────────
function UpdateBanner({ updateInfo, installing, installError, onInstall, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (updateInfo) {
      // small delay so it slides in after mount
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [updateInfo]);

  if (!updateInfo) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50 flex items-center justify-between
        gap-3 px-4 py-2.5 bg-primary text-primary-foreground shadow-lg
        transition-transform duration-300 ease-out
        ${visible ? "translate-y-0" : "-translate-y-full"}
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <HugeiconsIcon icon={Download04Icon} size={15} strokeWidth={2.5} className="shrink-0" />
        <p className="text-xs font-medium truncate">
          v{updateInfo.version} is available —{" "}
          <span className="opacity-80 font-normal">
            {updateInfo.body || "A new version of Pos-app is ready to install."}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-3 text-xs font-medium"
          onClick={onInstall}
          disabled={installing}
        >
          {installing ? (
            "Downloading…"
          ) : (
            <>
              Update Now
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2.5} className="ml-1" />
            </>
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 hover:bg-primary-foreground/10 text-primary-foreground"
          onClick={onDismiss}
          disabled={installing}
          title="Dismiss"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}

// ── Notification drawer ──────────────────────────────────────────────────────
function UpdateDrawer({ open, onClose, updateInfo, installing, installError, onInstall }) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-sm font-semibold">Notifications</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {updateInfo ? (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
              {/* Icon + text */}
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={2} className="text-primary" />
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    Update v{updateInfo.version} available
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {updateInfo.body || "Install the latest version of Pos-app to get new features and fixes."}
                  </p>
                </div>
              </div>

              {/* Install button */}
              <Button
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                onClick={onInstall}
                disabled={installing}
              >
                {installing ? (
                  <>
                    <span className="animate-spin inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent" />
                    Downloading & Installing…
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Download04Icon} size={13} strokeWidth={2.5} />
                    Install Update
                  </>
                )}
              </Button>

              {installError && (
                <p className="text-xs text-destructive break-all">{installError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-3 text-muted-foreground">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <HugeiconsIcon icon={CheckmarkBadge01Icon} size={24} strokeWidth={1.5} />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">You're up to date</p>
                <p className="text-xs">No updates available right now.</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Bell icon button (goes in the header) ────────────────────────────────────
export function UpdateBell() {
  const { updateInfo, hasUpdate, installing, installError, popupDismissed, installUpdate, dismissPopup } =
    useUpdater();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showBanner = hasUpdate && !popupDismissed;

  return (
    <>
      {/* Top banner */}
      <UpdateBanner
        updateInfo={showBanner ? updateInfo : null}
        installing={installing}
        installError={installError}
        onInstall={installUpdate}
        onDismiss={dismissPopup}
      />

      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        onClick={() => setDrawerOpen(true)}
        title="Notifications"
      >
        <HugeiconsIcon icon={Notification01Icon} size={16} strokeWidth={2} />
        {hasUpdate && (
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </Button>

      {/* Notification drawer */}
      <UpdateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        updateInfo={updateInfo || null}
        installing={installing}
        installError={installError}
        onInstall={installUpdate}
      />
    </>
  );
}
