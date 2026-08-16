#!/usr/bin/env node
/**
 * Génère supabase/functions/linkedin-weekly-post/docs-context.ts à partir de
 * docs/BACKEND.md et docs/FRONTEND.md.
 *
 * Les edge functions ne peuvent pas lire le dépôt à l'exécution : on embarque
 * donc les sections de la doc technique sous forme de constantes TypeScript,
 * découpées par titre (## / ###) pour permettre une sélection par mots-clés.
 *
 * Usage : node scripts/generate-linkedin-docs-context.cjs
 * À relancer après toute mise à jour majeure de docs/BACKEND.md ou FRONTEND.md.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
// Chaque edge function est déployée isolément : on écrit une copie du contexte
// dans chaque fonction qui en a besoin (génération + audit).
const OUTS = [
  path.join(ROOT, "supabase/functions/linkedin-weekly-post/docs-context.ts"),
  path.join(ROOT, "supabase/functions/linkedin-post-audit/docs-context.ts"),
];
const SOURCES = [
  { file: "docs/BACKEND.md", origin: "backend" },
  { file: "docs/FRONTEND.md", origin: "frontend" },
];

const MAX_SECTION_CHARS = 1600;

function splitSections(markdown, origin) {
  const lines = markdown.split("\n");
  const sections = [];
  let current = null;
  let inCode = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) inCode = !inCode;
    const heading = !inCode && /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      if (current) sections.push(current);
      current = { origin, heading: heading[2].trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) sections.push(current);

  return sections
    .map((s) => ({
      origin: s.origin,
      heading: s.heading,
      body: s.body
        .join("\n")
        .replace(/```[\s\S]*?```/g, "") // retire les blocs de code (bruit pour un LLM éditorial)
        .replace(/\|/g, " ") // le pipe est un caractère interdit dans les posts
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, MAX_SECTION_CHARS),
    }))
    .filter((s) => s.body.length > 120);
}

const all = SOURCES.flatMap(({ file, origin }) => {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.warn(`⚠︎ ${file} introuvable, ignoré`);
    return [];
  }
  return splitSections(fs.readFileSync(full, "utf8"), origin);
});

const header = `// AUTO-GÉNÉRÉ par scripts/generate-linkedin-docs-context.cjs — ne pas éditer à la main.
// Source : docs/BACKEND.md + docs/FRONTEND.md (${new Date().toISOString().slice(0, 10)}).
// Relancer le script après toute évolution majeure de la doc technique.

export type DocSection = {
  origin: "backend" | "frontend";
  heading: string;
  body: string;
};

export const DOC_SECTIONS: DocSection[] = ${JSON.stringify(all, null, 2)};
`;

for (const out of OUTS) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, header, "utf8");
  console.log(
    `✓ ${all.length} sections écrites dans ${path.relative(ROOT, out)} (${(header.length / 1024).toFixed(1)} kB)`,
  );
}
