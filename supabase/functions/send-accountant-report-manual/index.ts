// Send-Accountant-Report-Manual
// On-demand accountant report send triggered from the "Envoyer au comptable"
// button in MesTrajets. Reads an existing report_shares row (created client-side),
// renders it to PDF via Browserless, and sends via Resend with the PDF attached.
//
// Requires a valid user JWT (verify_jwt = true) — the caller must own the share.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  assertAIBudget,
  BudgetExceededError,
  COST_ESTIMATES,
  trackAICost,
} from "../_shared/cost-guard.ts";

const FRONTEND_URL = "https://iktracker.fr";
const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "IKtracker <releves@iktracker.fr>";
const REPLY_TO = "contact@iktracker.fr";
const BROWSERLESS_BASE = "https://production-sfo.browserless.io";

interface Payload {
  shareId: string;
  accountantEmail?: string;
  periodLabel?: string;
  tripsCount?: number;
  totalKm?: number;
  totalIk?: number;
  ownerName?: string;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

function wrapForPdf(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

async function renderPdf(html: string): Promise<Uint8Array> {
  const token = Deno.env.get("BROWSERLESS_API_KEY");
  if (!token) throw new Error("BROWSERLESS_API_KEY missing");
  const res = await fetch(`${BROWSERLESS_BASE}/pdf?token=${token}&timeout=60000`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      options: {
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", right: "14mm", bottom: "18mm", left: "14mm" },
      },
      waitForTimeout: 200,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`browserless pdf failed [${res.status}]: ${txt.slice(0, 400)}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("browserless returned empty pdf");
  return buf;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments: { filename: string; content: string }[];
  idempotencyKey: string;
}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) throw new Error("LOVABLE_API_KEY / RESEND_API_KEY missing");
  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      "Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [params.to],
      reply_to: REPLY_TO,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`resend send failed [${res.status}]: ${txt.slice(0, 500)}`);
  }
  return res.json().catch(() => ({}));
}

function buildEmailHtml(a: {
  ownerName: string;
  periodLabel: string;
  tripsCount: number;
  totalKm: number;
  totalIk: number;
  shareLink: string;
}) {
  return `<!doctype html><html lang="fr"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#1a1a2e;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
    <h1 style="color:#4f46e5;font-size:20px;margin:0 0 12px;">Relevé kilométrique — ${escapeHtml(a.periodLabel)}</h1>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">Vous trouverez en pièce jointe le relevé kilométrique de <strong>${escapeHtml(a.ownerName)}</strong>.</p>
    <ul style="margin:0 0 16px;padding-left:20px;">
      <li>${a.tripsCount} trajet(s) professionnel(s)</li>
      <li>${a.totalKm.toFixed(0)} km parcourus</li>
      <li>${a.totalIk.toFixed(2)} € d'indemnités</li>
    </ul>
    <p style="margin:0 0 16px;">Lien de consultation en ligne (valide 7 jours) :<br><a href="${a.shareLink}" style="color:#4f46e5;">${a.shareLink}</a></p>
    <p style="margin:16px 0 0;color:#64748b;font-size:12px;">Envoyé via IKtracker — ${FRONTEND_URL}</p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    // Plafond budgétaire centralisé — le rendu PDF Browserless est payant.
    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    try {
      await assertAIBudget(adminClient, "send-accountant-report-manual");
    } catch (e) {
      if (e instanceof BudgetExceededError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.shareId) {
      return new Response(JSON.stringify({ error: "shareId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient (payload > user_preferences.accountant_email)
    let recipient = (payload.accountantEmail ?? "").trim();
    if (!recipient) {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("accountant_email")
        .eq("user_id", userId)
        .maybeSingle();
      recipient = (prefs?.accountant_email ?? "").trim();
    }
    if (!recipient) {
      return new Response(JSON.stringify({ error: "no_recipient" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load share (RLS enforces ownership)
    const { data: share, error: shareErr } = await supabase
      .from("report_shares")
      .select("id, user_id, html_content")
      .eq("id", payload.shareId)
      .maybeSingle();
    if (shareErr || !share) {
      return new Response(JSON.stringify({ error: "share_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (share.user_id !== userId) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const periodLabel =
      payload.periodLabel ??
      new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const ownerName = payload.ownerName ?? "Votre client";
    const tripsCount = payload.tripsCount ?? 0;
    const totalKm = payload.totalKm ?? 0;
    const totalIk = payload.totalIk ?? 0;
    const shareLink = `${FRONTEND_URL}/temporaryreport/${share.id}`;

    // Render PDF
    const pdf = await renderPdf(wrapForPdf(`Relevé IK - ${periodLabel}`, share.html_content));
    trackAICost(adminClient, {
      functionName: "send-accountant-report-manual",
      model: "browserless-pdf",
      costEuros: COST_ESTIMATES.browserless_pdf,
      userId,
      metadata: { share_id: payload.shareId },
    });
    const filename = `releve-ik-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`;

    await sendResendEmail({
      to: recipient,
      subject: `Relevé kilométrique — ${periodLabel}`,
      html: buildEmailHtml({ ownerName, periodLabel, tripsCount, totalKm, totalIk, shareLink }),
      attachments: [{ filename, content: toBase64(pdf) }],
      idempotencyKey: `manual-${share.id}-${recipient}`,
    });

    return new Response(JSON.stringify({ ok: true, recipient, shareLink }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-accountant-report-manual error:", msg);
    return new Response(JSON.stringify({ error: "send_failed", details: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
