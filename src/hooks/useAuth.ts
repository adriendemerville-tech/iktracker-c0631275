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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    // Clear local state immediately
    setUser(null);
    setSession(null);
    setRequiresAuth(true);
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
