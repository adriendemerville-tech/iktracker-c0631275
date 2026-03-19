import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Car, Lock, Loader2, Eye, EyeOff, CheckCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import { PersonaPicker, PERSONA_OPTIONS, type PersonaValue } from '@/components/PersonaPicker';

// Deployed domain - OAuth redirects here
const DEPLOYED_DOMAIN = 'iktracker.lovable.app';

const Auth = () => {
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [showOAuthSuccess, setShowOAuthSuccess] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOnDeployedDomain = window.location.hostname === DEPLOYED_DOMAIN;

  // Check if user has persona set
  const checkPersona = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('persona')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) return true; // Don't block on error
      return !!(data as any)?.persona;
    } catch {
      return true; // Don't block on error
    }
  };

  const handlePersonaSelected = async (persona: PersonaValue) => {
    if (!pendingUserId) return;

    const personaOption = PERSONA_OPTIONS.find(p => p.value === persona);
    
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: pendingUserId,
          persona: persona,
        } as any, { onConflict: 'user_id' });
      
      // Sync profession to localStorage
      if (personaOption) {
        const stored = localStorage.getItem('ik-tracker-preferences');
        const prefs = stored ? JSON.parse(stored) : {};
        prefs.profession = personaOption.profession;
        localStorage.setItem('ik-tracker-preferences', JSON.stringify(prefs));
      }
    } catch (e) {
      console.warn('Failed to save persona:', e);
    }

    setShowPersonaPicker(false);
    navigate('/app', { replace: true });
  };

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
          // Check persona before redirecting
          const hasPersona = await checkPersona(session.user.id);
          if (!hasPersona) {
            setPendingUserId(session.user.id);
            setShowPersonaPicker(true);
            setShowLoginForm(false);
          } else {
            navigate('/app', { replace: true });
          }
        }
      } else {
        // No session - show login form
        setShowLoginForm(true);
        setCheckingAuth(false);
      }
    };
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (isOnDeployedDomain) {
          setShowOAuthSuccess(true);
          setCheckingAuth(false);
        } else {
          // Check persona for existing users
          const hasPersona = await checkPersona(session.user.id);
          if (!hasPersona) {
            setPendingUserId(session.user.id);
            setShowPersonaPicker(true);
            setShowLoginForm(false);
          } else {
            toast({ title: 'Connexion réussie', description: 'Bienvenue !' });
            navigate('/app', { replace: true });
          }
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

  // Show persona picker
  if (showPersonaPicker) {
    return (
      <>
        <Helmet>
          <title>Votre profil | IKtracker</title>
          <meta name="description" content="Complétez votre profil IKtracker." />
        </Helmet>
        <PersonaPicker onSelect={handlePersonaSelected} />
      </>
    );
  }

  // Show OAuth success screen on deployed domain
  if (showOAuthSuccess) {
    return (
      <>
        <Helmet>
          <title>Connexion | IKtracker</title>
          <meta name="description" content="Connectez-vous à IKtracker pour gérer vos trajets professionnels et calculer automatiquement vos indemnités kilométriques." />
          <link rel="canonical" href="https://iktracker.fr/auth" />
        </Helmet>
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
      </>
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

  // Login form - Premium SaaS design
  if (showLoginForm) {
    return (
      <>
        <Helmet>
          <title>Connexion | IKtracker</title>
          <meta name="description" content="Connectez-vous à IKtracker pour gérer vos trajets professionnels et calculer automatiquement vos indemnités kilométriques." />
          <link rel="canonical" href="https://iktracker.fr/auth" />
        </Helmet>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 cursor-default relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
        
        {/* Decorative grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Back to home link */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm z-20"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        
        {/* Main Card - Landscape format */}
        <div className="relative z-10 w-full max-w-4xl animate-fade-in">
          <div className="bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-800/50 overflow-hidden animate-scale-in">
            <div className="grid md:grid-cols-2">
              
              {/* Left Panel - Branding */}
              <div className="hidden md:flex flex-col justify-between p-10 lg:p-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-r border-slate-800/50">
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <img 
                      src="/logo-iktracker-250.webp" 
                      alt="IKtracker" 
                      width={40}
                      height={40}
                      className="w-10 h-10"
                      loading="eager"
                      fetchPriority="high"
                    />
                    <span className="text-xl font-semibold text-white">IKtracker</span>
                  </div>
                  
                  <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
                    Automatisez gratuitement*<br />vos <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">indemnités kilométriques</span>
                  </h2>
                  
                  <p className="text-slate-400 text-base leading-relaxed mb-8">
                    Connectez-vous pour suivre vos trajets professionnels.
                  </p>
                  
                  {/* Features */}
                  <div className="space-y-4">
                  {[
                      'Calcul selon le barème fiscal',
                      'Export PDF en un clic',
                      'Synchronisation avec votre calendrier',
                      'Tournée automatisée sur smartphone, via GPS',
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        </div>
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-auto pt-8 border-t border-slate-800/50 space-y-4">
                  <p className="text-xs text-slate-500">
                    *Créé par un indépendant, mis à la disposition de la communauté
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {[1,2,3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-300">
                          {['A', 'M', 'S'][i-1]}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500">
                      Rejoint par <span className="text-slate-300">+500 professionnels</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Right Panel - Auth Form */}
              <div className="p-8 md:p-10 lg:p-12">
                {/* Mobile Logo */}
                <div className="flex items-center gap-3 mb-8 md:hidden">
                  <img 
                    src="/logo-iktracker-250.webp" 
                    alt="IKtracker" 
                    width={40}
                    height={40}
                    className="w-10 h-10"
                    loading="eager"
                    fetchPriority="high"
                  />
                  <span className="text-xl font-semibold text-white">IKtracker</span>
                </div>
                
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">Bienvenue</h1>
                  <p className="text-slate-400">
                    Connectez-vous pour continuer
                  </p>
                </div>
                
                <AuthForm multilineCta />
                
                <p className="mt-8 text-center text-slate-500 text-sm">
                  100% gratuit • Aucune carte requise
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </>
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
