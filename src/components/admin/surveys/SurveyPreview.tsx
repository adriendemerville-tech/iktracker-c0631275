import { useState, useCallback } from "react";
import { X, Star, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  type ContentBlock,
  type SurveyVariant,
  type Survey,
} from "./survey-types";
import { PollBlock, RatingBlock, TextBlock, InfoBlock } from "@/components/SurveyWidget";

interface SurveyPreviewProps {
  survey: Survey;
  variant: SurveyVariant;
  onClose: () => void;
}

export function SurveyPreview({ survey, variant, onClose }: SurveyPreviewProps) {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const blocks = variant.content_blocks || [];
  const block = blocks[currentBlockIndex];
  const isLast = currentBlockIndex === blocks.length - 1;

  const handleNext = useCallback(() => {
    if (currentBlockIndex < blocks.length - 1) {
      setCurrentBlockIndex((i) => i + 1);
    } else {
      setSubmitted(true);
    }
  }, [currentBlockIndex, blocks.length]);

  if (submitted) {
    return (
      <div className="w-80 bg-card border border-border rounded-xl shadow-2xl p-5 animate-fade-in">
        <p className="text-center text-sm text-card-foreground">Merci pour votre retour !</p>
      </div>
    );
  }

  if (!block) return null;

  const rawAnswer = responses[block.id] as string | undefined;
  const isFreeAnswer =
    typeof rawAnswer === "string" && (rawAnswer === "__other__" || rawAnswer.startsWith("__free_"));
  const freeKey =
    rawAnswer === "__other__"
      ? block.id
      : `${block.id}_${rawAnswer?.match(/__free_(\d+)__/)?.[1] ?? ""}`;
  const hasAnswer =
    block.type === "info" ||
    block.type === "cta" ||
    (rawAnswer !== undefined &&
      rawAnswer !== "" &&
      (!isFreeAnswer || (otherTexts[freeKey] || "").trim().length > 0));

  return (
    <div className="w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
        <span className="text-xs font-semibold text-foreground truncate">{survey.title}</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {block.type === "poll" && (
          <PollBlock
            block={block}
            value={responses[block.id] as string}
            onChange={(val) => setResponses((r) => ({ ...r, [block.id]: val }))}
            otherTexts={otherTexts}
            onOtherTextChange={(key, val) => setOtherTexts((t) => ({ ...t, [key]: val }))}
          />
        )}
        {block.type === "rating" && (
          <RatingBlock
            block={block}
            value={responses[block.id] as number}
            hovered={hoveredRating}
            onHover={setHoveredRating}
            onChange={(val) => setResponses((r) => ({ ...r, [block.id]: val }))}
          />
        )}
        {block.type === "text_question" && (
          <TextBlock
            block={block}
            value={(responses[block.id] as string) || ""}
            onChange={(val) => setResponses((r) => ({ ...r, [block.id]: val }))}
          />
        )}
        {(block.type === "info" || block.type === "cta") && (
          <InfoBlock block={block} onButtonClick={() => {}} />
        )}
        {block.type === "screenshot" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {(block.config.prompt as string) || "Partagez une capture d'écran"}
            </p>
            <Textarea
              value={(responses[block.id] as string) || ""}
              onChange={(e) => setResponses((r) => ({ ...r, [block.id]: e.target.value }))}
              placeholder="Commentaire (aperçu)"
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        )}
        {block.type === "share" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {(block.config.message as string) || "Partagez IKtracker !"}
            </p>
            <div className="flex gap-2">
              {((block.config.channels as string[]) || ["whatsapp", "sms"]).map((ch) => (
                <Button key={ch} size="sm" variant="outline" className="text-xs capitalize">
                  {ch === "whatsapp" ? "WhatsApp" : "SMS"}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        {blocks.length > 1 && (
          <span className="text-[10px] text-muted-foreground">
            {currentBlockIndex + 1}/{blocks.length}
          </span>
        )}
        <Button
          size="sm"
          disabled={!hasAnswer}
          onClick={handleNext}
          className="ml-auto text-xs gap-1"
        >
          {isLast ? "Envoyer" : "Suivant"}
          {isLast ? <Send className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}
