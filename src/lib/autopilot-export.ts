/**
 * CSV export helpers for the Autopilot admin dashboard.
 * Pure functions — no React, no Supabase. Trivially testable.
 */

interface AuditLogLike {
  id: string;
  created_at: string;
  action: string;
  resource_type: string;
  resource_id: string;
  api_key_name: string | null;
  reverted: boolean;
  reverted_at: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

interface AutopilotEventLike {
  id: string;
  audit_log_id: string | null;
  created_at: string;
  event_type: string;
  severity: string;
  page_key: string | null;
  message: string;
  resolved: boolean;
  resolved_at: string | null;
}

/** Escape a single CSV field per RFC 4180 (comma, quote, newline → quoted + doubled quotes). */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from headers + rows. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const bodyLines = rows.map((r) => r.map(escapeCsvField).join(","));
  // Prepend BOM so Excel detects UTF-8 properly.
  return "\uFEFF" + [headerLine, ...bodyLines].join("\r\n");
}

/** Build CSV rows for audit logs. */
export function auditLogsToCsv(logs: AuditLogLike[]): string {
  const headers = [
    "date",
    "action",
    "resource_type",
    "resource_id",
    "api_key",
    "reverted",
    "reverted_at",
  ];
  const rows = logs.map((l) => [
    l.created_at,
    l.action,
    l.resource_type,
    l.resource_id,
    l.api_key_name ?? "",
    l.reverted ? "yes" : "no",
    l.reverted_at ?? "",
  ]);
  return buildCsv(headers, rows);
}

/** Build CSV rows for autopilot events. */
export function eventsToCsv(events: AutopilotEventLike[]): string {
  const headers = [
    "date",
    "severity",
    "event_type",
    "page_key",
    "message",
    "resolved",
    "resolved_at",
    "audit_log_id",
  ];
  const rows = events.map((e) => [
    e.created_at,
    e.severity,
    e.event_type,
    e.page_key ?? "",
    e.message,
    e.resolved ? "yes" : "no",
    e.resolved_at ?? "",
    e.audit_log_id ?? "",
  ]);
  return buildCsv(headers, rows);
}

/** Trigger a browser download of a string as a CSV file. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Allow the download to start before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
