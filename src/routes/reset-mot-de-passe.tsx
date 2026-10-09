import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/reset-mot-de-passe')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: 'Nouveau mot de passe | IKtracker' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ResetPasswordPage,
})

export default function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const invalid = !token

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne sont pas identiques.',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/public/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Erreur',
          description: data?.error || 'Impossible de changer le mot de passe.',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Mot de passe modifié',
        description: 'Connectez-vous avec votre nouveau mot de passe.',
      })
      navigate({ to: '/' })
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de changer le mot de passe, réessayez.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[500px] bg-card border border-border rounded-2xl p-8 md:p-10">
        <img
          src="/logo-iktracker-250.webp"
          alt="Logo IKtracker"
          width={56}
          height={56}
          className="mx-auto mb-5 h-14 w-14"
          loading="eager"
          fetchPriority="high"
        />
        <h1 className="text-2xl font-bold text-foreground mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Choisissez un mot de passe d'au moins 6 caractères.
        </p>
        {invalid ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              Lien invalide. Redemandez un email de réinitialisation depuis la
              page de connexion.
            </p>
            <Button type="button" className="w-full" onClick={() => navigate({ to: '/' })}>
              Retour à l'accueil
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-sm text-destructive">
                  Les mots de passe ne sont pas identiques.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password || password !== confirmPassword}>
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
