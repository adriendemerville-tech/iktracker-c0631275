// Constantes partagées du forum IKtracker.
// Aucune dépendance serveur ici : ce module est importé côté client ET serveur.

export const FORUM_LEVELS = [
  { key: "nouveau", label: "Nouveau", min: 0, color: "text-muted-foreground" },
  { key: "contributeur", label: "Contributeur", min: 10, color: "text-sky-600" },
  { key: "habitue", label: "Habitué", min: 50, color: "text-emerald-600" },
  { key: "referent", label: "Référent", min: 150, color: "text-violet-600" },
  { key: "expert", label: "Expert", min: 400, color: "text-amber-600" },
] as const;

export type ForumLevelKey = (typeof FORUM_LEVELS)[number]["key"];

export function levelInfo(key: string) {
  return FORUM_LEVELS.find((l) => l.key === key) ?? FORUM_LEVELS[0];
}

export function nextLevel(key: string) {
  const idx = FORUM_LEVELS.findIndex((l) => l.key === key);
  return idx >= 0 && idx < FORUM_LEVELS.length - 1 ? FORUM_LEVELS[idx + 1] : null;
}

export const PERSONA_LABELS: Record<string, string> = {
  sante_liberal: "Santé libérale",
  artisan_btp: "Artisan / BTP",
  consultant_freelance: "Consultant / Freelance",
  commercial_immobilier: "Commercial / Immobilier",
  expert_comptable_tns: "Expert-comptable / TNS",
  autre: "Indépendant",
};

export function personaLabel(persona?: string | null): string | null {
  if (!persona) return null;
  return PERSONA_LABELS[persona] ?? null;
}

const STOP_WORDS = new Set([
  "le","la","les","un","une","des","du","de","d","et","ou","à","au","aux","en","dans","pour",
  "par","sur","avec","sans","que","qui","quoi","est","sont","ce","cette","ces","mon","ma","mes",
  "je","tu","il","elle","on","nous","vous","ils","elles","comment","pourquoi","quel","quelle",
  "faut","peut","dois","doit","plus","moins","mais","donc","car","si","y","a","the",
]);

/** Normalise une chaîne en segment d'URL (sans accents, minuscule, tirets). */
export function slugifyWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug de discussion : 1 à 4 mots-clés significatifs séparés par des tirets.
 * Exemple : "Comment déclarer mes IK en frais réels ?" -> "declarer-ik-frais-reels"
 */
export function buildDiscussionSlug(title: string, maxWords = 4): string {
  const words = slugifyWord(title)
    .split("-")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const kept = (words.length ? words : slugifyWord(title).split("-").filter(Boolean)).slice(
    0,
    Math.max(1, maxWords),
  );
  return kept.join("-") || "discussion";
}

/** Extrait une méta-description propre depuis le corps d'un message. */
export function buildMetaDescription(body: string, max = 158): string {
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export const FORUM_BASE_URL = "https://iktracker.fr/forum";

export const FORUM_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const FORUM_ATTACHMENT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
