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

// --- AUTOPILOT ---

async function handleAutopilot(supabase: any, req: Request, url: URL, subResource: string | undefined) {
  // GET /autopilot/registry — full timeline of changes + linked events
  if (req.method === 'GET' && (!subResource || subResource === 'registry')) {
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const pageKey = url.searchParams.get('page_key')

    // Fetch audit logs
    let auditQuery = supabase
      .from('api_audit_logs').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (pageKey) {
      auditQuery = auditQuery.eq('resource_id', pageKey)
    }
    const { data: logs, error: logsErr, count } = await auditQuery
    if (logsErr) return errorResp('Failed to fetch registry', 500)

    // Fetch linked events
    const logIds = (logs || []).map((l: any) => l.id)
    let events: any[] = []
    if (logIds.length > 0) {
      const { data: evts } = await supabase
        .from('autopilot_events').select('*')
        .in('audit_log_id', logIds)
        .order('created_at', { ascending: false })
      events = evts || []
    }

    // Also get orphan events (not linked to audit logs)
    const { data: orphanEvents } = await supabase
      .from('autopilot_events').select('*')
      .is('audit_log_id', null)
      .order('created_at', { ascending: false })
      .limit(50)

    return successResp({
      changes: logs,
      events: [...events, ...(orphanEvents || [])],
      total_changes: count,
    })
  }

  // GET /autopilot/health — per-page health scores
  if (req.method === 'GET' && subResource === 'health') {
    const { data: activeEvents } = await supabase
      .from('autopilot_events').select('page_key, severity')
      .eq('resolved', false)

    const pageHealth: Record<string, { critical: number; warning: number; info: number; score: number }> = {}
    for (const evt of (activeEvents || [])) {
      const key = evt.page_key || '__global__'
      if (!pageHealth[key]) pageHealth[key] = { critical: 0, warning: 0, info: 0, score: 100 }
      if (evt.severity === 'critical') { pageHealth[key].critical++; pageHealth[key].score = 0 }
      else if (evt.severity === 'warning') { pageHealth[key].warning++; pageHealth[key].score = Math.min(pageHealth[key].score, 50) }
      else { pageHealth[key].info++ }
    }

    return successResp({ pages: pageHealth })
  }

  // GET /autopilot/events — list all events
  if (req.method === 'GET' && subResource === 'events') {
    const resolved = url.searchParams.get('resolved')
    let query = supabase.from('autopilot_events').select('*').order('created_at', { ascending: false }).limit(200)
    if (resolved === 'false') query = query.eq('resolved', false)
    if (resolved === 'true') query = query.eq('resolved', true)

    const { data, error } = await query
    if (error) return errorResp('Failed to fetch events', 500)
    return successResp(data)
  }

  // POST /autopilot/events — Crawlers pushes detected events/bugs
  if (req.method === 'POST' && subResource === 'events') {
    const body = await req.json()
    const { event_type, severity, page_key, message, details, audit_log_id } = body

    if (!message) return errorResp('message is required', 400)

    const validSeverities = ['info', 'warning', 'critical']
    const sev = validSeverities.includes(severity) ? severity : 'info'

    const { data, error } = await supabase
      .from('autopilot_events')
      .insert({
        event_type: event_type || 'external',
        severity: sev,
        page_key: page_key || null,
        message,
        details: details || {},
        audit_log_id: audit_log_id || null,
      })
      .select()
      .single()

    if (error) return errorResp('Failed to create event: ' + error.message, 500)
    return successResp(data, 201)
  }

  return errorResp('Autopilot endpoint not found', 404)
}

// --- DOCS ---

function handleDocs() {
  const docs = {
    api: 'IKtracker Blog API',
    version: '2.0.0',
    base_url: '/blog-api',
    authentication: {
      methods: [
        { type: 'API Key', header: 'x-api-key', description: 'Required for all write operations' },
        { type: 'Bearer Token', header: 'Authorization: Bearer <token>', description: 'Webhook authentication' },
      ],
      note: 'GET /posts and GET /pages are publicly accessible without authentication',
    },
    rate_limit: '100 requests/minute per API key',
    endpoints: {
      health: {
        'GET /health': { auth: false, description: 'API health check and content counts' },
      },
      docs: {
        'GET /docs': { auth: false, description: 'This documentation endpoint' },
      },
      posts: {
        'GET /posts': { auth: false, description: 'List published posts', params: 'limit, offset' },
        'GET /posts/:slug': { auth: false, description: 'Get a published post by slug' },
        'GET /posts?all=true': { auth: true, description: 'List all posts (incl. drafts)' },
        'POST /posts': { auth: true, description: 'Create or update a post (upsert by slug)', body: 'title*, slug*, content, status (draft|published|archived), meta_description, featured_image_url/image_url, author_name, subtitle, published_at' },
        'PUT /posts/:slug': { auth: true, description: 'Update a post by slug' },
        'DELETE /posts/:slug': { auth: true, description: 'Delete a post by slug' },
      },
      pages: {
        'GET /pages': { auth: false, description: 'List all static pages' },
        'GET /pages/:page_key': { auth: false, description: 'Get a page by key' },
        'POST /pages': { auth: true, description: 'Create or update a page (upsert by page_key)', body: 'page_key*, title, meta_title, meta_description, content, schema_org, canonical_url' },
        'PUT /pages/:page_key': { auth: true, description: 'Update a page by key' },
        'DELETE /pages/:page_key': { auth: true, description: 'Delete a page by key' },
      },
      injection: {
        note: 'Also accessible via /code or /cms-push-code aliases',
        'GET /injection/head': { auth: true, description: 'Get global head injections' },
        'PUT /injection/head': { auth: true, description: 'Set global head injections', body: 'content, label, is_active OR injections[]' },
        'GET /injection/body-end': { auth: true, description: 'Get global body-end injections' },
        'PUT /injection/body-end': { auth: true, description: 'Set global body-end injections' },
        'GET /injection/page/:page_key': { auth: true, description: 'Get page-specific injections' },
        'PUT /injection/page/:page_key': { auth: true, description: 'Set page-specific injections' },
      },
      seo: {
        'GET /seo/robots-txt': { auth: true, description: 'Get robots.txt content' },
        'PUT /seo/robots-txt': { auth: true, description: 'Update robots.txt', body: 'content' },
        'GET /seo/sitemap': { auth: true, description: 'Get sitemap config and published posts' },
        'PUT /seo/sitemap': { auth: true, description: 'Update sitemap config', body: 'config' },
        'GET /seo/redirects': { auth: true, description: 'List all redirects' },
        'POST /seo/redirects': { auth: true, description: 'Create a redirect', body: 'source_path*, target_url*, status_code (301|302), is_active' },
        'DELETE /seo/redirects/:id': { auth: true, description: 'Delete a redirect' },
      },
      config: {
        'GET /config/site': { auth: true, description: 'Get site info config' },
        'GET /config/navigation': { auth: true, description: 'Get header/footer navigation' },
        'PUT /config/navigation': { auth: true, description: 'Update navigation', body: 'header, footer' },
      },
      media: {
        'GET /media': { auth: true, description: 'List uploaded media files' },
        'POST /media': { auth: true, description: 'Upload a file (multipart or base64 JSON)', body: 'filename*, data* (base64), content_type' },
        'DELETE /media/:filename': { auth: true, description: 'Delete a media file' },
      },
      audit: {
        'GET /audit': { auth: true, description: 'List audit logs', params: 'limit, offset' },
        'POST /audit/revert/:log_id': { auth: true, description: 'Revert a change by audit log ID' },
      },
      autopilot: {
        'GET /autopilot/registry': { auth: true, description: 'Timeline of changes with linked events', params: 'limit, offset, page_key' },
        'GET /autopilot/health': { auth: true, description: 'Per-page health scores (0-100)' },
        'GET /autopilot/events': { auth: true, description: 'List autopilot events', params: 'resolved (true|false)' },
        'POST /autopilot/events': { auth: true, description: 'Report a detected event/bug', body: 'message*, event_type, severity (info|warning|critical), page_key, details, audit_log_id' },
      },
    },
    field_aliases: {
      note: 'The API accepts multiple field name variants for flexibility',
      content: ['content', 'content_markdown', 'contentMarkdown', 'content_md', 'markdown', 'body', 'text', 'content_html'],
      featured_image_url: ['featured_image_url', 'featuredImageUrl', 'image_url', 'imageUrl', 'heroImageUrl', 'hero_image_url', 'coverImageUrl'],
      meta_description: ['meta_description', 'metaDescription', 'meta', 'seoDescription', 'description'],
      author_name: ['author_name', 'authorName', 'author', 'auteur', 'byline'],
      subtitle: ['subtitle', 'subTitle', 'sub_title', 'sousTitre', 'sous_titre'],
      status: ['status', 'state', 'postStatus'],
    },
  }
  return jsonResp(docs)
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

    // ==================== DOCS (no auth) ====================
    if (resource === 'docs' && req.method === 'GET') {
      const resp = handleDocs()
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
      case 'code':
      case 'cms-push-code':
        resp = await handleInjection(supabase, req, slug ?? '', subId, apiKeyName)
        break
      case 'config':
        resp = await handleConfig(supabase, req, slug ?? '', apiKeyName)
        break
      case 'media':
        resp = await handleMedia(supabase, req, slug, apiKeyName)
        break
      case 'autopilot':
        resp = await handleAutopilot(supabase, req, url, slug)
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
