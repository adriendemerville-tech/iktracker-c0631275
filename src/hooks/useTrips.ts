import { useState, useEffect } from 'react';
import { Trip, Location, IK_RATE } from '@/types/trip';

const TRIPS_KEY = 'ik-tracker-trips';
const LOCATIONS_KEY = 'ik-tracker-locations';

const defaultLocations: Location[] = [
  { id: '1', name: 'Maison', address: '', type: 'home' },
  { id: '2', name: 'Bureau', address: '', type: 'office' },
];

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [savedLocations, setSavedLocations] = useState<Location[]>(defaultLocations);

  useEffect(() => {
    const stored = localStorage.getItem(TRIPS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setTrips(parsed.map((t: any) => ({
        ...t,
        startTime: new Date(t.startTime),
        endTime: new Date(t.endTime),
      })));
    }

    const storedLocations = localStorage.getItem(LOCATIONS_KEY);
    if (storedLocations) {
      setSavedLocations(JSON.parse(storedLocations));
    }
  }, []);

  const saveTrips = (newTrips: Trip[]) => {
    setTrips(newTrips);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(newTrips));
  };

  const saveLocations = (newLocations: Location[]) => {
    setSavedLocations(newLocations);
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(newLocations));
  };

  const addTrip = (trip: Omit<Trip, 'id' | 'ikAmount'>) => {
    const newTrip: Trip = {
      ...trip,
      id: crypto.randomUUID(),
      ikAmount: trip.distance * IK_RATE,
    };
    saveTrips([newTrip, ...trips]);
    return newTrip;
  };

  const deleteTrip = (id: string) => {
    saveTrips(trips.filter(t => t.id !== id));
  };

  const addLocation = (location: Omit<Location, 'id'>) => {
    const newLocation: Location = {
      ...location,
      id: crypto.randomUUID(),
    };
    saveLocations([...savedLocations, newLocation]);
    return newLocation;
  };

  const updateLocation = (id: string, updates: Partial<Location>) => {
    saveLocations(savedLocations.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLocation = (id: string) => {
    saveLocations(savedLocations.filter(l => l.id !== id));
  };

  const totalKm = trips.reduce((sum, t) => sum + t.distance, 0);
  const totalIK = trips.reduce((sum, t) => sum + t.ikAmount, 0);

  return {
    trips,
    savedLocations,
    totalKm,
    totalIK,
    addTrip,
    deleteTrip,
    addLocation,
    updateLocation,
    deleteLocation,
  };
}
