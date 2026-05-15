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
    'process.env.REACT': JSON.stringify('{}')
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