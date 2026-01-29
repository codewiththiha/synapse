"use client";

import { useGlobalStore } from "@/stores/use-global-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AlertDialogProvider() {
  const { alertOpen, alertConfig, closeAlert } = useGlobalStore();

  const handleConfirm = () => {
    alertConfig?.onConfirm?.();
    closeAlert();
  };

  const handleCancel = () => {
    alertConfig?.onCancel?.();
    closeAlert();
  };

  return (
    <AlertDialog open={alertOpen} onOpenChange={(open) => !open && closeAlert()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{alertConfig?.title || "Are you sure?"}</AlertDialogTitle>
          {alertConfig?.description && (
            <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {alertConfig?.cancelLabel || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={alertConfig?.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {alertConfig?.confirmLabel || "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
