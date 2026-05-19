-- Repair migration for existing Supabase projects.
-- Safe to run in SQL Editor when the remote schema drifted from the repo.

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
  priority smallint not null default 2,
  list_id uuid references public.lists(id) on delete set null,
  due_at date,
  due_time time,
  repeat_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lists
  add column if not exists user_id text,
  add column if not exists name text,
  add column if not exists color text default '#007aff',
  add column if not exists sort_order integer default 0,
  add column if not exists created_at timestamptz default now();

alter table public.tasks
  add column if not exists user_id text,
  add column if not exists title text,
  add column if not exists content text default '',
  add column if not exists completed boolean default false,
  add column if not exists priority smallint default 2,
  add column if not exists list_id uuid,
  add column if not exists due_at date,
  add column if not exists due_time time,
  add column if not exists repeat_rule text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.lists
  alter column user_id type text using user_id::text,
  alter column color type text,
  alter column color set default '#007aff',
  alter column sort_order set default 0,
  alter column created_at set default now();

alter table public.tasks
  alter column user_id type text using user_id::text,
  alter column content set default '',
  alter column completed set default false,
  alter column priority type smallint using priority::smallint,
  alter column priority set default 2,
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.lists
set
  user_id = coalesce(user_id, 'user-id'),
  name = coalesce(name, 'Untitled List'),
  color = coalesce(nullif(color, ''), '#007aff'),
  sort_order = coalesce(sort_order, 0),
  created_at = coalesce(created_at, now())
where
  user_id is null
  or name is null
  or
  color is null
  or color = ''
  or sort_order is null
  or created_at is null;

update public.tasks
set
  user_id = coalesce(user_id, 'user-id'),
  title = coalesce(title, 'Untitled Task'),
  content = coalesce(content, ''),
  completed = coalesce(completed, false),
  priority = case
    when priority in (1, 2, 3) then priority
    else 2
  end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  user_id is null
  or title is null
  or content is null
  or completed is null
  or priority is null
  or priority not in (1, 2, 3)
  or created_at is null
  or updated_at is null;

update public.lists
set user_id = coalesce(user_id, 'user-id')
where user_id is null;

alter table public.lists
  alter column user_id set not null,
  alter column name set not null,
  alter column color set not null,
  alter column sort_order set not null,
  alter column created_at set not null;

alter table public.tasks
  alter column user_id set not null,
  alter column title set not null,
  alter column content set not null,
  alter column completed set not null,
  alter column priority set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.tasks
  drop constraint if exists tasks_priority_check;

alter table public.tasks
  add constraint tasks_priority_check check (priority in (1, 2, 3));

do $$
declare
  has_todos boolean;
  has_category boolean;
  has_due_date boolean;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'todos'
  ) into has_todos;

  if has_todos then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = 'todos' and column_name = 'category'
    ) into has_category;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = 'todos' and column_name = 'due_date'
    ) into has_due_date;

    if has_category then
      insert into public.lists (user_id, name, color, sort_order, created_at)
      select
        src.user_id,
        src.name,
        '#007aff' as color,
        src.sort_order,
        src.created_at
      from (
        select
          coalesce(t.user_id::text, 'user-id') as user_id,
          t.category as name,
          row_number() over (
            partition by coalesce(t.user_id::text, 'user-id')
            order by t.category
          ) - 1 as sort_order,
          min(coalesce(t.created_at, now())) as created_at
        from public.todos t
        where t.category is not null and btrim(t.category) <> ''
        group by coalesce(t.user_id::text, 'user-id'), t.category
      ) src
      where not exists (
        select 1
        from public.lists l
        where l.user_id = src.user_id and l.name = src.name
      );
    end if;

    if has_category and has_due_date then
      insert into public.tasks (
        id,
        user_id,
        title,
        content,
        completed,
        priority,
        list_id,
        due_at,
        created_at,
        updated_at
      )
      select
        t.id,
        coalesce(t.user_id::text, 'user-id') as user_id,
        coalesce(t.title, 'Untitled Task') as title,
        coalesce(t.content, '') as content,
        coalesce(t.completed, false) as completed,
        case
          when t.priority in (1, 2, 3) then t.priority::smallint
          else 2
        end as priority,
        l.id as list_id,
        t.due_date as due_at,
        coalesce(t.created_at, now()) as created_at,
        coalesce(t.updated_at, coalesce(t.created_at, now())) as updated_at
      from public.todos t
      left join public.lists l
        on l.user_id = coalesce(t.user_id::text, 'user-id')
       and l.name = t.category
      on conflict (id) do update
      set
        user_id = excluded.user_id,
        title = excluded.title,
        content = excluded.content,
        completed = excluded.completed,
        priority = excluded.priority,
        list_id = excluded.list_id,
        due_at = excluded.due_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    elsif has_category then
      insert into public.tasks (
        id,
        user_id,
        title,
        content,
        completed,
        priority,
        list_id,
        created_at,
        updated_at
      )
      select
        t.id,
        coalesce(t.user_id::text, 'user-id') as user_id,
        coalesce(t.title, 'Untitled Task') as title,
        coalesce(t.content, '') as content,
        coalesce(t.completed, false) as completed,
        case
          when t.priority in (1, 2, 3) then t.priority::smallint
          else 2
        end as priority,
        l.id as list_id,
        coalesce(t.created_at, now()) as created_at,
        coalesce(t.updated_at, coalesce(t.created_at, now())) as updated_at
      from public.todos t
      left join public.lists l
        on l.user_id = coalesce(t.user_id::text, 'user-id')
       and l.name = t.category
      on conflict (id) do update
      set
        user_id = excluded.user_id,
        title = excluded.title,
        content = excluded.content,
        completed = excluded.completed,
        priority = excluded.priority,
        list_id = excluded.list_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    elsif has_due_date then
      insert into public.tasks (
        id,
        user_id,
        title,
        content,
        completed,
        priority,
        due_at,
        created_at,
        updated_at
      )
      select
        t.id,
        coalesce(t.user_id::text, 'user-id') as user_id,
        coalesce(t.title, 'Untitled Task') as title,
        coalesce(t.content, '') as content,
        coalesce(t.completed, false) as completed,
        case
          when t.priority in (1, 2, 3) then t.priority::smallint
          else 2
        end as priority,
        t.due_date as due_at,
        coalesce(t.created_at, now()) as created_at,
        coalesce(t.updated_at, coalesce(t.created_at, now())) as updated_at
      from public.todos t
      on conflict (id) do update
      set
        user_id = excluded.user_id,
        title = excluded.title,
        content = excluded.content,
        completed = excluded.completed,
        priority = excluded.priority,
        due_at = excluded.due_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    else
      insert into public.tasks (
        id,
        user_id,
        title,
        content,
        completed,
        priority,
        created_at,
        updated_at
      )
      select
        t.id,
        coalesce(t.user_id::text, 'user-id') as user_id,
        coalesce(t.title, 'Untitled Task') as title,
        coalesce(t.content, '') as content,
        coalesce(t.completed, false) as completed,
        case
          when t.priority in (1, 2, 3) then t.priority::smallint
          else 2
        end as priority,
        coalesce(t.created_at, now()) as created_at,
        coalesce(t.updated_at, coalesce(t.created_at, now())) as updated_at
      from public.todos t
      on conflict (id) do update
      set
        user_id = excluded.user_id,
        title = excluded.title,
        content = excluded.content,
        completed = excluded.completed,
        priority = excluded.priority,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    end if;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_list_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_list_id_fkey
      foreign key (list_id) references public.lists(id) on delete set null;
  end if;
end $$;

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
