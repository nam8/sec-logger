# SEC Service Logger — Deployment Guide

A mobile-first web app for Scottish Episcopal Church clergy to log sacramental
events and generate the Canon 50 Annual Statistical Return.

This guide walks you through deploying the app so that:

- Data persists across devices, cache clears, and phone updates
- Each priest signs in with their own email
- The app is hosted free on GitHub Pages
- The database is hosted free on Supabase

---

## Architecture overview

```
┌─────────────┐        ┌──────────────┐
│  GitHub      │        │  Supabase    │
│  Pages       │◄──────►│  (Postgres)  │
│  (static     │  API   │              │
│   React app) │  calls │  - auth      │
└─────────────┘        │  - entries   │
                        │  - settings  │
                        └──────────────┘
```

**GitHub Pages** serves the static HTML/JS/CSS. It costs nothing.

**Supabase** provides authentication (email/password sign-in) and a
PostgreSQL database. The free tier gives you 500MB storage and 50,000
monthly active users — vastly more than a diocese needs.

The app runs entirely in the browser. There is no server to maintain.

---

## Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New Project**. Give it a name like `sec-logger`.
3. Choose a strong database password and a region close to Scotland
   (e.g. `eu-west-2` London).
4. Once created, go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

You'll paste these into the app's config file in Step 3.

## Step 2: Create the database tables

In Supabase, go to **SQL Editor** and run this:

```sql
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

-- Row Level Security: each user can only see their own data
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
```

## Step 3: Configure the app

Open `src/supabase.js` and replace the placeholder values with your
Project URL and anon key from Step 1.

## Step 4: Install and run locally

```bash
# You need Node.js 18+ installed
npm install
npm run dev
```

Open `http://localhost:5173` on your phone or browser.

## Step 5: Deploy to GitHub Pages

```bash
# Build the production bundle
npm run build

# The output is in the dist/ folder.
# Push it to GitHub and enable Pages, or use:
npm run deploy
```

This uses the `gh-pages` package to push `dist/` to the `gh-pages`
branch automatically.

Your app will be live at `https://YOUR-USERNAME.github.io/sec-logger/`.

## Step 6: Add it to the iPhone home screen

On Safari, navigate to the app URL, tap the Share button, then
**Add to Home Screen**. It will appear as a native-looking app icon.

---

## Adding more clergy users

Each priest simply visits the app URL and signs up with their email.
Supabase authentication handles everything. Each user's data is
completely isolated via Row Level Security — no priest can see
another's entries.

## Future: diocesan dashboard

When the diocese wants a combined view, you can add a `role` column
to the settings table and create a Supabase policy that lets a
diocesan secretary read (but not write) all entries. The React app
would then show an extra "Diocese" tab for users with that role.

---

## Project structure

```
sec-logger/
├── index.html          Entry point
├── package.json        Dependencies and scripts
├── vite.config.js      Build configuration
├── public/
│   └── favicon.ico
└── src/
    ├── main.jsx        React entry point
    ├── supabase.js     Supabase client config (your keys go here)
    ├── db.js           Database operations (replaces window.storage)
    ├── Auth.jsx         Sign-in / sign-up component
    └── App.jsx          Main application (the service logger)
```
