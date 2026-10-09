import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { render } from '@react-email/render'
import { createClient } from '@supabase/supabase-js'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Lien de réinitialisation maison : valable 28 h (le lien standard est plafonné à 1 h).
const SITE_URL = 'https://iktracker.fr'
const TOKEN_TTL_HOURS = 28
const TEMPLATE_NAME = 'password-reset'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const Route = createFileRoute('/api/public/auth/request-reset')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env['VITE_SUPABASE_URL']
        const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let email = ''
        try {
          const body = await request.json()
          email = String(body?.email ?? '').trim().toLowerCase()
        } catch {
          return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
          return Response.json({ error: 'Adresse email invalide' }, { status: 400 })
        }

        // Client service-role : le routeur est public, pas de session à vérifier.
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        })

        // Réponse identique que le compte existe ou non (pas d'énumération d'emails).
        const { data: userId, error: lookupError } = await admin.rpc(
          'get_auth_user_id_by_email',
          { p_email: email },
        )
        if (lookupError) {
          console.error('User lookup failed', { email_redacted: redactEmail(email) })
          return Response.json({ success: true })
        }

        if (userId) {
          // Anti-abus : max 3 demandes par compte toutes les 10 minutes.
          const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
          const { count } = await admin
            .from('password_reset_tokens')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gt('created_at', since)
          if ((count ?? 0) >= 3) {
            return Response.json({ success: true })
          }

          const rawToken = generateToken()
          const tokenHash = await sha256Hex(rawToken)
          const expiresAt = new Date(
            Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000,
          ).toISOString()

          // Purge des jetons expirés anciens et des jetons précédents du compte.
          await admin
            .from('password_reset_tokens')
            .delete()
            .eq('user_id', userId)
          await admin
            .from('password_reset_tokens')
            .delete()
            .lt('expires_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

          const { error: insertError } = await admin
            .from('password_reset_tokens')
            .insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
          if (insertError) {
            console.error('Failed to store reset token', { email_redacted: redactEmail(email) })
            return Response.json({ error: 'Failed to process request' }, { status: 500 })
          }

          await sendResetEmail(admin, email, {
            resetUrl: `${SITE_URL}/reset-mot-de-passe?token=${rawToken}`,
            validityHours: TOKEN_TTL_HOURS,
          }, tokenHash)
        }

        return Response.json({ success: true })
      },
    },
  },
})

async function sendResetEmail(
  admin: ReturnType<typeof createClient>,
  recipient: string,
  templateData: Record<string, unknown>,
  tokenHash: string,
) {
  const template = TEMPLATES[TEMPLATE_NAME]
  if (!template) {
    console.error('Template not found in registry', { templateName: TEMPLATE_NAME })
    return
  }

  const { data: suppressed } = await admin
    .from('suppressed_emails')
    .select('id')
    .eq('email', recipient.toLowerCase())
    .maybeSingle()
  if (suppressed) return

  // Jeton de désinscription : un seul par adresse (l'envoi en exige un).
  let unsubscribeToken: string | undefined
  const { data: existingToken } = await admin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', recipient.toLowerCase())
    .maybeSingle()
  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    const { error: upsertError } = await admin
      .from('email_unsubscribe_tokens')
      .upsert({ token: unsubscribeToken, email: recipient.toLowerCase() }, { onConflict: 'email' })
    if (upsertError) {
      console.error('Failed to create unsubscribe token', { email_redacted: redactEmail(recipient) })
      return
    }
  } else {
    return
  }

  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const plainText = await render(element, { plainText: true })
  const subject = 'Nouveau mot de passe — IKtracker'
  const messageId = crypto.randomUUID()

  await admin.from('email_send_log').insert({
    message_id: messageId,
    template_name: TEMPLATE_NAME,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqueueError } = await admin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `IKtracker <noreply@iktracker.fr>`,
      sender_domain: 'notify.iktracker.fr',
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: TEMPLATE_NAME,
      idempotency_key: `password-reset-${tokenHash}`,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (enqueueError) {
    console.error('Failed to enqueue email', { email_redacted: redactEmail(recipient) })
  }
}
