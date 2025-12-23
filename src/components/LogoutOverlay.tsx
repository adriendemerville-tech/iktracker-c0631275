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
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [message, setMessage] = useState('');
  
  // Check if desktop (>= 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  useEffect(() => {
    if (!isVisible) {
      setShowContent(false);
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

    // Simple animation sequence:
    // 1. Show content after a brief delay
    const showContentTimer = setTimeout(() => {
      setShowContent(true);
    }, 300);

    // 2. Fade out everything
    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    // 3. Navigate after fade out
    const navigateTimer = setTimeout(() => {
      navigate('/');
      onComplete?.();
    }, 3100);

    return () => {
      clearTimeout(showContentTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(navigateTimer);
    };
  }, [isVisible, isDesktop, navigate, onComplete]);

  // On mobile, don't render anything
  if (!isDesktop) {
    return null;
  }

  const fullMessage = userName ? `${message} ${userName} !` : `${message} !`;

  return (
    <AnimatePresence>
      {isVisible && !fadeOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
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

          {/* Content container - logo + message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            {/* Logo */}
            <img
              src="/logo-iktracker-250.webp"
              alt="IKTracker"
              className="w-16 h-16 object-contain"
              style={{
                filter: 'drop-shadow(0 4px 20px hsla(210, 100%, 70%, 0.3))',
              }}
            />
            
            {/* Farewell message */}
            <h1 
              className="text-2xl md:text-3xl font-semibold tracking-tight text-center"
              style={{
                color: 'white',
                textShadow: '0 2px 20px hsla(210, 100%, 70%, 0.3), 0 4px 40px hsla(217, 90%, 30%, 0.5)',
              }}
            >
              {fullMessage}
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
