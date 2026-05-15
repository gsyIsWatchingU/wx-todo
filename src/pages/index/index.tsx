import { useState } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import './index.scss'

export default function Index() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')

  const addTodo = () => {
    if (!inputValue.trim()) return
    setTodos([...todos, { id: Date.now(), text: inputValue, completed: false }])
    setInputValue('')
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <View className='index-container'>
      <View className='header'>
        <Text className='title'>Todo List</Text>
        <Text className='subtitle'>记录每一天的待办事项</Text>
      </View>
      <View className='input-box'>
        <Input 
          className='task-input' 
          placeholder='请输入任务内容' 
          value={inputValue}
          onInput={(e) => setInputValue(e.detail.value)}
        />
        <Button className='add-btn' onClick={addTodo}>添加</Button>
      </View>
      <View className='content'>
        {todos.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-text'>暂无待办事项</Text>
            <Text className='empty-hint'>在上方输入框输入任务内容</Text>
          </View>
        ) : (
          <View className='todo-list'>
            {todos.map((todo) => (
              <View key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <View className='todo-content' onClick={() => toggleTodo(todo.id)}>
                  <View className={`checkbox ${todo.completed ? 'checked' : ''}`}></View>
                  <Text className={`todo-text ${todo.completed ? 'done' : ''}`}>{todo.text}</Text>
                </View>
                <Button className='delete-btn' onClick={() => deleteTodo(todo.id)}>删除</Button>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}