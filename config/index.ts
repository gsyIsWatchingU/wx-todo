import { defineConfig } from '@tarojs/cli'

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
  plugins: [
    '@tarojs/plugin-platform-weapp',
    '@tarojs/plugin-framework-react'
  ],
  defineConstants: {
    'process.env.REACT': JSON.stringify('{}'),
    'process.env.TARO_APP_SUPABASE_URL': JSON.stringify('https://mzqbykasnnzahbcyywtl.supabase.co'),
    'process.env.TARO_APP_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cWJ5a2Fzbm56YWhiY3l5d3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTMxNzcsImV4cCI6MjA5NDYyOTE3N30.gtwTU77E0K8oxWKIfkcfz28LUx4eJ0wffc1Cb7M_W-w')
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
        enable: false,
        config: {
          camelCase: true
        }
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
        enable: false,
        config: {
          camelCase: true
        }
      }
    }
  }
})