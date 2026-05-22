import Taro from '@tarojs/taro'

const SUPABASE_URL = process.env.TARO_APP_SUPABASE_URL || 'https://mzqbykasnnzahbcyywtl.supabase.co'
const SUPABASE_ANON_KEY = process.env.TARO_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cWJ5a2Fzbm56YWhiY3l5d3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTMxNzcsImV4cCI6MjA5NDYyOTE3N30.gtwTU77E0K8oxWKIfkcfz28LUx4eJ0wffc1Cb7M_W-w'
const AUTH_USER_KEY = 'auth_user'

export class SupabaseRequestError extends Error {
  statusCode: number
  data: any

  constructor(statusCode: number, data: any) {
    super(typeof data === 'string' ? data : JSON.stringify(data))
    this.name = 'SupabaseRequestError'
    this.statusCode = statusCode
    this.data = data
  }
}

export async function invokeEdgeFunction<T = any>(
  functionName: string,
  data?: Record<string, any>,
  options: {
    method?: 'GET' | 'POST'
    withSession?: boolean
  } = {}
): Promise<T> {
  const user = options.withSession === false ? null : (Taro.getStorageSync(AUTH_USER_KEY) as { sessionToken?: string } | null)
  const res = await Taro.request({
    url: `${SUPABASE_URL}/functions/v1/${functionName}`,
    method: options.method || 'POST',
    data,
    timeout: 15000,
    header: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(user?.sessionToken ? { 'x-session-token': user.sessionToken } : {}),
    },
  })

  if (res.statusCode >= 400) {
    throw new SupabaseRequestError(res.statusCode, res.data)
  }

  return res.data as T
}
