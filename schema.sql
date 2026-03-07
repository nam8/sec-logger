-- SEC Service Logger — Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Entries table: one row per logged service
create table entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  date date not null,
  communicants integer default 0,
  under16 integer default 0,
  over16 integer default 0,
  baptised_under6 integer default 0,
  baptised_over6 integer default 0,
  number_confirmed integer default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- Settings table: one row per user
create table settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  charge_name text default '',
  dark_mode boolean default false,
  updated_at timestamptz default now()
);

-- Row Level Security: each user can only access their own data
alter table entries enable row level security;
alter table settings enable row level security;

create policy "Users see own entries"
  on entries for select using (auth.uid() = user_id);

create policy "Users insert own entries"
  on entries for insert with check (auth.uid() = user_id);

create policy "Users update own entries"
  on entries for update using (auth.uid() = user_id);

create policy "Users delete own entries"
  on entries for delete using (auth.uid() = user_id);

create policy "Users see own settings"
  on settings for select using (auth.uid() = user_id);

create policy "Users upsert own settings"
  on settings for insert with check (auth.uid() = user_id);

create policy "Users update own settings"
  on settings for update using (auth.uid() = user_id);

-- Index for fast queries by user and date
create index idx_entries_user_date on entries(user_id, date desc);
