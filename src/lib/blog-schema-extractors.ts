/**
 * Extracteurs de schémas JSON-LD depuis le contenu markdown/HTML d'un article.
 * Utilisés à la fois côté client (BlogPost.tsx) et SSR (meta-renderer edge function).
 */

const FAQ_HEADING_RE = /^##\s+(?:FAQ|Questions?\s+fr[ée]quentes?|Foire\s+aux\s+questions)\b.*$/im;
const HOWTO_HEADING_RE = /^##\s+(?:Phasage|[ÉE]tapes|D[ée]roul[ée]|Proc[ée]dure|Comment\s+(?:faire|proc[ée]der)|Tutoriel|Mode\s+op[ée]ratoire|Marche\s+[àa]\s+suivre)\b.*$/im;

interface FAQItem { question: string; answer: string }
interface HowToStep { name: string; text: string }

/**
 * Extrait une section délimitée par un H2 (##) jusqu'au prochain H2 ou fin de texte.
 */
function extractSection(content: string, headingRegex: RegExp): string | null {
  const lines = content.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRegex.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join('\n').trim();
}

/**
 * Extrait des paires Q/R depuis une section FAQ.
 * Patterns supportés :
 *   ### Question ?
 *   Réponse...
 *
 *   **Question ?**
 *   Réponse...
 */
export function extractFAQ(content: string): FAQItem[] {
  const section = extractSection(content, FAQ_HEADING_RE);
  if (!section) return [];

  const items: FAQItem[] = [];
  const lines = section.split('\n');
  let currentQ: string | null = null;
  let currentA: string[] = [];

  const flush = () => {
    if (currentQ && currentA.length) {
      const answer = currentA.join(' ').replace(/\s+/g, ' ').trim();
      if (answer) items.push({ question: currentQ, answer });
    }
    currentQ = null;
    currentA = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const h3 = line.match(/^###\s+(.+?)\s*\??$/);
    const bold = line.match(/^\*\*(.+?)\s*\??\*\*\s*$/);
    if (h3 || bold) {
      flush();
      const q = (h3 ? h3[1] : bold![1]).trim();
      currentQ = q.endsWith('?') ? q : `${q} ?`;
    } else if (currentQ && line) {
      currentA.push(line.replace(/^[-*]\s+/, ''));
    } else if (!line && currentA.length) {
      // blank line ends an answer block only if next non-blank starts a new Q
      currentA.push(' ');
    }
  }
  flush();
  return items;
}

/**
 * Extrait les étapes d'un tutoriel depuis une section Phasage/Étapes/Procédure.
 * Patterns supportés :
 *   1. Étape...
 *   - Étape...
 *   ### Étape 1 — Titre
 */
export function extractHowToSteps(content: string): HowToStep[] {
  const section = extractSection(content, HOWTO_HEADING_RE);
  if (!section) return [];

  const steps: HowToStep[] = [];
  const lines = section.split('\n');
  let currentName: string | null = null;
  let currentText: string[] = [];

  const flush = () => {
    if (currentName) {
      const text = currentText.join(' ').replace(/\s+/g, ' ').trim() || currentName;
      steps.push({ name: currentName, text });
    }
    currentName = null;
    currentText = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const h3 = line.match(/^###\s+(.+)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (h3) {
      flush();
      currentName = h3[1].trim();
    } else if (numbered) {
      flush();
      currentName = numbered[2].trim();
    } else if (bullet && !currentName) {
      steps.push({ name: bullet[1].trim(), text: bullet[1].trim() });
    } else if (currentName && line) {
      currentText.push(line);
    }
  }
  flush();
  return steps.filter(s => s.name.length > 0).slice(0, 12);
}

/**
 * Construit un schéma Person enrichi pour l'auteur (E-E-A-T).
 * Si l'auteur correspond à la rédaction IKtracker, résout vers Adrien de Volontat.
 */
export function buildAuthorPerson(authorName: string | null | undefined) {
  const name = (authorName || '').trim();
  const isFounder = !name
    || /adrien\s+de\s+volontat/i.test(name)
    || /r[ée]daction\s+iktracker/i.test(name)
    || /iktracker/i.test(name);

  if (isFounder) {
    return {
      "@type": "Person",
      "name": "Adrien de Volontat",
      "url": "https://www.iktracker.fr/blog/auteur/adrien-de-volontat",
      "jobTitle": "Fondateur d'IKtracker",
      "sameAs": [
        "https://www.iktracker.fr/blog/auteur/adrien-de-volontat",
        "https://www.linkedin.com/in/adriendevolontat/",
      ],
      "worksFor": { "@type": "Organization", "name": "IKtracker", "url": "https://www.iktracker.fr" },
    };
  }

  return {
    "@type": "Person",
    "name": name,
    "worksFor": { "@type": "Organization", "name": "IKtracker", "url": "https://www.iktracker.fr" },
  };
}

/**
 * Schéma FAQPage prêt à injecter.
 */
export function buildFAQSchema(content: string) {
  const items = extractFAQ(content);
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(i => ({
      "@type": "Question",
      "name": i.question,
      "acceptedAnswer": { "@type": "Answer", "text": i.answer },
    })),
  };
}

/**
 * Schéma HowTo prêt à injecter.
 */
export function buildHowToSchema(content: string, title: string) {
  const steps = extractHowToSteps(content);
  if (steps.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": title,
    "step": steps.map((s, idx) => ({
      "@type": "HowToStep",
      "position": idx + 1,
      "name": s.name,
      "text": s.text,
    })),
  };
}
