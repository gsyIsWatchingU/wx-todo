import { View, Text, Button } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getWechatUserInfo, saveSession, isLoggedIn } from '../../services/auth'
import './index.scss'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      Taro.redirectTo({ url: '/pages/today/index' })
    }
  }, [])

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const { userInfo } = await getWechatUserInfo()
      saveSession(userInfo)
      Taro.redirectTo({ url: '/pages/today/index' })
    } catch (error) {
      console.error('Login failed:', error)
      Taro.showToast({
        title: error instanceof Error ? error.message : '登录失败',
        icon: 'none',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View className='auth-page'>
      <View className='auth-container'>
        <View className='auth-icon'>
          <Text className='icon-text'>📝</Text>
        </View>
        <Text className='auth-title'>待办事项</Text>
        <Text className='auth-desc'>登录后数据将跟随微信号</Text>

        <Button
          className='login-btn'
          type='primary'
          loading={isLoading}
          onClick={handleLogin}
        >
          {isLoading ? '登录中...' : '微信授权登录'}
        </Button>
      </View>
    </View>
  )
}