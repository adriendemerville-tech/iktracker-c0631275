import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'Désinscription | IKtracker' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
})

type State = 'validating' | 'confirm' | 'invalid' | 'done' | 'error'

export default function UnsubscribePage() {
  const token = Route.useSearch().token ?? ''
  const [state, setState] = useState<State>(token ? 'validating' : 'invalid')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) setState('confirm')
        else if (res.status === 410) setState('invalid')
        else setState('invalid')
      })
      .catch(() => !cancelled && setState('invalid'))
    return () => {
      cancelled = true
    }
  }, [token])

  const confirm = async () => {
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 md:p-8 text-center">
        <p className="text-lg font-bold text-foreground mb-2">IKtracker</p>
        {state === 'validating' && (
          <p className="text-sm text-muted-foreground">Vérification…</p>
        )}
        {state === 'confirm' && (
          <>
            <p className="text-sm text-foreground mb-4">
              Voulez-vous ne plus recevoir les emails de IKtracker ?
            </p>
            <button
              type="button"
              onClick={confirm}
              className="w-full inline-flex justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Confirmer la désinscription
            </button>
          </>
        )}
        {state === 'invalid' && (
          <p className="text-sm text-muted-foreground">
            Lien invalide ou déjà utilisé.
          </p>
        )}
        {state === 'done' && (
          <>
            <p className="text-sm text-foreground mb-4">
              Vous ne recevrez plus d'emails de IKtracker.
            </p>
            <Link to="/" className="text-sm text-primary underline">
              Retour à l'accueil
            </Link>
          </>
        )}
        {state === 'error' && (
          <p className="text-sm text-destructive">
            Une erreur est survenue, réessayez.
          </p>
        )}
      </div>
    </div>
  )
}
