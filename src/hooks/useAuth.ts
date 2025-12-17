import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const SESSION_COUNT_KEY = 'ik_session_count';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(1);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    // Track session count
    const storedCount = localStorage.getItem(SESSION_COUNT_KEY);
    const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
    const newCount = currentCount + 1;
    
    // Only increment on first load of the app
    if (!sessionStorage.getItem('session_started')) {
      localStorage.setItem(SESSION_COUNT_KEY, newCount.toString());
      sessionStorage.setItem('session_started', 'true');
      setSessionCount(newCount);
    } else {
      setSessionCount(currentCount);
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Force requiresAuth when user signs out
        if (event === 'SIGNED_OUT') {
          setRequiresAuth(true);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Requires auth if it's the second session or later AND user is not logged in
    setRequiresAuth(sessionCount >= 2 && !user);
  }, [sessionCount, user]);

  const signOut = async () => {
    // Optimistic local sign-out (instant UX, avoids Safari hanging)
    setUser(null);
    setSession(null);
    setRequiresAuth(true);

    // Best-effort server sign-out (token revoke). Don't block UI indefinitely.
    try {
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('signOut_timeout')), 4000)
        ),
      ]);
      if (error) {
        console.warn('Sign out error:', error);
      }
    } catch (error) {
      console.warn('Sign out warning:', error);
    }
  };

  return {
    user,
    session,
    loading,
    sessionCount,
    requiresAuth,
    signOut,
  };
};
