create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  openid text,
  unionid text,
  nick_name text,
  avatar_url text,
  identity_status text not null default 'active' check (identity_status in ('active', 'legacy_unclaimed')),
  legacy_nickname text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_app_users_openid_unique
  on public.app_users(openid)
  where openid is not null;

create unique index if not exists idx_app_users_unionid_unique
  on public.app_users(unionid)
  where unionid is not null;

create index if not exists idx_app_users_legacy_nickname
  on public.app_users(legacy_nickname)
  where legacy_nickname is not null;

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_app_sessions_user_id on public.app_sessions(user_id);
create index if not exists idx_app_sessions_expires_at on public.app_sessions(expires_at);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lists'
      and column_name = 'user_id'
      and data_type <> 'uuid'
  ) then
    alter table public.lists rename column user_id to legacy_user_key;
    alter table public.lists add column user_id uuid;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'user_id'
      and data_type <> 'uuid'
  ) then
    alter table public.tasks rename column user_id to legacy_user_key;
    alter table public.tasks add column user_id uuid;
  end if;
end $$;

alter table public.lists add column if not exists legacy_user_key text;
alter table public.tasks add column if not exists legacy_user_key text;
alter table public.lists add column if not exists user_id uuid;
alter table public.tasks add column if not exists user_id uuid;

insert into public.app_users (legacy_nickname, nick_name, identity_status)
select distinct legacy_key, legacy_key, 'legacy_unclaimed'
from (
  select nullif(btrim(legacy_user_key), '') as legacy_key from public.lists
  union
  select nullif(btrim(legacy_user_key), '') as legacy_key from public.tasks
) legacy_keys
where legacy_key is not null
  and not exists (
    select 1
    from public.app_users au
    where au.legacy_nickname = legacy_key
  );

update public.lists l
set user_id = au.id
from public.app_users au
where l.user_id is null
  and l.legacy_user_key is not null
  and au.legacy_nickname = l.legacy_user_key;

update public.tasks t
set user_id = au.id
from public.app_users au
where t.user_id is null
  and t.legacy_user_key is not null
  and au.legacy_nickname = t.legacy_user_key;

alter table public.lists
  alter column user_id set not null;

alter table public.tasks
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lists_user_id_fkey'
  ) then
    alter table public.lists
      add constraint lists_user_id_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_user_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_user_id_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;
end $$;

drop index if exists idx_tasks_user_completed;
drop index if exists idx_lists_user_sort;

create index if not exists idx_tasks_user_completed on public.tasks(user_id, completed);
create index if not exists idx_lists_user_sort on public.lists(user_id, sort_order);

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.lists enable row level security;

drop policy if exists "anon can manage tasks" on public.tasks;
drop policy if exists "anon can manage lists" on public.lists;

revoke all on public.tasks from anon;
revoke all on public.lists from anon;
revoke all on public.app_users from anon;
revoke all on public.app_sessions from anon;

grant usage on schema public to anon;
