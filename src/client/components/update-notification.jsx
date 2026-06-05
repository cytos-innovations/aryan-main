import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon, Download04Icon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUpdater } from "@/hooks/use-updater";

// ── Startup popup ────────────────────────────────────────────────────────────
function UpdatePopup({ updateInfo, installing, onInstall, onDismiss }) {
  if (!updateInfo) return null;
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Download04Icon} size={18} strokeWidth={2} className="text-primary" />
            Update Available — v{updateInfo.version}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {updateInfo.body ||
              "A new version of Pos-app is ready. You can install it now or later from the notification bell."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss} disabled={installing}>
            Later
          </AlertDialogCancel>
          <AlertDialogAction onClick={onInstall} disabled={installing}>
            {installing ? "Downloading…" : "Update Now"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Notification drawer ──────────────────────────────────────────────────────
function UpdateDrawer({ open, onClose, updateInfo, installing, onInstall }) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-sm font-semibold">Notifications</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {updateInfo ? (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <HugeiconsIcon icon={Download04Icon} size={15} strokeWidth={2} className="text-primary" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-tight">
                    v{updateInfo.version} is available
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {updateInfo.body || "Install the latest version of Pos-app."}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={onInstall}
                disabled={installing}
              >
                {installing ? "Downloading & Installing…" : "Install Update"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} size={32} strokeWidth={1.5} />
              <p className="text-sm">You're up to date</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Bell icon button (goes in the header) ────────────────────────────────────
export function UpdateBell() {
  const { updateInfo, hasUpdate, installing, popupDismissed, installUpdate, dismissPopup } =
    useUpdater();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showPopup = hasUpdate && !popupDismissed;

  return (
    <>
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

      {/* Startup popup */}
      <UpdatePopup
        updateInfo={showPopup ? updateInfo : null}
        installing={installing}
        onInstall={installUpdate}
        onDismiss={dismissPopup}
      />

      {/* Notification drawer */}
      <UpdateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        updateInfo={updateInfo || null}
        installing={installing}
        onInstall={installUpdate}
      />
    </>
  );
}
