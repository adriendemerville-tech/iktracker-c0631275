import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// ==================== HELPERS ====================

function resolveField(body: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) return { key, value: body[key] }
  }
  return { key: null as string | null, value: undefined as any }
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function successResp(data: unknown, status = 200) {
  return jsonResp({ success: true, data }, status)
}

function errorResp(message: string, status: number) {
  return jsonResp({ success: false, error: message }, status)
}

async function logAudit(supabase: any, action: string, resourceType: string, resourceId: string, previousData: any, newData: any, apiKeyName: string | null) {
  try {
    await supabase.from('api_audit_logs').insert({
      action, resource_type: resourceType, resource_id: resourceId,
      previous_data: previousData, new_data: newData, api_key_name: apiKeyName,
    })
  } catch (e) { console.error('Audit log error:', e) }
}

async function logAccess(supabase: any, method: string, path: string, apiKeyName: string | null, statusCode: number, startTime: number) {
  try {
    await supabase.from('api_access_logs').insert({
      method, path, api_key_name: apiKeyName,
      status_code: statusCode,
      response_time_ms: Date.now() - startTime,
    })
  } catch (e) { console.error('Access log error:', e) }
}

// ==================== RATE LIMITING ====================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100
const RATE_WINDOW_MS = 60_000

function checkRateLimit(apiKeyName: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(apiKeyName)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(apiKeyName, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT
}

// ==================== ROUTE HANDLERS ====================

async function handleHealth(supabase: any) {
  const [{ count: postsCount }, { count: pagesCount }] = await Promise.all([
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
    supabase.from('page_contents').select('*', { count: 'exact', head: true }),
  ])
  return successResp({
    status: 'ok',
    api_version: '2.0.0',
    timestamp: new Date().toISOString(),
    counts: { posts: postsCount ?? 0, pages: pagesCount ?? 0 },
  })
}

// --- SEO ---

async function handleSeo(supabase: any, req: Request, subResource: string, subId: string | undefined, apiKeyName: string | null) {
  if (subResource === 'robots-txt') {
    if (req.method === 'GET') {
      const { data } = await supabase.from('site_seo_config').select('*').eq('config_key', 'robots_txt').single()
      return successResp({ content: data?.content ?? '' })
    }
    if (req.method === 'PUT') {
      const body = await req.json()
      const { data: prev } = await supabase.from('site_seo_config').select('*').eq('config_key', 'robots_txt').single()
      const { data, error } = await supabase.from('site_seo_config')
        .upsert({ config_key: 'robots_txt', content: body.content ?? '', updated_at: new Date().toISOString(), updated_by: 'api' }, { onConflict: 'config_key' })
        .select().single()
      if (error) return errorResp('Failed to update robots.txt', 500)
      await logAudit(supabase, 'update', 'seo_config', 'robots_txt', prev, data, apiKeyName)
      return successResp(data)
    }
  }

  if (subResource === 'sitemap') {
    if (req.method === 'GET') {
      // Fetch published posts for sitemap generation
      const { data: posts } = await supabase.from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published').order('published_at', { ascending: false })
      const { data: config } = await supabase.from('site_seo_config').select('*').eq('config_key', 'sitemap_config').single()
      return successResp({ config: config?.content, posts: posts ?? [] })
    }
    if (req.method === 'PUT') {
      const body = await req.json()
      const { data, error } = await supabase.from('site_seo_config')
        .upsert({ config_key: 'sitemap_config', content: JSON.stringify(body.config ?? {}), updated_at: new Date().toISOString(), updated_by: 'api' }, { onConflict: 'config_key' })
        .select().single()
      if (error) return errorResp('Failed to update sitemap config', 500)
      return successResp({ message: 'Sitemap config updated', data })
    }
  }

  if (subResource === 'redirects') {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('seo_redirects').select('*').order('created_at', { ascending: false })
      if (error) return errorResp('Failed to fetch redirects', 500)
      return successResp(data)
    }
    if (req.method === 'POST') {
      const body = await req.json()
      if (!body.source_path || !body.target_url) return errorResp('source_path and target_url are required', 400)
      const { data, error } = await supabase.from('seo_redirects').insert({
        source_path: body.source_path,
        target_url: body.target_url,
        status_code: body.status_code ?? 301,
        is_active: body.is_active ?? true,
      }).select().single()
      if (error) return errorResp('Failed to create redirect', 500)
      await logAudit(supabase, 'create', 'redirect', data.id, null, data, apiKeyName)
      return successResp(data, 201)
    }
    if (req.method === 'DELETE' && subId) {
      const { data: prev } = await supabase.from('seo_redirects').select('*').eq('id', subId).single()
      const { error } = await supabase.from('seo_redirects').delete().eq('id', subId)
      if (error) return errorResp('Failed to delete redirect', 500)
      await logAudit(supabase, 'delete', 'redirect', subId, prev, null, apiKeyName)
      return successResp({ deleted: true })
    }
  }

  return errorResp('SEO endpoint not found', 404)
}

// --- INJECTIONS ---

async function handleInjection(supabase: any, req: Request, subResource: string, subId: string | undefined, apiKeyName: string | null) {
  if (subResource === 'head' || subResource === 'body-end') {
    const location = subResource === 'head' ? 'head' : 'body_end'
    if (req.method === 'GET') {
      const { data } = await supabase.from('code_injections').select('*').eq('location', location).is('page_key', null)
      return successResp(data ?? [])
    }
    if (req.method === 'PUT') {
      const body = await req.json()
      // Upsert: delete existing global injections for this location, insert new ones
      await supabase.from('code_injections').delete().eq('location', location).is('page_key', null)
      const items = Array.isArray(body.injections) ? body.injections : [{ content: body.content ?? '', label: body.label ?? location }]
      const toInsert = items.map((item: any) => ({ location, page_key: null, content: item.content ?? '', label: item.label ?? '', is_active: item.is_active ?? true }))
      const { data, error } = await supabase.from('code_injections').insert(toInsert).select()
      if (error) return errorResp('Failed to update injections', 500)
      await logAudit(supabase, 'update', 'injection', location, null, data, apiKeyName)
      return successResp(data)
    }
  }

  if (subResource === 'page' && subId) {
    if (req.method === 'GET') {
      const { data } = await supabase.from('code_injections').select('*').eq('location', 'page_specific').eq('page_key', subId)
      return successResp(data ?? [])
    }
    if (req.method === 'PUT') {
      const body = await req.json()
      await supabase.from('code_injections').delete().eq('location', 'page_specific').eq('page_key', subId)
      const items = Array.isArray(body.injections) ? body.injections : [{ content: body.content ?? '', label: body.label ?? subId }]
      const toInsert = items.map((item: any) => ({ location: 'page_specific', page_key: subId, content: item.content ?? '', label: item.label ?? '', is_active: item.is_active ?? true }))
      const { data, error } = await supabase.from('code_injections').insert(toInsert).select()
      if (error) return errorResp('Failed to update page injections', 500)
      await logAudit(supabase, 'update', 'injection', `page:${subId}`, null, data, apiKeyName)
      return successResp(data)
    }
  }

  return errorResp('Injection endpoint not found', 404)
}

// --- CONFIG ---

async function handleConfig(supabase: any, req: Request, subResource: string, apiKeyName: string | null) {
  if (subResource === 'site') {
    const { data } = await supabase.from('site_config').select('*').eq('config_key', 'site_info').single()
    return successResp({
      ...(data?.config_value ?? {}),
      api_version: '2.0.0',
      cms: 'IKtracker/Lovable',
    })
  }

  if (subResource === 'navigation') {
    if (req.method === 'GET') {
      const { data } = await supabase.from('site_config').select('*').in('config_key', ['navigation_header', 'navigation_footer'])
      const result: Record<string, any> = {}
      for (const row of data ?? []) result[row.config_key] = row.config_value
      return successResp(result)
    }
    if (req.method === 'PUT') {
      const body = await req.json()
      const updates = []
      if (body.header !== undefined) {
        updates.push(supabase.from('site_config').upsert({ config_key: 'navigation_header', config_value: body.header, updated_at: new Date().toISOString() }, { onConflict: 'config_key' }))
      }
      if (body.footer !== undefined) {
        updates.push(supabase.from('site_config').upsert({ config_key: 'navigation_footer', config_value: body.footer, updated_at: new Date().toISOString() }, { onConflict: 'config_key' }))
      }
      await Promise.all(updates)
      await logAudit(supabase, 'update', 'config', 'navigation', null, body, apiKeyName)
      return successResp({ updated: true })
    }
  }

  return errorResp('Config endpoint not found', 404)
}

// --- MEDIA ---

async function handleMedia(supabase: any, req: Request, subId: string | undefined, apiKeyName: string | null) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.storage.from('blog-images').list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } })
    if (error) return errorResp('Failed to list media', 500)
    const files = (data ?? []).map((f: any) => ({
      name: f.name,
      id: f.id,
      size: f.metadata?.size,
      mimetype: f.metadata?.mimetype,
      created_at: f.created_at,
      url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/blog-images/${f.name}`,
    }))
    return successResp(files)
  }

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/octet-stream')) {
      // Accept JSON with base64
      const body = await req.json()
      if (!body.filename || !body.data) return errorResp('filename and data (base64) required', 400)
      const bytes = Uint8Array.from(atob(body.data), c => c.charCodeAt(0))
      const { data, error } = await supabase.storage.from('blog-images').upload(body.filename, bytes, {
        contentType: body.content_type ?? 'image/webp',
        upsert: true,
      })
      if (error) return errorResp('Failed to upload file: ' + error.message, 500)
      const url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/blog-images/${body.filename}`
      await logAudit(supabase, 'create', 'media', body.filename, null, { url }, apiKeyName)
      return successResp({ path: data.path, url }, 201)
    }
    // Multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return errorResp('No file provided', 400)
    const filename = formData.get('filename')?.toString() ?? file.name
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { data, error } = await supabase.storage.from('blog-images').upload(filename, bytes, {
      contentType: file.type,
      upsert: true,
    })
    if (error) return errorResp('Failed to upload: ' + error.message, 500)
    const url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/blog-images/${filename}`
    await logAudit(supabase, 'create', 'media', filename, null, { url }, apiKeyName)
    return successResp({ path: data.path, url }, 201)
  }

  if (req.method === 'DELETE' && subId) {
    const { error } = await supabase.storage.from('blog-images').remove([subId])
    if (error) return errorResp('Failed to delete file', 500)
    await logAudit(supabase, 'delete', 'media', subId, null, null, apiKeyName)
    return successResp({ deleted: true })
  }

  return errorResp('Media endpoint not found', 404)
}

// --- PAGES ---

async function handlePages(supabase: any, req: Request, slug: string | undefined, apiKeyName: string | null, isPublic: boolean) {
  if (req.method === 'GET') {
    if (slug) {
      const { data, error } = await supabase.from('page_contents').select('*').eq('page_key', slug).single()
      if (error || !data) return errorResp('Page not found', 404)
      return isPublic ? jsonResp(data) : successResp(data)
    }
    const { data, error } = await supabase.from('page_contents').select('*').order('page_key')
    if (error) return errorResp('Failed to fetch pages', 500)
    return isPublic ? jsonResp({ pages: data }) : successResp(data)
  }

  if (req.method === 'PUT' && slug) {
    const { data: prevData } = await supabase.from('page_contents').select('*').eq('page_key', slug).single()
    const body = await req.json()
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: 'api' }
    if (body.title !== undefined) updateData.title = body.title
    if (body.meta_title !== undefined) updateData.meta_title = body.meta_title
    if (body.meta_description !== undefined) updateData.meta_description = body.meta_description
    if (body.content !== undefined) updateData.content = body.content
    if (body.schema_org !== undefined) updateData.schema_org = body.schema_org
    if (body.canonical_url !== undefined) updateData.canonical_url = body.canonical_url

    const { data, error } = await supabase.from('page_contents').update(updateData).eq('page_key', slug).select().single()
    if (error || !data) return errorResp('Failed to update page', error ? 500 : 404)
    await logAudit(supabase, 'update', 'page', slug, prevData, data, apiKeyName)
    return successResp(data)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    if (!body.page_key) return errorResp('page_key is required', 400)
    const { data: prevData } = await supabase.from('page_contents').select('*').eq('page_key', body.page_key).single()
    const { data, error } = await supabase.from('page_contents')
      .upsert({
        page_key: body.page_key, title: body.title ?? null, meta_title: body.meta_title ?? null,
        meta_description: body.meta_description ?? null, content: body.content ?? {},
        schema_org: body.schema_org ?? null, canonical_url: body.canonical_url ?? null,
        updated_by: 'api',
      }, { onConflict: 'page_key' }).select().single()
    if (error) return errorResp('Failed to create/update page', 500)
    await logAudit(supabase, prevData ? 'update' : 'create', 'page', body.page_key, prevData, data, apiKeyName)
    return successResp(data, 201)
  }

  if (req.method === 'DELETE' && slug) {
    const { data: prevData } = await supabase.from('page_contents').select('*').eq('page_key', slug).single()
    const { error } = await supabase.from('page_contents').delete().eq('page_key', slug)
    if (error) return errorResp('Failed to delete page', 500)
    await logAudit(supabase, 'delete', 'page', slug, prevData, null, apiKeyName)
    return successResp({ deleted: true })
  }

  return errorResp('Not found', 404)
}

// --- POSTS ---

async function handlePosts(supabase: any, req: Request, url: URL, slug: string | undefined, apiKeyName: string | null, isPublic: boolean) {
  if (req.method === 'GET') {
    if (isPublic) {
      if (slug) {
        const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single()
        if (error || !data) return jsonResp({ error: 'Post not found' }, 404)
        return jsonResp(data)
      }
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const { data, error, count } = await supabase.from('blog_posts')
        .select('id, slug, title, subtitle, meta_description, featured_image_url, author_name, published_at, created_at', { count: 'exact' })
        .eq('status', 'published').order('published_at', { ascending: false }).range(offset, offset + limit - 1)
      if (error) return jsonResp({ error: 'Failed to fetch posts' }, 500)
      return jsonResp({ posts: data, total: count })
    }

    // Authenticated GET
    if (slug) {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()
      if (error || !data) return errorResp('Post not found', 404)
      return successResp(data)
    }
    const includeAll = url.searchParams.get('all') === 'true'
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    let query = supabase.from('blog_posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (!includeAll) query = query.eq('status', 'published')
    const { data, error, count } = await query
    if (error) return errorResp('Failed to fetch posts', 500)
    return successResp({ posts: data, total: count })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const title = body.title
    const postSlug = body.slug
    const statusResolved = resolveField(body, ['status', 'state', 'postStatus'])
    const status = statusResolved.value ?? 'draft'
    if (!title || !postSlug) return errorResp('Title and slug are required', 400)
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
    if (error) return errorResp('Failed to create post: ' + error.message, 500)
    await logAudit(supabase, prevData ? 'update' : 'create', 'post', postSlug, prevData, data, apiKeyName)
    return successResp(data, 201)
  }

  if (req.method === 'PUT' && slug) {
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
        if (!existing?.published_at && !updateData.published_at) {
          updateData.published_at = new Date().toISOString()
        }
      }
    }

    const { data, error } = await supabase.from('blog_posts').update(updateData).eq('slug', slug).select().single()
    if (error) return errorResp('Failed to update post', 500)
    await logAudit(supabase, 'update', 'post', slug, prevData, data, apiKeyName)
    return successResp(data)
  }

  if (req.method === 'DELETE' && slug) {
    const { data: prevData } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()
    const { error } = await supabase.from('blog_posts').delete().eq('slug', slug)
    if (error) return errorResp('Failed to delete post', 500)
    await logAudit(supabase, 'delete', 'post', slug, prevData, null, apiKeyName)
    return successResp({ deleted: true })
  }

  return errorResp('Not found', 404)
}

// --- AUDIT ---

async function handleAudit(supabase: any, req: Request, url: URL, slug: string | undefined, pathParts: string[], apiKeyName: string | null) {
  if (req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const { data, error, count } = await supabase
      .from('api_audit_logs').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (error) return errorResp('Failed to fetch audit logs', 500)
    return successResp({ logs: data, total: count })
  }

  if (req.method === 'POST' && slug === 'revert' && pathParts[3]) {
    const logId = pathParts[3]
    const { data: logEntry, error: logError } = await supabase.from('api_audit_logs').select('*').eq('id', logId).single()
    if (logError || !logEntry) return errorResp('Audit log not found', 404)
    if (logEntry.reverted) return errorResp('Already reverted', 400)

    const table = logEntry.resource_type === 'post' ? 'blog_posts' : 'page_contents'
    const idCol = logEntry.resource_type === 'post' ? 'slug' : 'page_key'

    if (logEntry.action === 'delete') {
      if (!logEntry.previous_data) return errorResp('No previous data to restore', 400)
      const { id: _id, ...insertData } = logEntry.previous_data as Record<string, any>
      const { error } = await supabase.from(table).upsert(insertData, { onConflict: idCol })
      if (error) return errorResp('Failed to revert: ' + error.message, 500)
    } else if (logEntry.action === 'create') {
      const { error } = await supabase.from(table).delete().eq(idCol, logEntry.resource_id)
      if (error) return errorResp('Failed to revert: ' + error.message, 500)
    } else if (logEntry.action === 'update') {
      if (!logEntry.previous_data) return errorResp('No previous data to restore', 400)
      const { id: _id, ...updateData } = logEntry.previous_data as Record<string, any>
      const { error } = await supabase.from(table).update(updateData).eq(idCol, logEntry.resource_id)
      if (error) return errorResp('Failed to revert: ' + error.message, 500)
    }

    await supabase.from('api_audit_logs').update({ reverted: true, reverted_at: new Date().toISOString() }).eq('id', logId)
    return successResp({ message: 'Change reverted' })
  }

  return errorResp('Audit endpoint not found', 404)
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  // pathParts[0] = 'blog-api', pathParts[1] = resource, pathParts[2] = sub/slug, pathParts[3] = subId
  const resource = pathParts[1]
  const slug = pathParts[2]
  const subId = pathParts[3]

  let apiKeyName: string | null = null

  try {
    // ==================== PUBLIC GET (no auth) ====================
    if (req.method === 'GET' && (resource === 'posts' || resource === 'pages') && !req.headers.get('x-api-key') && !req.headers.get('authorization')) {
      const resp = resource === 'posts'
        ? await handlePosts(supabase, req, url, slug, null, true)
        : await handlePages(supabase, req, slug, null, true)
      await logAccess(supabase, req.method, url.pathname, null, resp.status, startTime)
      return resp
    }

    // ==================== HEALTH (no auth) ====================
    if (resource === 'health' && req.method === 'GET') {
      const resp = await handleHealth(supabase)
      await logAccess(supabase, req.method, url.pathname, null, resp.status, startTime)
      return resp
    }

    // ==================== AUTH CHECK ====================
    const apiKey = req.headers.get('x-api-key')
    const authHeader = req.headers.get('authorization')
    const webhookToken = Deno.env.get('BLOG_WEBHOOK_TOKEN')

    let isWebhookAuth = false

    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7)
      if (webhookToken && bearerToken === webhookToken) {
        isWebhookAuth = true
        apiKeyName = 'webhook'
      }
    }

    if (!isWebhookAuth) {
      if (!apiKey) return errorResp('API key or Bearer token required', 401)
      const { data: keyData, error: keyError } = await supabase
        .from('blog_api_keys').select('id, name').eq('api_key', apiKey).eq('is_active', true).single()
      if (keyError || !keyData) return errorResp('Invalid API key', 401)
      apiKeyName = keyData.name
      await supabase.from('blog_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id)
    }

    // ==================== RATE LIMIT ====================
    if (apiKeyName && !checkRateLimit(apiKeyName)) {
      const resp = errorResp('Rate limit exceeded (100 req/min)', 429)
      await logAccess(supabase, req.method, url.pathname, apiKeyName, 429, startTime)
      return resp
    }

    // ==================== ROUTING ====================
    let resp: Response

    switch (resource) {
      case 'posts':
        resp = await handlePosts(supabase, req, url, slug, apiKeyName, false)
        break
      case 'pages':
        resp = await handlePages(supabase, req, slug, apiKeyName, false)
        break
      case 'audit':
        resp = await handleAudit(supabase, req, url, slug, pathParts, apiKeyName)
        break
      case 'seo':
        resp = await handleSeo(supabase, req, slug ?? '', subId, apiKeyName)
        break
      case 'injection':
        resp = await handleInjection(supabase, req, slug ?? '', subId, apiKeyName)
        break
      case 'config':
        resp = await handleConfig(supabase, req, slug ?? '', apiKeyName)
        break
      case 'media':
        resp = await handleMedia(supabase, req, slug, apiKeyName)
        break
      default:
        resp = errorResp('Not found', 404)
    }

    await logAccess(supabase, req.method, url.pathname, apiKeyName, resp.status, startTime)
    return resp

  } catch (error) {
    console.error('Unexpected error:', error)
    await logAccess(supabase, req.method, url.pathname, apiKeyName, 500, startTime)
    return errorResp('Internal server error', 500)
  }
})
