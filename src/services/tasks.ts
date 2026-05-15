import { createClient } from '@supabase/supabase-js';
import type { Task, List, TaskFilter, CreateTaskInput, UpdateTaskInput } from '../types';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const listTasks = async (filter?: TaskFilter): Promise<Task[]> => {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', (await getCurrentUser())?.id)
    .order('due_at', { ascending: true })
    .order('due_time', { ascending: true });

  if (filter?.status === 'active') {
    query = query.eq('completed', false);
  } else if (filter?.status === 'completed') {
    query = query.eq('completed', true);
  }

  if (filter?.listId) {
    query = query.eq('list_id', filter.listId);
  }

  if (filter?.dateStart && filter?.dateEnd) {
    query = query.gte('due_at', filter.dateStart).lt('due_at', filter.dateEnd);
  }

  if (filter?.includeUndated) {
    query = query.or(`due_at.is.null,and(due_at.gte.${filter.dateStart},due_at.lt.${filter.dateEnd})`);
  }

  if (filter?.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user?.id,
      title: input.title,
      content: input.content || '',
      priority: input.priority || 2,
      list_id: input.listId || null,
due_at: input.dueAt || null,
      due_time: input.dueTime || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTask = async (id: string, input: UpdateTaskInput): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      content: input.content,
      completed: input.completed,
      priority: input.priority,
      list_id: input.listId,
      due_at: input.dueAt,
      due_time: input.dueTime,
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const toggleTask = async (id: string, completed: boolean): Promise<Task> => {
  return updateTask(id, { completed });
};

export const listLists = async (): Promise<List[]> => {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', (await getCurrentUser())?.id)
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const createList = async (name: string, color: string): Promise<List> => {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: user?.id,
      name,
      color,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export default supabase;