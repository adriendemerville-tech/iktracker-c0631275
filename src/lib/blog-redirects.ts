/**
 * Redirections 301 des slugs de blog consolidés.
 *
 * Ce fichier n'est PLUS une copie : il ré-exporte la source de vérité unique
 * `supabase/functions/_shared/blog-redirects.ts` (également consommée par
 * l'Edge Function meta-renderer). Le Worker Cloudflare est un miroir généré
 * par `scripts/sync-blog-redirects.cjs` et vérifié par
 * `scripts/validate-blog-redirects-sync.cjs`.
 */
export { BLOG_SLUG_REDIRECTS } from "../../supabase/functions/_shared/blog-redirects";
