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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [message, setMessage] = useState('');
  
  // Check if desktop (>= 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  useEffect(() => {
    if (!isVisible) {
      setShowSpinner(true);
      setShowText(false);
      setHideText(false);
      setFadeOut(false);
      setIsTransitioning(false);
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

    // Desktop animation sequence (smooth crossfade with blur):
    // 1. Start blur transition
    const startTransitionTimer = setTimeout(() => {
      setIsTransitioning(true);
    }, 800);

    // 2. Spinner fades out while text fades in (overlap for smooth transition)
    const hideSpinnerTimer = setTimeout(() => {
      setShowSpinner(false);
    }, 1200);

    // Start showing text slightly before spinner fully disappears
    const showTextTimer = setTimeout(() => {
      setShowText(true);
    }, 900);

    // End blur transition
    const endTransitionTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1400);

    // 3. Text stays visible, then fades out
    const hideTextTimer = setTimeout(() => {
      setHideText(true);
    }, 2800);

    // 3. Fade out background
    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3400);

    // 4. After fade out animation completes, navigate
    const navigateTimer = setTimeout(() => {
      navigate('/');
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(startTransitionTimer);
      clearTimeout(hideSpinnerTimer);
      clearTimeout(showTextTimer);
      clearTimeout(endTransitionTimer);
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-[25vh] overflow-hidden"
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

          {/* Blur overlay during transition */}
          <motion.div
            className="absolute inset-0 pointer-events-none z-[5]"
            initial={{ opacity: 0 }}
            animate={{ opacity: isTransitioning ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: 'hsla(217, 91%, 25%, 0.2)',
            }}
          />

          {/* Spinner during initial loading */}
          <AnimatePresence mode="wait">
            {showSpinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="absolute z-10 flex flex-col items-center"
              >
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
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ 
                  duration: 0.6, 
                  ease: [0.4, 0, 0.2, 1],
                  opacity: { duration: 0.5 }
                }}
                className="absolute text-center z-10 flex flex-col items-center"
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
