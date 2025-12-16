import { useState, useEffect } from 'react';
import { Trip, Location, Vehicle, calculateTotalAnnualIK } from '@/types/trip';

const TRIPS_KEY = 'ik-tracker-trips';
const LOCATIONS_KEY = 'ik-tracker-locations';
const VEHICLES_KEY = 'ik-tracker-vehicles';

const defaultLocations: Location[] = [
  { id: '1', name: 'Maison', address: '', type: 'home' },
  { id: '2', name: 'Bureau', address: '', type: 'office' },
];

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [savedLocations, setSavedLocations] = useState<Location[]>(defaultLocations);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

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

    const storedVehicles = localStorage.getItem(VEHICLES_KEY);
    if (storedVehicles) {
      setVehicles(JSON.parse(storedVehicles));
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

  const saveVehicles = (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(newVehicles));
  };

  // Calculate total km for the current year for a specific vehicle
  const getTotalAnnualKm = (vehicleId: string) => {
    const currentYear = new Date().getFullYear();
    return trips
      .filter(t => t.vehicleId === vehicleId && new Date(t.startTime).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.distance, 0);
  };

  const addTrip = (trip: Omit<Trip, 'id' | 'ikAmount'>) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    if (!vehicle) return null;

    const totalAnnualKm = getTotalAnnualKm(trip.vehicleId) + trip.distance;
    const ikAmount = calculateTotalAnnualIK(totalAnnualKm, vehicle.fiscalPower) - 
                     calculateTotalAnnualIK(totalAnnualKm - trip.distance, vehicle.fiscalPower);

    const newTrip: Trip = {
      ...trip,
      id: crypto.randomUUID(),
      ikAmount,
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

  const addVehicle = (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: crypto.randomUUID(),
    };
    saveVehicles([...vehicles, newVehicle]);
    return newVehicle;
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    saveVehicles(vehicles.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVehicle = (id: string) => {
    saveVehicles(vehicles.filter(v => v.id !== id));
  };

  const totalKm = trips.reduce((sum, t) => sum + t.distance, 0);
  const totalIK = trips.reduce((sum, t) => sum + t.ikAmount, 0);

  // Recalculate total IK based on annual totals per vehicle
  const recalculatedTotalIK = () => {
    const vehicleKms = new Map<string, number>();
    trips.forEach(t => {
      const current = vehicleKms.get(t.vehicleId) || 0;
      vehicleKms.set(t.vehicleId, current + t.distance);
    });

    let total = 0;
    vehicleKms.forEach((km, vehicleId) => {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        total += calculateTotalAnnualIK(km, vehicle.fiscalPower);
      }
    });
    return total;
  };

  return {
    trips,
    savedLocations,
    vehicles,
    totalKm,
    totalIK: recalculatedTotalIK(),
    getTotalAnnualKm,
    addTrip,
    deleteTrip,
    addLocation,
    updateLocation,
    deleteLocation,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
