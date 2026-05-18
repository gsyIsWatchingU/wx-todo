-- Supabase schema for the wx-todo mini program.
-- Run this in Supabase SQL Editor if REST requests return PGRST205 / table not found.

create extension if not exists pgcrypto;

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  color text not null default '#007aff',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  content text not null default '',
  completed boolean not null default false,
  priority smallint not null default 2 check (priority in (1, 2, 3)),
  list_id uuid references public.lists(id) on delete set null,
  due_at date,
  due_time time,
  repeat_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_completed on public.tasks(user_id, completed);
create index if not exists idx_tasks_due_at on public.tasks(due_at);
create index if not exists idx_tasks_list_id on public.tasks(list_id);
create index if not exists idx_lists_user_sort on public.lists(user_id, sort_order);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.lists enable row level security;

-- The current mini program uses a fixed user_id ('user-id') and the anon key.
-- These policies intentionally allow anon CRUD while the app is in prototype mode.
drop policy if exists "anon can manage tasks" on public.tasks;
create policy "anon can manage tasks"
on public.tasks
for all
to anon
using (true)
with check (true);

drop policy if exists "anon can manage lists" on public.lists;
create policy "anon can manage lists"
on public.lists
for all
to anon
using (true)
with check (true);

grant usage on schema public to anon;
grant select, insert, update, delete on public.tasks to anon;
grant select, insert, update, delete on public.lists to anon;
