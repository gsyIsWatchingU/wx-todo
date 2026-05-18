import Taro from '@tarojs/taro'

const SUPABASE_URL = 'https://mzqbykasnnzahbcyywtl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cWJ5a2Fzbm56YWhiY3l5d3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTMxNzcsImV4cCI6MjA5NDYyOTE3N30.gtwTU77E0K8oxWKIfkcfz28LUx4eJ0wffc1Cb7M_W-w'

export async function supabaseRequest<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    data?: any
  } = {}
): Promise<T> {
  const res = await Taro.request({
    url: `${SUPABASE_URL}/rest/v1/${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  })

  if (res.statusCode >= 400) {
    throw new Error(JSON.stringify(res.data))
  }

  return res.data as T
}
