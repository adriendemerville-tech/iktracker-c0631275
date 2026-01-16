import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const ThemeOnboarding = () => {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const handleThemeSelect = (selectedTheme: 'light' | 'dark') => {
    setTheme(selectedTheme);
    // Mark onboarding as complete
    localStorage.setItem('theme-onboarding-complete', 'true');
    navigate('/app', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-slate-950 to-slate-900" />
      
      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-slate-700/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex justify-center mb-8"
        >
          <img 
            src="/logo-iktracker-250.webp" 
            alt="IKtracker" 
            className="w-16 h-16"
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-3xl md:text-4xl font-bold text-white mb-3"
        >
          Choisissez votre thème
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-slate-400 mb-12 text-lg"
        >
          Vous pourrez le modifier à tout moment dans les paramètres
        </motion.p>

        {/* Theme buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Light Mode Button */}
          <button
            onClick={() => handleThemeSelect('light')}
            className="group relative bg-white rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-4 focus:ring-offset-slate-950"
          >
            <div className="flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Sun className="w-10 h-10 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-1">Mode clair</h3>
                <p className="text-slate-500 text-sm">Interface lumineuse</p>
              </div>
            </div>
            
            {/* Preview bar */}
            <div className="mt-6 bg-slate-100 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 bg-slate-300 rounded w-3/4" />
                <div className="h-2 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          </button>

          {/* Dark Mode Button */}
          <button
            onClick={() => handleThemeSelect('dark')}
            className="group relative bg-slate-800 border border-slate-700 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-4 focus:ring-offset-slate-950"
          >
            <div className="flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Moon className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">Mode sombre</h3>
                <p className="text-slate-400 text-sm">Confort visuel</p>
              </div>
            </div>
            
            {/* Preview bar */}
            <div className="mt-6 bg-slate-900 rounded-lg p-3 flex items-center gap-3 border border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-blue-500" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 bg-slate-700 rounded w-3/4" />
                <div className="h-2 bg-slate-800 rounded w-1/2" />
              </div>
            </div>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ThemeOnboarding;
