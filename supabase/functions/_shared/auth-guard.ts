// Shared caller authorization guard for report-sending edge functions.
//
// Authorizes a request in one of three ways:
//   1. `x-cron-secret` header matching CRON_SECRET / SYNC_CRON_TOKEN (scheduled runs)
//   2. Bearer JWT whose user id equals the targeted `user_id` (self-service)
//   3. Bearer JWT of a user holding the `admin` role
//
// Returns a structured result so callers can decide what privileged options
// (e.g. `override_email`) they are willing to honour.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type CallerKind = 'cron' | 'admin' | 'self' | 'none'

export interface AuthorizeResult {
  ok: boolean
  kind: CallerKind
  /** Authenticated user id, when the caller presented a JWT. */
  callerId: string | null
  /** True when the caller may use privileged options such as override_email. */
  privileged: boolean
  status: number
  error?: string
}

function isCronRequest(req: Request): boolean {
  const provided = req.headers.get('x-cron-secret')
  if (!provided) return false
  const candidates = [
    Deno.env.get('CRON_SECRET'),
    Deno.env.get('SYNC_CRON_TOKEN'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  ].filter(Boolean) as string[]
  return candidates.some((c) => c === provided)
}

function isServiceRoleBearer(req: Request): boolean {
  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  return token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * @param admin  A service-role Supabase client (used for getUser + has_role).
 * @param targetUserId  The user whose data the request wants to act on, if any.
 */
export async function authorizeReportCaller(
  req: Request,
  admin: SupabaseClient,
  targetUserId: string | null,
): Promise<AuthorizeResult> {
  if (isCronRequest(req) || isServiceRoleBearer(req)) {
    return { ok: true, kind: 'cron', callerId: null, privileged: true, status: 200 }
  }

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, kind: 'none', callerId: null, privileged: false, status: 401, error: 'Unauthorized' }
  }

  const token = authHeader.slice(7)
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    return { ok: false, kind: 'none', callerId: null, privileged: false, status: 401, error: 'Unauthorized' }
  }

  const callerId = data.user.id

  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: callerId, _role: 'admin' })
  if (isAdmin === true) {
    return { ok: true, kind: 'admin', callerId, privileged: true, status: 200 }
  }

  // Non-admin users may only act on themselves, and must say which user.
  if (!targetUserId || targetUserId !== callerId) {
    return { ok: false, kind: 'none', callerId, privileged: false, status: 403, error: 'Forbidden' }
  }

  return { ok: true, kind: 'self', callerId, privileged: false, status: 200 }
}

/** Service-role client helper shared by report functions. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}
