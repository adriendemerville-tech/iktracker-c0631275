import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { levelInfo, nextLevel } from "@/lib/forum/constants";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelUpDialogProps {
  level: string | null;
  previousLevel?: string | null;
  onClose: () => void;
}

/**
 * Célébration de passage de niveau.
 * Animation CSS légère (pas de librairie), désactivée si prefers-reduced-motion.
 */
export function LevelUpDialog({ level, previousLevel, onClose }: LevelUpDialogProps) {
  const reduced = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  if (!level) return null;

  const info = levelInfo(level);
  const upcoming = nextLevel(level);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm text-center overflow-hidden">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.25),transparent_65%)]",
            !reduced.current && "animate-fade-in",
          )}
        />
        <div className="relative z-10 flex flex-col items-center gap-3 py-2">
          <span
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20",
              !reduced.current && "animate-scale-in",
            )}
          >
            <Sparkles className={cn("h-9 w-9", info.color)} aria-hidden="true" />
          </span>

          <DialogTitle className="text-xl">Niveau {info.label} débloqué</DialogTitle>
          <DialogDescription className="text-sm">
            {previousLevel
              ? `Vous passez de ${levelInfo(previousLevel).label} à ${info.label} grâce à votre participation au forum.`
              : `Votre participation au forum vous fait passer au niveau ${info.label}.`}
          </DialogDescription>

          {upcoming && (
            <p className="text-xs text-muted-foreground">
              Prochain palier : <span className="font-medium">{upcoming.label}</span> à{" "}
              {upcoming.min} points.
            </p>
          )}

          <Button variant="gradient" className="mt-2 w-full" onClick={onClose} autoFocus>
            Continuer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
