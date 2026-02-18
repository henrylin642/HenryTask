create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text not null default '#1f7a8c',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  story text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  color text not null check (color in ('red','yellow','blue')),
  position integer not null,
  deadline date,
  status text not null default 'todo' check (status in ('todo', 'done')),
  points integer check (points is null or points >= 0),
  project_id uuid references public.projects(id) on delete set null
);

alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create policy "public projects read" on public.projects
  for select
  using (true);

create policy "public projects insert" on public.projects
  for insert
  with check (true);

create policy "public projects update" on public.projects
  for update
  using (true)
  with check (true);

create policy "public projects delete" on public.projects
  for delete
  using (true);

create policy "public read" on public.tasks
  for select
  using (true);

create policy "public insert" on public.tasks
  for insert
  with check (true);

create policy "public update" on public.tasks
  for update
  using (true)
  with check (true);

create policy "public delete" on public.tasks
  for delete
  using (true);

create index if not exists tasks_status_deadline_idx
  on public.tasks(status, deadline);

create index if not exists tasks_project_idx
  on public.tasks(project_id);
