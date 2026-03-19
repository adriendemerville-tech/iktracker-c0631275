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

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function logAudit(supabase: any, action: string, resourceType: string, resourceId: string, previousData: any, newData: any, apiKeyName: string | null) {
  try {
    await supabase.from('api_audit_logs').insert({
      action, resource_type: resourceType, resource_id: resourceId,
      previous_data: previousData, new_data: newData, api_key_name: apiKeyName,
    })
  } catch (e) { console.error('Audit log error:', e) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const resource = pathParts[1] // 'posts', 'pages', or 'audit'
  const slug = pathParts[2]

  try {
    // ==================== PUBLIC GET ====================
    if (req.method === 'GET') {
      if (resource === 'posts') {
        if (slug) {
          const { data, error } = await supabase
            .from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single()
          if (error || !data) return jsonResp({ error: 'Post not found' }, 404)
          return jsonResp(data)
        } else {
          const limit = parseInt(url.searchParams.get('limit') || '10')
          const offset = parseInt(url.searchParams.get('offset') || '0')
          const { data, error, count } = await supabase
            .from('blog_posts')
            .select('id, slug, title, subtitle, meta_description, featured_image_url, author_name, published_at, created_at', { count: 'exact' })
            .eq('status', 'published').order('published_at', { ascending: false }).range(offset, offset + limit - 1)
          if (error) return jsonResp({ error: 'Failed to fetch posts' }, 500)
          return jsonResp({ posts: data, total: count })
        }
      }

      if (resource === 'pages') {
        if (slug) {
          const { data, error } = await supabase.from('page_contents').select('*').eq('page_key', slug).single()
          if (error || !data) return jsonResp({ error: 'Page not found' }, 404)
          return jsonResp(data)
        } else {
          const { data, error } = await supabase.from('page_contents').select('*').order('page_key')
          if (error) return jsonResp({ error: 'Failed to fetch pages' }, 500)
          return jsonResp({ pages: data })
        }
      }
    }

    // ==================== AUTH CHECK ====================
    const apiKey = req.headers.get('x-api-key')
    const authHeader = req.headers.get('authorization')
    const webhookToken = Deno.env.get('BLOG_WEBHOOK_TOKEN')

    let isWebhookAuth = false
    let apiKeyName: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7)
      if (webhookToken && bearerToken === webhookToken) {
        isWebhookAuth = true
        apiKeyName = 'webhook'
      }
    }

    if (!isWebhookAuth) {
      if (!apiKey) return jsonResp({ error: 'API key or Bearer token required' }, 401)
      const { data: keyData, error: keyError } = await supabase
        .from('blog_api_keys').select('id, name').eq('api_key', apiKey).eq('is_active', true).single()
      if (keyError || !keyData) return jsonResp({ error: 'Invalid API key' }, 401)
      apiKeyName = keyData.name
      await supabase.from('blog_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id)
    }

    // ==================== AUDIT ENDPOINTS ====================
    if (resource === 'audit') {
      if (req.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')
        const { data, error, count } = await supabase
          .from('api_audit_logs').select('*', { count: 'exact' })
          .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
        if (error) return jsonResp({ error: 'Failed to fetch audit logs' }, 500)
        return jsonResp({ logs: data, total: count })
      }

      // POST /audit/revert/:id — revert a change
      if (req.method === 'POST' && slug === 'revert' && pathParts[3]) {
        const logId = pathParts[3]
        const { data: logEntry, error: logError } = await supabase
          .from('api_audit_logs').select('*').eq('id', logId).single()
        if (logError || !logEntry) return jsonResp({ error: 'Audit log not found' }, 404)
        if (logEntry.reverted) return jsonResp({ error: 'Already reverted' }, 400)

        const table = logEntry.resource_type === 'post' ? 'blog_posts' : 'page_contents'
        const idCol = logEntry.resource_type === 'post' ? 'slug' : 'page_key'

        if (logEntry.action === 'delete') {
          // Re-insert deleted resource
          if (!logEntry.previous_data) return jsonResp({ error: 'No previous data to restore' }, 400)
          const { id: _id, ...insertData } = logEntry.previous_data as Record<string, any>
          const { error } = await supabase.from(table).upsert(insertData, { onConflict: idCol })
          if (error) return jsonResp({ error: 'Failed to revert', details: error.message }, 500)
        } else if (logEntry.action === 'create') {
          // Delete created resource
          const { error } = await supabase.from(table).delete().eq(idCol, logEntry.resource_id)
          if (error) return jsonResp({ error: 'Failed to revert', details: error.message }, 500)
        } else if (logEntry.action === 'update') {
          // Restore previous data
          if (!logEntry.previous_data) return jsonResp({ error: 'No previous data to restore' }, 400)
          const { id: _id, ...updateData } = logEntry.previous_data as Record<string, any>
          const { error } = await supabase.from(table).update(updateData).eq(idCol, logEntry.resource_id)
          if (error) return jsonResp({ error: 'Failed to revert', details: error.message }, 500)
        }

        await supabase.from('api_audit_logs').update({ reverted: true, reverted_at: new Date().toISOString() }).eq('id', logId)
        return jsonResp({ success: true, message: 'Change reverted' })
      }
    }

    // ==================== PAGES CRUD (protected) ====================
    if (resource === 'pages') {
      if (req.method === 'PUT' && slug) {
        // Fetch previous data for audit
        const { data: prevData } = await supabase.from('page_contents').select('*').eq('page_key', slug).single()

        const body = await req.json()
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: 'api' }
        if (body.title !== undefined) updateData.title = body.title
        if (body.meta_title !== undefined) updateData.meta_title = body.meta_title
        if (body.meta_description !== undefined) updateData.meta_description = body.meta_description
        if (body.content !== undefined) updateData.content = body.content

        const { data, error } = await supabase.from('page_contents').update(updateData).eq('page_key', slug).select().single()
        if (error || !data) return jsonResp({ error: 'Failed to update page', details: error?.message }, error ? 500 : 404)

        await logAudit(supabase, 'update', 'page', slug, prevData, data, apiKeyName)
        return jsonResp(data)
      }

      if (req.method === 'POST') {
        const body = await req.json()
        if (!body.page_key) return jsonResp({ error: 'page_key is required' }, 400)

        // Fetch previous data for audit (might not exist)
        const { data: prevData } = await supabase.from('page_contents').select('*').eq('page_key', body.page_key).single()

        const { data, error } = await supabase.from('page_contents')
          .upsert({ page_key: body.page_key, title: body.title ?? null, meta_title: body.meta_title ?? null, meta_description: body.meta_description ?? null, content: body.content ?? {}, updated_by: 'api' }, { onConflict: 'page_key' })
          .select().single()
        if (error) return jsonResp({ error: 'Failed to create/update page', details: error.message }, 500)

        await logAudit(supabase, prevData ? 'update' : 'create', 'page', body.page_key, prevData, data, apiKeyName)
        return jsonResp(data, 201)
      }

      if (req.method === 'DELETE' && slug) {
        const { data: prevData } = await supabase.from('page_contents').select('*').eq('page_key', slug).single()
        const { error } = await supabase.from('page_contents').delete().eq('page_key', slug)
        if (error) return jsonResp({ error: 'Failed to delete page' }, 500)

        await logAudit(supabase, 'delete', 'page', slug, prevData, null, apiKeyName)
        return jsonResp({ success: true })
      }
    }

    // ==================== POSTS CRUD (protected) ====================
    if (resource === 'posts') {
      if (req.method === 'POST') {
        const body = await req.json()
        const title = body.title
        const postSlug = body.slug
        const statusResolved = resolveField(body, ['status', 'state', 'postStatus'])
        const status = statusResolved.value ?? 'draft'

        if (!title || !postSlug) return jsonResp({ error: 'Title and slug are required' }, 400)

        // Fetch previous data for audit (might not exist)
        const { data: prevData } = await supabase.from('blog_posts').select('*').eq('slug', postSlug).single()

        const subtitleResolved = resolveField(body, ['subtitle', 'subTitle', 'sub_title', 'sousTitre', 'sous_titre'])
        const metaResolved = resolveField(body, ['meta_description', 'metaDescription', 'meta', 'seoDescription', 'description'])
        const imageResolved = resolveField(body, ['featured_image_url', 'featuredImageUrl', 'featuredImageURL', 'heroImageUrl', 'hero_image_url', 'coverImageUrl', 'imageUrl', 'image_url'])
        const authorResolved = resolveField(body, ['author_name', 'authorName', 'author', 'auteur', 'byline'])
        const contentResolved = resolveField(body, ['content_markdown', 'contentMarkdown', 'content_md', 'contentMd', 'markdown', 'content', 'body', 'text', 'content_html', 'contentHtml'])
        const content = asString(contentResolved.value)
        const publishedResolved = resolveField(body, ['published_at', 'publishedAt', 'published_time', 'publishedTime', 'createdAt', 'created_at'])
        const publishedCandidate = asString(publishedResolved.value).trim()
        const published_at = publishedCandidate ? publishedCandidate : status === 'published' ? new Date().toISOString() : null

        const postData: Record<string, unknown> = {
          title, slug: postSlug, subtitle: subtitleResolved.value ?? null, content,
          meta_description: metaResolved.value ?? null, featured_image_url: imageResolved.value ?? null,
          author_name: authorResolved.value ?? null, status, published_at,
        }

        const { data, error } = await supabase.from('blog_posts').upsert(postData, { onConflict: 'slug' }).select().single()
        if (error) return jsonResp({ error: 'Failed to create post', details: error.message }, 500)

        await logAudit(supabase, prevData ? 'update' : 'create', 'post', postSlug, prevData, data, apiKeyName)
        return jsonResp(data, 201)
      }

      if (req.method === 'PUT' && slug) {
        // Fetch previous data for audit
        const { data: prevData } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()

        const body = await req.json()
        const updateData: Record<string, unknown> = {}

        const titleResolved = resolveField(body, ['title'])
        if (titleResolved.value !== undefined) updateData.title = titleResolved.value
        const subtitleResolved = resolveField(body, ['subtitle', 'subTitle', 'sub_title', 'sousTitre', 'sous_titre'])
        if (subtitleResolved.value !== undefined) updateData.subtitle = subtitleResolved.value
        const metaResolved = resolveField(body, ['meta_description', 'metaDescription', 'meta', 'seoDescription', 'description'])
        if (metaResolved.value !== undefined) updateData.meta_description = metaResolved.value
        const imageResolved = resolveField(body, ['featured_image_url', 'featuredImageUrl', 'featuredImageURL', 'heroImageUrl', 'hero_image_url', 'coverImageUrl', 'imageUrl', 'image_url'])
        if (imageResolved.value !== undefined) updateData.featured_image_url = imageResolved.value
        const authorResolved = resolveField(body, ['author_name', 'authorName', 'author', 'auteur', 'byline'])
        if (authorResolved.value !== undefined) updateData.author_name = authorResolved.value
        const contentResolved = resolveField(body, ['content_markdown', 'contentMarkdown', 'content_md', 'contentMd', 'markdown', 'content', 'body', 'text', 'content_html', 'contentHtml'])
        if (contentResolved.value !== undefined) updateData.content = asString(contentResolved.value)
        const publishedResolved = resolveField(body, ['published_at', 'publishedAt', 'published_time', 'publishedTime', 'createdAt', 'created_at'])
        if (publishedResolved.value !== undefined) {
          const candidate = asString(publishedResolved.value).trim()
          updateData.published_at = candidate || null
        }
        const statusResolved = resolveField(body, ['status', 'state', 'postStatus'])
        if (statusResolved.value !== undefined) {
          updateData.status = statusResolved.value
          if (statusResolved.value === 'published') {
            const { data: existing } = await supabase.from('blog_posts').select('published_at').eq('slug', slug).single()
            if (!existing?.published_at && (!updateData.published_at)) {
              updateData.published_at = new Date().toISOString()
            }
          }
        }

        const { data, error } = await supabase.from('blog_posts').update(updateData).eq('slug', slug).select().single()
        if (error) return jsonResp({ error: 'Failed to update post' }, 500)

        await logAudit(supabase, 'update', 'post', slug, prevData, data, apiKeyName)
        return jsonResp(data)
      }

      if (req.method === 'DELETE' && slug) {
        const { data: prevData } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()
        const { error } = await supabase.from('blog_posts').delete().eq('slug', slug)
        if (error) return jsonResp({ error: 'Failed to delete post' }, 500)

        await logAudit(supabase, 'delete', 'post', slug, prevData, null, apiKeyName)
        return jsonResp({ success: true })
      }

      if (req.method === 'GET') {
        const includeAll = url.searchParams.get('all') === 'true'
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')
        let query = supabase.from('blog_posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
        if (!includeAll) query = query.eq('status', 'published')
        const { data, error, count } = await query
        if (error) return jsonResp({ error: 'Failed to fetch posts' }, 500)
        return jsonResp({ posts: data, total: count })
      }
    }

    return jsonResp({ error: 'Not found' }, 404)

  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonResp({ error: 'Internal server error' }, 500)
  }
})
