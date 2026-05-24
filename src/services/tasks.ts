import Taro from '@tarojs/taro'
import { invokeEdgeFunction, SupabaseRequestError } from './supabaseRequest'
import type { Task, List, TaskFilter, CreateTaskInput, UpdateTaskInput } from '../types'
import { requireCurrentUser } from './auth'

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

type ApiResponse<T> = {
  data: T
}

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix = 'task') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getTaskStorageKey(userId: string) {
  return `wx_todo_tasks:${userId}`
}

function getListStorageKey(userId: string) {
  return `wx_todo_lists:${userId}`
}

function normalizeTask(task: DbTask | Task): Task {
  const source = task as any
  return {
    id: String(source.id),
    userId: source.userId ?? source.user_id ?? '',
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
    userId: source.userId ?? source.user_id ?? '',
    name: source.name ?? '',
    color: source.color ?? '#007aff',
    sortOrder: source.sortOrder ?? source.sort_order ?? 0,
    createdAt: source.createdAt ?? source.created_at ?? nowIso(),
  }
}

function getLocalTasks(userId: string): Task[] {
  try {
    const value = Taro.getStorageSync(getTaskStorageKey(userId))
    const tasks = Array.isArray(value) ? value.map(normalizeTask) : []
    return tasks.filter(task => task.userId === userId)
  } catch (error) {
    console.warn('Failed to read local tasks:', error)
    return []
  }
}

function saveLocalTasks(userId: string, tasks: Task[]) {
  Taro.setStorageSync(getTaskStorageKey(userId), tasks.filter(task => task.userId === userId))
}

function mergeTasksById(existingTasks: Task[], incomingTasks: Task[]) {
  const taskMap = new Map(existingTasks.map(task => [task.id, task]))
  incomingTasks.forEach(task => {
    taskMap.set(task.id, task)
  })
  return sortTasks(Array.from(taskMap.values()))
}

function cacheRemoteTasks(userId: string, tasks: Task[], filter?: TaskFilter) {
  if (!filter || Object.keys(filter).length === 0) {
    saveLocalTasks(userId, sortTasks(tasks))
    return
  }

  const existingTasks = getLocalTasks(userId)
  saveLocalTasks(userId, mergeTasksById(existingTasks, tasks))
}

function getLocalLists(userId: string): List[] {
  try {
    const value = Taro.getStorageSync(getListStorageKey(userId))
    const lists = Array.isArray(value) ? value.map(normalizeList) : []
    if (lists.length > 0) {
      return lists.filter(list => list.userId === userId)
    }
  } catch (error) {
    console.warn('Failed to read local lists:', error)
  }

  return [
    {
      id: 'default',
      userId,
      name: 'Inbox',
      color: '#007aff',
      sortOrder: 0,
      createdAt: nowIso(),
    },
  ]
}

function saveLocalLists(userId: string, lists: List[]) {
  Taro.setStorageSync(getListStorageKey(userId), lists.filter(list => list.userId === userId))
}

function shouldUseLocalFallback(error: unknown) {
  if (!(error instanceof SupabaseRequestError)) return false
  if (error.statusCode >= 500) return true
  const message = typeof error.data === 'string' ? error.data : JSON.stringify(error.data || {})
  return message.includes('timeout') || message.includes('Failed to fetch') || error.statusCode === 404
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const dateCompare = (a.dueAt || '9999-12-31').localeCompare(b.dueAt || '9999-12-31')
    if (dateCompare !== 0) return dateCompare

    const timeCompare = (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99')
    if (timeCompare !== 0) return timeCompare

    return b.createdAt.localeCompare(a.createdAt)
  })
}

function matchesDateFilter(task: Task, filter?: TaskFilter) {
  if (!filter?.dateStart || !filter?.dateEnd) {
    return true
  }

  const inRange = Boolean(task.dueAt && task.dueAt >= filter.dateStart && task.dueAt < filter.dateEnd)
  return inRange || Boolean(filter.includeUndated && !task.dueAt)
}

function applyTaskFilter(tasks: Task[], filter?: TaskFilter) {
  const keyword = filter?.keyword?.trim().toLowerCase()

  const result = tasks.filter(task => {
    if (filter?.status === 'active' && task.completed) return false
    if (filter?.status === 'completed' && !task.completed) return false
    if (filter?.priority && task.priority !== filter.priority) return false
    if (filter?.listId && task.listId !== filter.listId) return false
    if (!matchesDateFilter(task, filter)) return false

    if (keyword) {
      const title = task.title.toLowerCase()
      const content = task.content.toLowerCase()
      if (!title.includes(keyword) && !content.includes(keyword)) {
        return false
      }
    }

    return true
  })

  const sorted = sortTasks(result)
  return filter?.limit ? sorted.slice(0, filter.limit) : sorted
}

function localCreateTask(input: CreateTaskInput, userId: string): Task {
  const tasks = getLocalTasks(userId)
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

  saveLocalTasks(userId, [task, ...tasks])
  return task
}

function localUpdateTask(id: string, input: UpdateTaskInput, userId: string): Task {
  const tasks = getLocalTasks(userId)
  const existing = tasks.find(task => task.id === id)
  if (!existing) {
    throw new Error('Task not found for current user')
  }

  const updatedTask: Task = {
    ...existing,
    ...input,
    listId: input.listId !== undefined ? input.listId : existing.listId,
    dueAt: input.dueAt !== undefined ? input.dueAt : existing.dueAt,
    dueTime: input.dueTime !== undefined ? input.dueTime : existing.dueTime,
    updatedAt: nowIso(),
  }

  saveLocalTasks(userId, tasks.map(task => task.id === id ? updatedTask : task))
  return updatedTask
}

export async function listTasks(filter?: TaskFilter): Promise<Task[]> {
  const user = requireCurrentUser()

  try {
    const response = await invokeEdgeFunction<ApiResponse<DbTask[]>>('app-api', {
      action: 'listTasks',
      filter,
    })

    const tasks = response.data.map(normalizeTask).filter(task => task.userId === user.id)
    cacheRemoteTasks(user.id, tasks, filter)
    return applyTaskFilter(tasks, filter)
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    console.warn('Tasks API unavailable. Falling back to local storage:', error)
    return applyTaskFilter(getLocalTasks(user.id), filter)
  }
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const user = requireCurrentUser()

  try {
    const response = await invokeEdgeFunction<ApiResponse<DbTask>>('app-api', {
      action: 'createTask',
      input,
    })

    const task = normalizeTask(response.data)
    const tasks = getLocalTasks(user.id).filter(item => item.id !== task.id)
    saveLocalTasks(user.id, [task, ...tasks])
    return task
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    console.warn('Create task failed remotely. Saved locally instead:', error)
    return localCreateTask(input, user.id)
  }
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const user = requireCurrentUser()

  try {
    const response = await invokeEdgeFunction<ApiResponse<DbTask>>('app-api', {
      action: 'updateTask',
      id,
      input,
    })

    const task = normalizeTask(response.data)
    const tasks = getLocalTasks(user.id)
    saveLocalTasks(
      user.id,
      tasks.some(item => item.id === id)
        ? tasks.map(item => item.id === id ? task : item)
        : [task, ...tasks],
    )
    return task
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return localUpdateTask(id, input, user.id)
  }
}

export async function deleteTask(id: string): Promise<void> {
  const user = requireCurrentUser()

  try {
    await invokeEdgeFunction<ApiResponse<{ success: true }>>('app-api', {
      action: 'deleteTask',
      id,
    })
  } finally {
    saveLocalTasks(user.id, getLocalTasks(user.id).filter(task => task.id !== id))
  }
}

export async function toggleTask(id: string, completed: boolean): Promise<Task> {
  return updateTask(id, { completed })
}

export async function listLists(): Promise<List[]> {
  const user = requireCurrentUser()

  try {
    const response = await invokeEdgeFunction<ApiResponse<DbList[]>>('app-api', {
      action: 'listLists',
    })
    const lists = response.data.map(normalizeList).filter(list => list.userId === user.id)
    saveLocalLists(user.id, lists)
    return lists
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    console.warn('Lists API unavailable. Falling back to local storage:', error)
    return getLocalLists(user.id)
  }
}

export async function createList(name: string, color: string): Promise<List> {
  const user = requireCurrentUser()

  try {
    const response = await invokeEdgeFunction<ApiResponse<DbList>>('app-api', {
      action: 'createList',
      input: { name, color },
    })
    const list = normalizeList(response.data)
    const lists = getLocalLists(user.id).filter(item => item.id !== list.id)
    saveLocalLists(user.id, [...lists, list].sort((a, b) => a.sortOrder - b.sortOrder))
    return list
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    const lists = getLocalLists(user.id)
    const list: List = {
      id: createId('list'),
      userId: user.id,
      name,
      color,
      sortOrder: lists.length,
      createdAt: nowIso(),
    }
    saveLocalLists(user.id, [...lists, list])
    return list
  }
}
