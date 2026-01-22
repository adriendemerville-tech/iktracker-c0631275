import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import ReCAPTCHA from 'react-google-recaptcha';

const RECAPTCHA_SITE_KEY = '6LeqDVMsAAAAAE_prKZwP9zj8ovr49OFOQnoISsP';

const fireConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  }, 150);

  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#2661D9', '#10b981', '#f59e0b', '#ec4899']
    });
  }, 300);
};

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRecaptchaChange = async (token: string | null) => {
    setRecaptchaToken(token);
    // When invisible reCAPTCHA resolves, proceed with signup
    if (token) {
      await performSignup(token);
    }
  };

  const handleRecaptchaExpired = () => {
    setRecaptchaToken(null);
    setLoading(false);
  };

  const handleRecaptchaError = () => {
    setLoading(false);
    toast({ title: 'Erreur', description: 'Erreur lors de la vérification. Veuillez réessayer.', variant: 'destructive' });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/app', { replace: true });
      }
      setCheckingAuth(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fireConfetti();
        toast({ title: 'Compte créé avec succès ! 🎉', description: 'Bienvenue sur IKtracker !' });
        // Check if this is a new signup (no theme onboarding completed)
        const themeOnboardingComplete = localStorage.getItem('theme-onboarding-complete');
        if (!themeOnboardingComplete) {
          setTimeout(() => navigate('/theme-onboarding', { replace: true }), 800);
        } else {
          setTimeout(() => navigate('/app', { replace: true }), 800);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

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
    
    // If we already have a token, proceed with signup
    if (recaptchaToken) {
      await performSignup(recaptchaToken);
      return;
    }
    
    // Execute invisible reCAPTCHA
    setLoading(true);
    try {
      recaptchaRef.current?.execute();
    } catch (error) {
      setLoading(false);
      toast({ title: 'Erreur', description: 'Erreur lors de la vérification. Veuillez réessayer.', variant: 'destructive' });
    }
  };

  const performSignup = async (token: string) => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            first_name: firstName.trim() || undefined,
            recaptcha_token: token,
          },
        },
      });
      if (error) throw error;
      fireConfetti();
      toast({ title: 'Inscription réussie 🎉', description: 'Vous pouvez maintenant utiliser l\'application.' });
      setTimeout(() => navigate('/theme-onboarding'), 800);
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes('User already registered')) {
        message = 'Cet email est déjà utilisé. Essayez de vous connecter.';
      } else if (error.message.includes('Password should be at least')) {
        message = 'Le mot de passe doit contenir au moins 6 caractères';
      }
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center cursor-default">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Créer un compte gratuit | IKtracker</title>
        <meta name="description" content="Créez votre compte IKtracker gratuit en 2 minutes. Commencez à automatiser le suivi de vos indemnités kilométriques dès aujourd'hui." />
        <link rel="canonical" href="https://iktracker.fr/signup" />
      </Helmet>
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 cursor-default relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-950 to-slate-900" />
      
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl" />
      
      {/* Grid pattern */}
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
      
      {/* Main Card */}
      <div className="relative z-10 w-full max-w-4xl animate-fade-in">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-slate-800/50 overflow-hidden animate-scale-in">
          <div className="grid md:grid-cols-2">
            
            {/* Left Panel - Branding */}
            <div className="hidden md:flex flex-col justify-between p-10 lg:p-12 bg-gradient-to-br from-blue-900/30 via-slate-800/50 to-slate-900/50 border-r border-slate-800/50">
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
                  Créez votre compte en quelques secondes et commencez à suivre vos trajets professionnels.
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
            
            {/* Right Panel - Signup Form */}
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
                <h1 className="text-2xl font-bold text-white mb-2">Créer un compte</h1>
                <p className="text-slate-400">
                  100% gratuit • Aucune carte requise
                </p>
              </div>
              
              {/* Google OAuth */}
              <Button
                type="button"
                variant="outline"
                className="w-full bg-white/5 border-slate-700 text-white hover:bg-white/10 mb-4"
                onClick={handleOAuthLogin}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continuer avec Google
              </Button>
              
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">ou</span>
                </div>
              </div>
              
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First name */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Prénom (optionnel)"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe (6 caractères min.)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Invisible reCAPTCHA */}
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  size="invisible"
                  onChange={handleRecaptchaChange}
                  onExpired={handleRecaptchaExpired}
                  onErrored={handleRecaptchaError}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Créer mon compte gratuit
                </Button>
              </form>
              
              {/* Login link */}
              <p className="mt-6 text-center text-slate-400 text-sm">
                Déjà un compte ?{' '}
                <Link to="/auth" className="text-blue-400 hover:text-blue-300 font-medium">
                  Connectez-vous
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Signup;
