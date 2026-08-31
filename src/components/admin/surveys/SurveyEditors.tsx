import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Eye, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { EmojiInput, EmojiTextarea } from "./EmojiField";
import {
  type ContentBlock,
  type SurveyVariant,
  CONTENT_BLOCK_TYPES,
  defaultContentBlock,
  SURVEY_QUESTION_MAX_LENGTH,
  SURVEY_INFO_TITLE_MAX_LENGTH,
  SURVEY_INFO_TEXT_MAX_LENGTH,
  SURVEY_SHARE_MESSAGE_MAX_LENGTH,
  SURVEY_SCREENSHOT_PROMPT_MAX_LENGTH,
} from "./survey-types";

export function ContentBlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
  onRemove: () => void;
}) {
  const meta = CONTENT_BLOCK_TYPES.find((t) => t.value === block.type);
  const Icon = meta?.icon || ListChecks;

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{meta?.label}</span>
            <span title="Visible par l'utilisateur">
              <Eye className="w-3.5 h-3.5 text-green-500" />
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {block.type === "poll" && (
          <>
            <div>
              <Label className="text-xs">Question</Label>
              <EmojiInput
                value={(block.config.question as string) || ""}
                onChange={(e) =>
                  onChange({ ...block, config: { ...block.config, question: e.target.value } })
                }
                placeholder="Votre question..."
              />
            </div>
            <div>
              <Label className="text-xs">Options</Label>
              {((block.config.options as string[]) || []).map((opt, i) => {
                const freeOptions = (block.config.freeOptions as number[]) || [];
                const isFree = freeOptions.includes(i);
                return (
                  <div key={i} className="group flex items-center gap-2 mt-1">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...(block.config.options as string[])];
                        opts[i] = e.target.value;
                        onChange({ ...block, config: { ...block.config, options: opts } });
                      }}
                      placeholder={`Option ${i + 1}`}
                      className={isFree ? "border-primary/50" : ""}
                    />
                    <div
                      className={`flex items-center gap-1 shrink-0 transition-opacity ${isFree ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    >
                      <label
                        className="flex items-center gap-1 cursor-pointer text-[10px] text-muted-foreground whitespace-nowrap select-none"
                        title="Champ libre : l'utilisateur peut saisir sa propre réponse"
                      >
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={(e) => {
                            const prev = (block.config.freeOptions as number[]) || [];
                            const next = e.target.checked
                              ? [...prev, i]
                              : prev.filter((idx) => idx !== i);
                            onChange({ ...block, config: { ...block.config, freeOptions: next } });
                          }}
                          className="rounded w-3 h-3"
                        />
                        Libre
                      </label>
                    </div>
                    {(block.config.options as string[]).length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const opts = (block.config.options as string[]).filter((_, j) => j !== i);
                          // Adjust freeOptions indices after removal
                          const prevFree = (block.config.freeOptions as number[]) || [];
                          const nextFree = prevFree
                            .filter((idx) => idx !== i)
                            .map((idx) => (idx > i ? idx - 1 : idx));
                          onChange({
                            ...block,
                            config: { ...block.config, options: opts, freeOptions: nextFree },
                          });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const opts = [...(block.config.options as string[]), ""];
                  onChange({ ...block, config: { ...block.config, options: opts } });
                }}
              >
                <Plus className="w-3 h-3 mr-1" /> Option
              </Button>
            </div>
          </>
        )}
        {block.type === "rating" && (
          <div>
            <Label className="text-xs">Question</Label>
            <EmojiInput
              value={(block.config.question as string) || ""}
              onChange={(e) =>
                onChange({ ...block, config: { ...block.config, question: e.target.value } })
              }
              placeholder="Comment évaluez-vous... ?"
            />
          </div>
        )}
        {block.type === "text_question" && (
          <>
            <div>
              <Label className="text-xs">Question</Label>
              <EmojiInput
                value={(block.config.question as string) || ""}
                onChange={(e) =>
                  onChange({ ...block, config: { ...block.config, question: e.target.value } })
                }
                placeholder="Votre question..."
              />
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={(block.config.placeholder as string) || ""}
                onChange={(e) =>
                  onChange({ ...block, config: { ...block.config, placeholder: e.target.value } })
                }
              />
            </div>
          </>
        )}
        {block.type === "screenshot" && (
          <div>
            <Label className="text-xs">Message d'invitation</Label>
            <EmojiTextarea
              value={(block.config.prompt as string) || ""}
              onChange={(e) =>
                onChange({ ...block, config: { ...block.config, prompt: e.target.value } })
              }
              rows={2}
            />
          </div>
        )}
        {block.type === "share" && (
          <>
            <div>
              <Label className="text-xs">Message pré-rempli</Label>
              <EmojiTextarea
                value={(block.config.message as string) || ""}
                onChange={(e) =>
                  onChange({ ...block, config: { ...block.config, message: e.target.value } })
                }
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              {["whatsapp", "sms"].map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={((block.config.channels as string[]) || []).includes(ch)}
                    onCheckedChange={(checked) => {
                      const channels = (block.config.channels as string[]) || [];
                      const next = checked ? [...channels, ch] : channels.filter((c) => c !== ch);
                      onChange({ ...block, config: { ...block.config, channels: next } });
                    }}
                  />
                  {ch === "whatsapp" ? "WhatsApp" : "SMS"}
                </label>
              ))}
            </div>
          </>
        )}
        {block.type === "info" && (
          <>
            <div>
              <Label className="text-xs">Titre (optionnel)</Label>
              <EmojiInput
                value={(block.config.title as string) || ""}
                onChange={(e) =>
                  onChange({ ...block, config: { ...block.config, title: e.target.value } })
                }
                placeholder="Titre..."
              />
            </div>
            <div>
              <Label className="text-xs">Texte</Label>
              <EmojiTextarea
                value={(block.config.text as string) || ""}
                onChange={(e) =>
                  onChange({ ...block, config: { ...block.config, text: e.target.value } })
                }
                placeholder="Votre message..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Libellé bouton (optionnel)</Label>
                <Input
                  value={(block.config.buttonLabel as string) || ""}
                  onChange={(e) =>
                    onChange({ ...block, config: { ...block.config, buttonLabel: e.target.value } })
                  }
                  placeholder="En savoir plus"
                />
              </div>
              <div>
                <Label className="text-xs">Lien (URL ou tab=NOM)</Label>
                <Input
                  value={(block.config.buttonUrl as string) || ""}
                  onChange={(e) =>
                    onChange({ ...block, config: { ...block.config, buttonUrl: e.target.value } })
                  }
                  placeholder="/app/mestrajets ou tab=stats"
                />
              </div>
            </div>
          </>
        )}

        {block.type === "cta" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Texte</Label>
              <EmojiTextarea
                value={(block.config.text as string) || ""}
                onChange={(e) =>
                  onChange({ ...block, config: { ...block.config, text: e.target.value } })
                }
                placeholder="Votre message..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Ancre du bouton</Label>
                <Input
                  value={(block.config.buttonLabel as string) || ""}
                  onChange={(e) =>
                    onChange({ ...block, config: { ...block.config, buttonLabel: e.target.value } })
                  }
                  placeholder="Forum"
                />
              </div>
              <div>
                <Label className="text-xs">Page de destination</Label>
                <Input
                  value={(block.config.buttonUrl as string) || ""}
                  onChange={(e) =>
                    onChange({ ...block, config: { ...block.config, buttonUrl: e.target.value } })
                  }
                  placeholder="https://iktracker.fr/forum/"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VariantEditor({
  variant,
  onChange,
  onRemove,
  canRemove,
}: {
  variant: SurveyVariant;
  onChange: (v: SurveyVariant) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <Input
              value={variant.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onChange({ ...variant, name: e.target.value })}
              className="h-8 w-40 text-sm font-medium"
            />
            <Badge variant="outline">{variant.distribution_pct}%</Badge>
          </div>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          <div>
            <Label className="text-xs">Répartition (%)</Label>
            <Slider
              value={[variant.distribution_pct]}
              onValueChange={([v]) => onChange({ ...variant, distribution_pct: v })}
              min={0}
              max={100}
              step={5}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold">Blocs de contenu</Label>
            {(variant.content_blocks || []).map((block, i) => (
              <ContentBlockEditor
                key={block.id}
                block={block}
                onChange={(updated) => {
                  const blocks = [...variant.content_blocks];
                  blocks[i] = updated;
                  onChange({ ...variant, content_blocks: blocks });
                }}
                onRemove={() => {
                  onChange({
                    ...variant,
                    content_blocks: variant.content_blocks.filter((_, j) => j !== i),
                  });
                }}
              />
            ))}
            <Select
              onValueChange={(type) => {
                onChange({
                  ...variant,
                  content_blocks: [
                    ...variant.content_blocks,
                    defaultContentBlock(type as ContentBlock["type"]),
                  ],
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="+ Ajouter un bloc" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_BLOCK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="w-4 h-4" /> {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---- Survey responses panel ----
