// Tutorial state hook - separated from OnboardingTutorial to avoid bundling framer-motion
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useTutorial = () => {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);

  // Authenticated: increment visit_count in DB and decide tutorial visibility
  useEffect(() => {
    if (!user) return;

    const incrementAndCheck = async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('visit_count')
          .eq('user_id', user.id)
          .maybeSingle();

        const currentCount = (data as any)?.visit_count ?? 0;
        const newCount = currentCount + 1;

        await supabase
          .from('user_preferences')
          .upsert(
            { user_id: user.id, visit_count: newCount } as any,
            { onConflict: 'user_id' }
          );

        setVisitCount(newCount);

        // Show tutorial only on first 2 visits
        if (newCount <= 2) {
          const hasCompleted = localStorage.getItem('iktracker_tutorial_completed');
          if (!hasCompleted) {
            setTimeout(() => setShowTutorial(true), 1000);
          }
        }
      } catch (e) {
        console.warn('Failed to track visit count:', e);
        // Fallback to localStorage
        const hasCompleted = localStorage.getItem('iktracker_tutorial_completed');
        if (!hasCompleted) {
          setTimeout(() => setShowTutorial(true), 1000);
        }
      }
    };

    incrementAndCheck();
  }, [user]);

  // Fallback for non-authenticated users
  useEffect(() => {
    if (user) return;
    const hasCompleted = localStorage.getItem('iktracker_tutorial_completed');
    if (!hasCompleted) {
      const timer = setTimeout(() => setShowTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const startTutorial = () => setShowTutorial(true);
  const completeTutorial = () => setShowTutorial(false);
  const resetTutorial = () => {
    localStorage.removeItem('iktracker_tutorial_completed');
    startTutorial();
  };

  return {
    showTutorial,
    startTutorial,
    completeTutorial,
    resetTutorial,
    visitCount,
  };
};
