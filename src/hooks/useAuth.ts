import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const SESSION_COUNT_KEY = 'ik_session_count';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(1);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Silent session refresh - attempts to get a new session using refresh token
  const silentRefresh = useCallback(async () => {
    if (isRefreshing) return null;
    
    setIsRefreshing(true);
    try {
      console.log('[Auth] Attempting silent session refresh...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.warn('[Auth] Silent refresh failed:', error.message);
        return null;
      }
      
      if (data.session) {
        console.log('[Auth] Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
        return data.session;
      }
      
      return null;
    } catch (err) {
      console.warn('[Auth] Silent refresh error:', err);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

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
        
        // Handle token refresh events
        if (event === 'TOKEN_REFRESHED') {
          console.log('[Auth] Token refreshed via auth state change');
        }
      }
    );

    // THEN check for existing session and attempt silent refresh if needed
    const initializeSession = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('[Auth] Error getting session:', error.message);
          // Try silent refresh if there's an error (session might be expired)
          await silentRefresh();
          setLoading(false);
          return;
        }
        
        if (existingSession) {
          // Check if session is about to expire (within 5 minutes)
          const expiresAt = existingSession.expires_at;
          if (expiresAt) {
            const expiresAtMs = expiresAt * 1000;
            const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
            
            if (expiresAtMs < fiveMinutesFromNow) {
              console.log('[Auth] Session expiring soon, refreshing...');
              await silentRefresh();
            } else {
              setSession(existingSession);
              setUser(existingSession.user);
            }
          } else {
            setSession(existingSession);
            setUser(existingSession.user);
          }
        } else {
          // No session exists, try silent refresh in case there's a refresh token
          const refreshed = await silentRefresh();
          if (!refreshed) {
            setSession(null);
            setUser(null);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('[Auth] Session initialization error:', err);
        setLoading(false);
      }
    };

    initializeSession();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Requires auth if it's the second session or later AND user is not logged in
    setRequiresAuth(sessionCount >= 2 && !user);
  }, [sessionCount, user]);

  const signOut = async (): Promise<boolean> => {
    // Show logout overlay
    setIsLoggingOut(true);

    // Optimistic local sign-out (instant UX, avoids Safari hanging)
    setUser(null);
    setSession(null);
    setRequiresAuth(true);

    // Force clear Supabase session from localStorage regardless of server response
    // This fixes the issue where server returns 403 "session_not_found" but client keeps old session
    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    localStorage.removeItem(storageKey);

    // Best-effort server sign-out (token revoke). Don't block UI indefinitely.
    try {
      const { error } = await Promise.race([
        supabase.auth.signOut({ scope: 'local' }), // Use 'local' scope to avoid server errors
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

    // Return true to indicate signout complete (for navigation timing)
    return true;
  };

  const clearLogoutOverlay = () => {
    setIsLoggingOut(false);
  };

  return {
    user,
    session,
    loading,
    sessionCount,
    requiresAuth,
    isRefreshing,
    isLoggingOut,
    signOut,
    silentRefresh,
    clearLogoutOverlay,
  };
};
