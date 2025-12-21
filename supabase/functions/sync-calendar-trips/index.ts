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

// Fetch Google Calendar events: 7 days ago + today + next 14 days
async function fetchGoogleCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startWindow = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000); // -7 days
  const endWindow = new Date(startOfToday.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days

  const params = new URLSearchParams({
    timeMin: startWindow.toISOString(),
    timeMax: endWindow.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  console.log(`Fetching Google Calendar events from ${startWindow.toISOString()} to ${endWindow.toISOString()}`);

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
    return [];
  }

  const data = await response.json();
  console.log(`Fetched ${data.items?.length || 0} raw events from Google Calendar`);
  return data.items || [];
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

// Get user's last used vehicle (from most recent trip) or first vehicle
async function getUserLastUsedVehicle(userId: string, supabase: any): Promise<VehicleInfo | null> {
  // First try to get the vehicle from the most recent trip
  const { data: recentTrip } = await supabase
    .from('trips')
    .select('vehicle_id')
    .eq('user_id', userId)
    .not('vehicle_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastVehicleId = recentTrip?.[0]?.vehicle_id;

  if (lastVehicleId) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, fiscal_power, is_electric')
      .eq('id', lastVehicleId)
      .single();
    
    if (vehicle) return vehicle;
  }

  // Fallback: get the first vehicle
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, fiscal_power, is_electric')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  return vehicles?.[0] || null;
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

// Check if a trip already exists for this calendar event
async function tripExistsForEvent(userId: string, eventId: string, supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', userId)
    .eq('calendar_event_id', eventId)
    .limit(1);

  return (data?.length || 0) > 0;
}

// Create a trip from a calendar event
async function createTripFromEvent(
  userId: string,
  event: CalendarEvent,
  vehicle: VehicleInfo | null,
  supabase: any
): Promise<{ created: boolean; reason?: string }> {
  // Log all events for debugging
  console.log(`Processing event: "${event.summary}" | location: "${event.location || 'NONE'}" | id: ${event.id}`);

  // Skip events without location - but log it
  if (!event.location) {
    console.log(`⏭️ Skipping event "${event.summary}" - no location field`);
    return { created: false, reason: 'no_location' };
  }

  // Check if trip already exists
  if (await tripExistsForEvent(userId, event.id, supabase)) {
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

  // Calculate IK amount if we have a vehicle
  // Note: distance is 0 at creation, IK will be recalculated when user sets distance
  // But we calculate based on current annual km for proper rate tier
  let ikAmount = 0;
  // IK will be calculated when user updates the distance
  
  // Create the trip
  const { error } = await supabase.from('trips').insert({
    user_id: userId,
    vehicle_id: vehicle?.id || null,
    start_location: DEFAULT_START_LOCATION,
    end_location: event.location,
    distance: 0, // User will update distance later
    round_trip: true,
    purpose: event.summary || 'Rendez-vous calendrier',
    date: eventDate,
    ik_amount: ikAmount,
    source: 'google_calendar',
    calendar_event_id: event.id,
  });

  if (error) {
    console.error(`❌ Failed to create trip for event "${event.summary}":`, error);
    return { created: false, reason: 'db_error' };
  }

  console.log(`✅ Created trip for event "${event.summary}" to ${event.location} on ${eventDate} (vehicle: ${vehicle?.id || 'none'})`);
  return { created: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting calendar sync...');
    console.log('Time:', new Date().toISOString());

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

    for (const connection of connections || []) {
      try {
        console.log(`Processing user ${connection.user_id}...`);

        // Refresh token if needed
        const accessToken = await refreshGoogleToken(connection, supabase);
        if (!accessToken) {
          console.log(`Skipping user ${connection.user_id} - no valid token`);
          continue;
        }

        // Fetch calendar events
        const events = await fetchGoogleCalendarEvents(accessToken);
        console.log(`Found ${events.length} events for user ${connection.user_id}`);

        // Get user's last used vehicle
        const vehicle = await getUserLastUsedVehicle(connection.user_id, supabase);

        // Create trips from events
        let tripsCreated = 0;
        let skippedNoLocation = 0;
        let skippedAlreadyExists = 0;
        let skippedOther = 0;

        for (const event of events) {
          const result = await createTripFromEvent(
            connection.user_id,
            event,
            vehicle,
            supabase
          );
          if (result.created) {
            tripsCreated++;
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
        console.log(`User ${connection.user_id}: created=${tripsCreated}, skipped_no_location=${skippedNoLocation}, skipped_exists=${skippedAlreadyExists}, skipped_other=${skippedOther}`);
      } catch (error) {
        console.error(`Error processing user ${connection.user_id}:`, error);
      }
    }

    const result = {
      success: true,
      usersProcessed,
      totalTripsCreated,
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
