import { supabaseRequest } from './supabaseRequest'
import type { Task, List, TaskFilter, CreateTaskInput, UpdateTaskInput } from '../types'

export async function getCurrentUser() {
  // 微信小程序中简单实现，可根据需要扩展为微信登录
  return { id: 'user-id' }
}

export async function listTasks(filter?: TaskFilter): Promise<Task[]> {
  let query = 'tasks?select=*&user_id=eq.' + (await getCurrentUser())?.id

  if (filter?.status === 'active') {
    query += '&completed=eq.false'
  } else if (filter?.status === 'completed') {
    query += '&completed=eq.true'
  }

  if (filter?.listId) {
    query += `&list_id=eq.${filter.listId}`
  }

  if (filter?.dateStart && filter?.dateEnd) {
    query += `&due_at=gte.${filter.dateStart}&due_at=lt.${filter.dateEnd}`
  }

  query += '&order=due_at.asc,due_time.asc'

  return supabaseRequest<Task[]>(query)
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const user = await getCurrentUser()
  const data = await supabaseRequest<Task[]>('tasks', {
    method: 'POST',
    data: {
      user_id: user?.id,
      title: input.title,
      content: input.content || '',
      priority: input.priority || 2,
      list_id: input.listId || null,
      due_at: input.dueAt || null,
      due_time: input.dueTime || null,
    },
  })

  return data[0]
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const data = await supabaseRequest<Task[]>(`tasks?id=eq.${id}`, {
    method: 'PATCH',
    data: {
      title: input.title,
      content: input.content,
      completed: input.completed,
      priority: input.priority,
      list_id: input.listId,
      due_at: input.dueAt,
      due_time: input.dueTime,
    },
  })

  return data[0]
}

export async function deleteTask(id: string): Promise<void> {
  await supabaseRequest(`tasks?id=eq.${id}`, {
    method: 'DELETE',
  })
}

export async function toggleTask(id: string, completed: boolean): Promise<Task> {
  return updateTask(id, { completed })
}

export async function listLists(): Promise<List[]> {
  const user = await getCurrentUser()
  const query = `lists?select=*&user_id=eq.${user?.id}&order=sort_order.asc`
  return supabaseRequest<List[]>(query)
}

export async function createList(name: string, color: string): Promise<List> {
  const user = await getCurrentUser()
  const data = await supabaseRequest<List[]>('lists', {
    method: 'POST',
    data: {
      user_id: user?.id,
      name,
      color,
    },
  })

  return data[0]
}
