import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy?: number;
}

interface DetectedTrip {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startLocation: { lat: number; lng: number; address?: string };
  endLocation: { lat: number; lng: number; address?: string };
  distance: number;
  duration: number; // minutes
  refund: number;
  type: 'chantier' | 'fournisseur' | 'client' | 'visite' | 'other';
}

// Parse Google Takeout JSON format
function parseGoogleTakeout(jsonData: any): LocationPoint[] {
  const locations: LocationPoint[] = [];

  // New semantic format (Records.json or Timeline data)
  if (jsonData.semanticSegments) {
    console.log('Parsing semantic segments format...');
    for (const segment of jsonData.semanticSegments) {
      if (segment.visit?.topCandidate?.placeLocation) {
        const latLng = segment.visit.topCandidate.placeLocation.latLng;
        if (latLng) {
          // Format: "geo:48.8566,2.3522"
          const match = latLng.match(/geo:([-\d.]+),([-\d.]+)/);
          if (match) {
            locations.push({
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
              timestamp: new Date(segment.startTime || segment.endTime),
            });
          }
        }
      }
      if (segment.activity?.start && segment.activity?.end) {
        // Activity segments have start and end points
        const startLat = segment.activity.start.latLng;
        const endLat = segment.activity.end.latLng;
        if (startLat) {
          const match = startLat.match(/geo:([-\d.]+),([-\d.]+)/);
          if (match) {
            locations.push({
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
              timestamp: new Date(segment.startTime),
            });
          }
        }
        if (endLat) {
          const match = endLat.match(/geo:([-\d.]+),([-\d.]+)/);
          if (match) {
            locations.push({
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
              timestamp: new Date(segment.endTime),
            });
          }
        }
      }
    }
  }

  // Timeline Edits format
  if (jsonData.timelineEdits) {
    console.log('Parsing timeline edits format...');
    for (const edit of jsonData.timelineEdits) {
      if (edit.placeAggregates?.placeAggregateInfo) {
        for (const place of edit.placeAggregates.placeAggregateInfo) {
          if (place.score > 0.5 && place.placeId) {
            // We'll need to resolve these place IDs later
          }
        }
      }
    }
  }

  // Legacy format (Location History.json)
  if (jsonData.locations) {
    console.log('Parsing legacy locations format...');
    for (const loc of jsonData.locations) {
      const lat = loc.latitudeE7 ? loc.latitudeE7 / 1e7 : loc.latitude;
      const lng = loc.longitudeE7 ? loc.longitudeE7 / 1e7 : loc.longitude;
      const timestamp = loc.timestampMs 
        ? new Date(parseInt(loc.timestampMs)) 
        : loc.timestamp 
          ? new Date(loc.timestamp) 
          : new Date();
      
      if (lat && lng) {
        locations.push({
          lat,
          lng,
          timestamp,
          accuracy: loc.accuracy,
        });
      }
    }
  }

  // Raw timeline objects format
  if (jsonData.rawSignals) {
    console.log('Parsing raw signals format...');
    for (const signal of jsonData.rawSignals) {
      if (signal.position) {
        locations.push({
          lat: signal.position.latLng.latitudeE7 / 1e7,
          lng: signal.position.latLng.longitudeE7 / 1e7,
          timestamp: new Date(signal.position.timestamp),
          accuracy: signal.position.accuracyMm ? signal.position.accuracyMm / 1000 : undefined,
        });
      }
    }
  }

  // Sort by timestamp
  locations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  console.log(`Parsed ${locations.length} location points`);
  return locations;
}

// Calculate distance between two points in km (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Detect trips from location points
function detectTrips(locations: LocationPoint[], minTripDistance: number = 2): DetectedTrip[] {
  const trips: DetectedTrip[] = [];
  
  if (locations.length < 2) {
    console.log('Not enough location points to detect trips');
    return trips;
  }

  let tripStart: LocationPoint | null = null;
  let tripPoints: LocationPoint[] = [];
  const stayThreshold = 30 * 60 * 1000; // 30 minutes stay = end of trip

  for (let i = 0; i < locations.length; i++) {
    const current = locations[i];
    const next = locations[i + 1];

    if (!tripStart) {
      tripStart = current;
      tripPoints = [current];
      continue;
    }

    tripPoints.push(current);

    // Check if this is end of trip (long stay or last point)
    const isLastPoint = !next;
    const isLongStay = next && (next.timestamp.getTime() - current.timestamp.getTime() > stayThreshold);
    
    if (isLastPoint || isLongStay) {
      // End current trip
      const tripEnd = current;
      const distance = calculateDistance(
        tripStart.lat, tripStart.lng,
        tripEnd.lat, tripEnd.lng
      );

      // Only record trips with minimum distance
      if (distance >= minTripDistance) {
        const duration = (tripEnd.timestamp.getTime() - tripStart.timestamp.getTime()) / (1000 * 60);
        
        // Calculate IK refund based on French 2024 rates (simplified)
        const ikRate = distance <= 5000 ? 0.603 : distance <= 20000 ? 0.340 : 0.234;
        const refund = Math.round(distance * ikRate * 100) / 100;

        trips.push({
          id: crypto.randomUUID(),
          date: tripStart.timestamp.toISOString().split('T')[0],
          startTime: tripStart.timestamp.toISOString(),
          endTime: tripEnd.timestamp.toISOString(),
          startLocation: { lat: tripStart.lat, lng: tripStart.lng },
          endLocation: { lat: tripEnd.lat, lng: tripEnd.lng },
          distance: Math.round(distance * 10) / 10,
          duration: Math.round(duration),
          refund,
          type: 'other',
        });
      }

      tripStart = null;
      tripPoints = [];
    }
  }

  console.log(`Detected ${trips.length} trips`);
  return trips;
}

// Reverse geocode a location
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Use Nominatim (OpenStreetMap) - free and no API key needed
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'IKTracker/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding failed:', response.status);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const data = await response.json();
    
    // Build a readable address
    if (data.address) {
      const parts = [];
      if (data.address.road) parts.push(data.address.road);
      if (data.address.house_number) parts.unshift(data.address.house_number);
      if (data.address.city || data.address.town || data.address.village) {
        parts.push(data.address.city || data.address.town || data.address.village);
      }
      if (parts.length > 0) return parts.join(', ');
    }

    return data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Classify trip type based on address keywords
function classifyTrip(address: string): DetectedTrip['type'] {
  const lowerAddress = address.toLowerCase();
  
  if (/chantier|construction|travaux|btp|bâtiment/.test(lowerAddress)) {
    return 'chantier';
  }
  if (/point p|leroy merlin|castorama|brico|matériaux|fournisseur|grossiste/.test(lowerAddress)) {
    return 'fournisseur';
  }
  if (/bureau|office|entreprise|société|sarl|sas|eurl/.test(lowerAddress)) {
    return 'client';
  }
  if (/visite|rdv|rendez-vous/.test(lowerAddress)) {
    return 'visite';
  }
  
  return 'other';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, jsonData, trips: tripsToImport, vehicleId } = body;

    if (action === 'parse') {
      console.log('Starting Google Takeout parsing for user:', user.id);
      
      // Track the attempt
      await supabaseClient
        .from('takeout_import_attempts')
        .insert({ 
          user_id: user.id, 
          status: 'started' 
        });
      
      // Parse the JSON data
      const locations = parseGoogleTakeout(jsonData);
      
      if (locations.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Aucune donnée de localisation trouvée dans le fichier. Assurez-vous d\'avoir exporté l\'historique des positions depuis Google Takeout.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Detect trips
      const detectedTrips = detectTrips(locations);

      if (detectedTrips.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Aucun trajet détecté. Vérifiez que votre historique de positions contient des déplacements significatifs.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reverse geocode destinations (with rate limiting)
      console.log(`Reverse geocoding ${detectedTrips.length} destinations...`);
      
      for (let i = 0; i < detectedTrips.length; i++) {
        const trip = detectedTrips[i];
        
        // Geocode start and end
        trip.startLocation.address = await reverseGeocode(trip.startLocation.lat, trip.startLocation.lng);
        
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 200));
        
        trip.endLocation.address = await reverseGeocode(trip.endLocation.lat, trip.endLocation.lng);
        
        // Classify trip type
        trip.type = classifyTrip(trip.endLocation.address || '');
        
        // Delay between trips
        if (i < detectedTrips.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Calculate total potential refund
      const totalRefund = detectedTrips.reduce((sum, t) => sum + t.refund, 0);
      const totalDistance = detectedTrips.reduce((sum, t) => sum + t.distance, 0);

      console.log(`Parsing complete: ${detectedTrips.length} trips, ${totalDistance.toFixed(1)} km, ${totalRefund.toFixed(2)} € potential`);

      return new Response(
        JSON.stringify({
          success: true,
          trips: detectedTrips,
          summary: {
            totalTrips: detectedTrips.length,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalRefund: Math.round(totalRefund * 100) / 100,
            dateRange: {
              start: detectedTrips[0]?.date,
              end: detectedTrips[detectedTrips.length - 1]?.date,
            },
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'import') {
      console.log('Importing validated trips for user:', user.id);
      
      if (!tripsToImport || tripsToImport.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Aucun trajet à importer' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's default vehicle if not provided
      let selectedVehicleId = vehicleId;
      if (!selectedVehicleId) {
        const { data: vehicles } = await supabaseClient
          .from('vehicles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        selectedVehicleId = vehicles?.[0]?.id || null;
      }

      // Insert trips into database
      const tripsToInsert = tripsToImport.map((trip: DetectedTrip) => ({
        user_id: user.id,
        vehicle_id: selectedVehicleId,
        date: trip.date,
        start_location: trip.startLocation.address || `${trip.startLocation.lat}, ${trip.startLocation.lng}`,
        end_location: trip.endLocation.address || `${trip.endLocation.lat}, ${trip.endLocation.lng}`,
        distance: trip.distance,
        ik_amount: trip.refund,
        round_trip: false,
        status: 'pending',
        source: 'google_takeout',
        purpose: trip.type === 'chantier' ? 'Chantier' : 
                 trip.type === 'fournisseur' ? 'Fournisseur' : 
                 trip.type === 'client' ? 'Client' : 
                 trip.type === 'visite' ? 'Visite' : null,
      }));

      const { data: insertedTrips, error: insertError } = await supabaseClient
        .from('trips')
        .insert(tripsToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting trips:', insertError);
        
        // Track failed import
        await supabaseClient
          .from('takeout_import_attempts')
          .insert({ 
            user_id: user.id, 
            status: 'failed',
            error_message: insertError.message
          });
        
        return new Response(
          JSON.stringify({ error: 'Erreur lors de l\'importation des trajets' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const totalKm = tripsToImport.reduce((sum: number, t: DetectedTrip) => sum + t.distance, 0);
      const totalIk = tripsToImport.reduce((sum: number, t: DetectedTrip) => sum + t.refund, 0);

      // Track successful import
      await supabaseClient
        .from('takeout_import_attempts')
        .insert({ 
          user_id: user.id, 
          status: 'success',
          trips_imported: insertedTrips?.length || 0,
          total_km: totalKm,
          total_ik: totalIk
        });

      console.log(`Successfully imported ${insertedTrips?.length || 0} trips`);

      return new Response(
        JSON.stringify({
          success: true,
          importedCount: insertedTrips?.length || 0,
          totalRefund: totalIk,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Action invalide' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-takeout function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
