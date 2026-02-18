create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text not null default '#1f7a8c',
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'public projects read'
  ) then
    create policy "public projects read" on public.projects
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'public projects insert'
  ) then
    create policy "public projects insert" on public.projects
      for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'public projects update'
  ) then
    create policy "public projects update" on public.projects
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'public projects delete'
  ) then
    create policy "public projects delete" on public.projects
      for delete
      using (true);
  end if;
end $$;

alter table public.tasks
  add column if not exists status text default 'todo',
  add column if not exists story text,
  add column if not exists points integer,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists completed_at timestamptz;

alter table public.tasks
  drop constraint if exists tasks_points_nonnegative;

alter table public.tasks
  add constraint tasks_points_nonnegative check (points is null or points >= 0);

update public.tasks
set status = 'todo'
where status is null;

create index if not exists tasks_status_deadline_idx
  on public.tasks(status, deadline);

create index if not exists tasks_project_idx
  on public.tasks(project_id);
