import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Car, Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

// Deployed domain - OAuth redirects here
const DEPLOYED_DOMAIN = 'iktracker.lovable.app';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showOAuthSuccess, setShowOAuthSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOnDeployedDomain = window.location.hostname === DEPLOYED_DOMAIN;

  // Check if user is already logged in and redirect to home
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If we're on deployed domain and there's a hash (OAuth callback), show success screen
        const hasOAuthCallback = window.location.hash.includes('access_token') || 
                                  window.location.hash.includes('refresh_token');
        if (isOnDeployedDomain && hasOAuthCallback) {
          setShowOAuthSuccess(true);
          setCheckingAuth(false);
        } else {
        navigate('/app', { replace: true });
        }
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();

    // Listen for auth state changes (e.g., after OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // If on deployed domain, show success screen instead of immediate redirect
        if (isOnDeployedDomain) {
          setShowOAuthSuccess(true);
          setCheckingAuth(false);
        } else {
          toast({ title: 'Connexion réussie', description: 'Bienvenue !' });
          navigate('/app', { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast, isOnDeployedDomain]);

  // Check if we're in password reset mode or have OAuth error
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (type === 'recovery') {
      setMode('reset-password');
    }
    
    // Show OAuth errors from URL hash
    if (error) {
      toast({ 
        title: 'Erreur OAuth', 
        description: errorDescription || error, 
        variant: 'destructive' 
      });
      console.error('OAuth error:', error, errorDescription);
      // Clear the hash to prevent re-showing error
      window.location.hash = '';
    }
  }, [toast]);

  const handleOAuthLogin = async () => {
    setOauthLoading('google');
    try {
      // Let the backend use its configured Site URL for the final redirect.
      // This avoids 403 errors caused by non-allowed redirectTo domains (e.g., preview URLs).
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
      } else if (mode === 'reset-password') {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        toast({ 
          title: 'Mot de passe modifié', 
          description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.' 
        });
        // Clear the URL hash
        window.location.hash = '';
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

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Connexion';
      case 'signup': return 'Inscription gratuite';
      case 'forgot-password': return 'Mot de passe oublié';
      case 'reset-password': return 'Nouveau mot de passe';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Connectez-vous pour continuer à utiliser l\'application';
      case 'signup': return 'Créez un compte gratuit pour sauvegarder vos trajets';
      case 'forgot-password': return 'Entrez votre email pour recevoir un lien de réinitialisation';
      case 'reset-password': return 'Choisissez votre nouveau mot de passe';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login': return 'Se connecter';
      case 'signup': return 'S\'inscrire';
      case 'forgot-password': return 'Envoyer le lien';
      case 'reset-password': return 'Modifier le mot de passe';
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show OAuth success screen on deployed domain
  if (showOAuthSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Connexion réussie !</CardTitle>
            <CardDescription>
              Vous êtes maintenant connecté à IK Tracker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate('/app', { replace: true })}
            >
              Continuer sur l'app
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Vous avez été redirigé sur {window.location.hostname}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Car className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* OAuth button - shown for login and signup */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleOAuthLogin}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
                {mode === 'login' ? 'Se connecter avec Google' : 'S\'inscrire avec Google'}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field - shown for login, signup, forgot-password */}
            {mode !== 'reset-password' && (
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password field - shown for login, signup */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset-password' && (
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nouveau mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {getButtonText()}
            </Button>
          </form>

          {/* Forgot password link - shown in login mode, under the form */}
          {mode === 'login' && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* Back button for forgot-password mode */}
          {mode === 'forgot-password' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
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
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === 'login' 
                  ? 'Pas encore de compte ? Inscrivez-vous gratuitement'
                  : 'Déjà un compte ? Connectez-vous'
                }
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
