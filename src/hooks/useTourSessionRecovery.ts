import { useState, useEffect, useCallback, useRef } from 'react';
import { TourStop } from './useTourTracker';

// Time thresholds in milliseconds
const TRANSPARENT_RESUME_THRESHOLD = 20 * 60 * 1000; // 20 minutes
const MODAL_RESUME_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

// Storage keys
const STORAGE_KEYS = {
  SESSION_ACTIVE: 'tour_session_active',
  SESSION_ID: 'tour_session_id',
  LAST_ACTIVITY: 'tour_last_activity',
  TOUR_DATA: 'tour_session_data', // Complete tour state for recovery
};

export interface TourSessionData {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  stops: TourStop[];
  totalDistanceKm: number;
  gpsPoints: Array<{ lat: number; lng: number; timestamp: number; accuracy: number }>;
}

export type SessionRecoveryCase = 'transparent' | 'modal' | 'auto_finalize' | 'none';

export interface SessionRecoveryResult {
  case: SessionRecoveryCase;
  sessionData: TourSessionData | null;
  inactivityDuration: number; // in milliseconds
}

/**
 * Save current session state to localStorage
 */
export function saveSessionState(data: Partial<TourSessionData>) {
  try {
    const existingData = loadSessionState();
    const newData = { ...existingData, ...data, lastActivity: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.TOUR_DATA, JSON.stringify(newData));
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, newData.lastActivity);
    localStorage.setItem(STORAGE_KEYS.SESSION_ACTIVE, 'true');
  } catch (e) {
    console.warn('Failed to save session state:', e);
  }
}

/**
 * Load session state from localStorage
 */
export function loadSessionState(): TourSessionData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TOUR_DATA);
    if (data) {
      const parsed = JSON.parse(data);
      // Reconstruct Date objects for stops
      if (parsed.stops) {
        parsed.stops = parsed.stops.map((stop: any) => ({
          ...stop,
          timestamp: new Date(stop.timestamp),
        }));
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load session state:', e);
  }
  return null;
}

/**
 * Clear all session data from localStorage
 */
export function clearSessionState() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Check if there's an active session that needs recovery
 */
export function checkSessionRecovery(): SessionRecoveryResult {
  try {
    const isActive = localStorage.getItem(STORAGE_KEYS.SESSION_ACTIVE) === 'true';
    if (!isActive) {
      return { case: 'none', sessionData: null, inactivityDuration: 0 };
    }

    const lastActivityStr = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    if (!lastActivityStr) {
      // Active but no last activity - treat as auto finalize
      const sessionData = loadSessionState();
      clearSessionState();
      return { case: 'auto_finalize', sessionData, inactivityDuration: Infinity };
    }

    const lastActivity = new Date(lastActivityStr).getTime();
    const now = Date.now();
    const inactivityDuration = now - lastActivity;
    const sessionData = loadSessionState();

    if (inactivityDuration < TRANSPARENT_RESUME_THRESHOLD) {
      // Case A: < 4 minutes - transparent resume
      return { case: 'transparent', sessionData, inactivityDuration };
    } else if (inactivityDuration < MODAL_RESUME_THRESHOLD) {
      // Case B: 4 minutes - 2 hours - show modal
      return { case: 'modal', sessionData, inactivityDuration };
    } else {
      // Case C: > 2 hours - auto finalize
      return { case: 'auto_finalize', sessionData, inactivityDuration };
    }
  } catch (e) {
    console.warn('Error checking session recovery:', e);
    return { case: 'none', sessionData: null, inactivityDuration: 0 };
  }
}

/**
 * Format inactivity duration for display
 */
export function formatInactivityDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours >= 1) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Hook to manage tour session recovery
 */
export function useTourSessionRecovery() {
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<SessionRecoveryResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasCheckedRef = useRef(false);
  
  // Start a new session
  const startSession = useCallback((tourStartTime: Date) => {
    const sessionId = crypto.randomUUID();
    saveSessionState({
      sessionId,
      startTime: tourStartTime.toISOString(),
      lastActivity: new Date().toISOString(),
      stops: [],
      totalDistanceKm: 0,
      gpsPoints: [],
    });
    console.log('Tour session started:', sessionId);
  }, []);
  
  // Update session activity (call this regularly during tour)
  const updateSessionActivity = useCallback((data: {
    stops?: TourStop[];
    totalDistanceKm?: number;
    gpsPoints?: Array<{ lat: number; lng: number; timestamp: number; accuracy: number }>;
  }) => {
    const existingData = loadSessionState();
    if (!existingData) return;
    
    saveSessionState({
      ...existingData,
      ...data,
      stops: data.stops || existingData.stops,
      lastActivity: new Date().toISOString(),
    });
  }, []);
  
  // End session normally
  const endSession = useCallback(() => {
    clearSessionState();
    console.log('Tour session ended normally');
  }, []);
  
  // Accept recovery (Case B - user said yes)
  const acceptRecovery = useCallback(() => {
    setShowRecoveryModal(false);
    // Update last activity to now
    const sessionData = loadSessionState();
    if (sessionData) {
      saveSessionState({ ...sessionData, lastActivity: new Date().toISOString() });
    }
    return recoveryResult?.sessionData || null;
  }, [recoveryResult]);
  
  // Decline recovery (Case B - user said no) - returns session data for finalization
  const declineRecovery = useCallback(() => {
    setShowRecoveryModal(false);
    const data = recoveryResult?.sessionData;
    clearSessionState();
    return data;
  }, [recoveryResult]);
  
  // Get recovery status for initial check
  const checkRecoveryOnMount = useCallback((): SessionRecoveryResult => {
    if (hasCheckedRef.current) {
      return { case: 'none', sessionData: null, inactivityDuration: 0 };
    }
    hasCheckedRef.current = true;
    
    const result = checkSessionRecovery();
    setRecoveryResult(result);
    
    if (result.case === 'modal') {
      setShowRecoveryModal(true);
    }
    
    return result;
  }, []);
  
  // Reset for new check (useful when navigating back)
  const resetRecoveryCheck = useCallback(() => {
    hasCheckedRef.current = false;
    setRecoveryResult(null);
    setShowRecoveryModal(false);
  }, []);
  
  return {
    showRecoveryModal,
    recoveryResult,
    isProcessing,
    setIsProcessing,
    startSession,
    updateSessionActivity,
    endSession,
    acceptRecovery,
    declineRecovery,
    checkRecoveryOnMount,
    resetRecoveryCheck,
    formatInactivityDuration,
  };
}
