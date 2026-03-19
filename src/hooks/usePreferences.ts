import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PERSONA_OPTIONS } from '@/components/PersonaPicker';

export interface Preferences {
  showTripTime: boolean;
  stopDetectionMinutes: number;
  locationRadiusMeters: number;
  minDistanceKm: number;
  profession: string;
  accountantEmail: string;
  hasSentToAccountant: boolean;
  counterResetDate: string | null; // ISO date string
  fiscalYearStartMonth: number; // 1-12, default 1 (January)
  fiscalYearStartDay: number; // 1-31, default 1
}

const PREFERENCES_KEY = 'ik-tracker-preferences';

const defaultPreferences: Preferences = {
  showTripTime: true,
  stopDetectionMinutes: 7,
  locationRadiusMeters: 100,
  minDistanceKm: 1,
  profession: '',
  accountantEmail: '',
  hasSentToAccountant: false,
  counterResetDate: null,
  fiscalYearStartMonth: 1,
  fiscalYearStartDay: 1,
};

// Get the fiscal year start date for a given reference date
export function getFiscalYearStart(refDate: Date, fiscalYearStartMonth: number = 1, fiscalYearStartDay: number = 1): Date {
  const year = refDate.getFullYear();
  const fiscalStart = new Date(year, fiscalYearStartMonth - 1, fiscalYearStartDay);
  if (refDate < fiscalStart) {
    return new Date(year - 1, fiscalYearStartMonth - 1, fiscalYearStartDay);
  }
  return fiscalStart;
}

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
          .select('accountant_email, persona')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('Failed to load preferences from database:', error);
          return;
        }

        if (data) {
          const updates: Partial<Preferences> = {};
          
          if (data.accountant_email) {
            updates.accountantEmail = data.accountant_email;
          }
          
          // Sync persona → profession if persona is set and profession is empty
          const persona = (data as any)?.persona as string | undefined;
          if (persona) {
            const personaOption = PERSONA_OPTIONS.find(p => p.value === persona);
            if (personaOption) {
              updates.profession = personaOption.profession;
            }
          }

          if (Object.keys(updates).length > 0) {
            setPreferences(prev => ({ ...prev, ...updates }));
          }
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

  // Save persona to database when profession changes (reverse mapping)
  const savePersonaToDatabase = useCallback(async (profession: string) => {
    if (!user) return;

    // Find matching persona for this profession
    const personaOption = PERSONA_OPTIONS.find(p => p.profession === profession);
    if (!personaOption) return; // No matching persona, just keep localStorage

    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          persona: personaOption.value,
        } as any, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Failed to save persona to database:', e);
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

    // Sync profession → persona to database
    if (key === 'profession' && user) {
      savePersonaToDatabase(value as string);
    }
  };

  const resetCounters = useCallback(() => {
    setPreferences(prev => ({ ...prev, counterResetDate: new Date().toISOString() }));
  }, []);

  return {
    preferences,
    updatePreference,
    resetCounters,
    isLoading,
  };
}
