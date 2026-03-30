const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const marinaKey = Deno.env.get('MARINA_API_KEY');
  if (!marinaKey) {
    return new Response(
      JSON.stringify({ error: 'Marina API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // GET = poll job status
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const response = await fetch(`https://api.crawlers.fr/functions/v1/marina?job_id=${encodeURIComponent(jobId)}`, {
        headers: { 'x-marina-key': marinaKey },
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Marina poll error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to poll job status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // POST = start analysis
  if (req.method === 'POST') {
    try {
      const { url } = await req.json();
      if (!url || typeof url !== 'string') {
        return new Response(
          JSON.stringify({ error: 'URL is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch('https://api.crawlers.fr/functions/v1/marina', {
        method: 'POST',
        headers: {
          'x-marina-key': marinaKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Marina analyze error:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
