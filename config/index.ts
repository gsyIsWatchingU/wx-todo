import { defineConfig } from '@tarojs/cli'

const DEFAULT_SUPABASE_URL = 'https://mzqbykasnnzahbcyywtl.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cWJ5a2Fzbm56YWhiY3l5d3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTMxNzcsImV4cCI6MjA5NDYyOTE3N30.gtwTU77E0K8oxWKIfkcfz28LUx4eJ0wffc1Cb7M_W-w'

function hasOptionalPlugin(name: string) {
  try {
    require.resolve(name)
    return true
  } catch {
    return false
  }
}

const plugins = [
  '@tarojs/plugin-platform-weapp',
  '@tarojs/plugin-framework-react',
]

if (hasOptionalPlugin('@tarojs/plugin-platform-h5')) {
  plugins.unshift('@tarojs/plugin-platform-h5')
}

function getBuildEnv(name: string, fallback: string) {
  return process.env[name] || fallback
}

export default defineConfig({
  projectName: 'wx-todo',
  designWidth: 375,
  deviceRatio: {
    375: 2 / 1,
    640: 1 / 2,
    750: 1 / 2,
    828: 1 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  plugins,
  compiler: {
    type: 'webpack5',
    // Taro 4.2.0's H5 webpack runner reads compiler.prebundle directly.
    // Keep it explicit so cloud builds don't crash when the default is missing.
    prebundle: {
      enable: false
    }
  },
  defineConstants: {
    'process.env.REACT': JSON.stringify('{}'),
    'process.env.TARO_APP_SUPABASE_URL': JSON.stringify(getBuildEnv('TARO_APP_SUPABASE_URL', DEFAULT_SUPABASE_URL)),
    'process.env.TARO_APP_SUPABASE_ANON_KEY': JSON.stringify(getBuildEnv('TARO_APP_SUPABASE_ANON_KEY', DEFAULT_SUPABASE_ANON_KEY))
  },
  copy: {
    patterns: [
      {
        from: 'static',
        to: 'dist/static'
      }
    ],
    options: {}
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false
      }
    }
  }
})
