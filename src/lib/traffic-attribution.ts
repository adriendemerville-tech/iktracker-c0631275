/**
 * Attribution de trafic — fiabilisation de la détection des sources IA.
 *
 * Objectif : GA4 ne reconnaît qu'une liste restreinte de referrers "AI Assistant".
 * Beaucoup de sessions issues des assistants IA arrivent sans referrer (app native
 * ChatGPT, copier-coller, ouverture hors navigateur) et tombent dans "Direct".
 *
 * Ce module :
 *  1. capture la source au PREMIER hit de la session (referrer + UTM + mode de lancement) ;
 *  2. classe la session (ai / pwa / search / referral / direct) ;
 *  3. persiste le résultat pour toute la durée de la session ;
 *  4. expose des paramètres exploitables comme dimensions personnalisées GA4
 *     et comme override de campagne (campaign_source / campaign_medium).
 */

import { isBrowser, safeSessionStorage } from '@/lib/ssr-utils';

export type TrafficChannel = 'ai' | 'pwa' | 'search' | 'social' | 'referral' | 'direct';

export interface TrafficAttribution {
  channel: TrafficChannel;
  /** Nom normalisé du vendeur IA (chatgpt, perplexity, gemini...) ou 'none' */
  aiVendor: string;
  /** Valeur à envoyer dans campaign_source */
  source: string;
  /** Valeur à envoyer dans campaign_medium */
  medium: string;
  campaign: string | null;
  /** browser | standalone (PWA installée) | twa */
  launchMode: string;
  /** Referrer brut observé au premier hit (diagnostic) */
  rawReferrer: string;
  /** Page d'entrée */
  landingPage: string;
}

const STORAGE_KEY = 'ik_attribution_v1';

/**
 * Domaines des assistants IA. GA4 n'en reconnaît qu'une partie dans son
 * canal "AI Assistant" — on couvre ici l'ensemble du marché francophone.
 */
const AI_REFERRER_MAP: Array<[RegExp, string]> = [
  [/(^|\.)chatgpt\.com$/i, 'chatgpt'],
  [/(^|\.)chat\.openai\.com$/i, 'chatgpt'],
  [/(^|\.)openai\.com$/i, 'chatgpt'],
  [/(^|\.)oai\.(azure|st)\b/i, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/i, 'perplexity'],
  [/(^|\.)pplx\.ai$/i, 'perplexity'],
  [/(^|\.)gemini\.google\.com$/i, 'gemini'],
  [/(^|\.)bard\.google\.com$/i, 'gemini'],
  [/(^|\.)aistudio\.google\.com$/i, 'gemini'],
  [/(^|\.)copilot\.microsoft\.com$/i, 'copilot'],
  [/(^|\.)bing\.com$/i, 'bing-or-copilot'],
  [/(^|\.)claude\.ai$/i, 'claude'],
  [/(^|\.)anthropic\.com$/i, 'claude'],
  [/(^|\.)chat\.mistral\.ai$/i, 'lechat'],
  [/(^|\.)mistral\.ai$/i, 'lechat'],
  [/(^|\.)grok\.com$/i, 'grok'],
  [/(^|\.)x\.ai$/i, 'grok'],
  [/(^|\.)deepseek\.com$/i, 'deepseek'],
  [/(^|\.)you\.com$/i, 'you'],
  [/(^|\.)phind\.com$/i, 'phind'],
  [/(^|\.)poe\.com$/i, 'poe'],
  [/(^|\.)kagi\.com$/i, 'kagi'],
  [/(^|\.)duckduckgo\.com$/i, 'duckduckgo-ai'],
  [/(^|\.)meta\.ai$/i, 'meta-ai'],
  [/(^|\.)huggingface\.co$/i, 'huggingface'],
];

const SEARCH_REFERRERS = /(^|\.)(google\.[a-z.]+|qwant\.com|ecosia\.org|yahoo\.com|yandex\.[a-z]+|baidu\.com|brave\.com)$/i;
const SOCIAL_REFERRERS = /(^|\.)(linkedin\.com|lnkd\.in|facebook\.com|instagram\.com|t\.co|x\.com|twitter\.com|reddit\.com|youtube\.com|whatsapp\.com|tiktok\.com)$/i;

/** Valeurs d'utm_source considérées comme IA (liens que l'on balise nous-mêmes). */
const AI_UTM_SOURCES = /(chatgpt|openai|perplexity|gemini|copilot|claude|lechat|mistral|grok|deepseek|llm|ai[-_]?assistant|geo)/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function matchAiVendor(host: string): string | null {
  for (const [re, vendor] of AI_REFERRER_MAP) {
    if (re.test(host)) return vendor;
  }
  return null;
}

function detectLaunchMode(): string {
  if (!isBrowser()) return 'ssr';
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (document.referrer.startsWith('android-app://')) return 'twa';
  if (nav.standalone === true) return 'standalone';
  if (window.matchMedia?.('(display-mode: standalone)').matches) return 'standalone';
  if (window.matchMedia?.('(display-mode: minimal-ui)').matches) return 'standalone';
  if (window.matchMedia?.('(display-mode: fullscreen)').matches) return 'standalone';
  return 'browser';
}

function computeAttribution(): TrafficAttribution {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');
  const rawReferrer = document.referrer || '';
  const referrerHost = hostOf(rawReferrer);
  const launchMode = detectLaunchMode();
  const landingPage = window.location.pathname;

  // 1. Balisage explicite : un lien que l'on a taggué prime sur tout le reste.
  if (utmSource) {
    const isAi = AI_UTM_SOURCES.test(utmSource) || utmMedium === 'ai';
    return {
      channel: isAi ? 'ai' : utmSource === 'pwa' ? 'pwa' : 'referral',
      aiVendor: isAi ? utmSource.toLowerCase() : 'none',
      source: utmSource,
      medium: utmMedium || (isAi ? 'ai_assistant' : 'referral'),
      campaign: utmCampaign,
      launchMode,
      rawReferrer,
      landingPage,
    };
  }

  // 2. Referrer identifiable comme assistant IA.
  const vendor = referrerHost ? matchAiVendor(referrerHost) : null;
  if (vendor) {
    return {
      channel: 'ai',
      aiVendor: vendor,
      source: vendor,
      medium: 'ai_assistant',
      campaign: null,
      launchMode,
      rawReferrer,
      landingPage,
    };
  }

  // 3. Lancement depuis l'icône PWA : ce n'est pas du "Direct" d'acquisition,
  //    c'est de la rétention applicative. On l'isole pour ne plus polluer Direct.
  if (launchMode !== 'browser') {
    return {
      channel: 'pwa',
      aiVendor: 'none',
      source: 'pwa',
      medium: 'app',
      campaign: null,
      launchMode,
      rawReferrer,
      landingPage,
    };
  }

  if (referrerHost && SEARCH_REFERRERS.test(referrerHost)) {
    return {
      channel: 'search',
      aiVendor: 'none',
      source: referrerHost,
      medium: 'organic',
      campaign: null,
      launchMode,
      rawReferrer,
      landingPage,
    };
  }

  if (referrerHost && SOCIAL_REFERRERS.test(referrerHost)) {
    return {
      channel: 'social',
      aiVendor: 'none',
      source: referrerHost,
      medium: 'social',
      campaign: null,
      launchMode,
      rawReferrer,
      landingPage,
    };
  }

  if (referrerHost && !referrerHost.endsWith('iktracker.fr')) {
    return {
      channel: 'referral',
      aiVendor: 'none',
      source: referrerHost,
      medium: 'referral',
      campaign: null,
      launchMode,
      rawReferrer,
      landingPage,
    };
  }

  // 4. Direct résiduel : aucun referrer, aucun tag, navigateur classique.
  //    C'est le seul bucket qui reste réellement ambigu (dont copier-coller IA).
  return {
    channel: 'direct',
    aiVendor: 'none',
    source: '(direct)',
    medium: '(none)',
    campaign: null,
    launchMode,
    rawReferrer,
    landingPage,
  };
}

/**
 * Retourne l'attribution de la session courante, calculée une seule fois
 * au premier hit puis mémorisée (les navigations internes ne l'écrasent pas).
 */
export function getSessionAttribution(): TrafficAttribution | null {
  if (!isBrowser()) return null;

  const cached = safeSessionStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as TrafficAttribution;
    } catch {
      /* valeur corrompue : on recalcule */
    }
  }

  const attribution = computeAttribution();
  try {
    safeSessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    /* stockage indisponible : l'attribution reste valable pour ce hit */
  }
  return attribution;
}

/** Paramètres à joindre à chaque hit GA4 (dimensions personnalisées + campagne). */
export function getGaAttributionParams(): Record<string, string> {
  const a = getSessionAttribution();
  if (!a) return {};
  const params: Record<string, string> = {
    traffic_channel: a.channel,
    ai_vendor: a.aiVendor,
    launch_mode: a.launchMode,
    entry_referrer: a.rawReferrer ? hostOf(a.rawReferrer) || 'unknown' : '(none)',
  };
  // Override de campagne : force GA4 à sortir ces sessions de "Direct".
  if (a.channel !== 'direct' && a.channel !== 'search') {
    params.campaign_source = a.source;
    params.campaign_medium = a.medium;
    if (a.campaign) params.campaign_name = a.campaign;
  }
  return params;
}
