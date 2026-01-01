import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function resolveField(body: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return { key, value: body[key] }
    }
  }
  return { key: null as string | null, value: undefined as any }
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
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
        // Create or update post (CMS sync)
        const body = await req.json()

        console.log('Received body fields:', Object.keys(body))

        const title = body.title
        const postSlug = body.slug
        const statusResolved = resolveField(body, ['status', 'state', 'postStatus'])
        const status = statusResolved.value ?? 'draft'

        if (!title || !postSlug) {
          return new Response(JSON.stringify({ error: 'Title and slug are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const subtitleResolved = resolveField(body, ['subtitle', 'subTitle', 'sub_title', 'sousTitre', 'sous_titre'])
        const metaResolved = resolveField(body, ['meta_description', 'metaDescription', 'meta', 'seoDescription', 'description'])
        const imageResolved = resolveField(body, [
          'featured_image_url',
          'featuredImageUrl',
          'featuredImageURL',
          'heroImageUrl',
          'hero_image_url',
          'coverImageUrl',
          'imageUrl',
          'image_url',
        ])
        const authorResolved = resolveField(body, ['author_name', 'authorName', 'author', 'auteur', 'byline'])

        // Support multiple content field names from different CMS systems
        const contentResolved = resolveField(body, [
          'content_markdown',
          'contentMarkdown',
          'content_md',
          'contentMd',
          'markdown',
          'content',
          'body',
          'text',
          // fallback if some CMS only sends HTML
          'content_html',
          'contentHtml',
        ])
        const content = asString(contentResolved.value)

        // Published date mapping
        const publishedResolved = resolveField(body, [
          'published_at',
          'publishedAt',
          'published_time',
          'publishedTime',
          // CMS often provides createdAt only
          'createdAt',
          'created_at',
        ])
        const publishedCandidate = asString(publishedResolved.value).trim()
        const published_at = publishedCandidate
          ? publishedCandidate
          : status === 'published'
            ? new Date().toISOString()
            : null

        console.log('Resolved CMS fields:', {
          statusFrom: statusResolved.key,
          subtitleFrom: subtitleResolved.key,
          metaFrom: metaResolved.key,
          imageFrom: imageResolved.key,
          authorFrom: authorResolved.key,
          contentFrom: contentResolved.key,
          publishedFrom: publishedResolved.key,
          contentLength: content.length,
        })

        const postData: Record<string, unknown> = {
          title,
          slug: postSlug,
          subtitle: subtitleResolved.value ?? null,
          content,
          meta_description: metaResolved.value ?? null,
          featured_image_url: imageResolved.value ?? null,
          author_name: authorResolved.value ?? null,
          status,
          published_at,
        }

        const { data, error } = await supabase
          .from('blog_posts')
          .upsert(postData, { onConflict: 'slug' })
          .select()
          .single()

        if (error) {
          console.error('Error upserting post:', error)
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

        console.log('Update - Received body fields:', Object.keys(body))

        const updateData: Record<string, unknown> = {}

        const titleResolved = resolveField(body, ['title'])
        if (titleResolved.value !== undefined) updateData.title = titleResolved.value

        const subtitleResolved = resolveField(body, ['subtitle', 'subTitle', 'sub_title', 'sousTitre', 'sous_titre'])
        if (subtitleResolved.value !== undefined) updateData.subtitle = subtitleResolved.value

        const metaResolved = resolveField(body, ['meta_description', 'metaDescription', 'meta', 'seoDescription', 'description'])
        if (metaResolved.value !== undefined) updateData.meta_description = metaResolved.value

        const imageResolved = resolveField(body, [
          'featured_image_url',
          'featuredImageUrl',
          'featuredImageURL',
          'heroImageUrl',
          'hero_image_url',
          'coverImageUrl',
          'imageUrl',
          'image_url',
        ])
        if (imageResolved.value !== undefined) updateData.featured_image_url = imageResolved.value

        const authorResolved = resolveField(body, ['author_name', 'authorName', 'author', 'auteur', 'byline'])
        if (authorResolved.value !== undefined) updateData.author_name = authorResolved.value

        const contentResolved = resolveField(body, [
          'content_markdown',
          'contentMarkdown',
          'content_md',
          'contentMd',
          'markdown',
          'content',
          'body',
          'text',
          'content_html',
          'contentHtml',
        ])
        if (contentResolved.value !== undefined) updateData.content = asString(contentResolved.value)

        const publishedResolved = resolveField(body, [
          'published_at',
          'publishedAt',
          'published_time',
          'publishedTime',
          'createdAt',
          'created_at',
        ])
        if (publishedResolved.value !== undefined) {
          const candidate = asString(publishedResolved.value).trim()
          updateData.published_at = candidate || null
        }

        const statusResolved = resolveField(body, ['status', 'state', 'postStatus'])
        if (statusResolved.value !== undefined) {
          updateData.status = statusResolved.value

          if (statusResolved.value === 'published') {
            const { data: existing } = await supabase
              .from('blog_posts')
              .select('published_at')
              .eq('slug', slug)
              .single()

            const alreadyPublishedAt = existing?.published_at
            const incomingPublishedAt = updateData.published_at

            if (!alreadyPublishedAt && (incomingPublishedAt === undefined || incomingPublishedAt === null || incomingPublishedAt === '')) {
              updateData.published_at = new Date().toISOString()
            }
          }
        }

        console.log('Update - Resolved CMS fields:', {
          titleFrom: titleResolved.key,
          subtitleFrom: subtitleResolved.key,
          metaFrom: metaResolved.key,
          imageFrom: imageResolved.key,
          authorFrom: authorResolved.key,
          contentFrom: contentResolved.key,
          publishedFrom: publishedResolved.key,
          statusFrom: statusResolved.key,
          hasUpdateData: Object.keys(updateData).length,
        })

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
