import { MessageSquare, Star, Camera, Share2, ListChecks, Info } from "lucide-react";

// ---- Types ----

export interface ContentBlock {
  id: string;
  type: "poll" | "rating" | "text_question" | "screenshot" | "share" | "info";
  config: Record<string, unknown>;
}

export interface SurveyVariant {
  id: string;
  survey_id: string;
  name: string;
  distribution_pct: number;
  content_blocks: ContentBlock[];
  created_at: string;
  updated_at: string;
}

export interface Survey {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  status: string;
  published_at: string | null;
  target_page: string;
  duration_days: number;
  max_impressions_per_user: number;
  delay_between_impressions_hours: number;
  target_personas: string[];
  target_user_count: number | null;
  target_min_days_since_signup: number | null;
  target_max_days_since_signup: number | null;
  created_by: string | null;
}

export interface SurveyStats {
  survey_id: string;
  total_shown: number;
  total_dismissed: number;
  total_completed: number;
  total_responses: number;
  unique_users_shown: number;
  unique_users_responded: number;
}

export const CONTENT_BLOCK_TYPES = [
  { value: "poll", label: "Sondage", icon: ListChecks },
  { value: "rating", label: "Note sur 5", icon: Star },
  { value: "text_question", label: "Question ouverte", icon: MessageSquare },
  { value: "info", label: "Texte / info", icon: Info },
  { value: "screenshot", label: "Capture d'écran", icon: Camera },
  { value: "share", label: "Partage", icon: Share2 },
] as const;

export const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Brouillon", variant: "outline" },
  published: { label: "Publié", variant: "default" },
  paused: { label: "Pausé", variant: "secondary" },
  completed: { label: "Terminé", variant: "destructive" },
};

export const PAGE_OPTIONS = ["/app", "/app/mestrajets", "/app/profile", "/calendrier", "/mode-tournee"];

// ---- Helpers ----

export function generateId() {
  return crypto.randomUUID();
}

export function defaultContentBlock(type: ContentBlock["type"]): ContentBlock {
  const base = { id: generateId(), type, config: {} };
  switch (type) {
    case "poll":
      return { ...base, config: { question: "", options: ["", ""] } };
    case "rating":
      return { ...base, config: { question: "Comment évaluez-vous IKtracker ?" } };
    case "text_question":
      return { ...base, config: { question: "", placeholder: "Votre réponse..." } };
    case "screenshot":
      return {
        ...base,
        config: { prompt: "Partagez une capture d'écran pour nous aider à améliorer l'app" },
      };
    case "share":
      return {
        ...base,
        config: {
          message: "Découvre IKtracker pour suivre tes indemnités kilométriques !",
          channels: ["whatsapp", "sms"],
        },
      };
    case "info":
      return { ...base, config: { title: "", text: "", buttonLabel: "", buttonUrl: "" } };
    default:
      return base;
  }
}

// ---- Sub-components ----

