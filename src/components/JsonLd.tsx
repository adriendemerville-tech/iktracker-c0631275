import * as React from "react";

/**
 * Rend les scripts `application/ld+json` en ligne, dans le HTML SSR, là où les
 * crawlers et agents LLM les voient sans exécuter de JS.
 *
 * Remplace l'ancien wrapper Helmet : title / meta / link / canonical sont
 * désormais gérés exclusivement par le `head()` des routes TanStack.
 * Tout enfant qui n'est pas du JSON-LD est ignoré.
 */
const isJsonLd = (node: React.ReactNode): node is React.ReactElement =>
  React.isValidElement(node) &&
  node.type === "script" &&
  (node.props as { type?: string }).type === "application/ld+json";

function collect(children: React.ReactNode, out: React.ReactElement[]) {
  React.Children.forEach(children, (child) => {
    if (child === null || child === undefined || child === false) return;
    if (React.isValidElement(child) && child.type === React.Fragment) {
      collect((child.props as { children?: React.ReactNode }).children, out);
      return;
    }
    if (isJsonLd(child)) out.push(child);
  });
}

export function JsonLd({ children }: { children?: React.ReactNode }) {
  const scripts: React.ReactElement[] = [];
  collect(children, scripts);

  return (
    <>
      {scripts.map((script, index) => {
        const raw = (script.props as { children?: React.ReactNode }).children;
        const json = Array.isArray(raw) ? raw.join("") : String(raw ?? "");
        return (
          <script
            key={index}
            type="application/ld+json"
            // JSON déjà sérialisé : rendu brut pour éviter l'échappement React
            // des quotes, qui casse les parseurs JSON-LD stricts.
            dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }}
          />
        );
      })}
    </>
  );
}

export default JsonLd;
