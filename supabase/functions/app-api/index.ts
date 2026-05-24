import { corsHeaders } from '../_shared/cors.ts'
import { requireSessionUser } from '../_shared/auth.ts'

type RequestBody = {
  action?: string
  filter?: {
    keyword?: string
    status?: 'all' | 'active' | 'completed'
    priority?: 1 | 2 | 3
    listId?: string
    dateStart?: string
    dateEnd?: string
    includeUndated?: boolean
  }
  input?: Record<string, unknown>
  id?: string
}

function getLegacyUserKey(user: { nick_name: string | null; id: string }): string {
  if (!user || !user.id) {
    throw new Error('Invalid user object: missing id')
  }
  const nickname = user.nick_name?.trim()
  return nickname && nickname.length > 0 ? nickname : user.id
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function matchesDateFilter(task: { due_at: string | null }, filter: NonNullable<RequestBody['filter']>) {
  if (!filter.dateStart || !filter.dateEnd) {
    return true
  }

  const inRange = Boolean(task.due_at && task.due_at >= filter.dateStart && task.due_at < filter.dateEnd)
  return inRange || Boolean(filter.includeUndated && !task.due_at)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { supabase, user } = await requireSessionUser(request)
    const body = await request.json() as RequestBody

    if (body.action === 'listTasks') {
      const filter = body.filter || {}
      let query = supabase
        .from('tasks')
        .select('id, user_id, title, content, completed, priority, list_id, due_at, due_time, repeat_rule, created_at, updated_at')
        .eq('user_id', user.id)

      if (filter.status === 'active') {
        query = query.eq('completed', false)
      } else if (filter.status === 'completed') {
        query = query.eq('completed', true)
      }

      if (filter.priority) {
        query = query.eq('priority', filter.priority)
      }

      if (filter.listId) {
        query = query.eq('list_id', filter.listId)
      }

      query = query
        .order('due_at', { ascending: true })
        .order('due_time', { ascending: true })
        .order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) return jsonResponse({ error: error.message }, 500)

      const keyword = filter.keyword?.trim().toLowerCase() || ''
      const filteredData = (data || []).filter(task => {
        if (!matchesDateFilter(task, filter)) {
          return false
        }

        if (!keyword) {
          return true
        }

        const title = (task.title || '').toLowerCase()
        const content = (task.content || '').toLowerCase()
        return title.includes(keyword) || content.includes(keyword)
      })

      return jsonResponse({ data: filteredData })
    }

    if (body.action === 'createTask') {
      const payload = body.input || {}
      const legacyUserKey = getLegacyUserKey(user)
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          legacy_user_key: legacyUserKey,
          title: payload.title,
          content: payload.content || '',
          priority: payload.priority || 2,
          list_id: payload.listId || null,
          due_at: payload.dueAt || null,
          due_time: payload.dueTime || null,
        })
        .select('id, user_id, title, content, completed, priority, list_id, due_at, due_time, repeat_rule, created_at, updated_at')
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ data })
    }

    if (body.action === 'updateTask') {
      const payload = body.input || {}
      const { data: ownedTask, error: ownedTaskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', body.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (ownedTaskError) return jsonResponse({ error: ownedTaskError.message }, 500)
      if (!ownedTask) return jsonResponse({ error: 'Task not found' }, 404)

      const updatePayload = {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.content !== undefined ? { content: payload.content || '' } : {}),
        ...(payload.completed !== undefined ? { completed: payload.completed } : {}),
        ...(payload.priority !== undefined ? { priority: payload.priority || 2 } : {}),
        ...(payload.listId !== undefined ? { list_id: payload.listId || null } : {}),
        ...(payload.dueAt !== undefined ? { due_at: payload.dueAt || null } : {}),
        ...(payload.dueTime !== undefined ? { due_time: payload.dueTime || null } : {}),
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', body.id)
        .eq('user_id', user.id)
        .select('id, user_id, title, content, completed, priority, list_id, due_at, due_time, repeat_rule, created_at, updated_at')
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ data })
    }

    if (body.action === 'deleteTask') {
      const { data: ownedTask, error: ownedTaskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', body.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (ownedTaskError) return jsonResponse({ error: ownedTaskError.message }, 500)
      if (!ownedTask) return jsonResponse({ error: 'Task not found' }, 404)

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', body.id)
        .eq('user_id', user.id)

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ data: { success: true } })
    }

    if (body.action === 'listLists') {
      const { data, error } = await supabase
        .from('lists')
        .select('id, user_id, name, color, sort_order, created_at')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ data })
    }

    if (body.action === 'createList') {
      const payload = body.input || {}
      const legacyUserKey = getLegacyUserKey(user)
      const { count } = await supabase
        .from('lists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { data, error } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          legacy_user_key: legacyUserKey,
          name: payload.name,
          color: payload.color || '#007aff',
          sort_order: count || 0,
        })
        .select('id, user_id, name, color, sort_order, created_at')
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ data })
    }

    return jsonResponse({ error: 'Unsupported action' }, 400)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unexpected API error',
    }, 500)
  }
})
