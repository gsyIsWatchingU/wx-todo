import { createClient } from 'npm:@supabase/supabase-js@2'

export type SessionUser = {
  id: string
  openid: string | null
  unionid: string | null
  nick_name: string | null
  avatar_url: string | null
  identity_status: 'active' | 'legacy_unclaimed'
}

export function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL or SERVICE_ROLE_KEY is not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function requireSessionUser(request: Request) {
  const sessionToken = request.headers.get('x-session-token')
  if (!sessionToken) {
    throw new Response(JSON.stringify({ error: 'Missing session token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createAdminClient()
  const tokenHash = await sha256(sessionToken)
  const { data: sessionRow, error } = await supabase
    .from('app_sessions')
    .select('id, expires_at, user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) {
    throw new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!sessionRow || new Date(sessionRow.expires_at).getTime() <= Date.now()) {
    throw new Response(JSON.stringify({ error: 'Session is invalid or expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: user, error: userError } = await supabase
    .from('app_users')
    .select('id, openid, unionid, nick_name, avatar_url, identity_status')
    .eq('id', sessionRow.user_id)
    .maybeSingle()

  if (userError) {
    throw new Response(JSON.stringify({ error: userError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!user) {
    throw new Response(JSON.stringify({ error: 'Session user not found' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await supabase
    .from('app_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', sessionRow.id)

  return {
    supabase,
    user: user as SessionUser,
  }
}
