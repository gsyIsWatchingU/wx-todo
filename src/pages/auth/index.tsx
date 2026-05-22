import { View, Text, Button, Input, Image } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getWechatCode, isLoggedIn, loginWithWechat } from '../../services/auth'
import './index.scss'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [nickName, setNickName] = useState<string>('')

  useEffect(() => {
    if (isLoggedIn()) {
      Taro.redirectTo({ url: '/pages/today/index' })
    } else {
      getWechatCode().then(setCode).catch(console.warn)
    }
  }, [])

  const handleChooseAvatar = (e: any) => {
    const { avatarUrl } = e.detail
    setAvatarUrl(avatarUrl)
  }

  const handleNickNameInput = (e: any) => {
    setNickName(e.detail.value)
  }

  const handleLogin = async () => {
    if (!nickName.trim()) {
      Taro.showToast({
        title: '请输入昵称',
        icon: 'none',
      })
      return
    }

    if (!avatarUrl) {
      Taro.showToast({
        title: '请选择头像',
        icon: 'none',
      })
      return
    }

    setIsLoading(true)
    try {
      if (!code) {
        throw new Error('WeChat login code is missing')
      }

      const userInfo = await loginWithWechat(code, {
        nickName,
        avatarUrl,
      })

      if (userInfo.claimStatus === 'legacy_conflict') {
        Taro.showToast({
          title: '检测到历史昵称冲突，旧数据需手动认领',
          icon: 'none',
          duration: 2500,
        })
      }
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
        <Text className='auth-title'>待办事项</Text>
        <Text className='auth-desc'>完善资料后数据将跟随微信号</Text>

        <View className='avatar-section'>
          <Button
            className='avatar-btn'
            open-type='chooseAvatar'
            onChooseAvatar={handleChooseAvatar}
          >
            {avatarUrl ? (
              <Image className='avatar-image' src={avatarUrl} mode='aspectFill' />
            ) : (
              <Text className='avatar-placeholder'>+</Text>
            )}
          </Button>
          <Text className='avatar-tip'>点击选择头像</Text>
        </View>

        <View className='nickname-section'>
          <Input
            className='nickname-input'
            type='nickname'
            placeholder='请输入昵称'
            value={nickName}
            onInput={handleNickNameInput}
          />
        </View>

        <Button
          className='login-btn'
          type='primary'
          loading={isLoading}
          onClick={handleLogin}
        >
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </View>
    </View>
  )
}
