import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trip, Location, Vehicle, calculateTotalAnnualIK, TourStopData } from '@/types/trip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePreferences } from './usePreferences';

const TRIPS_KEY = 'ik-tracker-trips';
const LOCATIONS_KEY = 'ik-tracker-locations';
const VEHICLES_KEY = 'ik-tracker-vehicles';

const defaultLocations: Location[] = [
  { id: '1', name: 'Maison', address: '', type: 'home' },
  { id: '2', name: 'Bureau', address: '', type: 'office' },
];

export function useTrips() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [savedLocations, setSavedLocations] = useState<Location[]>(defaultLocations);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from database for logged-in users
  const loadFromDatabase = useCallback(async () => {
    if (!user) return;

    try {
      // Load vehicles
      const { data: dbVehicles } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbVehicles) {
        setVehicles(dbVehicles.map(v => ({
          id: v.id,
          ownerFirstName: (v as any).owner_first_name || '',
          ownerLastName: (v as any).owner_last_name || '',
          licensePlate: (v as any).license_plate || '',
          make: (v as any).make || '',
          model: (v as any).model || v.name,
          fiscalPower: v.fiscal_power,
          year: (v as any).year || undefined,
          isElectric: (v as any).is_electric || false,
        })));
      }

      // Load locations
      const { data: dbLocations } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbLocations && dbLocations.length > 0) {
        setSavedLocations(dbLocations.map(l => ({
          id: l.id,
          name: l.name,
          address: l.address || '',
          type: l.type as Location['type'],
          lat: l.latitude || undefined,
          lng: l.longitude || undefined,
        })));
      }

      // Load trips
      const { data: dbTrips } = await supabase
        .from('trips')
        .select('*')
        .order('date', { ascending: false });

      if (dbTrips) {
        setTrips(dbTrips.map(t => ({
          id: t.id,
          vehicleId: t.vehicle_id,
          startLocation: { id: '', name: t.start_location, address: '', type: 'other' as const },
          endLocation: { id: '', name: t.end_location, address: '', type: 'other' as const },
          distance: t.distance,
          baseDistance: t.round_trip ? t.distance / 2 : t.distance,
          roundTrip: t.round_trip,
          purpose: t.purpose || '',
          startTime: new Date(t.date),
          endTime: new Date(t.date),
          ikAmount: t.ik_amount,
          tourStops: (t as any).tour_stops as TourStopData[] | undefined,
          calendarEventId: t.calendar_event_id || undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading from database:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load from localStorage for non-logged users
  const loadFromLocalStorage = useCallback(() => {
    const stored = localStorage.getItem(TRIPS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setTrips(parsed.map((t: any) => ({
        ...t,
        baseDistance: t.baseDistance || t.distance,
        roundTrip: t.roundTrip || false,
        startTime: new Date(t.startTime),
        endTime: new Date(t.endTime),
        tourStops: t.tourStops || undefined,
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
    setLoading(false);
  }, []);

  // Migrate localStorage data to database when user logs in
  const migrateToDatabase = useCallback(async () => {
    if (!user) return;

    const localVehicles = localStorage.getItem(VEHICLES_KEY);
    const localLocations = localStorage.getItem(LOCATIONS_KEY);
    const localTrips = localStorage.getItem(TRIPS_KEY);

    // Check if there's local data to migrate
    if (!localVehicles && !localLocations && !localTrips) return;

    try {
      // Migrate vehicles
      if (localVehicles) {
        const vehiclesToMigrate: Vehicle[] = JSON.parse(localVehicles);
        const vehicleIdMap = new Map<string, string>();

        for (const v of vehiclesToMigrate) {
          const { data } = await supabase
            .from('vehicles')
            .insert({
              user_id: user.id,
              name: `${v.make} ${v.model}`.trim() || 'Véhicule',
              fiscal_power: v.fiscalPower,
              owner_first_name: v.ownerFirstName,
              owner_last_name: v.ownerLastName,
              license_plate: v.licensePlate,
              make: v.make,
              model: v.model,
              year: v.year || null,
            } as any)
            .select()
            .single();
          
          if (data) {
            vehicleIdMap.set(v.id, data.id);
          }
        }

        // Migrate locations
        if (localLocations) {
          const locationsToMigrate: Location[] = JSON.parse(localLocations);
          for (const l of locationsToMigrate) {
            if (l.id === '1' || l.id === '2') continue; // Skip defaults
            await supabase.from('locations').insert({
              user_id: user.id,
              name: l.name,
              address: l.address || null,
              type: l.type,
              latitude: l.lat || null,
              longitude: l.lng || null,
            });
          }
        }

        // Migrate trips
        if (localTrips) {
          const tripsToMigrate: Trip[] = JSON.parse(localTrips);
          for (const t of tripsToMigrate) {
            const newVehicleId = vehicleIdMap.get(t.vehicleId);
            if (newVehicleId) {
              await supabase.from('trips').insert({
                user_id: user.id,
                vehicle_id: newVehicleId,
                date: new Date(t.startTime).toISOString().split('T')[0],
                start_location: t.startLocation.name,
                end_location: t.endLocation.name,
                distance: t.distance,
                purpose: t.purpose || null,
                round_trip: false,
                ik_amount: t.ikAmount,
              });
            }
          }
        }

        // Clear localStorage after migration
        localStorage.removeItem(VEHICLES_KEY);
        localStorage.removeItem(LOCATIONS_KEY);
        localStorage.removeItem(TRIPS_KEY);
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      migrateToDatabase().then(() => loadFromDatabase());
    } else {
      loadFromLocalStorage();
    }
  }, [user, loadFromDatabase, loadFromLocalStorage, migrateToDatabase]);

  // Save functions
  const saveTripsLocal = (newTrips: Trip[]) => {
    setTrips(newTrips);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(newTrips));
  };

  const saveLocationsLocal = (newLocations: Location[]) => {
    setSavedLocations(newLocations);
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(newLocations));
  };

  const saveVehiclesLocal = (newVehicles: Vehicle[]) => {
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

  // CRUD Operations
  const addTrip = async (trip: Omit<Trip, 'id' | 'ikAmount'>) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    if (!vehicle) return null;

    const totalAnnualKm = getTotalAnnualKm(trip.vehicleId) + trip.distance;
    let ikAmount = calculateTotalAnnualIK(totalAnnualKm, vehicle.fiscalPower) - 
                   calculateTotalAnnualIK(totalAnnualKm - trip.distance, vehicle.fiscalPower);
    
    // Apply 20% bonus for electric vehicles
    if (vehicle.isElectric) {
      ikAmount = ikAmount * 1.2;
    }

    if (user) {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          vehicle_id: trip.vehicleId,
          date: new Date(trip.startTime).toISOString().split('T')[0],
          start_location: trip.startLocation.name,
          end_location: trip.endLocation.name,
          distance: trip.distance,
          purpose: trip.purpose || null,
          round_trip: trip.roundTrip,
          ik_amount: ikAmount,
          tour_stops: trip.tourStops || null,
        } as any)
        .select()
        .single();

      if (data) {
        const newTrip: Trip = {
          id: data.id,
          vehicleId: data.vehicle_id,
          startLocation: trip.startLocation,
          endLocation: trip.endLocation,
          distance: data.distance,
          baseDistance: trip.baseDistance,
          roundTrip: trip.roundTrip,
          purpose: data.purpose || '',
          startTime: new Date(data.date),
          endTime: new Date(data.date),
          ikAmount: data.ik_amount,
          tourStops: (data as any).tour_stops as TourStopData[] | undefined,
        };
        setTrips(prev => [newTrip, ...prev]);
        return newTrip;
      }
      return null;
    } else {
      const newTrip: Trip = {
        ...trip,
        id: crypto.randomUUID(),
        ikAmount,
        tourStops: trip.tourStops,
      };
      saveTripsLocal([newTrip, ...trips]);
      return newTrip;
    }
  };

  const deleteTrip = async (id: string) => {
    if (user) {
      await supabase.from('trips').delete().eq('id', id);
      setTrips(prev => prev.filter(t => t.id !== id));
    } else {
      saveTripsLocal(trips.filter(t => t.id !== id));
    }
  };

  const updateTrip = async (id: string, updates: Partial<Omit<Trip, 'id'>>) => {
    const existingTrip = trips.find(t => t.id === id);
    if (!existingTrip) return null;

    // IMPORTANT: Once a trip is created, the vehicle cannot be changed
    // Remove vehicleId from updates to prevent modification
    const { vehicleId: _ignoredVehicleId, ...safeUpdates } = updates;

    const vehicle = vehicles.find(v => v.id === existingTrip.vehicleId);
    if (!vehicle) return null;

    // Recalculate IK if distance changed
    let ikAmount = existingTrip.ikAmount;
    if (safeUpdates.distance !== undefined && safeUpdates.distance !== existingTrip.distance) {
      const totalAnnualKm = getTotalAnnualKm(vehicle.id) - existingTrip.distance + safeUpdates.distance;
      ikAmount = calculateTotalAnnualIK(totalAnnualKm, vehicle.fiscalPower) - 
                 calculateTotalAnnualIK(totalAnnualKm - safeUpdates.distance, vehicle.fiscalPower);
      
      // Apply 20% bonus for electric vehicles
      if (vehicle.isElectric) {
        ikAmount = ikAmount * 1.2;
      }
    }

    if (user) {
      const { error } = await supabase
        .from('trips')
        .update({
          // vehicle_id is NOT updated - trips are permanently linked to their vehicle
          date: safeUpdates.startTime ? new Date(safeUpdates.startTime).toISOString().split('T')[0] : undefined,
          start_location: safeUpdates.startLocation?.name,
          end_location: safeUpdates.endLocation?.name,
          distance: safeUpdates.distance,
          round_trip: safeUpdates.roundTrip,
          purpose: safeUpdates.purpose || null,
          ik_amount: ikAmount,
        })
        .eq('id', id);

      if (!error) {
        const updatedTrip: Trip = {
          ...existingTrip,
          ...safeUpdates,
          vehicleId: existingTrip.vehicleId, // Ensure vehicleId stays unchanged
          ikAmount,
        };
        setTrips(prev => prev.map(t => t.id === id ? updatedTrip : t));
        return updatedTrip;
      }
      return null;
    } else {
      const updatedTrip: Trip = {
        ...existingTrip,
        ...safeUpdates,
        vehicleId: existingTrip.vehicleId, // Ensure vehicleId stays unchanged
        ikAmount,
      };
      saveTripsLocal(trips.map(t => t.id === id ? updatedTrip : t));
      return updatedTrip;
    }
  };

  const addLocation = async (location: Omit<Location, 'id'>) => {
    if (user) {
      const { data } = await supabase
        .from('locations')
        .insert({
          user_id: user.id,
          name: location.name,
          address: location.address || null,
          type: location.type,
          latitude: location.lat || null,
          longitude: location.lng || null,
        })
        .select()
        .single();

      if (data) {
        const newLocation: Location = {
          id: data.id,
          name: data.name,
          address: data.address || '',
          type: data.type as Location['type'],
          lat: data.latitude || undefined,
          lng: data.longitude || undefined,
        };
        setSavedLocations(prev => [...prev, newLocation]);
        return newLocation;
      }
      return null;
    } else {
      const newLocation: Location = {
        ...location,
        id: crypto.randomUUID(),
      };
      saveLocationsLocal([...savedLocations, newLocation]);
      return newLocation;
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    if (user) {
      // Check if this is a default location (not in database)
      const isDefaultLocation = id === '1' || id === '2';
      
      if (isDefaultLocation) {
        // Create new location in database instead of updating
        const existingLocation = savedLocations.find(l => l.id === id);
        const { data } = await supabase
          .from('locations')
          .insert({
            user_id: user.id,
            name: updates.name || existingLocation?.name || '',
            address: updates.address || existingLocation?.address || null,
            type: updates.type || existingLocation?.type || 'other',
            latitude: updates.lat || existingLocation?.lat || null,
            longitude: updates.lng || existingLocation?.lng || null,
          })
          .select()
          .single();

        if (data) {
          // Replace the default location with the new DB location
          setSavedLocations(prev => prev.map(l => l.id === id ? {
            id: data.id,
            name: data.name,
            address: data.address || '',
            type: data.type as Location['type'],
            lat: data.latitude || undefined,
            lng: data.longitude || undefined,
          } : l));
        }
      } else {
        // Normal update for DB locations
        await supabase
          .from('locations')
          .update({
            name: updates.name,
            address: updates.address || null,
            type: updates.type,
            latitude: updates.lat || null,
            longitude: updates.lng || null,
          })
          .eq('id', id);
        setSavedLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
      }
    } else {
      saveLocationsLocal(savedLocations.map(l => l.id === id ? { ...l, ...updates } : l));
    }
  };

  const deleteLocation = async (id: string) => {
    if (user) {
      await supabase.from('locations').delete().eq('id', id);
      setSavedLocations(prev => prev.filter(l => l.id !== id));
    } else {
      saveLocationsLocal(savedLocations.filter(l => l.id !== id));
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    if (user) {
      const { data } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          name: `${vehicle.make} ${vehicle.model}`.trim() || 'Véhicule',
          fiscal_power: vehicle.fiscalPower,
          owner_first_name: vehicle.ownerFirstName,
          owner_last_name: vehicle.ownerLastName,
          license_plate: vehicle.licensePlate,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year || null,
          is_electric: vehicle.isElectric || false,
        } as any)
        .select()
        .single();

      if (data) {
        const newVehicle: Vehicle = {
          ...vehicle,
          id: data.id,
        };
        setVehicles(prev => [...prev, newVehicle]);
        return newVehicle;
      }
      return null;
    } else {
      const newVehicle: Vehicle = {
        ...vehicle,
        id: crypto.randomUUID(),
      };
      saveVehiclesLocal([...vehicles, newVehicle]);
      return newVehicle;
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    const existingVehicle = vehicles.find(v => v.id === id);
    if (!existingVehicle) return;

    // Check if fiscal power or electric status changed - need to recalculate IK for all trips
    const fiscalPowerChanged = updates.fiscalPower !== undefined && updates.fiscalPower !== existingVehicle.fiscalPower;
    const electricStatusChanged = updates.isElectric !== undefined && updates.isElectric !== existingVehicle.isElectric;
    const needsIKRecalculation = fiscalPowerChanged || electricStatusChanged;

    const newFiscalPower = updates.fiscalPower ?? existingVehicle.fiscalPower;
    const newIsElectric = updates.isElectric ?? existingVehicle.isElectric;

    if (user) {
      // Update the vehicle first
      await supabase
        .from('vehicles')
        .update({
          name: `${updates.make || existingVehicle.make || ''} ${updates.model || existingVehicle.model || ''}`.trim() || undefined,
          fiscal_power: updates.fiscalPower,
          owner_first_name: updates.ownerFirstName,
          owner_last_name: updates.ownerLastName,
          license_plate: updates.licensePlate,
          make: updates.make,
          model: updates.model,
          year: updates.year || null,
          is_electric: updates.isElectric,
        } as any)
        .eq('id', id);

      // If fiscal power or electric status changed, recalculate IK for all trips with this vehicle
      if (needsIKRecalculation) {
        const vehicleTrips = trips.filter(t => t.vehicleId === id);
        
        // Sort trips by date to calculate cumulative IK correctly
        const sortedTrips = [...vehicleTrips].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        let cumulativeKm = 0;
        for (const trip of sortedTrips) {
          const previousCumulativeKm = cumulativeKm;
          cumulativeKm += trip.distance;
          
          // Calculate new IK based on cumulative distance
          let newIkAmount = calculateTotalAnnualIK(cumulativeKm, newFiscalPower) - 
                           calculateTotalAnnualIK(previousCumulativeKm, newFiscalPower);
          
          // Apply 20% bonus for electric vehicles
          if (newIsElectric) {
            newIkAmount = newIkAmount * 1.2;
          }

          // Update trip in database
          await supabase
            .from('trips')
            .update({ ik_amount: newIkAmount })
            .eq('id', trip.id);
        }

        // Reload trips from database to get updated IK amounts
        const { data: updatedTrips } = await supabase
          .from('trips')
          .select('*')
          .order('date', { ascending: false });

        if (updatedTrips) {
          setTrips(updatedTrips.map(t => ({
            id: t.id,
            vehicleId: t.vehicle_id,
            startLocation: { id: '', name: t.start_location, address: '', type: 'other' as const },
            endLocation: { id: '', name: t.end_location, address: '', type: 'other' as const },
            distance: t.distance,
            baseDistance: t.round_trip ? t.distance / 2 : t.distance,
            roundTrip: t.round_trip,
            purpose: t.purpose || '',
            startTime: new Date(t.date),
            endTime: new Date(t.date),
            ikAmount: t.ik_amount,
            tourStops: (t as any).tour_stops as TourStopData[] | undefined,
            calendarEventId: t.calendar_event_id || undefined,
          })));
        }
      }

      setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    } else {
      // For local storage users
      if (needsIKRecalculation) {
        const vehicleTrips = trips.filter(t => t.vehicleId === id);
        const sortedTrips = [...vehicleTrips].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        let cumulativeKm = 0;
        const updatedTripsMap = new Map<string, number>();
        
        for (const trip of sortedTrips) {
          const previousCumulativeKm = cumulativeKm;
          cumulativeKm += trip.distance;
          
          let newIkAmount = calculateTotalAnnualIK(cumulativeKm, newFiscalPower) - 
                           calculateTotalAnnualIK(previousCumulativeKm, newFiscalPower);
          
          if (newIsElectric) {
            newIkAmount = newIkAmount * 1.2;
          }
          
          updatedTripsMap.set(trip.id, newIkAmount);
        }

        // Update all trips with new IK amounts
        const newTrips = trips.map(t => 
          updatedTripsMap.has(t.id) 
            ? { ...t, ikAmount: updatedTripsMap.get(t.id)! } 
            : t
        );
        saveTripsLocal(newTrips);
      }
      
      saveVehiclesLocal(vehicles.map(v => v.id === id ? { ...v, ...updates } : v));
    }
  };

  const deleteVehicle = async (id: string) => {
    if (user) {
      await supabase.from('vehicles').delete().eq('id', id);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } else {
      saveVehiclesLocal(vehicles.filter(v => v.id !== id));
    }
  };

  // Filter trips based on counter reset date
  const filteredTrips = useMemo(() => {
    if (!preferences.counterResetDate) return trips;
    const resetDate = new Date(preferences.counterResetDate);
    return trips.filter(t => new Date(t.startTime) >= resetDate);
  }, [trips, preferences.counterResetDate]);

  const totalKm = filteredTrips.reduce((sum, t) => sum + t.distance, 0);

  const recalculatedTotalIK = useMemo(() => {
    const vehicleKms = new Map<string, number>();
    filteredTrips.forEach(t => {
      const current = vehicleKms.get(t.vehicleId) || 0;
      vehicleKms.set(t.vehicleId, current + t.distance);
    });

    let total = 0;
    vehicleKms.forEach((km, vehicleId) => {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        let vehicleIK = calculateTotalAnnualIK(km, vehicle.fiscalPower);
        // Apply 20% bonus for electric vehicles
        if (vehicle.isElectric) {
          vehicleIK = vehicleIK * 1.2;
        }
        total += vehicleIK;
      }
    });
    return total;
  }, [filteredTrips, vehicles]);

  return {
    trips,
    savedLocations,
    vehicles,
    totalKm,
    totalIK: recalculatedTotalIK,
    loading,
    getTotalAnnualKm,
    addTrip,
    updateTrip,
    deleteTrip,
    addLocation,
    updateLocation,
    deleteLocation,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
