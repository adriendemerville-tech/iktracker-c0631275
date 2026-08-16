import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { drivingDistanceKm, type Coord } from './distance';

const LIVE_TRIP_KEY = 'iktracker.livetrip';

export interface LiveTripPoint extends Coord {
  address: string | null;
  /** Horodatage ISO enregistré automatiquement. */
  at: string;
}

export interface LiveTrip {
  start: LiveTripPoint;
  vehicleId: string | null;
}

export async function requestForegroundLocation(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function reverseGeocode(coord: Coord): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coord.lat,
      longitude: coord.lng,
    });
    if (!place) return null;
    const line = [
      [place.streetNumber, place.street].filter(Boolean).join(' '),
      place.postalCode,
      place.city ?? place.subregion,
    ]
      .filter(Boolean)
      .join(', ');
    return line || place.name || null;
  } catch {
    return null;
  }
}

async function capturePoint(): Promise<LiveTripPoint> {
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  return { ...coord, address: await reverseGeocode(coord), at: new Date().toISOString() };
}

export async function getLiveTrip(): Promise<LiveTrip | null> {
  const raw = await AsyncStorage.getItem(LIVE_TRIP_KEY);
  return raw ? (JSON.parse(raw) as LiveTrip) : null;
}

/** Démarre un trajet : géolocalise le départ et horodate automatiquement. */
export async function startLiveTrip(vehicleId: string | null): Promise<LiveTrip> {
  const start = await capturePoint();
  const trip: LiveTrip = { start, vehicleId };
  await AsyncStorage.setItem(LIVE_TRIP_KEY, JSON.stringify(trip));
  return trip;
}

export async function cancelLiveTrip(): Promise<void> {
  await AsyncStorage.removeItem(LIVE_TRIP_KEY);
}

export interface FinishedLiveTrip {
  start: LiveTripPoint;
  end: LiveTripPoint;
  distanceKm: number;
  source: 'google' | 'estimation';
  durationMin: number;
  vehicleId: string | null;
}

/** Termine le trajet : géolocalise l'arrivée, horodate et calcule la distance routière. */
export async function finishLiveTrip(): Promise<FinishedLiveTrip> {
  const trip = await getLiveTrip();
  if (!trip) throw new Error('Aucun trajet en cours');
  const end = await capturePoint();
  const { km, source } = await drivingDistanceKm(trip.start, end);
  const durationMin = Math.max(
    0,
    Math.round((new Date(end.at).getTime() - new Date(trip.start.at).getTime()) / 60000),
  );
  return { start: trip.start, end, distanceKm: km, source, durationMin, vehicleId: trip.vehicleId };
}
