// Tutorial state hook - separated from OnboardingTutorial to avoid bundling framer-motion
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const LS_KEY = 'iktracker_tutorial_completed';

export const useTutorial = () => {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);

  // Authenticated: increment visit_count in DB and decide tutorial visibility based on DB flag
  useEffect(() => {
    if (!user) return;

    const incrementAndCheck = async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('visit_count, tutorial_completed_at')
          .eq('user_id', user.id)
          .maybeSingle();

        const currentCount = (data as any)?.visit_count ?? 0;
        const tutorialCompletedAt = (data as any)?.tutorial_completed_at ?? null;
        const newCount = currentCount + 1;

        await supabase
          .from('user_preferences')
          .upsert(
            { user_id: user.id, visit_count: newCount } as any,
            { onConflict: 'user_id' }
          );

        setVisitCount(newCount);

        // Sync DB → localStorage so legacy checks stay consistent
        if (tutorialCompletedAt) {
          localStorage.setItem(LS_KEY, 'true');
          return;
        }

        // Show tutorial only on first 2 visits AND not yet completed in DB
        if (newCount <= 2) {
          setTimeout(() => setShowTutorial(true), 1000);
        }
      } catch (e) {
        console.warn('Failed to track visit count:', e);
        // Fallback to localStorage only when DB unreachable
        const hasCompleted = localStorage.getItem(LS_KEY);
        if (!hasCompleted) {
          setTimeout(() => setShowTutorial(true), 1000);
        }
      }
    };

    incrementAndCheck();
  }, [user]);

  // Fallback for non-authenticated users (uses localStorage only)
  useEffect(() => {
    if (user) return;
    const hasCompleted = localStorage.getItem(LS_KEY);
    if (!hasCompleted) {
      const timer = setTimeout(() => setShowTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const startTutorial = useCallback(() => setShowTutorial(true), []);

  const completeTutorial = useCallback(async () => {
    setShowTutorial(false);
    localStorage.setItem(LS_KEY, 'true');
    if (user) {
      try {
        await supabase
          .from('user_preferences')
          .upsert(
            { user_id: user.id, tutorial_completed_at: new Date().toISOString() } as any,
            { onConflict: 'user_id' }
          );
      } catch (e) {
        console.warn('Failed to persist tutorial completion:', e);
      }
    }
  }, [user]);

  const resetTutorial = useCallback(async () => {
    localStorage.removeItem(LS_KEY);
    if (user) {
      try {
        await supabase
          .from('user_preferences')
          .upsert(
            { user_id: user.id, tutorial_completed_at: null } as any,
            { onConflict: 'user_id' }
          );
      } catch (e) {
        console.warn('Failed to reset tutorial in DB:', e);
      }
    }
    setShowTutorial(true);
  }, [user]);

  return {
    showTutorial,
    startTutorial,
    completeTutorial,
    resetTutorial,
    visitCount,
  };
};
