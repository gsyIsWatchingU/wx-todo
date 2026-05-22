import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient, randomToken, sha256 } from '../_shared/auth.ts'

type LoginBody = {
  code?: string
  nickName?: string
  avatarUrl?: string
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

async function exchangeWechatCode(code: string) {
  const appId = Deno.env.get('WECHAT_APP_ID')
  const appSecret = Deno.env.get('WECHAT_APP_SECRET')

  if (!appId || !appSecret) {
    throw new Error('WECHAT_APP_ID or WECHAT_APP_SECRET is not configured')
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', appSecret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url.toString())
  const data = await response.json()
  if (!response.ok || data.errcode || !data.openid) {
    throw new Error(data.errmsg || 'Failed to exchange wechat code')
  }

  return data as { openid: string; unionid?: string }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await request.json() as LoginBody
    if (!body.code || !body.nickName || !body.avatarUrl) {
      return jsonResponse({ error: 'code, nickName and avatarUrl are required' }, 400)
    }

    const wechatUser = await exchangeWechatCode(body.code)
    const supabase = createAdminClient()

    const { data: existingUser, error: existingUserError } = await supabase
      .from('app_users')
      .select('id, openid, unionid, nick_name, avatar_url, identity_status')
      .eq('openid', wechatUser.openid)
      .maybeSingle()

    if (existingUserError) {
      return jsonResponse({ error: existingUserError.message }, 500)
    }

    let user = existingUser
    let claimStatus: 'claimed_legacy' | 'new_user' | 'existing_user' | 'legacy_conflict' = 'existing_user'

    if (user) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('app_users')
        .update({
          unionid: wechatUser.unionid || user.unionid || null,
          nick_name: body.nickName,
          avatar_url: body.avatarUrl,
          identity_status: 'active',
          claimed_at: user.identity_status === 'legacy_unclaimed' ? new Date().toISOString() : undefined,
        })
        .eq('id', user.id)
        .select('id, openid, unionid, nick_name, avatar_url, identity_status')
        .single()

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500)
      }
      user = updatedUser
    } else {
      const { data: legacyCandidates, error: legacyError } = await supabase
        .from('app_users')
        .select('id, openid, unionid, nick_name, avatar_url, identity_status')
        .eq('identity_status', 'legacy_unclaimed')
        .eq('legacy_nickname', body.nickName)
        .limit(2)

      if (legacyError) {
        return jsonResponse({ error: legacyError.message }, 500)
      }

      if (legacyCandidates.length === 1) {
        claimStatus = 'claimed_legacy'
        const { data: claimedUser, error: claimError } = await supabase
          .from('app_users')
          .update({
            openid: wechatUser.openid,
            unionid: wechatUser.unionid || null,
            nick_name: body.nickName,
            avatar_url: body.avatarUrl,
            identity_status: 'active',
            claimed_at: new Date().toISOString(),
          })
          .eq('id', legacyCandidates[0].id)
          .select('id, openid, unionid, nick_name, avatar_url, identity_status')
          .single()

        if (claimError) {
          return jsonResponse({ error: claimError.message }, 500)
        }
        user = claimedUser
      } else {
        claimStatus = legacyCandidates.length > 1 ? 'legacy_conflict' : 'new_user'
        const { data: createdUser, error: createError } = await supabase
          .from('app_users')
          .insert({
            openid: wechatUser.openid,
            unionid: wechatUser.unionid || null,
            nick_name: body.nickName,
            avatar_url: body.avatarUrl,
            identity_status: 'active',
          })
          .select('id, openid, unionid, nick_name, avatar_url, identity_status')
          .single()

        if (createError) {
          return jsonResponse({ error: createError.message }, 500)
        }
        user = createdUser
      }
    }

    const sessionToken = randomToken()
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const tokenHash = await sha256(sessionToken)

    const { error: sessionError } = await supabase
      .from('app_sessions')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: sessionExpiresAt,
      })

    if (sessionError) {
      return jsonResponse({ error: sessionError.message }, 500)
    }

    await supabase
      .from('login_logs')
      .insert({
        openid: wechatUser.openid,
        unionid: wechatUser.unionid || null,
        nick_name: body.nickName,
        avatar_url: body.avatarUrl,
        login_source: 'wechat_miniapp',
      })

    return jsonResponse({
      sessionToken,
      sessionExpiresAt,
      user: {
        id: user.id,
        openid: user.openid,
        unionid: user.unionid,
        nickName: user.nick_name,
        avatarUrl: user.avatar_url,
        claimStatus,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unexpected login error',
    }, 500)
  }
})
