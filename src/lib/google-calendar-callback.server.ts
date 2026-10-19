import { z } from "zod";

const callbackSchema = z.object({
  code: z.string().min(1).max(8192).optional(),
  state: z.string().min(1).max(8192),
  error: z.string().min(1).max(8192).optional(),
}).refine((value) => Boolean(value.code || value.error));

const redirectSchema = z.object({ redirect_url: z.string().url().max(8192) });
const allowedOrigins = ["https://iktracker.fr", "https://www.iktracker.fr", "https://iktracker.lovable.app"];
const privateHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };

// No database access: the existing function authenticates the signed state before exchanging the code.
export async function forwardGoogleCalendarCallback(
  request: Request,
  backendUrl: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const input = callbackSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!input.success) return new Response("Retour Google Agenda invalide ou incomplet.", { status: 400, headers: privateHeaders });
  if (!backendUrl) return new Response("Google Agenda est temporairement indisponible.", { status: 503, headers: privateHeaders });

  try {
    const response = await fetcher(`${backendUrl}/functions/v1/google-calendar-auth?action=exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return new Response("La connexion Google Agenda a échoué. Réessayez depuis votre profil.", { status: 400, headers: privateHeaders });
    const result = redirectSchema.parse(await response.json());
    const target = new URL(result.redirect_url);
    const destination = allowedOrigins.includes(target.origin) && !target.username && !target.password
      ? target.toString() : "https://iktracker.fr/profile";
    return new Response(null, { status: 302, headers: { ...privateHeaders, Location: destination } });
  } catch {
    return new Response("La connexion Google Agenda est indisponible. Réessayez depuis votre profil.", { status: 502, headers: privateHeaders });
  }
}