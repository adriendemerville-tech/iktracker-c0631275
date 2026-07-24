import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PERSONA_OPTIONS } from '@/components/PersonaPicker';

export type CalendarImportMode = 'individual' | 'tour';
export type IKRateOverride = 'auto' | 'tier2' | 'tier3';
export type AccountantFrequency = 'monthly' | 'quarterly' | 'yearly';

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
  calendarImportMode: CalendarImportMode;
  ikRateOverride: IKRateOverride;
  // Accountant automated sending
  accountantAutoSend: boolean;
  accountantFrequency: AccountantFrequency;
  accountantSendDay: number; // 1-28
  // Trip defaults (local-only)
  defaultVehicleId: string | null;
  defaultPurpose: string;
  defaultRoundTrip: boolean;
  // Notifications (local-only)
  notifTourReminder: boolean;
  notifAnnualThreshold: boolean;
  // Automation (local-only, sent to server later)
  autoMonthlyExport: boolean;
  // Server-side monthly report to the user (sent the 15th)
  userMonthlyReportEnabled: boolean;
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
  calendarImportMode: 'individual',
  ikRateOverride: 'auto',
  accountantAutoSend: false,
  accountantFrequency: 'monthly',
  accountantSendDay: 5,
  defaultVehicleId: null,
  defaultPurpose: '',
  defaultRoundTrip: false,
  notifTourReminder: true,
  notifAnnualThreshold: true,
  autoMonthlyExport: false,
  autoMonthlyExport: false,
  userMonthlyReportEnabled: true,
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
          .select('accountant_email, persona, calendar_import_mode, ik_rate_override, accountant_auto_send, accountant_frequency, accountant_send_day')
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
          
          // Sync persona → profession
          const persona = (data as any)?.persona as string | undefined;
          if (persona && persona !== 'undefined') {
            const personaOption = PERSONA_OPTIONS.find(p => p.value === persona);
            if (personaOption) {
              updates.profession = personaOption.profession;
            }
          } else {
            updates.profession = '';
          }

          // Sync calendar import mode
          const mode = (data as any)?.calendar_import_mode as CalendarImportMode | undefined;
          if (mode === 'tour' || mode === 'individual') {
            updates.calendarImportMode = mode;
          }

          // Sync IK rate override
          const override = (data as any)?.ik_rate_override as IKRateOverride | undefined;
          if (override === 'auto' || override === 'tier2' || override === 'tier3') {
            updates.ikRateOverride = override;
          }

          if (typeof (data as any)?.accountant_auto_send === 'boolean') {
            updates.accountantAutoSend = (data as any).accountant_auto_send;
          }
          const freq = (data as any)?.accountant_frequency as AccountantFrequency | undefined;
          if (freq === 'monthly' || freq === 'quarterly' || freq === 'yearly') {
            updates.accountantFrequency = freq;
          }
          const day = (data as any)?.accountant_send_day as number | undefined;
          if (typeof day === 'number' && day >= 1 && day <= 28) {
            updates.accountantSendDay = day;
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

    // Find matching persona for this profession, fallback to 'undefined'
    const personaOption = PERSONA_OPTIONS.find(p => p.profession === profession);
    const personaValue = personaOption?.value || 'undefined';

    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          persona: personaValue,
        } as any, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Failed to save persona to database:', e);
    }
  }, [user]);

  // Save calendar import mode to database
  const saveCalendarImportModeToDatabase = useCallback(async (mode: CalendarImportMode) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, calendar_import_mode: mode } as any, { onConflict: 'user_id' });
      if (error) console.warn('Failed to save calendar_import_mode:', error);
    } catch (e) {
      console.warn('Failed to save calendar_import_mode:', e);
    }
  }, [user]);

  // Save IK rate override to database
  const saveIkRateOverrideToDatabase = useCallback(async (override: IKRateOverride) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, ik_rate_override: override } as any, { onConflict: 'user_id' });
      if (error) console.warn('Failed to save ik_rate_override:', error);
    } catch (e) {
      console.warn('Failed to save ik_rate_override:', e);
    }
  }, [user]);

  // Save accountant scheduling fields to database
  const saveAccountantScheduleToDatabase = useCallback(async (patch: {
    accountant_auto_send?: boolean;
    accountant_frequency?: AccountantFrequency;
    accountant_send_day?: number;
  }) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, ...patch } as any, { onConflict: 'user_id' });
      if (error) console.warn('Failed to save accountant schedule:', error);
    } catch (e) {
      console.warn('Failed to save accountant schedule:', e);
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

    // Sync calendar import mode to database
    if (key === 'calendarImportMode' && user) {
      saveCalendarImportModeToDatabase(value as CalendarImportMode);
    }

    // Sync IK rate override to database
    if (key === 'ikRateOverride' && user) {
      saveIkRateOverrideToDatabase(value as IKRateOverride);
    }

    // Sync accountant scheduling fields
    if (key === 'accountantAutoSend' && user) {
      saveAccountantScheduleToDatabase({ accountant_auto_send: value as boolean });
    }
    if (key === 'accountantFrequency' && user) {
      saveAccountantScheduleToDatabase({ accountant_frequency: value as AccountantFrequency });
    }
    if (key === 'accountantSendDay' && user) {
      saveAccountantScheduleToDatabase({ accountant_send_day: value as number });
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
