import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthFormProps {
  className?: string;
  compact?: boolean;
  multilineCta?: boolean;
  onSuccess?: () => void;
}

export const AuthForm = ({ className, compact = false, multilineCta = false, onSuccess }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleOAuthLogin = async () => {
    setOauthLoading('google');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: 'Connexion réussie', description: 'Bienvenue !' });
        onSuccess?.();
        navigate('/app');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast({ title: 'Inscription réussie', description: 'Vous pouvez maintenant utiliser l\'application.' });
        onSuccess?.();
        navigate('/app');
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({ 
          title: 'Email envoyé', 
          description: 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe.' 
        });
        setMode('login');
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email ou mot de passe incorrect';
      } else if (error.message.includes('User already registered')) {
        message = 'Cet email est déjà utilisé';
      } else if (error.message.includes('Password should be at least')) {
        message = 'Le mot de passe doit contenir au moins 6 caractères';
      } else if (error.message.includes('User not found')) {
        message = 'Aucun compte trouvé avec cet email';
      }
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login': return 'Se connecter';
      case 'signup': return 'Créer mon compte';
      case 'forgot-password': return 'Envoyer le lien';
    }
  };

  return (
    // Fixed min-height to prevent CLS during mode transitions
    <div className={cn("w-full", className)} style={{ minHeight: compact ? 'auto' : '420px', minWidth: '300px' }}>
      <div className={cn(
        "bg-card/80 backdrop-blur-sm border border-border rounded-2xl",
        compact ? "p-5" : "p-6 md:p-8"
      )}>
        {!compact && (
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-foreground mb-1">
              {mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' 
                ? 'Accédez à votre tableau de bord' 
                : mode === 'signup' 
                ? 'Créez votre compte en 2 minutes'
                : 'Recevez un lien de réinitialisation'}
            </p>
          </div>
        )}

        {/* OAuth button */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="space-y-3 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-background/50 focus-visible-ring"
              onClick={handleOAuthLogin}
              disabled={oauthLoading !== null}
              aria-label="Se connecter avec Google"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true" role="img">
                  <title>Logo Google</title>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continuer avec Google
            </Button>

            <div className="relative" role="separator" aria-orientation="horizontal">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" aria-label="Formulaire d'authentification">
          {/* Email field */}
          {mode !== 'forgot-password' || mode === 'forgot-password' ? (
            <div className="relative">
              <label htmlFor="auth-email" className="sr-only">Adresse email</label>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="auth-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-background/50 focus-visible-ring"
                required
                aria-required="true"
                autoComplete="email"
              />
            </div>
          ) : null}

          {/* Password field */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="relative">
              <label htmlFor="auth-password" className="sr-only">Mot de passe</label>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-background/50 focus-visible-ring"
                minLength={6}
                required
                aria-required="true"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible-ring rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          )}

          <Button type="submit" className="w-full focus-visible-ring" variant="gradient" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
            {getButtonText()}
          </Button>
        </form>

        {/* Forgot password link */}
        {mode === 'login' && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setMode('forgot-password')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors focus-visible-ring rounded-sm underline-offset-4 hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {/* Back button for forgot-password mode */}
        {mode === 'forgot-password' && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 focus-visible-ring rounded-sm"
            >
              <ArrowLeft className="w-3 h-3" aria-hidden="true" />
              Retour à la connexion
            </button>
          </div>
        )}

        {/* Toggle login/signup */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-base text-primary hover:text-primary/80 transition-colors font-medium focus-visible-ring rounded-sm underline-offset-4 hover:underline"
            >
              {mode === 'login' 
                ? <><span className="block">Pas encore de compte ?</span><span className="block">Rejoignez la communauté !</span></>
                : 'Déjà un compte ? Connectez-vous'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
