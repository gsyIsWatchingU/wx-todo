create index if not exists idx_tasks_user_due_completed
  on public.tasks(user_id, due_at, completed);

create index if not exists idx_tasks_user_priority
  on public.tasks(user_id, priority);
