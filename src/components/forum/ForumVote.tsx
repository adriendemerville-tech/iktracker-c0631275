import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { voteOnTarget } from "@/lib/forum.functions";
import { toast } from "sonner";

interface ForumVoteProps {
  targetType: "discussion" | "reply";
  targetId: string;
  score: number;
  initialVote?: -1 | 0 | 1;
  canVote: boolean;
  orientation?: "vertical" | "horizontal";
}

export function ForumVote({
  targetType,
  targetId,
  score,
  initialVote = 0,
  canVote,
  orientation = "vertical",
}: ForumVoteProps) {
  const [value, setValue] = useState<-1 | 0 | 1>(initialVote);
  const [current, setCurrent] = useState(score);
  const [pending, setPending] = useState(false);

  const submit = async (next: -1 | 1) => {
    if (!canVote) {
      toast.info("Connectez-vous pour voter.");
      return;
    }
    const applied: -1 | 0 | 1 = value === next ? 0 : next;
    const optimistic = current - value + applied;
    setValue(applied);
    setCurrent(optimistic);
    setPending(true);
    try {
      const res = await voteOnTarget({
        data: { target_type: targetType, target_id: targetId, value: applied },
      });
      if (res.ok) setCurrent(res.score);
    } catch {
      setValue(value);
      setCurrent(current);
      toast.error("Vote impossible pour le moment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        orientation === "vertical" ? "flex-col" : "flex-row",
      )}
    >
      <button
        type="button"
        onClick={() => submit(1)}
        disabled={pending}
        aria-label="Voter pour"
        aria-pressed={value === 1}
        className={cn(
          "rounded-md p-1 transition-colors hover:bg-muted focus-visible-ring",
          value === 1 ? "text-primary" : "text-muted-foreground",
        )}
      >
        <ChevronUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="text-xs font-semibold tabular-nums" aria-live="polite">
        {current}
      </span>
      <button
        type="button"
        onClick={() => submit(-1)}
        disabled={pending}
        aria-label="Voter contre"
        aria-pressed={value === -1}
        className={cn(
          "rounded-md p-1 transition-colors hover:bg-muted focus-visible-ring",
          value === -1 ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
