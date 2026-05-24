export type ViewMode = 'day' | 'week' | 'month' | 'list';

export type TaskStatusFilter = 'all' | 'active' | 'completed';

export interface Task {
  id: string;
  userId: string;
  title: string;
  content: string;
  completed: boolean;
  priority: 1 | 2 | 3;
  listId: string | null;
  dueAt: string | null;
  dueTime: string | null;
  repeatRule: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface TaskFilter {
  keyword?: string;
  status?: TaskStatusFilter;
  priority?: 1 | 2 | 3;
  listId?: string;
  dateStart?: string;
  dateEnd?: string;
  includeUndated?: boolean;
  limit?: number;
}

export interface CreateTaskInput {
  title: string;
  content?: string;
  priority?: 1 | 2 | 3;
  listId?: string;
  dueAt?: string | null;
  dueTime?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  content?: string;
  completed?: boolean;
  priority?: 1 | 2 | 3;
  listId?: string | null;
  dueAt?: string | null;
  dueTime?: string | null;
}
