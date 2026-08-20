// react-helmet-async ships CJS + ESM builds whose export shapes differ between
// the client bundle and the SSR runtime: named imports crash SSR module
// evaluation, and a default import breaks the client build (no default export
// in the ESM build). A namespace import works everywhere — we then resolve the
// components from either the namespace itself or its `.default` interop slot.
// All app code must import Helmet / HelmetProvider from here, never from
// 'react-helmet-async' directly.
import * as React from "react";
import * as pkg from "react-helmet-async";

type HelmetModule = typeof import("react-helmet-async");

const ns = pkg as unknown as HelmetModule & { default?: HelmetModule };
const resolved: HelmetModule = ns.Helmet ? ns : (ns.default as HelmetModule);

const BaseHelmet = resolved.Helmet;
export const HelmetProvider = resolved.HelmetProvider;

type HelmetProps = React.ComponentProps<typeof BaseHelmet>;

const isJsonLd = (node: React.ReactNode): node is React.ReactElement =>
  React.isValidElement(node) &&
  node.type === "script" &&
  (node.props as { type?: string }).type === "application/ld+json";

/** Flattens fragments/arrays so conditional children are inspected too. */
function splitChildren(children: React.ReactNode): {
  jsonLd: React.ReactElement[];
  rest: React.ReactNode[];
} {
  const jsonLd: React.ReactElement[] = [];
  const rest: React.ReactNode[] = [];

  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (child === null || child === undefined || child === false) return;
      if (React.isValidElement(child) && child.type === React.Fragment) {
        walk((child.props as { children?: React.ReactNode }).children);
        return;
      }
      if (isJsonLd(child)) {
        jsonLd.push(child);
        return;
      }
      rest.push(child);
    });
  };

  walk(children);
  return { jsonLd, rest };
}

/**
 * Helmet only mutates <head> after hydration, so JSON-LD passed to it is
 * invisible to crawlers and LLM agents that read the server HTML. This wrapper
 * keeps titles/meta/links on Helmet but renders `application/ld+json` scripts
 * inline, in the document body, where SSR emits them. Schema.org and Google
 * both accept JSON-LD anywhere in the document.
 */
export function Helmet({ children, ...props }: HelmetProps) {
  const { jsonLd, rest } = splitChildren(children);

  return (
    <>
      <BaseHelmet {...props}>{rest}</BaseHelmet>
      {jsonLd.map((script, index) => {
        const raw = (script.props as { children?: React.ReactNode }).children;
        const json = Array.isArray(raw) ? raw.join("") : String(raw ?? "");
        return (
          <script
            key={index}
            type="application/ld+json"
            // Already-serialized JSON: rendering it raw avoids React escaping
            // quotes into entities, which breaks strict JSON-LD parsers.
            dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }}
          />
        );
      })}
    </>
  );
}
