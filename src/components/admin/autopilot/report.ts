import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AuditLog, AutopilotEvent } from "./types";

export type ReportPeriod = "1d" | "7d" | "30d";

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  "1d": "Dernières 24h",
  "7d": "Derniers 7 jours",
  "30d": "Derniers 30 jours",
};

export const REPORT_PERIOD_MS: Record<ReportPeriod, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Generate the diagnostic paragraph for the report
export function generateDiagnosticSection(
  recentLogs: AuditLog[],
  recentEvents: AutopilotEvent[],
  deduped: { log: AuditLog; count: number }[],
  periodLabel: string,
): string {
  // --- Volume analysis ---
  const totalCalls = recentLogs.length;
  const uniqueResources = deduped.length;
  const creates = recentLogs.filter((l) => l.action === "create").length;
  const updates = recentLogs.filter((l) => l.action === "update" || l.action === "upsert").length;
  const deletes = recentLogs.filter((l) => l.action === "delete").length;
  const reverted = recentLogs.filter((l) => l.reverted).length;
  const revertRate = totalCalls > 0 ? Math.round((reverted / totalCalls) * 100) : 0;

  // Repeated modifications on same resource (potential churn)
  const highChurn = deduped.filter((d) => d.count >= 3);

  // --- Events / friction analysis ---
  const criticalEvents = recentEvents.filter((e) => e.severity === "critical");
  const warningEvents = recentEvents.filter((e) => e.severity === "warning");
  const unresolvedEvents = recentEvents.filter((e) => !e.resolved);
  const resolvedEvents = recentEvents.filter((e) => e.resolved);

  // Group events by page_key for friction map
  const frictionByPage = new Map<string, AutopilotEvent[]>();
  for (const evt of unresolvedEvents) {
    const key = evt.page_key || "(global)";
    const arr = frictionByPage.get(key) || [];
    arr.push(evt);
    frictionByPage.set(key, arr);
  }

  // --- Resource type breakdown ---
  const byType = new Map<string, number>();
  for (const log of recentLogs) {
    byType.set(log.resource_type, (byType.get(log.resource_type) || 0) + 1);
  }

  // --- SEO/GEO needs assessment ---
  const seoLogs = recentLogs.filter((l) => l.resource_type === "seo" || l.resource_type === "page");
  const blogLogs = recentLogs.filter((l) => l.resource_type === "post");
  const redirectLogs = recentLogs.filter((l) => l.resource_type === "redirect");
  const injectionLogs = recentLogs.filter((l) => l.resource_type === "injection");

  // Build diagnostic HTML
  let html = `<div class="diag"><h2>🔍 Diagnostic</h2>`;

  // 1. Volume conformity
  html += `<div class="diag-section"><h3>📊 Conformité du volume d'activité</h3>`;
  if (totalCalls === 0) {
    html += `<p>Aucune activité Crawlers détectée sur la période <strong>${periodLabel}</strong>. Vérifier que l'intégration API est opérationnelle.</p>`;
  } else {
    html += `<p>${totalCalls} appel(s) API sur ${uniqueResources} ressource(s) unique(s). `;
    html += `Répartition : ${creates} création(s), ${updates} modification(s), ${deletes} suppression(s).`;
    if (reverted > 0)
      html += ` <span class="diag-warn">${reverted} action(s) annulée(s) (${revertRate}%)</span>.`;
    html += `</p>`;
    // Type breakdown
    const typeEntries = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
    html += `<ul>${typeEntries.map(([type, count]) => `<li><strong>${type}</strong> : ${count} appel(s)</li>`).join("")}</ul>`;
  }
  html += `</div>`;

  // 2. Friction / failures
  html += `<div class="diag-section"><h3>⚠️ Points de friction & échecs</h3>`;
  if (
    criticalEvents.length === 0 &&
    warningEvents.length === 0 &&
    highChurn.length === 0 &&
    reverted === 0
  ) {
    html += `<p class="diag-ok">✅ Aucun incident, aucune friction détectée. Toutes les actions se sont déroulées normalement.</p>`;
  } else {
    const issues: string[] = [];
    if (criticalEvents.length > 0)
      issues.push(
        `<span class="diag-crit">${criticalEvents.length} événement(s) critique(s)</span> nécessitant une attention immédiate`,
      );
    if (warningEvents.length > 0)
      issues.push(
        `<span class="diag-warn">${warningEvents.length} avertissement(s)</span> détecté(s)`,
      );
    if (reverted > 0)
      issues.push(
        `${reverted} action(s) annulée(s) — indiquant des modifications incorrectes ou non souhaitées`,
      );
    if (highChurn.length > 0)
      issues.push(
        `${highChurn.length} ressource(s) modifiée(s) ≥3 fois (churn) : ${highChurn.map((d) => '"' + ((d.log.new_data as any)?.title || (d.log.new_data as any)?.slug || d.log.resource_id) + '" (×' + d.count + ")").join(", ")}`,
      );
    html += `<ul>${issues.map((i) => `<li>${i}</li>`).join("")}</ul>`;

    // Friction map by page
    if (frictionByPage.size > 0) {
      html += `<p style="margin-top:8px;font-weight:600;font-size:12px;">Pages avec événements non résolus :</p><ul>`;
      for (const [page, evts] of frictionByPage) {
        const crits = evts.filter((e) => e.severity === "critical").length;
        const warns = evts.filter((e) => e.severity === "warning").length;
        html += `<li><strong>${page}</strong> : ${evts.length} événement(s)`;
        if (crits > 0) html += ` dont <span class="diag-crit">${crits} critique(s)</span>`;
        if (warns > 0)
          html += `${crits > 0 ? "," : " dont"} <span class="diag-warn">${warns} warning(s)</span>`;
        html += `</li>`;
      }
      html += `</ul>`;
    }
  }
  html += `</div>`;

  // 3. SEO / GEO needs
  html += `<div class="diag-section"><h3>🌐 Besoins SEO & GEO</h3>`;
  const seoInsights: string[] = [];

  if (seoLogs.length > 0) {
    seoInsights.push(
      `${seoLogs.length} modification(s) SEO/pages — les métadonnées et le contenu statique sont activement optimisés`,
    );
  } else {
    seoInsights.push(
      `Aucune modification SEO sur la période — vérifier si les balises meta, schema.org et les contenus statiques sont à jour`,
    );
  }

  if (blogLogs.length > 0) {
    seoInsights.push(
      `${blogLogs.length} action(s) sur les articles de blog — le contenu éditorial est en mouvement`,
    );
  } else {
    seoInsights.push(
      `Aucun article de blog créé ou modifié — le contenu frais est essentiel pour le référencement organique et la GEO`,
    );
  }

  if (redirectLogs.length > 0) {
    seoInsights.push(`${redirectLogs.length} redirection(s) gérée(s) — bon suivi des URL cassées`);
  }

  if (injectionLogs.length > 0) {
    seoInsights.push(
      `${injectionLogs.length} injection(s) de code modifiée(s) — scripts de tracking ou partenaires mis à jour`,
    );
  }

  // Static GEO recommendations
  seoInsights.push(
    `<strong>Rappel GEO</strong> : les données critiques (barèmes IK, tableaux) doivent être rendues en HTML statique via le meta-renderer pour être indexables par les agents IA (ChatGPT, Perplexity, Claude)`,
  );
  seoInsights.push(
    `<strong>Rappel SEO</strong> : synchroniser la liste des User-Agents entre le Cloudflare Worker et le meta-renderer pour éviter les redirections fallback`,
  );

  html += `<ul>${seoInsights.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  html += `</div>`;

  // Resolution summary
  if (recentEvents.length > 0) {
    html += `<div class="diag-section"><h3>📋 Résumé des événements</h3>`;
    html += `<p>${recentEvents.length} événement(s) total sur la période : ${resolvedEvents.length} résolu(s), ${unresolvedEvents.length} en cours.</p>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// Heuristic: classify a log as deployed via Parménion or direct Crawlers tools
export function classifySource(log: AuditLog): "parmenion" | "crawlers_direct" {
  // Parménion handles pages, SEO, injections, config, media, redirects
  const parmenionTypes = [
    "page",
    "seo",
    "seo_config",
    "injection",
    "config",
    "site_config",
    "redirect",
    "media",
  ];
  if (parmenionTypes.includes(log.resource_type)) return "parmenion";
  // Everything else (posts) = direct Crawlers content tools
  return "crawlers_direct";
}

// Generate report HTML for a configurable period
export function generateReportHTML(
  logs: AuditLog[],
  events: AutopilotEvent[],
  period: ReportPeriod = "1d",
): string {
  const now = new Date();
  const periodStart = new Date(now.getTime() - REPORT_PERIOD_MS[period]);
  const periodLabel = REPORT_PERIOD_LABELS[period];
  const recentLogs = logs
    .filter((l) => new Date(l.created_at) >= periodStart)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentEvents = events.filter((e) => new Date(e.created_at) >= periodStart);

  const actionLabels: Record<string, string> = {
    create: "Création",
    update: "Modification",
    delete: "Suppression",
    upsert: "Création / Mise à jour",
  };

  const resourceLabels: Record<string, string> = {
    post: "Article de blog",
    page: "Page statique",
    seo: "Configuration SEO",
    injection: "Injection de code",
    config: "Configuration site",
    media: "Média",
    redirect: "Redirection",
  };

  function getDescription(log: AuditLog): string {
    const action = actionLabels[log.action] || log.action;
    const resource = resourceLabels[log.resource_type] || log.resource_type;
    const data = log.new_data || log.previous_data || {};
    const title =
      (data as any).title ||
      (data as any).meta_title ||
      (data as any).slug ||
      (data as any).page_key ||
      log.resource_id;
    return `${action} de ${resource.toLowerCase()} : "${title}"`;
  }

  function getUrl(log: AuditLog): string {
    const data = log.new_data || log.previous_data || {};
    const slug = (data as any).slug || (data as any).page_key || "";
    if (log.resource_type === "post" && slug) return `https://iktracker.fr/blog/${slug}`;
    if (log.resource_type === "page" && slug) return `https://iktracker.fr/${slug}`;
    if (log.resource_type === "seo") return `https://iktracker.fr/${slug || ""}`;
    if (log.resource_type === "redirect") return (data as any).source_path || "-";
    return "-";
  }

  // Deduplicate: group by resource_type + resource_id, keep most recent, count occurrences
  const groupKey = (l: AuditLog) => `${l.resource_type}::${l.resource_id}`;

  function buildDedupedRows(logSet: AuditLog[]): { log: AuditLog; count: number }[] {
    const grouped = new Map<string, { log: AuditLog; count: number }>();
    for (const log of logSet) {
      const key = groupKey(log);
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { log, count: 1 });
      } else {
        existing.count++;
      }
    }
    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.log.created_at).getTime() - new Date(a.log.created_at).getTime(),
    );
  }

  // Split by source
  const parmenionLogs = recentLogs.filter((l) => classifySource(l) === "parmenion");
  const directLogs = recentLogs.filter((l) => classifySource(l) === "crawlers_direct");
  const parmenionDeduped = buildDedupedRows(parmenionLogs);
  const directDeduped = buildDedupedRows(directLogs);
  const allDeduped = buildDedupedRows(recentLogs);

  const dateRange = `${format(periodStart, "dd/MM/yyyy HH:mm", { locale: fr })} — ${format(now, "dd/MM/yyyy HH:mm", { locale: fr })}`;

  function buildTableRows(deduped: { log: AuditLog; count: number }[]): string {
    return deduped
      .map(
        ({ log, count }) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;font-size:13px;">
          ${format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${log.action === "create" ? "#d1fae5" : log.action === "delete" ? "#fee2e2" : "#dbeafe"};color:${log.action === "create" ? "#065f46" : log.action === "delete" ? "#991b1b" : "#1e40af"}">
            ${(actionLabels[log.action] || log.action).toUpperCase()}
          </span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">
          ${getDescription(log)}${count > 1 ? ` <span style="color:#6b7280;font-size:11px;">(×${count})</span>` : ""}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;word-break:break-all;">${getUrl(log)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">
          ${log.reverted ? "✅ Annulé" : "—"}
        </td>
      </tr>
    `,
      )
      .join("");
  }

  function buildTable(deduped: { log: AuditLog; count: number }[], emptyMsg: string): string {
    if (deduped.length === 0) return `<div class="empty">${emptyMsg}</div>`;
    return `<table>
      <thead><tr>
        <th>Date & Heure</th><th>Action</th><th>Description</th><th>URL</th><th>Statut</th>
      </tr></thead>
      <tbody>${buildTableRows(deduped)}</tbody>
    </table>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport Autopilot ${periodLabel} — IKtracker</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2.section-title { font-size: 17px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
  .source-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-parmenion { background: #dbeafe; color: #1e40af; }
  .badge-direct { background: #fce7f3; color: #9d174d; }
  .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  .stats { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 20px; }
  .stat-box .value { font-size: 24px; font-weight: 700; }
  .stat-box .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 2px solid #d1d5db; }
  tr:hover td { background: #f9fafb; }
  .diag { margin-top: 32px; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .diag h2 { font-size: 16px; margin: 0 0 16px; color: #1e293b; }
  .diag-section { margin-bottom: 16px; }
  .diag-section h3 { font-size: 13px; font-weight: 600; color: #475569; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .diag-section p, .diag-section li { font-size: 13px; color: #334155; line-height: 1.6; }
  .diag-section ul { padding-left: 18px; margin: 4px 0 0; }
  .diag-ok { color: #16a34a; font-weight: 600; }
  .diag-warn { color: #d97706; font-weight: 600; }
  .diag-crit { color: #dc2626; font-weight: 600; }
  .empty { text-align: center; padding: 40px; color: #9ca3af; font-size: 14px; }
  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 11px; }
  .source-summary { display: flex; gap: 32px; margin: 12px 0 24px; flex-wrap: wrap; }
  .source-card { flex: 1; min-width: 200px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; }
  .source-card h4 { font-size: 12px; color: #6b7280; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .source-card .big { font-size: 28px; font-weight: 700; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>📋 Rapport Autopilot — ${periodLabel}</h1>
  <div class="subtitle">Période : ${dateRange} · Généré le ${format(now, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</div>
  
  <div class="stats">
    <div class="stat-box"><div class="value">${allDeduped.length}</div><div class="label">Ressources modifiées</div></div>
    <div class="stat-box"><div class="value">${recentLogs.length}</div><div class="label">Appels API totaux</div></div>
    <div class="stat-box"><div class="value">${allDeduped.filter((d) => d.log.action === "create").length}</div><div class="label">Créations</div></div>
    <div class="stat-box"><div class="value">${allDeduped.filter((d) => d.log.action === "update" || d.log.action === "upsert").length}</div><div class="label">Modifications</div></div>
    <div class="stat-box"><div class="value">${allDeduped.filter((d) => d.log.action === "delete").length}</div><div class="label">Suppressions</div></div>
  </div>

  <!-- Source split summary -->
  <div class="source-summary">
    <div class="source-card">
      <h4><span class="source-badge badge-parmenion">Parménion</span> Orchestrateur</h4>
      <div class="big">${parmenionLogs.length}</div>
      <div style="font-size:12px;color:#6b7280;">${parmenionDeduped.length} ressource(s) · Pages, SEO, injections, config</div>
    </div>
    <div class="source-card">
      <h4><span class="source-badge badge-direct">Outils Crawlers</span> Direct</h4>
      <div class="big">${directLogs.length}</div>
      <div style="font-size:12px;color:#6b7280;">${directDeduped.length} ressource(s) · Articles, contenu éditorial</div>
    </div>
  </div>

  <!-- Parménion section -->
  <h2 class="section-title"><span class="source-badge badge-parmenion">Parménion</span> Actions de l'orchestrateur</h2>
  ${buildTable(parmenionDeduped, "Aucune action Parménion sur cette période.")}

  <!-- Crawlers Direct section -->
  <h2 class="section-title"><span class="source-badge badge-direct">Outils Crawlers</span> Actions des outils directs</h2>
  ${buildTable(directDeduped, "Aucune action directe Crawlers sur cette période.")}

  ${generateDiagnosticSection(recentLogs, recentEvents, allDeduped, periodLabel)}

  <div class="footer">IKtracker · Rapport généré automatiquement · iktracker.fr</div>
</body>
</html>`;
}

