alter table public.tasks
  alter column legacy_user_key drop not null;

alter table public.lists
  alter column legacy_user_key drop not null;
