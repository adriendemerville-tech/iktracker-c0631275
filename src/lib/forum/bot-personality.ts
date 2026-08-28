// Logique pure d'animation du forum par les profils communautaires.
// Aucun accès réseau ni base ici : ce module est testable unitairement.

export type DiscColor = "bleu" | "vert" | "jaune" | "rouge";
export type AgeBand = "25-35" | "35-50" | "50-65";
export type Register = "soutenu" | "courant" | "familier";
export type Verbosity = "court" | "moyen" | "long";
export type Lifecycle = "montant" | "actif" | "essoufle" | "dormant";

export interface BotPersonality {
  user_id: string;
  disc_color: DiscColor;
  age_band: AgeBand;
  register: Register;
  typo_rate: number;
  verbosity: Verbosity;
  active_hours: number[];
  active_days: number[];
  activity_weight: number;
  lifecycle: Lifecycle;
  is_active: boolean;
  memory: Record<string, unknown>;
  last_discussion_at?: string | null;
  last_reply_at?: string | null;
}

export interface BotProfileContext extends BotPersonality {
  pseudo: string;
  persona: string | null;
  bio: string | null;
}

/* -------------------------------------------------------------------------- */
/* Anti-cannibalisation SEO                                                    */
/* -------------------------------------------------------------------------- */

/** Termes qui appartiennent aux pages SEO du site : interdits aux bots. */
export const FORBIDDEN_TERMS = [
  "indemnité kilométrique",
  "indemnites kilometriques",
  "indemnités kilométriques",
  "indemnite kilometrique",
  "barème kilométrique",
  "bareme kilometrique",
  "barème 2026",
  "frais réels",
  "frais reels",
  "déclaration 2035",
  "declaration 2035",
  "case 7up",
  "abattement forfaitaire",
  "remboursement kilométrique",
  "ik fiscal",
  "note de frais kilométrique",
  "grand déplacement",
  "puissance fiscale",
  "cheval fiscal",
  "iktracker vs",
  "meilleure application ik",
];

const IK_PATTERNS = [
  /\bIK\b/,
  /\bkilom[ée]trique/i,
  /\bbar[èe]me\b/i,
  /\bURSSAF\b/i,
  /\bDGFiP\b/i,
  /\b2035\b/,
  /\b\d+[.,]\d+\s*(?:€|euros?)\s*(?:\/|par )\s*km\b/i,
];

/** Vrai si le texte empiète sur le périmètre SEO protégé du site. */
export function violatesSeoGuard(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term)) return `terme interdit: ${term}`;
  }
  for (const re of IK_PATTERNS) {
    if (re.test(text)) return `motif interdit: ${re.source}`;
  }
  return null;
}

/** Aucun conseil fiscal chiffré : les bots parlent métier, pas fiscalité. */
export function violatesAdviceGuard(text: string): string | null {
  if (/\b\d+\s*(?:%|pour cent)\s*(?:de\s*)?(?:d[ée]duction|abattement|tva)/i.test(text)) {
    return "conseil fiscal chiffré";
  }
  if (/\b(?:tu dois|vous devez|il faut absolument)\b.{0,40}\b(?:d[ée]clarer|fisc|imp[ôo]ts?)\b/i.test(text)) {
    return "conseil fiscal normatif";
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Similarité de titres (anti-doublon)                                         */
/* -------------------------------------------------------------------------- */

function tokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
}

/** Indice de Jaccard entre deux titres (0 = rien en commun, 1 = identiques). */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

export const TITLE_SIMILARITY_MAX = 0.5;

/** Vrai si le titre est trop proche d'un titre déjà publié. */
export function isDuplicateTitle(title: string, existing: string[]): boolean {
  return existing.some((t) => titleSimilarity(title, t) >= TITLE_SIMILARITY_MAX);
}

/* -------------------------------------------------------------------------- */
/* Affinité de persona                                                         */
/* -------------------------------------------------------------------------- */

const AFFINITY: Record<string, string[]> = {
  sante_liberal: ["sante_liberal", "autre"],
  artisan_btp: ["artisan_btp", "autre"],
  consultant_freelance: ["consultant_freelance", "expert_comptable_tns"],
  commercial_immobilier: ["commercial_immobilier", "consultant_freelance"],
  expert_comptable_tns: ["expert_comptable_tns", "consultant_freelance"],
  autre: ["autre"],
};

/** Multiplicateur de probabilité de réponse selon la proximité des métiers. */
export function personaAffinity(a: string | null, b: string | null): number {
  if (!a || !b) return 1;
  if (a === b) return 2.5;
  return AFFINITY[a]?.includes(b) ? 1.6 : 0.8;
}

/* -------------------------------------------------------------------------- */
/* Pondération du choix des cibles                                             */
/* -------------------------------------------------------------------------- */

export interface ReplyTarget {
  discussion_id: string;
  title: string;
  persona: string | null;
  is_bot: boolean;
  created_at: string;
  last_activity_at: string;
  reply_count: number;
}

/**
 * Score d'attractivité d'une discussion pour un bot.
 * Priorise fortement les discussions de vrais utilisateurs et les fils récents ;
 * les anciens fils sont progressivement délaissés (décroissance à 14 jours).
 */
export function targetWeight(bot: BotProfileContext, target: ReplyTarget, now = new Date()): number {
  const ageDays = (now.getTime() - new Date(target.last_activity_at).getTime()) / 86_400_000;
  const recency = Math.exp(-ageDays / 14);
  const human = target.is_bot ? 1 : 3.5;
  const affinity = personaAffinity(bot.persona, target.persona);
  const saturation = 1 / (1 + target.reply_count * 0.25);
  return recency * human * affinity * saturation * Math.max(0.1, bot.activity_weight);
}

/** Tirage pondéré déterministe à partir d'un aléa [0,1[. */
export function weightedPick<T>(items: T[], weight: (item: T) => number, rand: number): T | null {
  const weights = items.map((i) => Math.max(0, weight(i)));
  const total = weights.reduce((s, w) => s + w, 0);
  if (!items.length || total <= 0) return null;
  let cursor = rand * total;
  for (let i = 0; i < items.length; i++) {
    cursor -= weights[i]!;
    if (cursor <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/* -------------------------------------------------------------------------- */
/* Planning hebdomadaire                                                       */
/* -------------------------------------------------------------------------- */

/** Hash déterministe (FNV-1a) pour dériver un planning stable par semaine. */
export function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export interface Slot {
  day: number; // 1 = lundi ... 7 = dimanche
  hour: number; // heure UTC
}

/**
 * Deux créneaux de publication par semaine, tirés au sort de façon stable :
 * jamais le même jour, jamais à heure ronde de rendez-vous, creux le dimanche.
 */
export function weeklyDiscussionSlots(weekKey: string): Slot[] {
  const seed = hashSeed(weekKey);
  const days = [1, 2, 3, 4, 5, 6];
  const first = days[seed % days.length]!;
  const rest = days.filter((d) => Math.abs(d - first) >= 2);
  const second = rest[(seed >>> 8) % rest.length] ?? ((first % 6) + 1);
  const hours = [7, 8, 9, 11, 13, 17, 18, 20, 21];
  return [
    { day: first, hour: hours[(seed >>> 4) % hours.length]! },
    { day: second, hour: hours[(seed >>> 12) % hours.length]! },
  ].sort((a, b) => a.day - b.day || a.hour - b.hour);
}

/** Vrai si le bot est censé être connecté à cet instant. */
export function isBotAwake(bot: BotPersonality, now = new Date()): boolean {
  if (!bot.is_active || bot.lifecycle === "dormant") return false;
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  return bot.active_days.includes(day) && bot.active_hours.includes(hour);
}

export const LIFECYCLE_MULTIPLIER: Record<Lifecycle, number> = {
  montant: 1.4,
  actif: 1,
  essoufle: 0.4,
  dormant: 0,
};

/* -------------------------------------------------------------------------- */
/* Style rédactionnel                                                          */
/* -------------------------------------------------------------------------- */

const DISC_STYLE: Record<DiscColor, string> = {
  bleu: "tu es carré, tu donnes des exemples concrets de ta semaine, tu poses des questions pratiques, peu d'émotion",
  vert: "tu es sympa, tu racontes ce que toi tu fais, tu contredis rarement",
  jaune: "tu es bavard, phrases courtes, anecdotes, tu pars parfois à côté du sujet",
  rouge: "tu es cash, tu dis ce que tu penses, phrases très courtes, tu contredis franchement",
};

const AGE_STYLE: Record<AgeBand, string> = {
  "25-35": "tu parles d'apps, de tel, de groupes WhatsApp, ton très informel",
  "35-50": "tu parles chantier, planning, famille, ton posé",
  "50-65": "tu parles papier, agenda, tel qui sonne, tu tapes un peu plus lentement",
};

const REGISTER_STYLE: Record<Register, string> = {
  soutenu: "phrases complètes et ponctuation correcte, mais vocabulaire simple, jamais littéraire",
  courant: "langue de tous les jours, phrases simples et courtes",
  familier: "langage parlé, abréviations (tel, rdv, bcp, pcq), souvent pas de majuscule en début de phrase",
};

const VERBOSITY_TARGET: Record<Verbosity, string> = {
  court: "1 à 3 phrases",
  moyen: "4 à 6 phrases",
  long: "2 paragraphes courts maximum",
};

/**
 * Formules « trop parfaites » qui trahissent un texte de modèle.
 * Elles sont bannies du prompt et vérifiées après génération.
 */
export const BANNED_PHRASES = [
  "cher ami",
  "chers amis",
  "hantise",
  "je comprends parfaitement",
  "je comprends tout à fait",
  "en effet",
  "il est vrai que",
  "force est de constater",
  "je me permets",
  "n'hésitez pas",
  "n'hésite pas à",
  "à cet égard",
  "par ailleurs",
  "en définitive",
  "précieux",
  "gymnastique",
  "contre-productif",
  "sérénité",
  "serein face",
  "chronophage",
  "fluidité",
  "au demeurant",
  "cela étant dit",
  "merci pour ce sujet",
  "sujet fort intéressant",
  "vision d'ensemble",
  "aide précieuse",
  "je vous rejoins",
  "belle journée",
  "bien à vous",
  "cordialement",
  "en espérant",
  "d'une part",
  "en outre",
  "toutefois",
  "néanmoins",
];

/** Vrai si le texte contient une formule trop « écrite » pour un forum. */
export function violatesToneGuard(text: string): string | null {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) return `formule artificielle: ${phrase}`;
  }
  return null;
}

/** Outils et marques que les membres peuvent citer, en bien comme en mal. */
export const MENTIONABLE_TOOLS = [
  "Google Calendar",
  "Google Maps",
  "Waze",
  "Excel",
  "Google Sheets",
  "WhatsApp",
  "Notion",
  "Trello",
  "Henrri",
  "Facture.net",
  "Pennylane",
  "Tiime",
  "Indy",
  "Freebe",
  "Shine",
  "Qonto",
  "Sellsy",
  "Axonaut",
  "Obat",
  "Batappli",
  "Doctolib",
  "Waibi",
  "Onedrive",
  "Dropbox",
  "un carnet papier",
  "l'agenda papier",
  "le bloc-notes du tel",
];

/** Bloc de contraintes de style injecté dans le prompt Mistral. */
export function styleBlock(bot: BotProfileContext): string {
  const tools = [...MENTIONABLE_TOOLS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .join(", ");
  return [
    `Tu es ${bot.pseudo}, membre du forum IKtracker.`,
    bot.bio ? `Ton profil : ${bot.bio}` : "",
    `Personnalité (${bot.disc_color}) : ${DISC_STYLE[bot.disc_color]}.`,
    `Âge ${bot.age_band} : ${AGE_STYLE[bot.age_band]}.`,
    `Niveau de langue ${bot.register} : ${REGISTER_STYLE[bot.register]}.`,
    `Longueur : ${VERBOSITY_TARGET[bot.verbosity]}. Court, c'est mieux que long.`,
    "Tu écris comme sur Facebook ou un groupe WhatsApp de pros : direct, simple, vocabulaire pauvre, phrases courtes.",
    "Vocabulaire limité : utilise des mots de tous les jours. Jamais de mot rare, jamais de tournure littéraire, jamais de synonyme sophistiqué.",
    "Tu peux citer des outils ou des marques que tu utilises, en bien ou en mal, comme le ferait un vrai membre. Exemples possibles : " +
      tools +
      ". Reste honnête : dis ce qui t'agace autant que ce qui te sert. Ne fais pas de pub pour IKtracker, tu n'es pas vendeur.",
    "Interdit : les formules toutes faites du type « cher ami », « je comprends parfaitement », « en effet », « il est vrai que », « n'hésite pas », « aide précieuse », « chronophage », « sérénité ». Aucun mot de liaison littéraire.",
    "Interdits absolus : indemnités kilométriques, barèmes, fiscalité chiffrée, déclaration d'impôts, conseil fiscal.",
    "Pas d'emoji. Pas de gras. Pas de liste à puces. Pas de conclusion qui résume.",
    "Ne te présente pas, ne salue pas, ne signe pas, ne remercie pas pour le sujet, n'annonce pas ce que tu vas dire.",
    "Ne redis pas ce qu'un autre membre a déjà dit dans le fil : apporte un angle différent ou tais-toi.",
  ]
    .filter(Boolean)
    .join("\n");
}


/* -------------------------------------------------------------------------- */
/* Imperfections d'écriture                                                    */
/* -------------------------------------------------------------------------- */

const TYPO_RULES: Array<[RegExp, string]> = [
  [/\bça\b/, "ca"],
  [/\bêtre\b/, "etre"],
  [/\bà\b/, "a"],
  [/\bplutôt\b/, "plutot"],
  [/\bmême\b/, "meme"],
  [/\bdéjà\b/, "deja"],
  [/\bquand même\b/, "quand meme"],
  [/\bc'est\b/, "cest"],
  [/\bpeut-être\b/, "peut etre"],
  [/\bparce que\b/, "parce-que"],
  [/\bça va\b/, "sa va"],
  [/\bles\b/, "le"],
];

/**
 * Injecte quelques imperfections cohérentes avec le taux de fautes du bot.
 * `rand` doit renvoyer un nombre dans [0,1[.
 */
export function applyTypos(text: string, rate: number, rand: () => number = Math.random): string {
  if (rate <= 0) return text;
  let out = text;
  const attempts = Math.max(1, Math.round(text.length / 220));
  for (let i = 0; i < attempts; i++) {
    if (rand() > rate * 8) continue;
    const rule = TYPO_RULES[Math.floor(rand() * TYPO_RULES.length)]!;
    out = out.replace(rule[0], rule[1]);
  }
  if (rate > 0.05 && rand() < 0.4) out = out.replace(/\. ([A-ZÀÉÈ])/, (_m, c: string) => `. ${c.toLowerCase()}`);
  return out;
}

/* -------------------------------------------------------------------------- */
/* Nature de la réponse                                                        */
/* -------------------------------------------------------------------------- */

export type ReplyStance = "constructive" | "sceptique" | "desaccord" | "breve";

/** 75 % de réponses constructives, 25 % de bruit et de débat. */
export function pickStance(rand: number): ReplyStance {
  if (rand < 0.75) return "constructive";
  if (rand < 0.85) return "sceptique";
  if (rand < 0.94) return "desaccord";
  return "breve";
}

export const STANCE_PROMPT: Record<ReplyStance, string> = {
  constructive: "Apporte une réponse utile, tirée de ton expérience concrète.",
  sceptique: "Tu es dubitatif : tu poses une objection ou tu demandes des précisions, sans être agressif.",
  desaccord:
    "Tu n'es pas d'accord et tu le dis, avec ton propre contre-exemple vécu. Tu peux contredire frontalement un autre membre.",
  breve: "Réponse très courte (une phrase), peu informative, du genre réaction rapide entre deux rendez-vous.",
};

/** Vrai si un fil doit rester sans réponse (environ 25 % des discussions). */
export function shouldStayUnanswered(discussionId: string): boolean {
  return hashSeed(discussionId) % 100 < 25;
}
