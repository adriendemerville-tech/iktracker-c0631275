import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accumulateDistance, detectStops, type Point } from './geo';

export const TOUR_TASK = 'iktracker-tour-location';
const STORAGE_KEY = 'iktracker.tour.points';
const SESSION_KEY = 'iktracker.tour.session';

export interface TourSession {
  startedAt: number;
  vehicleId: string | null;
}

async function readPoints(): Promise<Point[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Point[]) : [];
}

async function writePoints(points: Point[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(points));
}

// Tâche background : doit être déclarée au niveau module (chargée au boot de l'app).
TaskManager.defineTask(TOUR_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] })?.locations ?? [];
  if (!locations.length) return;
  const existing = await readPoints();
  const next = existing.concat(
    locations.map((l) => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      timestamp: l.timestamp,
    })),
  );
  await writePoints(next);
});

export async function getLocationPermissionStatus(): Promise<{
  foreground: Location.PermissionStatus;
  background: Location.PermissionStatus;
}> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  return { foreground: fg.status, background: bg.status };
}

export async function requestTourPermissions(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

export async function startTour(vehicleId: string | null): Promise<void> {
  await writePoints([]);
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ startedAt: Date.now(), vehicleId } satisfies TourSession),
  );
  await Location.startLocationUpdatesAsync(TOUR_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10_000, // 10 s, aligné sur le web
    distanceInterval: 20,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Mode Tournée actif',
      notificationBody: 'IKTracker enregistre votre itinéraire professionnel.',
      notificationColor: '#4F46E5',
    },
  });
}

export async function isTourRunning(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TOUR_TASK);
}

export async function getActiveSession(): Promise<TourSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as TourSession) : null;
}

export async function getLiveDistance(): Promise<number> {
  return accumulateDistance(await readPoints());
}

export async function stopTour(): Promise<{ distance: number; points: Point[]; stops: Point[]; session: TourSession | null }> {
  if (await isTourRunning()) {
    await Location.stopLocationUpdatesAsync(TOUR_TASK);
  }
  const points = await readPoints();
  const session = await getActiveSession();
  await AsyncStorage.multiRemove([STORAGE_KEY, SESSION_KEY]);
  return {
    distance: accumulateDistance(points),
    points,
    stops: detectStops(points),
    session,
  };
}
