import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Car, Lock, Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';

// Deployed domain - OAuth redirects here
const DEPLOYED_DOMAIN = 'iktracker.lovable.app';

const Auth = () => {
  // SEO meta tags
  useEffect(() => {
    document.title = 'Connexion | IKtracker';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Connectez-vous à IKtracker pour gérer vos trajets professionnels et calculer automatiquement vos indemnités kilométriques. Inscription gratuite.');
    }
    return () => {
      document.title = 'IKtracker - Calcul automatique des indemnités kilométriques';
    };
  }, []);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [showOAuthSuccess, setShowOAuthSuccess] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOnDeployedDomain = window.location.hostname === DEPLOYED_DOMAIN;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check for password reset mode
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      if (type === 'recovery') {
        setIsResetPassword(true);
        setCheckingAuth(false);
        return;
      }
      
      // Show OAuth errors from URL hash
      if (error) {
        toast({ 
          title: 'Erreur OAuth', 
          description: errorDescription || error, 
          variant: 'destructive' 
        });
        window.location.hash = '';
        setShowLoginForm(true);
        setCheckingAuth(false);
        return;
      }

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
        // No session - show login form
        setShowLoginForm(true);
        setCheckingAuth(false);
      }
    };
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast({ 
        title: 'Mot de passe modifié', 
        description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.' 
      });
      window.location.hash = '';
      navigate('/', { replace: true });
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes('Password should be at least')) {
        message = 'Le mot de passe doit contenir au moins 6 caractères';
      }
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center cursor-default">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  // Show OAuth success screen on deployed domain
  if (showOAuthSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4 cursor-default">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Connexion réussie !</CardTitle>
            <CardDescription>
              Vous êtes maintenant connecté à IKtracker
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

  // Password reset form
  if (isResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4 cursor-default">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Car className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
            <CardDescription>Choisissez votre nouveau mot de passe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Modifier le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login form with elegant gradient background
  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex flex-col items-center justify-center p-4 cursor-default relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-slate-500/10 rounded-full blur-3xl" />
        </div>
        
        {/* Back to home link */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
        
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 relative z-10">
          <img 
            src="/logo-iktracker-250.webp" 
            alt="IKtracker" 
            className="w-12 h-12"
          />
          <span className="text-2xl font-bold text-white">IKtracker</span>
        </div>
        
        {/* Login Card */}
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm relative z-10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
            <CardDescription>
              Connectez-vous pour accéder à vos trajets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <AuthForm />
          </CardContent>
        </Card>
        
        {/* Footer text */}
        <p className="mt-6 text-white/50 text-sm text-center relative z-10">
          100% gratuit • Aucune carte bancaire requise
        </p>
      </div>
    );
  }

  // Default: loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center cursor-default">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );
};

export default Auth;
