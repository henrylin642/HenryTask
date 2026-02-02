create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now(),
  color text not null check (color in ('red','yellow','blue')),
  position integer not null,
  deadline date
);

alter table public.tasks enable row level security;

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
