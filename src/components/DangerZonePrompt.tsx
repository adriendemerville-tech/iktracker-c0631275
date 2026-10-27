import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DANGER_ZONE_COPY } from "@/lib/danger-zones/copy";

interface DangerZonePromptProps {
  open: boolean;
  onEnable: () => void;
  onLater: () => void;
}

export function DangerZonePrompt({ open, onEnable, onLater }: DangerZonePromptProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onLater();
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{DANGER_ZONE_COPY.promptTitle}</AlertDialogTitle>
          <AlertDialogDescription>{DANGER_ZONE_COPY.promptBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
          <Button variant="outline" className="flex-1" onClick={onLater}>
            {DANGER_ZONE_COPY.promptLater}
          </Button>
          <Button className="flex-1" onClick={onEnable}>
            {DANGER_ZONE_COPY.promptEnable}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
