import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Google Maps API key for distance calculation
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// Default start location for calendar-detected trips
const DEFAULT_START_LOCATION = "Maison";

interface CalendarEvent {
  id: string;
  summary?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface CalendarConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

// Refresh Google access token if expired
async function refreshGoogleToken(connection: CalendarConnection, supabase: any): Promise<string | null> {
  if (!connection.refresh_token) {
    console.log(`No refresh token for connection ${connection.id}`);
    return null;
  }

  // Check if token is expired
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    if (expiresAt > new Date()) {
      return connection.access_token; // Token still valid
    }
  }

  console.log(`Refreshing token for connection ${connection.id}`);

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error(`Failed to refresh token for connection ${connection.id}:`, await response.text());
      return null;
    }

    const tokens = await response.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Update token in database
    await supabase
      .from('calendar_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return tokens.access_token;
  } catch (error) {
    console.error(`Error refreshing token for connection ${connection.id}:`, error);
    return null;
  }
}

// Calculate date range for calendar sync
// Default (monthsBack=0): today only + 14 days ahead (prevents re-importing archived trips)
// With monthsBack > 0: allows importing past events for manual sync
function getCalendarSyncDateRange(monthsBack: number = 0): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  let startDate: Date;
  if (monthsBack > 0) {
    // User explicitly requested past import - go back X months
    startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1, 0, 0, 0);
  } else {
    // Default: start from today at midnight (no past import)
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
  
  // End window: 14 days from today
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 23, 59, 59);
  
  return { startDate, endDate };
}

// Fetch Google Calendar events based on monthsBack parameter
async function fetchGoogleCalendarEvents(accessToken: string, monthsBack: number = 0): Promise<{ events: CalendarEvent[]; dateRange: { startDate: string; endDate: string } }> {
  const { startDate, endDate } = getCalendarSyncDateRange(monthsBack);

  const params = new URLSearchParams({
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  });

  console.log(`Fetching Google Calendar events from ${startDate.toISOString()} to ${endDate.toISOString()} (monthsBack=${monthsBack})`);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch calendar events:', response.status, errorText);
    return { 
      events: [], 
      dateRange: { 
        startDate: startDate.toISOString().split('T')[0], 
        endDate: endDate.toISOString().split('T')[0] 
      } 
    };
  }

  const data = await response.json();
  console.log(`Fetched ${data.items?.length || 0} raw events from Google Calendar`);
  return { 
    events: data.items || [], 
    dateRange: { 
      startDate: startDate.toISOString().split('T')[0], 
      endDate: endDate.toISOString().split('T')[0] 
    } 
  };
}

// IK Barème 2024 (same as frontend)
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

interface VehicleInfo {
  id: string;
  fiscal_power: number;
  is_electric: boolean;
}

// Get user's default vehicle: if only one vehicle, use it; otherwise use last used from trips
async function getUserLastUsedVehicle(userId: string, supabase: any): Promise<VehicleInfo | null> {
  // First, get all user's vehicles
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('id, fiscal_power, is_electric')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!allVehicles || allVehicles.length === 0) {
    return null;
  }

  // If only one vehicle, use it directly
  if (allVehicles.length === 1) {
    console.log(`User has only 1 vehicle, using it: ${allVehicles[0].id}`);
    return allVehicles[0];
  }

  // Multiple vehicles: try to get the one from the most recent trip
  const { data: recentTrip } = await supabase
    .from('trips')
    .select('vehicle_id')
    .eq('user_id', userId)
    .not('vehicle_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastVehicleId = recentTrip?.[0]?.vehicle_id;

  if (lastVehicleId) {
    const lastVehicle = allVehicles.find((v: VehicleInfo) => v.id === lastVehicleId);
    if (lastVehicle) {
      console.log(`Using last used vehicle: ${lastVehicle.id}`);
      return lastVehicle;
    }
  }

  // Fallback: use the most recently created vehicle
  console.log(`Fallback to most recent vehicle: ${allVehicles[0].id}`);
  return allVehicles[0];
}

// Get total annual km for a vehicle in current year
async function getVehicleAnnualKm(userId: string, vehicleId: string, supabase: any): Promise<number> {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const { data: trips } = await supabase
    .from('trips')
    .select('distance')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .gte('date', startOfYear)
    .lte('date', endOfYear);

  return trips?.reduce((sum: number, t: { distance: number }) => sum + (t.distance || 0), 0) || 0;
}

// Get user's home/default location for distance calculation
// Returns both address (for distance calc) and name (for trip display)
async function getUserHomeLocation(userId: string, supabase: any): Promise<{ address: string; name: string } | null> {
  // Try to find a 'home' type location first
  const { data: homeLocation } = await supabase
    .from('locations')
    .select('address, name')
    .eq('user_id', userId)
    .eq('type', 'home')
    .limit(1);

  if (homeLocation && homeLocation.length > 0 && homeLocation[0].address) {
    return { 
      address: homeLocation[0].address, 
      name: homeLocation[0].name || 'Domicile' 
    };
  }

  // Fallback: try to find an 'office' type location
  const { data: officeLocation } = await supabase
    .from('locations')
    .select('address, name')
    .eq('user_id', userId)
    .eq('type', 'office')
    .limit(1);

  if (officeLocation && officeLocation.length > 0 && officeLocation[0].address) {
    return { 
      address: officeLocation[0].address, 
      name: officeLocation[0].name || 'Bureau' 
    };
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
      // Convert meters to kilometers, round to 1 decimal
      const distanceKm = Math.round(element.distance.value / 100) / 10;
      console.log(`📏 Distance calculated: ${origin} → ${destination} = ${distanceKm} km`);
      return distanceKm;
    }

    console.log(`⚠️ Could not calculate distance for: ${origin} → ${destination} (status: ${element?.status})`);
    return null;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
}

// Check if a trip already exists for this calendar event (including deleted ones)
async function tripExistsForEvent(userId: string, eventId: string, supabase: any): Promise<{ exists: boolean; wasDeleted: boolean }> {
  const { data } = await supabase
    .from('trips')
    .select('id, deleted_at')
    .eq('user_id', userId)
    .eq('calendar_event_id', eventId)
    .limit(1);

  if (!data || data.length === 0) {
    return { exists: false, wasDeleted: false };
  }
  
  // Trip exists - check if it was deleted (archived)
  const wasDeleted = data[0].deleted_at !== null;
  return { exists: true, wasDeleted };
}

// Check if a similar trip already exists (same date + similar destination) - includes archived trips
async function similarTripExists(
  userId: string, 
  eventDate: string, 
  destination: string, 
  supabase: any
): Promise<{ exists: boolean; wasDeleted: boolean }> {
  if (!destination) return { exists: false, wasDeleted: false };
  
  // Normalize destination for comparison (lowercase, trim)
  const normalizedDest = destination.toLowerCase().trim();
  
  // Fetch all trips for this date (including archived ones)
  const { data: existingTrips } = await supabase
    .from('trips')
    .select('id, end_location, deleted_at')
    .eq('user_id', userId)
    .eq('date', eventDate);

  if (!existingTrips || existingTrips.length === 0) {
    return { exists: false, wasDeleted: false };
  }

  // Check for similar destinations
  for (const trip of existingTrips) {
    const tripDest = (trip.end_location || '').toLowerCase().trim();
    
    // Check if destinations are similar (contains match or significant overlap)
    const isSimilar = 
      tripDest === normalizedDest ||
      tripDest.includes(normalizedDest) ||
      normalizedDest.includes(tripDest) ||
      // Also check city-level match (first significant word)
      (tripDest.split(',')[0]?.trim() === normalizedDest.split(',')[0]?.trim() && 
       tripDest.split(',')[0]?.trim().length > 3);
    
    if (isSimilar) {
      console.log(`🔍 Found similar trip: "${trip.end_location}" matches "${destination}" on ${eventDate}`);
      return { exists: true, wasDeleted: trip.deleted_at !== null };
    }
  }

  return { exists: false, wasDeleted: false };
}

// Find matching keyword in frequent_destinations for event title
async function findFrequentDestination(userId: string, eventTitle: string, supabase: any): Promise<string | null> {
  if (!eventTitle) return null;
  
  // Get all user's frequent destinations
  const { data: destinations } = await supabase
    .from('frequent_destinations')
    .select('keyword, address')
    .eq('user_id', userId);
  
  if (!destinations || destinations.length === 0) return null;
  
  // Split title into words and check each against keywords (case-insensitive)
  const titleWords = eventTitle.toLowerCase().split(/\s+/);
  
  for (const dest of destinations) {
    const keyword = dest.keyword.toLowerCase();
    if (titleWords.some((word: string) => word.includes(keyword) || keyword.includes(word))) {
      console.log(`🔑 Found matching keyword "${dest.keyword}" for event "${eventTitle}" → ${dest.address}`);
      return dest.address;
    }
  }
  
  return null;
}

// Create a trip from a calendar event
async function createTripFromEvent(
  userId: string,
  event: CalendarEvent,
  vehicle: VehicleInfo | null,
  userHomeLocation: { address: string; name: string } | null,
  supabase: any
): Promise<{ created: boolean; reason?: string; distanceCalculated?: boolean; pending?: boolean }> {
  // Log all events for debugging
  console.log(`Processing event: "${event.summary}" | location: "${event.location || 'NONE'}" | id: ${event.id}`);

  // Check if trip already exists (including deleted/archived trips)
  const { exists, wasDeleted } = await tripExistsForEvent(userId, event.id, supabase);
  
  if (exists) {
    if (wasDeleted) {
      console.log(`⏭️ Trip was previously deleted for event "${event.summary}" - not re-importing`);
      return { created: false, reason: 'previously_deleted' };
    }
    console.log(`⏭️ Trip already exists for event "${event.summary}"`);
    return { created: false, reason: 'already_exists' };
  }

  // Get event date
  const eventDateTime = event.start.dateTime || event.start.date;
  if (!eventDateTime) {
    console.log(`⏭️ Skipping event "${event.summary}" - no start date`);
    return { created: false, reason: 'no_start_date' };
  }

  const eventDate = new Date(eventDateTime).toISOString().split('T')[0];

  // Determine destination address
  let destinationAddress = event.location || '';
  let tripStatus = 'validated';
  
  // If no location in event, try to find from frequent_destinations using title keywords
  if (!event.location) {
    const matchedAddress = await findFrequentDestination(userId, event.summary || '', supabase);
    if (matchedAddress) {
      destinationAddress = matchedAddress;
      console.log(`📍 Using frequent destination address: ${matchedAddress}`);
    } else {
      // No location and no keyword match - create as pending
      tripStatus = 'pending_location';
      console.log(`⚠️ No location found, creating as pending: "${event.summary}"`);
    }
  }

  // Check for similar trips (same date + similar destination) - prevents duplicates with archived trips
  if (destinationAddress) {
    const { exists: similarExists, wasDeleted: similarWasDeleted } = await similarTripExists(
      userId, 
      eventDate, 
      destinationAddress, 
      supabase
    );
    
    if (similarExists) {
      if (similarWasDeleted) {
        console.log(`⏭️ Similar archived trip found for "${event.summary}" on ${eventDate} - not re-importing`);
        return { created: false, reason: 'similar_archived' };
      }
      console.log(`⏭️ Similar trip already exists for "${event.summary}" on ${eventDate}`);
      return { created: false, reason: 'similar_exists' };
    }
  }

  // Use home location name, or default to "Domicile"
  let startLocationName = userHomeLocation?.name || DEFAULT_START_LOCATION;
  
  // Try to calculate distance if we have both addresses
  let distance = 0;
  let distanceCalculated = false;
  
  // Log warning if home location is missing
  if (!userHomeLocation?.address) {
    console.log(`⚠️ No home address configured for user ${userId} - distance will be 0`);
  }
  
  if (tripStatus === 'validated' && destinationAddress) {
    // Use home address if available, otherwise try using "Maison" as fallback
    const originAddress = userHomeLocation?.address;
    
    if (originAddress) {
      const calculatedDistance = await calculateDrivingDistance(originAddress, destinationAddress);
      if (calculatedDistance !== null && calculatedDistance > 0) {
        // Round trip = double the distance
        distance = calculatedDistance * 2;
        distanceCalculated = true;
        console.log(`📍 Auto-calculated round-trip distance: ${distance} km`);
      } else {
        // Distance calculation failed - mark as pending so user can fix it
        tripStatus = 'pending_location';
        console.log(`⚠️ Distance calculation failed, marking as pending: ${originAddress} → ${destinationAddress}`);
      }
    } else {
      // No home address - mark as pending so user knows they need to configure it
      tripStatus = 'pending_location';
      console.log(`⚠️ No home address, marking as pending: "${event.summary}"`);
    }
  }

  // Calculate IK amount if we have a vehicle and distance
  let ikAmount = 0;
  if (vehicle && distance > 0) {
    const annualKm = await getVehicleAnnualKm(userId, vehicle.id, supabase);
    const newAnnualTotal = annualKm + distance;
    
    // Calculate incremental IK (what this trip adds to total)
    const ikBefore = calculateTotalAnnualIK(annualKm, vehicle.fiscal_power);
    const ikAfter = calculateTotalAnnualIK(newAnnualTotal, vehicle.fiscal_power);
    ikAmount = ikAfter - ikBefore;
    
    // Apply 20% bonus for electric vehicles
    if (vehicle.is_electric) {
      ikAmount *= 1.20;
    }
    
    ikAmount = Math.round(ikAmount * 100) / 100;
    console.log(`💰 IK calculated: ${ikAmount}€ (annual km: ${annualKm} → ${newAnnualTotal})`);
  }
  
  // Create the trip - use actual address for start_location to enable proper distance calculation
  // Use the real address if available, fall back to name for display purposes
  const startLocationValue = userHomeLocation?.address || startLocationName;
  
  const { error } = await supabase.from('trips').insert({
    user_id: userId,
    vehicle_id: vehicle?.id || null,
    start_location: startLocationValue,
    end_location: destinationAddress || event.summary || 'Adresse à compléter',
    distance: distance,
    round_trip: true,
    purpose: event.summary || 'Rendez-vous calendrier',
    date: eventDate,
    ik_amount: ikAmount,
    source: 'google_calendar',
    calendar_event_id: event.id,
    status: tripStatus,
  });

  if (error) {
    console.error(`❌ Failed to create trip for event "${event.summary}":`, error);
    return { created: false, reason: 'db_error' };
  }

  if (tripStatus === 'pending_location') {
    console.log(`🕐 Created PENDING trip for event "${event.summary}" (no address)`);
    return { created: true, pending: true };
  }

  console.log(`✅ Created trip for event "${event.summary}" to ${destinationAddress} on ${eventDate} (vehicle: ${vehicle?.id || 'none'}, distance: ${distance}km, ik: ${ikAmount}€)`);
  return { created: true, distanceCalculated };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body to get monthsBack parameter
    let monthsBack = 0;
    try {
      const body = await req.json();
      monthsBack = body.monthsBack || 0;
    } catch {
      // No body or invalid JSON - use default
    }
    
    console.log('Starting calendar sync...');
    console.log('Time:', new Date().toISOString());
    console.log('Months back:', monthsBack);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get all active Google Calendar connections
    const { data: connections, error: connectionsError } = await supabase
      .from('calendar_connections')
      .select('id, user_id, access_token, refresh_token, token_expires_at')
      .eq('provider', 'google')
      .eq('is_active', true);

    if (connectionsError) {
      console.error('Failed to fetch calendar connections:', connectionsError);
      throw connectionsError;
    }

    console.log(`Found ${connections?.length || 0} active Google Calendar connections`);

    let totalTripsCreated = 0;
    let usersProcessed = 0;
    let syncDateRange: { startDate: string; endDate: string } | null = null;

    for (const connection of connections || []) {
      try {
        console.log(`Processing user ${connection.user_id}...`);

        // Refresh token if needed
        const accessToken = await refreshGoogleToken(connection, supabase);
        if (!accessToken) {
          console.log(`Skipping user ${connection.user_id} - no valid token`);
          continue;
        }

        // Fetch calendar events (with monthsBack parameter)
        const { events, dateRange } = await fetchGoogleCalendarEvents(accessToken, monthsBack);
        console.log(`Found ${events.length} events for user ${connection.user_id}`);

        // Store date range for response
        if (!syncDateRange) {
          syncDateRange = dateRange;
        }

        // Get user's last used vehicle
        const vehicle = await getUserLastUsedVehicle(connection.user_id, supabase);
        
        // Get user's home location for distance calculation and trip start name
        const userHomeLocation = await getUserHomeLocation(connection.user_id, supabase);
        console.log(`User home location: ${userHomeLocation ? `${userHomeLocation.name} (${userHomeLocation.address})` : 'not found'}`);

        // Create trips from events
        let tripsCreated = 0;
        let tripsWithDistance = 0;
        let skippedNoLocation = 0;
        let skippedAlreadyExists = 0;
        let skippedOther = 0;

        for (const event of events) {
          const result = await createTripFromEvent(
            connection.user_id,
            event,
            vehicle,
            userHomeLocation,
            supabase
          );
          if (result.created) {
            tripsCreated++;
            if (result.distanceCalculated) {
              tripsWithDistance++;
            }
          } else if (result.reason === 'no_location') {
            skippedNoLocation++;
          } else if (result.reason === 'already_exists') {
            skippedAlreadyExists++;
          } else {
            skippedOther++;
          }
        }

        totalTripsCreated += tripsCreated;
        usersProcessed++;
        console.log(`User ${connection.user_id}: created=${tripsCreated} (with_distance=${tripsWithDistance}), skipped_no_location=${skippedNoLocation}, skipped_exists=${skippedAlreadyExists}, skipped_other=${skippedOther}`);
      } catch (error) {
        console.error(`Error processing user ${connection.user_id}:`, error);
      }
    }

    const result = {
      success: true,
      usersProcessed,
      totalTripsCreated,
      dateRange: syncDateRange,
      timestamp: new Date().toISOString(),
    };

    console.log('Calendar sync completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in sync-calendar-trips:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
