-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
-- Extended user data (Supabase Auth handles the core user)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'byok', 'pro', 'team')),
  api_key_encrypted text,  -- user's own API key (encrypted, for BYOK)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CREDITS ─────────────────────────────────────────────────
create table public.credits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  total_credits int not null default 50,     -- free credits on signup
  used_credits int not null default 0,
  bonus_credits int not null default 0,      -- referral/promo credits
  reset_at timestamptz,                      -- for monthly reset on paid plans
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Auto-create credits on profile creation
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.credits (user_id, total_credits, used_credits)
  values (new.id, 50, 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ─── GENERATIONS ─────────────────────────────────────────────
create table public.generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  prompt text not null,
  result text,                               -- generated component code
  model text not null default 'claude-sonnet-4-20250514',
  credits_used int not null default 1,
  mode text not null default 'managed' check (mode in ('managed', 'byok')),
  is_public boolean not null default false,  -- for sharing/marketplace later
  is_saved boolean not null default false,   -- user bookmarked this
  metadata jsonb default '{}',               -- spring config, category, etc.
  created_at timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.credits enable row level security;
alter table public.generations enable row level security;

-- Users can only read/update their own data
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can view own credits"
  on public.credits for select using (auth.uid() = user_id);

create policy "Users can view own generations"
  on public.generations for select using (auth.uid() = user_id);
create policy "Users can insert own generations"
  on public.generations for insert with check (auth.uid() = user_id);
create policy "Users can update own generations"
  on public.generations for update using (auth.uid() = user_id);
-- Public generations visible to all
create policy "Public generations visible to all"
  on public.generations for select using (is_public = true);

-- ─── INDEXES ─────────────────────────────────────────────────
create index idx_generations_user_id on public.generations(user_id);
create index idx_generations_created_at on public.generations(created_at desc);
create index idx_generations_is_public on public.generations(is_public) where is_public = true;
create index idx_credits_user_id on public.credits(user_id);
