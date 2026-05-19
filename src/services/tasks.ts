import Taro from '@tarojs/taro'
import { supabaseRequest, isMissingTableError, isSchemaMismatchError } from './supabaseRequest'
import type { Task, List, TaskFilter, CreateTaskInput, UpdateTaskInput } from '../types'

const TASK_STORAGE_KEY = 'wx_todo_tasks'
const LIST_STORAGE_KEY = 'wx_todo_lists'

export async function getCurrentUser() {
  // 微信小程序中简单实现，可根据需要扩展为微信登录
  return { id: 'user-id' }
}

type DbTask = {
  id: string
  user_id: string
  title: string
  content: string | null
  completed: boolean
  priority: 1 | 2 | 3
  list_id: string | null
  due_at: string | null
  due_time: string | null
  repeat_rule: string | null
  created_at: string
  updated_at: string
}

type DbList = {
  id: string
  user_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix = 'task') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeTask(task: DbTask | Task): Task {
  const source = task as any
  return {
    id: String(source.id),
    userId: source.userId ?? source.user_id ?? 'user-id',
    title: source.title ?? '',
    content: source.content ?? '',
    completed: Boolean(source.completed),
    priority: (source.priority ?? 2) as 1 | 2 | 3,
    listId: source.listId ?? source.list_id ?? null,
    dueAt: source.dueAt ?? source.due_at ?? null,
    dueTime: source.dueTime ?? source.due_time ?? null,
    repeatRule: source.repeatRule ?? source.repeat_rule ?? null,
    createdAt: source.createdAt ?? source.created_at ?? nowIso(),
    updatedAt: source.updatedAt ?? source.updated_at ?? nowIso(),
  }
}

function normalizeList(list: DbList | List): List {
  const source = list as any
  return {
    id: String(source.id),
    userId: source.userId ?? source.user_id ?? 'user-id',
    name: source.name ?? '',
    color: source.color ?? '#007aff',
    sortOrder: source.sortOrder ?? source.sort_order ?? 0,
    createdAt: source.createdAt ?? source.created_at ?? nowIso(),
  }
}

function buildTaskPayload(input: CreateTaskInput | UpdateTaskInput, userId?: string) {
  const payload: Record<string, any> = {}

  if (userId) payload.user_id = userId
  if ('title' in input && input.title !== undefined) payload.title = input.title
  if ('content' in input && input.content !== undefined) payload.content = input.content || ''
  if ('completed' in input && input.completed !== undefined) payload.completed = input.completed
  if ('priority' in input && input.priority !== undefined) payload.priority = input.priority || 2
  if ('listId' in input && input.listId !== undefined) payload.list_id = input.listId || null
  if ('dueAt' in input && input.dueAt !== undefined) payload.due_at = input.dueAt || null
  if ('dueTime' in input && input.dueTime !== undefined) payload.due_time = input.dueTime || null

  return payload
}

function getLocalTasks(): Task[] {
  try {
    const value = Taro.getStorageSync(TASK_STORAGE_KEY)
    return Array.isArray(value) ? value.map(normalizeTask) : []
  } catch (error) {
    console.warn('Failed to read local tasks:', error)
    return []
  }
}

function saveLocalTasks(tasks: Task[]) {
  Taro.setStorageSync(TASK_STORAGE_KEY, tasks)
}

function getLocalLists(): List[] {
  try {
    const value = Taro.getStorageSync(LIST_STORAGE_KEY)
    if (Array.isArray(value) && value.length > 0) return value.map(normalizeList)
  } catch (error) {
    console.warn('Failed to read local lists:', error)
  }

  return [
    {
      id: 'default',
      userId: 'user-id',
      name: '默认清单',
      color: '#007aff',
      sortOrder: 0,
      createdAt: nowIso(),
    },
  ]
}

function saveLocalLists(lists: List[]) {
  Taro.setStorageSync(LIST_STORAGE_KEY, lists)
}

function shouldUseLocalFallback(error: unknown) {
  if (isMissingTableError(error)) return true
  if (isSchemaMismatchError(error)) return true
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('PGRST205') || message.includes('schema cache') || message.includes('404')
}

function applyTaskFilter(tasks: Task[], filter?: TaskFilter) {
  const result = tasks.filter((task) => {
    if (filter?.status === 'active' && task.completed) return false
    if (filter?.status === 'completed' && !task.completed) return false
    if (filter?.listId && task.listId !== filter.listId) return false

    if (filter?.dateStart && filter?.dateEnd) {
      const inRange = Boolean(task.dueAt && task.dueAt >= filter.dateStart && task.dueAt < filter.dateEnd)
      const includeUndated = Boolean(filter.includeUndated && !task.dueAt)
      if (!inRange && !includeUndated) return false
    }

    return true
  })

  return result.sort((a, b) => {
    const dateCompare = (a.dueAt || '9999-12-31').localeCompare(b.dueAt || '9999-12-31')
    if (dateCompare !== 0) return dateCompare
    return (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99')
  })
}

function localCreateTask(input: CreateTaskInput, userId: string): Task {
  const tasks = getLocalTasks()
  const createdAt = nowIso()
  const task: Task = {
    id: createId(),
    userId,
    title: input.title,
    content: input.content || '',
    completed: false,
    priority: input.priority || 2,
    listId: input.listId || null,
    dueAt: input.dueAt || null,
    dueTime: input.dueTime || null,
    repeatRule: null,
    createdAt,
    updatedAt: createdAt,
  }

  saveLocalTasks([task, ...tasks])
  return task
}

export async function listTasks(filter?: TaskFilter): Promise<Task[]> {
  const user = await getCurrentUser()
  let query = `tasks?select=*&user_id=eq.${user?.id}`

  if (filter?.status === 'active') {
    query += '&completed=eq.false'
  } else if (filter?.status === 'completed') {
    query += '&completed=eq.true'
  }

  if (filter?.listId) {
    query += `&list_id=eq.${filter.listId}`
  }

  query += '&order=due_at.asc,due_time.asc,created_at.desc'

  try {
    const remoteTasks = await supabaseRequest<DbTask[]>(query)
    return applyTaskFilter(remoteTasks.map(normalizeTask), filter)
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    console.warn('Supabase tasks table is unavailable. Falling back to local storage:', error)
    return applyTaskFilter(getLocalTasks(), filter)
  }
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const user = await getCurrentUser()

  try {
    const data = await supabaseRequest<DbTask[]>('tasks', {
      method: 'POST',
      data: buildTaskPayload(input, user?.id),
    })

    return normalizeTask(data[0])
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    console.warn('Create task failed on Supabase. Saved locally instead:', error)
    return localCreateTask(input, user?.id || 'user-id')
  }
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  try {
    const data = await supabaseRequest<DbTask[]>(`tasks?id=eq.${id}`, {
      method: 'PATCH',
      data: buildTaskPayload(input),
    })

    return normalizeTask(data[0])
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    const tasks = getLocalTasks()
    const existing = tasks.find(task => task.id === id)
    if (!existing) throw error

    const updatedTask: Task = {
      ...existing,
      ...input,
      listId: input.listId !== undefined ? input.listId : existing.listId,
      dueAt: input.dueAt !== undefined ? input.dueAt : existing.dueAt,
      dueTime: input.dueTime !== undefined ? input.dueTime : existing.dueTime,
      updatedAt: nowIso(),
    }

    saveLocalTasks(tasks.map(task => task.id === id ? updatedTask : task))
    return updatedTask
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await supabaseRequest(`tasks?id=eq.${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    saveLocalTasks(getLocalTasks().filter(task => task.id !== id))
  }
}

export async function toggleTask(id: string, completed: boolean): Promise<Task> {
  return updateTask(id, { completed })
}

export async function listLists(): Promise<List[]> {
  const user = await getCurrentUser()
  const query = `lists?select=*&user_id=eq.${user?.id}&order=sort_order.asc`

  try {
    const lists = await supabaseRequest<DbList[]>(query)
    return lists.map(normalizeList)
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    console.warn('Supabase lists table is unavailable. Falling back to local storage:', error)
    return getLocalLists()
  }
}

export async function createList(name: string, color: string): Promise<List> {
  const user = await getCurrentUser()

  try {
    const data = await supabaseRequest<DbList[]>('lists', {
      method: 'POST',
      data: {
        user_id: user?.id,
        name,
        color,
      },
    })

    return normalizeList(data[0])
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    const lists = getLocalLists()
    const list: List = {
      id: createId('list'),
      userId: user?.id || 'user-id',
      name,
      color,
      sortOrder: lists.length,
      createdAt: nowIso(),
    }
    saveLocalLists([...lists, list])
    return list
  }
}
