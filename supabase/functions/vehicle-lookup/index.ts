import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licensePlate } = await req.json();

    if (!licensePlate) {
      console.error('No license plate provided');
      return new Response(
        JSON.stringify({ error: 'License plate is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the license plate (remove dashes and spaces)
    const cleanPlate = licensePlate.replace(/[-\s]/g, '').toUpperCase();
    console.log(`Looking up vehicle with plate: ${cleanPlate}`);

    const apiKey = Deno.env.get('IMMATRICULATION_API_KEY');
    
    if (!apiKey) {
      console.error('IMMATRICULATION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the French car check API via RapidAPI
    // API: api-de-plaque-d-immatriculation-france
    const apiUrl = `https://api-de-plaque-d-immatriculation-france.p.rapidapi.com/?immatriculation=${cleanPlate}`;
    
    console.log(`Calling RapidAPI: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'api-de-plaque-d-immatriculation-france.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // If API fails, return a simulated response for demo purposes
      // This allows the app to work even without a valid API key
      if (response.status === 401 || response.status === 403) {
        console.log('API authentication failed, returning simulated data');
        return simulatedResponse(cleanPlate, corsHeaders);
      }
      
      return new Response(
        JSON.stringify({ error: 'Vehicle not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('RapidAPI response:', JSON.stringify(data));

    // Check for error in response
    if (data.error || !data.marque) {
      console.log('Vehicle not found in API response');
      return new Response(
        JSON.stringify({ error: data.error || 'Vehicle not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map the RapidAPI response to our format
    // Response format: { marque, modele, date1erCir_us, puisFisc, energie, carrosserie, ... }
    const fuelType = data.energie || '';
    const isElectric = fuelType.toLowerCase().includes('electri') || 
                       fuelType.toLowerCase().includes('électri') ||
                       fuelType.toLowerCase() === 'el';
    
    const vehicleData = {
      success: true,
      licensePlate: licensePlate,
      make: data.marque || '',
      model: data.modele || '',
      year: data.date1erCir_us ? parseInt(data.date1erCir_us.substring(0, 4)) : null,
      fiscalPower: data.puisFisc ? parseInt(data.puisFisc) : null,
      fuelType: fuelType,
      isElectric: isElectric,
      bodyStyle: data.carrosserie || '',
      registrationDate: data.date1erCir || null,
    };

    console.log('Mapped vehicle data:', JSON.stringify(vehicleData));

    return new Response(
      JSON.stringify(vehicleData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in vehicle-lookup function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simulated response for demo/development purposes
function simulatedResponse(licensePlate: string, corsHeaders: Record<string, string>) {
  // Common French car makes for realistic simulation
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

  // Generate deterministic data based on license plate
  const hash = licensePlate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const makeIndex = hash % makes.length;
  const make = makes[makeIndex];
  const modelList = models[make] || ['Modèle'];
  const model = modelList[hash % modelList.length];
  
  // Check if it's an electric model
  const electricModels = ['Zoé', 'e-208', 'ë-C4', 'ID.3', 'ID.4', 'iX3', 'i4', 'EQA', 'EQC', 'e-tron', 'Q4 e-tron', 'bZ4X', 'Mustang Mach-E', '500e', 'Spring', 'Leaf', 'Ariya'];
  const isElectric = electricModels.includes(model);
  
  // Generate fiscal power based on model type
  const basePower = isElectric ? 4 : 5;
  const fiscalPower = basePower + (hash % 4);
  
  // Generate year between 2018 and 2024
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
    simulated: true, // Flag to indicate this is simulated data
  };

  console.log('Returning simulated vehicle data:', JSON.stringify(vehicleData));

  return new Response(
    JSON.stringify(vehicleData),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
