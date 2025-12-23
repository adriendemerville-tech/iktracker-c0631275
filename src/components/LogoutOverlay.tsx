import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';

const FAREWELL_MESSAGES = [
  'À bientôt',
  'À très vite',
  'Bon retour',
  'À la prochaine',
  'Bonne route',
];

// Get or create session farewell message (consistent within a session)
const getSessionFarewellMessage = (): string => {
  const storageKey = 'iktracker_farewell_message';
  const stored = sessionStorage.getItem(storageKey);
  
  if (stored) {
    return stored;
  }
  
  const randomMessage = FAREWELL_MESSAGES[Math.floor(Math.random() * FAREWELL_MESSAGES.length)];
  sessionStorage.setItem(storageKey, randomMessage);
  return randomMessage;
};

interface LogoutOverlayProps {
  isVisible: boolean;
  userName?: string | null;
  onComplete?: () => void;
}

export const LogoutOverlay = ({ isVisible, userName }: LogoutOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');
  
  // Check if desktop (>= 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Get consistent message for this session
  const message = useMemo(() => getSessionFarewellMessage(), []);
  const fullMessage = userName ? `${message} ${userName} !` : `${message} !`;

  useEffect(() => {
    if (!isVisible) {
      setPhase('hidden');
      return;
    }

    // Store farewell data for the transition shell (landing page will pick this up)
    sessionStorage.setItem('iktracker_logout_transition', JSON.stringify({
      message: fullMessage,
      timestamp: Date.now()
    }));

    // If mobile, redirect immediately
    if (!isDesktop) {
      window.location.href = "/";
      return;
    }

    // Start entering phase immediately
    setPhase('entering');

    // Transition to visible after enter animation
    const visibleTimer = setTimeout(() => {
      setPhase('visible');
    }, 300);

    // Navigate quickly - the HTML shell will maintain the overlay until Landing loads
    const navigateTimer = setTimeout(() => {
      window.location.href = "/";
    }, 800);

    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(navigateTimer);
    };
  }, [isVisible, isDesktop, fullMessage]);

  // On mobile, don't render anything
  if (!isDesktop || phase === 'hidden') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
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
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ 
          opacity: phase === 'exiting' ? 0 : 1, 
          y: phase === 'exiting' ? -20 : 0,
          scale: phase === 'exiting' ? 0.98 : 1
        }}
        transition={{ 
          duration: 0.6, 
          ease: [0.4, 0, 0.2, 1],
          delay: phase === 'entering' ? 0.1 : 0
        }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <img
          src="/logo-iktracker-250.webp"
          alt="IKTracker"
          width={64}
          height={64}
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
  );
};
