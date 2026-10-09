import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

// Valide le jeton de réinitialisation (28 h, usage unique) et enregistre le
// nouveau mot de passe via l'API d'administration du service d'authentification.
export const Route = createFileRoute('/api/public/auth/confirm-reset')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env['VITE_SUPABASE_URL']
        const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let token = ''
        let password = ''
        try {
          const body = await request.json()
          token = String(body?.token ?? '').trim()
          password = String(body?.password ?? '')
        } catch {
          return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
        }

        if (!token || password.length < 6) {
          return Response.json(
            { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
            { status: 400 },
          )
        }

        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        })

        const tokenHash = await sha256Hex(token)
        const { data: row, error: lookupError } = await admin
          .from('password_reset_tokens')
          .select('id, user_id, expires_at, used_at')
          .eq('token_hash', tokenHash)
          .maybeSingle()

        if (lookupError) {
          console.error('Reset token lookup failed')
          return Response.json({ error: 'Erreur serveur, réessayez.' }, { status: 500 })
        }

        const invalidResponse = Response.json(
          { error: 'Lien invalide ou expiré. Redemandez un email de réinitialisation.' },
          { status: 400 },
        )
        if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
          return invalidResponse
        }

        const { error: updateError } = await admin.auth.admin.updateUserById(
          row.user_id,
          { password },
        )
        if (updateError) {
          console.error('Password update failed', { status: updateError.status })
          return Response.json(
            { error: 'Impossible de changer le mot de passe, réessayez.' },
            { status: 500 },
          )
        }

        // Usage unique : on consomme le jeton et on retire les autres liens du compte.
        await admin.from('password_reset_tokens').delete().eq('user_id', row.user_id)

        return Response.json({ success: true })
      },
    },
  },
})

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
