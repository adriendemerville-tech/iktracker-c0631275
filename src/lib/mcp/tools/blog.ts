import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Accès blog via MCP : RLS blog_posts => écriture réservée au rôle admin.
function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const unauth = { content: [{ type: "text" as const, text: "Non authentifié" }], isError: true };
const err = (m: string) => ({ content: [{ type: "text" as const, text: m }], isError: true });
const LIST_COLS =
  "id, slug, title, subtitle, meta_description, status, is_listed, seo_indexable, featured_image_url, author_name, published_at, updated_at";
const status = z.enum(["draft", "published", "archived"]);

export const listBlogPostsTool = defineTool({
  name: "list_blog_posts",
  title: "Lister les articles du blog",
  description: "Liste les articles du blog IKtracker (filtre statut/recherche titre). Brouillons visibles pour les admins.",
  inputSchema: {
    status: status.optional().describe("Filtrer par statut."),
    search: z.string().max(200).optional().describe("Recherche dans le titre."),
    limit: z.number().int().min(1).max(200).optional().describe("Défaut 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status: s, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth;
    let q = sb(ctx).from("blog_posts").select(LIST_COLS).is("deleted_at", null)
      .order("updated_at", { ascending: false }).limit(limit ?? 50);
    if (s) q = q.eq("status", s);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data, error } = await q;
    if (error) return err(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { posts: data ?? [] } };
  },
});

export const getBlogPostTool = defineTool({
  name: "get_blog_post",
  title: "Lire un article",
  description: "Retourne un article complet (contenu Markdown inclus) par slug.",
  inputSchema: { slug: z.string().min(1) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth;
    const { data, error } = await sb(ctx).from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    if (error) return err(error.message);
    if (!data) return err("Article introuvable");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { post: data } };
  },
});

const fields = {
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  content: z.string().describe("Contenu Markdown (un seul H1 = le titre ; utiliser ## dans le contenu)."),
  meta_description: z.string().max(170).optional(),
  featured_image_url: z.string().url().optional(),
  author_name: z.string().max(100).optional(),
  is_listed: z.boolean().optional(),
  seo_indexable: z.boolean().optional(),
  status: status.optional().describe("draft par défaut."),
};

export const createBlogPostTool = defineTool({
  name: "create_blog_post",
  title: "Créer un article",
  description: "Crée un article (brouillon par défaut). Réservé aux admins IKtracker.",
  inputSchema: { slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), ...fields },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauth;
    const st = input.status ?? "draft";
    const { data, error } = await sb(ctx).from("blog_posts")
      .insert({ ...input, status: st, published_at: st === "published" ? new Date().toISOString() : null })
      .select(LIST_COLS).single();
    if (error) return err(error.message);
    return { content: [{ type: "text", text: `Article créé : ${data.slug} (${data.status})` }], structuredContent: { post: data } };
  },
});

export const updateBlogPostTool = defineTool({
  name: "update_blog_post",
  title: "Modifier / publier un article",
  description: "Met à jour un article par slug (contenu, SEO, statut draft/published/archived). Réservé aux admins.",
  inputSchema: {
    slug: z.string().min(1),
    title: fields.title.optional(),
    subtitle: fields.subtitle,
    content: fields.content.optional(),
    meta_description: fields.meta_description,
    featured_image_url: fields.featured_image_url,
    author_name: fields.author_name,
    is_listed: fields.is_listed,
    seo_indexable: fields.seo_indexable,
    status: fields.status,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth;
    const client = sb(ctx);
    const upd: Record<string, unknown> = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (patch.status === "published") {
      const { data: cur } = await client.from("blog_posts").select("published_at").eq("slug", slug).maybeSingle();
      if (!cur?.published_at) upd.published_at = new Date().toISOString();
    }
    const { data, error } = await client.from("blog_posts").update(upd).eq("slug", slug).select(LIST_COLS).maybeSingle();
    if (error) return err(error.message);
    if (!data) return err("Article introuvable ou droits insuffisants (admin requis)");
    return { content: [{ type: "text", text: `Article mis à jour : ${data.slug} (${data.status})` }], structuredContent: { post: data } };
  },
});
