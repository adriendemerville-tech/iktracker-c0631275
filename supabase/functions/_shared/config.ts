// Shared runtime configuration for IKtracker edge functions.
// Single source of truth for external endpoints and sender identity.

export const FRONTEND_URL = "https://iktracker.fr";
export const BROWSERLESS_BASE = "https://production-sfo.browserless.io";
export const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
export const FROM_EMAIL = "IKtracker <releves@iktracker.fr>";
export const REPLY_TO = "contact@iktracker.fr";

/** Secure share links TTL (days) for report_shares rows. */
export const SHARE_TTL_DAYS = 7;

/** Hard cap on generated PDF size (bytes). Beyond that the report is truncated. */
export const MAX_PDF_BYTES = 8 * 1024 * 1024;

/** Max trip rows rendered in a single statement PDF (annual reports can be huge). */
export const MAX_PDF_TRIP_ROWS = 3000;

/** Page size used when paginating PostgREST reads. */
export const DB_PAGE_SIZE = 1000;
