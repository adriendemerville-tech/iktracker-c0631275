// Tutorial state hook - separated from OnboardingTutorial to avoid bundling framer-motion
import { useState, useEffect } from 'react';

export const useTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if this is first visit
    const hasCompletedTutorial = localStorage.getItem('iktracker_tutorial_completed');
    if (!hasCompletedTutorial) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const completeTutorial = () => {
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem('iktracker_tutorial_completed');
    startTutorial();
  };

  return {
    showTutorial,
    startTutorial,
    completeTutorial,
    resetTutorial,
  };
};
