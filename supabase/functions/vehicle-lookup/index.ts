import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVEPIECES_API = 'https://api.drivepiecesauto.com';
const EARLWEB_API = 'https://moove-france.ewp.earlweb.net';

async function logApiCall(supabaseAdmin: any, userId: string | null, success: boolean, source: string, licensePlate: string) {
  try {
    await supabaseAdmin.from('api_usage_logs').insert({
      function_name: 'vehicle-lookup',
      user_id: userId,
      tokens_input: 0,
      tokens_output: 0,
      cost_euros: 0,
      model: source,
      metadata: { license_plate: licensePlate, success, source },
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
      description: "L'API de recherche de véhicule par plaque d'immatriculation a échoué.",
      user_id: userId,
      metadata,
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

function formatPlate(licensePlate: string): { clean: string; formatted: string } {
  const clean = licensePlate.replace(/[-\s]/g, '').toUpperCase();
  const formatted = clean.length === 7
    ? `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}`
    : licensePlate;
  return { clean, formatted };
}

function mapDrivePiecesData(data: any, licensePlate: string) {
  const powerSupply = (data.powerSupply || '').toLowerCase();
  const isElectric = powerSupply.includes('electri') || powerSupply.includes('électri');

  return {
    success: true,
    licensePlate,
    make: data.brandName || '',
    model: data.modelName || '',
    year: data.preRegistrationDate ? parseInt(data.preRegistrationDate.substring(0, 4)) : null,
    fiscalPower: data.legalPower ? parseInt(data.legalPower) : null,
    fuelType: data.powerSupply || '',
    isElectric,
    bodyStyle: data.carBody || '',
    registrationDate: data.preRegistrationDate || null,
    source: 'drivepiecesauto',
  };
}

function mapRapidApiData(vehicleInfo: any, licensePlate: string) {
  const fuelType = vehicleInfo.AWN_energie || '';
  const isElectric = fuelType.toLowerCase().includes('electri') ||
    fuelType.toLowerCase().includes('électri') ||
    fuelType.toLowerCase() === 'el';

  return {
    success: true,
    licensePlate,
    make: vehicleInfo.AWN_marque || '',
    model: vehicleInfo.AWN_modele || '',
    year: vehicleInfo.AWN_date_mise_en_circulation_us ? parseInt(vehicleInfo.AWN_date_mise_en_circulation_us.substring(0, 4)) : null,
    fiscalPower: vehicleInfo.AWN_puissance_fiscale ? parseInt(vehicleInfo.AWN_puissance_fiscale) : null,
    fuelType,
    isElectric,
    bodyStyle: vehicleInfo.AWN_carrosserie || '',
    registrationDate: vehicleInfo.AWN_date_mise_en_circulation || null,
    source: 'rapidapi',
  };
}

// Source 1: DrivePiecesAuto (gratuit, sans auth)
async function tryDrivePieces(formattedPlate: string): Promise<any | null> {
  try {
    console.log(`[DrivePieces] Trying plate: ${formattedPlate}`);
    const response = await fetch(`${DRIVEPIECES_API}/cars/plate/${encodeURIComponent(formattedPlate)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.drivepiecesauto.com',
      },
    });

    if (!response.ok) {
      console.log(`[DrivePieces] HTTP ${response.status}`);
      await response.text();
      return null;
    }

    const data = await response.json();
    if (!data || !data.brandName) {
      console.log('[DrivePieces] No vehicle data in response');
      return null;
    }

    console.log(`[DrivePieces] Found: ${data.brandName} ${data.modelName} (${data.legalPower} CV)`);
    return data;
  } catch (e) {
    console.error('[DrivePieces] Error:', e);
    return null;
  }
}

// Formule officielle française : PA = 1.34 + (1.8 × (kW/100)²) + (3.87 × (kW/100))
function kwToFiscalPower(kw: number): number {
  const ratio = kw / 100;
  return Math.floor(1.34 + (1.8 * ratio * ratio) + (3.87 * ratio));
}

// Source 2: Earlweb / Moove (gratuit, HTML parsing, sans auth)
async function tryEarlweb(formattedPlate: string): Promise<any | null> {
  try {
    console.log(`[Earlweb] Trying plate: ${formattedPlate}`);
    const response = await fetch(
      `${EARLWEB_API}/fr/vrm_search?vrm_type=fre:vrm:chatham&q=${encodeURIComponent(formattedPlate)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        redirect: 'follow',
      }
    );

    if (!response.ok) {
      console.log(`[Earlweb] HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract Marque (brand) from: <td class="label">Marque</td>\n<td>PEUGEOT</td>
    const marqueMatch = html.match(/<td\s+class="label">Marque<\/td>\s*<td>([^<]+)<\/td>/i);
    if (!marqueMatch) {
      console.log('[Earlweb] No vehicle data found');
      return null;
    }
    const make = marqueMatch[1].trim();

    // Extract Modèle from: <td class="label">Modèle</td>\n<td>5008 II ... 96kW ...</td>
    const modeleMatch = html.match(/<td\s+class="label">Mod[eè]le<\/td>\s*<td>([^<]+)<\/td>/i);
    const fullModel = modeleMatch ? modeleMatch[1].trim() : '';

    // Extract kW from model string (e.g. "96kW" or "173kW")
    const kwMatch = fullModel.match(/(\d+)\s*kW/i);
    const kw = kwMatch ? parseInt(kwMatch[1]) : null;

    // Extract clean model name (before the kW part)
    const cleanModel = fullModel
      .replace(/\([^)]*\)/g, '')  // Remove parenthetical codes
      .replace(/\d+kW.*$/i, '')   // Remove kW and everything after
      .replace(/\s+/g, ' ')
      .trim();

    // Extract fuel type from: <td class="label">Moteur</td>\n<td>E</td>
    const fuelMatch = html.match(/<td\s+class="label">Moteur<\/td>\s*<td>([^<]+)<\/td>/i);
    const fuelCode = fuelMatch ? fuelMatch[1].trim() : '';

    // Map fuel codes: E=Essence, D=Diesel, EL=Électrique, H=Hybride
    const fuelMap: Record<string, string> = {
      'E': 'Essence', 'D': 'Diesel', 'EL': 'Électrique',
      'H': 'Hybride', 'G': 'GPL', 'GN': 'GNV',
    };
    const fuelType = fuelMap[fuelCode.toUpperCase()] || fuelCode;
    const isElectric = ['EL', 'ÉLECTRIQUE', 'ELECTRIQUE'].includes(fuelCode.toUpperCase());

    // Extract year from: <td class="label">Année</td>\n<td>2016-</td>
    const yearMatch = html.match(/<td\s+class="label">Ann[eé]e<\/td>\s*<td>(\d{4})/i);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    // Calculate fiscal power from kW
    const fiscalPower = kw ? kwToFiscalPower(kw) : null;

    console.log(`[Earlweb] Found: ${make} ${cleanModel} ${kw}kW → ${fiscalPower} CV (${fuelType})`);

    return {
      make,
      model: cleanModel || fullModel,
      kw,
      fiscalPower,
      fuelType,
      isElectric,
      year,
    };
  } catch (e) {
    console.error('[Earlweb] Error:', e);
    return null;
  }
}

function mapEarlwebData(data: any, licensePlate: string) {
  return {
    success: true,
    licensePlate,
    make: data.make,
    model: data.model,
    year: data.year,
    fiscalPower: data.fiscalPower,
    fuelType: data.fuelType,
    isElectric: data.isElectric,
    bodyStyle: '',
    registrationDate: data.year ? `${data.year}-01-01` : null,
    source: 'earlweb',
    powerKw: data.kw,
    fiscalPowerEstimated: true,
  };
}

// Source 2: RapidAPI (payant, fallback)
async function tryRapidApi(formattedPlate: string, apiKey: string): Promise<any | null> {
  try {
    console.log(`[RapidAPI] Trying plate: ${formattedPlate}`);
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
      console.log(`[RapidAPI] HTTP ${response.status}`);
      await response.text();
      return null;
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return null;
    }

    const vehicleInfo = data.data;
    if (data.error === true || !vehicleInfo || !vehicleInfo.AWN_marque) {
      return null;
    }

    console.log(`[RapidAPI] Found: ${vehicleInfo.AWN_marque} ${vehicleInfo.AWN_modele}`);
    return vehicleInfo;
  } catch (e) {
    console.error('[RapidAPI] Error:', e);
    return null;
  }
}

// Source 3: Données simulées (dernier recours)
function generateSimulatedData(cleanPlate: string, licensePlate: string) {
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

  const hash = cleanPlate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const make = makes[hash % makes.length];
  const modelList = models[make] || ['Modèle'];
  const model = modelList[hash % modelList.length];

  const electricModels = ['Zoé', 'e-208', 'ë-C4', 'ID.3', 'ID.4', 'iX3', 'i4', 'EQA', 'EQC', 'e-tron', 'Q4 e-tron', 'bZ4X', 'Mustang Mach-E', '500e', 'Spring', 'Leaf', 'Ariya'];
  const isElectric = electricModels.includes(model);

  const basePower = isElectric ? 4 : 5;
  const fiscalPower = basePower + (hash % 4);
  const year = 2018 + (hash % 7);

  return {
    success: true,
    licensePlate,
    make,
    model,
    year,
    fiscalPower: Math.min(fiscalPower, 12),
    fuelType: isElectric ? 'Électrique' : (hash % 2 === 0 ? 'Essence' : 'Diesel'),
    isElectric,
    bodyStyle: hash % 3 === 0 ? 'SUV' : (hash % 3 === 1 ? 'Berline' : 'Citadine'),
    registrationDate: `${year}-${String((hash % 12) + 1).padStart(2, '0')}-01`,
    simulated: true,
    source: 'simulated',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

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

    const { clean: cleanPlate, formatted: formattedPlate } = formatPlate(licensePlate);
    console.log(`Looking up vehicle: ${formattedPlate}`);

    // 1️⃣ Source principale : DrivePiecesAuto (gratuit)
    const drivePiecesData = await tryDrivePieces(formattedPlate);
    if (drivePiecesData) {
      const vehicleData = mapDrivePiecesData(drivePiecesData, licensePlate);
      await logApiCall(supabaseAdmin, userId, true, 'drivepiecesauto', formattedPlate);
      return new Response(JSON.stringify(vehicleData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Fallback] DrivePieces failed, trying Earlweb...');

    // 2️⃣ Fallback gratuit : Earlweb/Moove (HTML parsing + formule kW→CV)
    const earlwebData = await tryEarlweb(formattedPlate);
    if (earlwebData) {
      const vehicleData = mapEarlwebData(earlwebData, licensePlate);
      await logApiCall(supabaseAdmin, userId, true, 'earlweb', formattedPlate);
      return new Response(JSON.stringify(vehicleData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Fallback] Earlweb failed, trying RapidAPI...');

    // 3️⃣ Fallback payant : RapidAPI
    const apiKey = Deno.env.get('RAPIDAPI_KEY');
    if (apiKey) {
      const rapidApiData = await tryRapidApi(formattedPlate, apiKey);
      if (rapidApiData) {
        const vehicleData = mapRapidApiData(rapidApiData, licensePlate);
        await logApiCall(supabaseAdmin, userId, true, 'rapidapi', formattedPlate);
        return new Response(JSON.stringify(vehicleData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[Fallback] RapidAPI failed, using simulated data...');
    await logError(supabaseAdmin, userId, 'vehicle-lookup: toutes les sources ont échoué, données simulées utilisées', {
      plate: formattedPlate,
    });

    // 3️⃣ Dernier recours : données simulées
    const simulatedData = generateSimulatedData(cleanPlate, licensePlate);
    await logApiCall(supabaseAdmin, userId, true, 'simulated', formattedPlate);
    return new Response(JSON.stringify(simulatedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in vehicle-lookup function:', errorMessage);
    await logApiCall(supabaseAdmin, userId, false, 'error', 'unknown');
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
