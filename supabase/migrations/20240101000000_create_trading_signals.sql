-- Create the table for storing signals
create table if not exists public.trading_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  pair text not null,
  message text not null,
  strategy text,
  type text default 'signal' -- 'signal', 'system', etc.
);

-- Enable Row Level Security
alter table public.trading_signals enable row level security;

-- Policies
-- 1. Service Role (Edge Function) can insert
create policy "Service role can insert signals"
  on public.trading_signals
  for insert
  to service_role
  with check (true);

-- 2. Authenticated users can read (for Realtime)
create policy "Authenticated users can select signals"
  on public.trading_signals
  for select
  to authenticated
  using (true);

-- Enable Realtime
alter publication supabase_realtime add table public.trading_signals;
