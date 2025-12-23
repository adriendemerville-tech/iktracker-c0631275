import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FAREWELL_MESSAGES = [
  'À bientôt',
  'À très vite',
  'Bon retour',
  'À la prochaine',
  'Bonne route',
];

interface LogoutOverlayProps {
  isVisible: boolean;
  userName?: string | null;
  onComplete?: () => void;
}

export const LogoutOverlay = ({ isVisible, userName, onComplete }: LogoutOverlayProps) => {
  const navigate = useNavigate();
  const [showSpinner, setShowSpinner] = useState(true);
  const [showText, setShowText] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [message, setMessage] = useState('');
  
  // Check if desktop (>= 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  useEffect(() => {
    if (!isVisible) {
      setShowSpinner(true);
      setShowText(false);
      setHideText(false);
      setFadeOut(false);
      setMessage('');
      return;
    }

    // Pick a random farewell message when overlay becomes visible
    const randomMessage = FAREWELL_MESSAGES[Math.floor(Math.random() * FAREWELL_MESSAGES.length)];
    setMessage(randomMessage);

    // If mobile, skip animation and redirect immediately
    if (!isDesktop) {
      navigate('/');
      onComplete?.();
      return;
    }

    // Desktop animation sequence:
    // 1. Show spinner for 1.5s, then hide it and show text
    const hideSpinnerTimer = setTimeout(() => {
      setShowSpinner(false);
    }, 1500);

    const showTextTimer = setTimeout(() => {
      setShowText(true);
    }, 1600);

    // 2. Text stays 2s, then hide it
    const hideTextTimer = setTimeout(() => {
      setHideText(true);
    }, 3600);

    // 3. Fade out background
    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, 4600);

    // 4. After fade out animation completes, navigate
    const navigateTimer = setTimeout(() => {
      navigate('/');
      onComplete?.();
    }, 5400);

    return () => {
      clearTimeout(hideSpinnerTimer);
      clearTimeout(showTextTimer);
      clearTimeout(hideTextTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(navigateTimer);
    };
  }, [isVisible, isDesktop, navigate, onComplete]);

  // On mobile, don't render anything
  if (!isDesktop) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && !fadeOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(217, 91%, 35%) 0%, hsl(217, 91%, 20%) 50%, hsl(220, 95%, 12%) 100%)',
          }}
        >
          {/* Subtle light reflection at top */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% -10%, hsla(210, 100%, 70%, 0.15) 0%, transparent 60%)',
            }}
          />
          
          {/* Soft glow in center */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, hsla(217, 90%, 50%, 0.1) 0%, transparent 50%)',
            }}
          />
          
          {/* Bottom shadow/vignette */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 100% 60% at 50% 110%, hsla(220, 100%, 5%, 0.4) 0%, transparent 70%)',
            }}
          />

          {/* Spinner during initial loading */}
          <AnimatePresence>
            {showSpinner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 flex flex-col items-center gap-8"
              >
                {/* Logo */}
                <motion.img
                  src="/logo-iktracker-250.webp"
                  alt="IK Tracker"
                  className="w-20 h-20 object-contain"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
                
                {/* Spinning loader */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-white/20" />
                  <motion.div
                    className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Farewell message */}
          <AnimatePresence>
            {showText && !hideText && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -5 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center relative z-10 flex flex-col items-center gap-10"
              >
                <h1 
                  className="text-2xl md:text-3xl font-semibold tracking-tight"
                  style={{
                    color: 'white',
                    textShadow: '0 2px 20px hsla(210, 100%, 70%, 0.3), 0 4px 40px hsla(217, 90%, 30%, 0.5)',
                  }}
                >
                  {userName ? `${message} ${userName} !` : `${message} !`}
                </h1>
                
                {/* Logo - larger container to prevent truncation */}
                <motion.div
                  className="w-24 h-24 flex items-center justify-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <img
                    src="/logo-iktracker-250.webp"
                    alt="IKTracker"
                    className="w-20 h-20 object-contain rounded-full shadow-lg"
                    style={{
                      boxShadow: '0 4px 30px hsla(210, 100%, 70%, 0.25)',
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
