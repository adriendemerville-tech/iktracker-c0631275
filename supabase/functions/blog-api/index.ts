import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  // Path format: /blog-api/posts or /blog-api/posts/:slug
  const resource = pathParts[1] // 'posts'
  const slug = pathParts[2] // slug or undefined

  try {
    // Public endpoints (no API key required)
    if (req.method === 'GET') {
      if (resource === 'posts') {
        if (slug) {
          // Get single published post by slug
          const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .single()

          if (error || !data) {
            return new Response(JSON.stringify({ error: 'Post not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          // List all published posts
          const limit = parseInt(url.searchParams.get('limit') || '10')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          const { data, error, count } = await supabase
            .from('blog_posts')
            .select('id, slug, title, subtitle, meta_description, featured_image_url, author_name, published_at, created_at', { count: 'exact' })
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (error) {
            console.error('Error fetching posts:', error)
            return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify({ posts: data, total: count }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // Protected endpoints (API key or Bearer token required)
    const apiKey = req.headers.get('x-api-key')
    const authHeader = req.headers.get('authorization')
    const webhookToken = Deno.env.get('BLOG_WEBHOOK_TOKEN')
    
    // Check Bearer token first (for external webhooks)
    let isWebhookAuth = false
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7)
      if (webhookToken && bearerToken === webhookToken) {
        isWebhookAuth = true
        console.log('Webhook authentication successful via Bearer token')
      }
    }
    
    // If not webhook auth, check x-api-key
    if (!isWebhookAuth) {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key or Bearer token required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate API key from database
      const { data: keyData, error: keyError } = await supabase
        .from('blog_api_keys')
        .select('id')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single()

      if (keyError || !keyData) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update last_used_at
      await supabase
        .from('blog_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id)
    }

    // Handle protected operations
    if (resource === 'posts') {
      if (req.method === 'POST') {
        // Create new post
        const body = await req.json()
        const { title, slug: postSlug, subtitle, content, meta_description, featured_image_url, author_name, status } = body

        if (!title || !postSlug) {
          return new Response(JSON.stringify({ error: 'Title and slug are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Auto-set published_at if not provided by CMS
        const published_at = body.published_at || new Date().toISOString()

        const postData: Record<string, unknown> = {
          title,
          slug: postSlug,
          subtitle,
          content: content || '',
          meta_description,
          featured_image_url,
          author_name,
          status: status || 'draft',
          published_at,
        }

        console.log('Creating post with published_at:', published_at)

        const { data, error } = await supabase
          .from('blog_posts')
          .insert(postData)
          .select()
          .single()

        if (error) {
          console.error('Error creating post:', error)
          return new Response(JSON.stringify({ error: 'Failed to create post', details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (req.method === 'PUT' && slug) {
        // Update post
        const body = await req.json()
        const { title, subtitle, content, meta_description, featured_image_url, author_name, status } = body

        const updateData: Record<string, unknown> = {}
        if (title !== undefined) updateData.title = title
        if (subtitle !== undefined) updateData.subtitle = subtitle
        if (content !== undefined) updateData.content = content
        if (meta_description !== undefined) updateData.meta_description = meta_description
        if (featured_image_url !== undefined) updateData.featured_image_url = featured_image_url
        if (author_name !== undefined) updateData.author_name = author_name
        if (status !== undefined) {
          updateData.status = status
          if (status === 'published') {
            // Check if already published
            const { data: existing } = await supabase
              .from('blog_posts')
              .select('published_at')
              .eq('slug', slug)
              .single()
            
            if (!existing?.published_at) {
              updateData.published_at = new Date().toISOString()
            }
          }
        }

        const { data, error } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('slug', slug)
          .select()
          .single()

        if (error) {
          console.error('Error updating post:', error)
          return new Response(JSON.stringify({ error: 'Failed to update post' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (req.method === 'DELETE' && slug) {
        // Delete post
        const { error } = await supabase
          .from('blog_posts')
          .delete()
          .eq('slug', slug)

        if (error) {
          console.error('Error deleting post:', error)
          return new Response(JSON.stringify({ error: 'Failed to delete post' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // GET all posts (including drafts) for admin
      if (req.method === 'GET') {
        const includeAll = url.searchParams.get('all') === 'true'
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        let query = supabase
          .from('blog_posts')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!includeAll) {
          query = query.eq('status', 'published')
        }

        const { data, error, count } = await query

        if (error) {
          console.error('Error fetching posts:', error)
          return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ posts: data, total: count }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
