import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface LogoutOverlayProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const LogoutOverlay = ({ isVisible, onComplete }: LogoutOverlayProps) => {
  const navigate = useNavigate();
  const [showText, setShowText] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  
  // Check if desktop (>= 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  useEffect(() => {
    if (!isVisible) {
      setShowText(false);
      setHideText(false);
      setFadeOut(false);
      return;
    }

    // If mobile, skip animation and redirect immediately
    if (!isDesktop) {
      navigate('/');
      onComplete?.();
      return;
    }

    // Desktop animation sequence:
    // 1. Wait 2s, then show text and trigger confetti
    const showTextTimer = setTimeout(() => {
      setShowText(true);
      
      // Subtle confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#ffffff', '#93c5fd', '#60a5fa', '#3b82f6'],
        gravity: 0.8,
        scalar: 0.9,
        drift: 0,
        ticks: 150,
      });
    }, 2000);

    // 2. Text stays 2s, then hide it (at 4s total)
    const hideTextTimer = setTimeout(() => {
      setHideText(true);
    }, 4000);

    // 3. 1s after text disappears, fade out background (at 5s total)
    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, 5000);

    // 4. After fade out animation completes, navigate (at ~5.8s)
    const navigateTimer = setTimeout(() => {
      navigate('/');
      onComplete?.();
    }, 5800);

    return () => {
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
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'hsl(217, 91%, 25%)' }}
        >
          <AnimatePresence>
            {showText && !hideText && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -5 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center"
              >
                <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                  À bientôt !
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
