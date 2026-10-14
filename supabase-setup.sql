-- Run this in Supabase Dashboard > SQL Editor > New query.
-- Row Level Security means each signed-in user can access only their own row.
create table if not exists public.cloudai_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"chats": [], "theme": "purple"}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.cloudai_user_data enable row level security;

drop policy if exists "Users can read their own Cloud AI data" on public.cloudai_user_data;
create policy "Users can read their own Cloud AI data"
  on public.cloudai_user_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own Cloud AI data" on public.cloudai_user_data;
create policy "Users can create their own Cloud AI data"
  on public.cloudai_user_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Cloud AI data" on public.cloudai_user_data;
create policy "Users can update their own Cloud AI data"
  on public.cloudai_user_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
