alter table public.tasks 
add column if not exists status text default 'todo';

-- Make sure existing tasks have a status
update public.tasks 
set status = 'todo' 
where status is null;
