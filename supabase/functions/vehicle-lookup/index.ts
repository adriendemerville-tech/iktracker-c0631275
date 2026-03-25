import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logApiCall(supabaseAdmin: any, userId: string | null, success: boolean, simulated: boolean, licensePlate: string) {
  try {
    await supabaseAdmin.from('api_usage_logs').insert({
      function_name: 'vehicle-lookup',
      user_id: userId,
      tokens_input: 0,
      tokens_output: 0,
      cost_euros: 0,
      model: success ? (simulated ? 'simulated' : 'rapidapi') : 'error',
      metadata: { license_plate: licensePlate, success, simulated },
    });
  } catch (e) {
    console.error('Failed to log API call:', e);
  }
}

async function logError(supabaseAdmin: any, userId: string | null, message: string, metadata: any) {
  try {
    await supabaseAdmin.from('error_logs').insert({
      source: 'Backend',
      error_type: 'api_failure',
      message,
      description: "L'API de recherche de véhicule par plaque d'immatriculation a échoué. Les utilisateurs reçoivent des données simulées au lieu de données réelles.",
      user_id: userId,
      metadata,
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Extract user ID from auth header
  let userId: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id || null;
    } catch {}
  }

  try {
    const { licensePlate } = await req.json();

    if (!licensePlate) {
      return new Response(
        JSON.stringify({ error: 'License plate is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPlate = licensePlate.replace(/[-\s]/g, '').toUpperCase();
    const formattedPlate = cleanPlate.length === 7 
      ? `${cleanPlate.slice(0, 2)}-${cleanPlate.slice(2, 5)}-${cleanPlate.slice(5, 7)}`
      : licensePlate;
    console.log(`Looking up vehicle with plate: ${formattedPlate}`);

    const apiKey = Deno.env.get('RAPIDAPI_KEY');
    
    if (!apiKey) {
      console.error('RAPIDAPI_KEY not configured');
      await logApiCall(supabaseAdmin, userId, false, false, formattedPlate);
      await logError(supabaseAdmin, userId, 'vehicle-lookup: RAPIDAPI_KEY non configurée', { plate: formattedPlate });
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = `https://api-de-plaque-d-immatriculation-france.p.rapidapi.com/?plaque=${encodeURIComponent(formattedPlate)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'api-de-plaque-d-immatriculation-france.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
        'plaque': formattedPlate,
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      if (response.status === 401 || response.status === 403) {
        console.log('API authentication failed, returning simulated data');
        await logApiCall(supabaseAdmin, userId, true, true, formattedPlate);
        await logError(supabaseAdmin, userId, `vehicle-lookup: API RapidAPI erreur ${response.status} — clé expirée ou abonnement terminé`, { plate: formattedPlate, status: response.status });
        return simulatedResponse(cleanPlate, corsHeaders);
      }
      
      await logApiCall(supabaseAdmin, userId, false, false, formattedPlate);
      return new Response(
        JSON.stringify({ error: 'Vehicle not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      await logApiCall(supabaseAdmin, userId, false, false, formattedPlate);
      return new Response(
        JSON.stringify({ error: 'Invalid API response', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vehicleInfo = data.data;
    if (data.error === true || !vehicleInfo || !vehicleInfo.AWN_marque) {
      await logApiCall(supabaseAdmin, userId, false, false, formattedPlate);
      return new Response(
        JSON.stringify({ error: data.message || 'Vehicle not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fuelType = vehicleInfo.AWN_energie || '';
    const isElectric = fuelType.toLowerCase().includes('electri') || 
                       fuelType.toLowerCase().includes('électri') ||
                       fuelType.toLowerCase() === 'el';
    
    const vehicleData = {
      success: true,
      licensePlate: licensePlate,
      make: vehicleInfo.AWN_marque || '',
      model: vehicleInfo.AWN_modele || '',
      year: vehicleInfo.AWN_date_mise_en_circulation_us ? parseInt(vehicleInfo.AWN_date_mise_en_circulation_us.substring(0, 4)) : null,
      fiscalPower: vehicleInfo.AWN_puissance_fiscale ? parseInt(vehicleInfo.AWN_puissance_fiscale) : null,
      fuelType: fuelType,
      isElectric: isElectric,
      bodyStyle: vehicleInfo.AWN_carrosserie || '',
      registrationDate: vehicleInfo.AWN_date_mise_en_circulation || null,
    };

    await logApiCall(supabaseAdmin, userId, true, false, formattedPlate);

    return new Response(
      JSON.stringify(vehicleData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in vehicle-lookup function:', errorMessage);
    await logApiCall(supabaseAdmin, userId, false, false, 'unknown');
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function simulatedResponse(licensePlate: string, corsHeaders: Record<string, string>) {
  const makes = ['Renault', 'Peugeot', 'Citroën', 'Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Toyota', 'Ford', 'Fiat', 'Dacia', 'Nissan'];
  const models: Record<string, string[]> = {
    'Renault': ['Clio', 'Mégane', 'Captur', 'Twingo', 'Zoé', 'Austral'],
    'Peugeot': ['208', '308', '3008', '5008', 'e-208', '2008'],
    'Citroën': ['C3', 'C4', 'C5 Aircross', 'Berlingo', 'ë-C4'],
    'Volkswagen': ['Golf', 'Polo', 'Tiguan', 'T-Roc', 'ID.3', 'ID.4'],
    'BMW': ['Série 1', 'Série 3', 'X1', 'X3', 'iX3', 'i4'],
    'Mercedes': ['Classe A', 'Classe C', 'GLA', 'EQA', 'EQC'],
    'Audi': ['A3', 'A4', 'Q3', 'Q5', 'e-tron', 'Q4 e-tron'],
    'Toyota': ['Yaris', 'Corolla', 'C-HR', 'RAV4', 'bZ4X'],
    'Ford': ['Fiesta', 'Focus', 'Puma', 'Kuga', 'Mustang Mach-E'],
    'Fiat': ['500', 'Panda', 'Tipo', '500e'],
    'Dacia': ['Sandero', 'Duster', 'Spring', 'Jogger'],
    'Nissan': ['Micra', 'Juke', 'Qashqai', 'Leaf', 'Ariya'],
  };

  const hash = licensePlate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const makeIndex = hash % makes.length;
  const make = makes[makeIndex];
  const modelList = models[make] || ['Modèle'];
  const model = modelList[hash % modelList.length];
  
  const electricModels = ['Zoé', 'e-208', 'ë-C4', 'ID.3', 'ID.4', 'iX3', 'i4', 'EQA', 'EQC', 'e-tron', 'Q4 e-tron', 'bZ4X', 'Mustang Mach-E', '500e', 'Spring', 'Leaf', 'Ariya'];
  const isElectric = electricModels.includes(model);
  
  const basePower = isElectric ? 4 : 5;
  const fiscalPower = basePower + (hash % 4);
  const year = 2018 + (hash % 7);

  const vehicleData = {
    success: true,
    licensePlate: licensePlate,
    make: make,
    model: model,
    year: year,
    fiscalPower: Math.min(fiscalPower, 12),
    fuelType: isElectric ? 'Électrique' : (hash % 2 === 0 ? 'Essence' : 'Diesel'),
    isElectric: isElectric,
    bodyStyle: hash % 3 === 0 ? 'SUV' : (hash % 3 === 1 ? 'Berline' : 'Citadine'),
    registrationDate: `${year}-${String((hash % 12) + 1).padStart(2, '0')}-01`,
    simulated: true,
  };

  return new Response(
    JSON.stringify(vehicleData),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
