create table if not exists profiles (
  id uuid primary key,
  display_name text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  credits integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  amount integer not null,
  reason text not null check (
    reason in ('signup_bonus', 'generation_charge', 'generation_refund', 'admin_grant')
  ),
  job_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists provider_assets (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_job_id text not null,
  audio_url text,
  cover_url text,
  lyrics text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  title text not null,
  prompt text not null,
  lyrics text not null default '',
  tags text[] not null default '{}',
  language text not null default '中文',
  mode text not null check (mode in ('original', 'cover_audio', 'cover_text_style')),
  visibility text not null default 'draft' check (visibility in ('draft', 'public', 'hidden')),
  audio_url text not null,
  cover_url text not null,
  duration_seconds integer not null default 0,
  provider_asset_id uuid references provider_assets(id),
  plays integer not null default 0,
  likes integer not null default 0,
  favorites integer not null default 0,
  remixes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  mode text not null check (mode in ('original', 'cover_audio', 'cover_text_style')),
  prompt text not null,
  lyrics text,
  tags text[] not null default '{}',
  language text not null default '中文',
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  cost integer not null,
  provider text not null,
  provider_job_id text not null,
  reference_audio_url text,
  error text,
  result_track_id uuid references tracks(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists likes (
  track_id uuid not null references tracks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (track_id, profile_id)
);

create table if not exists favorites (
  track_id uuid not null references tracks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (track_id, profile_id)
);

create table if not exists plays (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  profile_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists tracks_public_created_idx
  on tracks (visibility, created_at desc);

create index if not exists generation_jobs_owner_created_idx
  on generation_jobs (owner_id, created_at desc);
