import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Preferences {
  showTripTime: boolean;
  stopDetectionMinutes: number;
  locationRadiusMeters: number;
  profession: string;
  accountantEmail: string;
  hasSentToAccountant: boolean;
}

const PREFERENCES_KEY = 'ik-tracker-preferences';

const defaultPreferences: Preferences = {
  showTripTime: true,
  stopDetectionMinutes: 7,
  locationRadiusMeters: 100,
  profession: '',
  accountantEmail: '',
  hasSentToAccountant: false,
};

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
    return defaultPreferences;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load preferences from database when user is authenticated
  useEffect(() => {
    if (!user) return;

    const loadFromDatabase = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('accountant_email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('Failed to load preferences from database:', error);
          return;
        }

        if (data?.accountant_email) {
          setPreferences(prev => ({
            ...prev,
            accountantEmail: data.accountant_email || prev.accountantEmail,
          }));
        }
      } catch (e) {
        console.warn('Failed to load preferences from database:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromDatabase();
  }, [user]);

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }, [preferences]);

  // Save accountant email to database
  const saveAccountantEmailToDatabase = useCallback(async (email: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { 
            user_id: user.id, 
            accountant_email: email 
          },
          { 
            onConflict: 'user_id' 
          }
        );

      if (error) {
        console.warn('Failed to save accountant email to database:', error);
      }
    } catch (e) {
      console.warn('Failed to save accountant email to database:', e);
    }
  }, [user]);

  const updatePreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Sync accountant email to database if user is authenticated
    if (key === 'accountantEmail' && user) {
      saveAccountantEmailToDatabase(value as string);
    }
  };

  return {
    preferences,
    updatePreference,
    isLoading,
  };
}