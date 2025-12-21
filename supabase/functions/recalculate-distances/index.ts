import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GOOGLE_MAPS_API_KEY = 'AIzaSyDjuGRMRKrDb5OYhO0_Efcm8I7QpUe70IY';

// IK Barème 2024
interface IKBareme {
  cv: string;
  upTo5000: { rate: number };
  from5001To20000: { rate: number; fixed: number };
  over20000: { rate: number };
}

const IK_BAREME_2024: IKBareme[] = [
  { cv: '3', upTo5000: { rate: 0.529 }, from5001To20000: { rate: 0.316, fixed: 1065 }, over20000: { rate: 0.370 } },
  { cv: '4', upTo5000: { rate: 0.606 }, from5001To20000: { rate: 0.340, fixed: 1330 }, over20000: { rate: 0.407 } },
  { cv: '5', upTo5000: { rate: 0.636 }, from5001To20000: { rate: 0.357, fixed: 1395 }, over20000: { rate: 0.427 } },
  { cv: '6', upTo5000: { rate: 0.665 }, from5001To20000: { rate: 0.374, fixed: 1457 }, over20000: { rate: 0.447 } },
  { cv: '7+', upTo5000: { rate: 0.697 }, from5001To20000: { rate: 0.394, fixed: 1515 }, over20000: { rate: 0.470 } },
];

function getIKBareme(fiscalPower: number): IKBareme {
  if (fiscalPower <= 3) return IK_BAREME_2024[0];
  if (fiscalPower === 4) return IK_BAREME_2024[1];
  if (fiscalPower === 5) return IK_BAREME_2024[2];
  if (fiscalPower === 6) return IK_BAREME_2024[3];
  return IK_BAREME_2024[4];
}

function calculateTotalAnnualIK(totalAnnualKm: number, fiscalPower: number): number {
  const bareme = getIKBareme(fiscalPower);
  if (totalAnnualKm <= 5000) {
    return totalAnnualKm * bareme.upTo5000.rate;
  } else if (totalAnnualKm <= 20000) {
    return (totalAnnualKm * bareme.from5001To20000.rate) + bareme.from5001To20000.fixed;
  } else {
    return totalAnnualKm * bareme.over20000.rate;
  }
}

// Get user's home location for distance calculation
async function getUserHomeLocation(userId: string, supabase: any): Promise<string | null> {
  const { data: homeLocation } = await supabase
    .from('locations')
    .select('address, name')
    .eq('user_id', userId)
    .eq('type', 'home')
    .limit(1);

  if (homeLocation && homeLocation.length > 0 && homeLocation[0].address) {
    return homeLocation[0].address;
  }

  const { data: anyLocation } = await supabase
    .from('locations')
    .select('address, name')
    .eq('user_id', userId)
    .not('address', 'is', null)
    .limit(1);

  if (anyLocation && anyLocation.length > 0 && anyLocation[0].address) {
    return anyLocation[0].address;
  }

  return null;
}

// Calculate driving distance using Google Maps Distance Matrix API
async function calculateDrivingDistance(origin: string, destination: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode: 'driving',
      language: 'fr',
      key: GOOGLE_MAPS_API_KEY,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );

    if (!response.ok) {
      console.error('Distance Matrix API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Distance Matrix API status:', data.status, data.error_message);
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (element?.status === 'OK' && element.distance?.value) {
      const distanceKm = Math.round(element.distance.value / 100) / 10;
      console.log(`📏 Distance: ${origin} → ${destination} = ${distanceKm} km`);
      return distanceKm;
    }

    console.log(`⚠️ Could not calculate distance: ${origin} → ${destination}`);
    return null;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
}

// Get vehicle info
async function getVehicle(vehicleId: string, supabase: any): Promise<{ fiscal_power: number; is_electric: boolean } | null> {
  const { data } = await supabase
    .from('vehicles')
    .select('fiscal_power, is_electric')
    .eq('id', vehicleId)
    .maybeSingle();
  
  return data;
}

// Get total annual km for a vehicle
async function getVehicleAnnualKm(userId: string, vehicleId: string, tripDate: string, supabase: any): Promise<number> {
  const year = new Date(tripDate).getFullYear();
  const startOfYear = `${year}-01-01`;
  
  const { data: trips } = await supabase
    .from('trips')
    .select('distance, date')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .gte('date', startOfYear)
    .lt('date', tripDate);

  return trips?.reduce((sum: number, t: { distance: number }) => sum + (t.distance || 0), 0) || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting distance recalculation...');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get all trips with distance = 0
    const { data: tripsToUpdate, error: tripsError } = await supabase
      .from('trips')
      .select('id, user_id, vehicle_id, start_location, end_location, round_trip, date')
      .eq('distance', 0)
      .order('date', { ascending: true });

    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
      throw tripsError;
    }

    console.log(`Found ${tripsToUpdate?.length || 0} trips with distance=0`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // Group trips by user to fetch home location once per user
    const userHomeCache: Record<string, string | null> = {};

    for (const trip of tripsToUpdate || []) {
      try {
        // Get user's home location (cached)
        if (!(trip.user_id in userHomeCache)) {
          userHomeCache[trip.user_id] = await getUserHomeLocation(trip.user_id, supabase);
        }
        const userHome = userHomeCache[trip.user_id];

        if (!userHome) {
          console.log(`⏭️ Skipping trip ${trip.id} - no home address for user`);
          skipped++;
          continue;
        }

        // Determine origin: use home address if start_location is just a name like "Maison"
        const origin = trip.start_location.toLowerCase().includes('maison') || 
                       trip.start_location.length < 20 
                       ? userHome 
                       : trip.start_location;

        // Calculate distance
        const oneWayDistance = await calculateDrivingDistance(origin, trip.end_location);
        
        if (oneWayDistance === null || oneWayDistance === 0) {
          console.log(`⏭️ Skipping trip ${trip.id} - could not calculate distance`);
          skipped++;
          continue;
        }

        // Apply round trip multiplier
        const totalDistance = trip.round_trip ? oneWayDistance * 2 : oneWayDistance;

        // Calculate IK if vehicle exists
        let ikAmount = 0;
        if (trip.vehicle_id) {
          const vehicle = await getVehicle(trip.vehicle_id, supabase);
          if (vehicle) {
            const annualKmBefore = await getVehicleAnnualKm(trip.user_id, trip.vehicle_id, trip.date, supabase);
            const annualKmAfter = annualKmBefore + totalDistance;
            
            const ikBefore = calculateTotalAnnualIK(annualKmBefore, vehicle.fiscal_power);
            const ikAfter = calculateTotalAnnualIK(annualKmAfter, vehicle.fiscal_power);
            ikAmount = ikAfter - ikBefore;
            
            if (vehicle.is_electric) {
              ikAmount *= 1.20;
            }
            
            ikAmount = Math.round(ikAmount * 100) / 100;
          }
        }

        // Update trip
        const { error: updateError } = await supabase
          .from('trips')
          .update({
            distance: totalDistance,
            start_location: origin, // Update with full address
            ik_amount: ikAmount,
          })
          .eq('id', trip.id);

        if (updateError) {
          console.error(`❌ Failed to update trip ${trip.id}:`, updateError);
          failed++;
          continue;
        }

        console.log(`✅ Updated trip ${trip.id}: ${totalDistance}km, ${ikAmount}€`);
        updated++;

      } catch (error) {
        console.error(`Error processing trip ${trip.id}:`, error);
        failed++;
      }
    }

    const result = {
      success: true,
      totalTrips: tripsToUpdate?.length || 0,
      updated,
      skipped,
      failed,
      timestamp: new Date().toISOString(),
    };

    console.log('Distance recalculation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in recalculate-distances:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
