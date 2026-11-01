-- One schema, every statement idempotent: migrate() runs this on every boot.
-- Never add a bare "drop" here; it would run on every restart.

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  google_sub  text        not null unique,
  email       text        not null,
  name        text        not null default '',
  created_at  timestamptz not null default now()
);

-- A row of videos on one of the two pages ('watch' or 'saved').
create table if not exists playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references users(id) on delete cascade,
  page        text        not null check (page in ('watch', 'saved', 'shorts')),
  name        text        not null check (length(name) between 1 and 80),
  created_at  timestamptz not null default now()
);

create unique index if not exists playlists_user_page_name
  on playlists (user_id, page, lower(name));

create table if not exists videos (
  id            uuid primary key default gen_random_uuid(),
  playlist_id   uuid        not null references playlists(id) on delete cascade,
  youtube_id    text        not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title         text        not null,
  channel       text        not null default '',
  thumbnail_url text        not null,
  added_at      timestamptz not null default now(),
  watched_at    timestamptz,
  unique (playlist_id, youtube_id)
);

-- The OAuth 2.1 authorization server, as in the phrasebook: registered clients,
-- live authorization codes, live refresh tokens. Codes and tokens are stored
-- only as hashes.
create table if not exists oauth_clients (
  client_id     text primary key,
  client_name   text        not null,
  redirect_uris jsonb       not null,
  created_at    timestamptz not null default now()
);

create table if not exists oauth_auth_codes (
  code_hash      text primary key,
  client_id      text        not null references oauth_clients(client_id) on delete cascade,
  user_id        uuid        not null references users(id) on delete cascade,
  redirect_uri   text        not null,
  code_challenge text        not null,
  scope          text        not null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  used_at        timestamptz
);

create table if not exists oauth_refresh_tokens (
  token_hash text primary key,
  client_id  text        not null references oauth_clients(client_id) on delete cascade,
  user_id    uuid        not null references users(id) on delete cascade,
  scope      text        not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);

-- Channels followed quietly (2026-11-02). A YouTube channel's feed is shared by
-- everyone who follows it, so it is checked once however many follow it.
create table if not exists channel_feeds (
  channel_id  text primary key check (channel_id ~ '^[A-Za-z0-9_-]{12,80}$'),
  title       text        not null,
  avatar_url  text        not null default '',
  url         text        not null,
  checked_at  timestamptz
);

create table if not exists channel_follows (
  user_id     uuid        not null references users(id) on delete cascade,
  channel_id  text        not null references channel_feeds(channel_id) on delete cascade,
  followed_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

-- Uploads as seen in the channel's feed (its latest 15). Kept, not replaced, so
-- "new since last check" can be told apart.
create table if not exists channel_uploads (
  channel_id   text        not null references channel_feeds(channel_id) on delete cascade,
  youtube_id   text        not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title        text        not null,
  published_at timestamptz not null,
  first_seen   timestamptz not null default now(),
  primary key (channel_id, youtube_id)
);

-- Shorts (2026-11-02): a third playlist page, and a flag on every video. The
-- page check is replaced only when it does not yet allow 'shorts', so this does
-- not take a lock on every boot.
alter table videos add column if not exists is_short boolean not null default false;
alter table channel_uploads add column if not exists is_short boolean not null default false;

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'playlists_page_check'
       and pg_get_constraintdef(oid) not like '%shorts%'
  ) then
    alter table playlists drop constraint playlists_page_check;
    alter table playlists add constraint playlists_page_check check (page in ('watch', 'saved', 'shorts'));
  end if;
end $$;

-- Playlists followed like channels (2026-11-02): a series such as ABC's "If You're
-- Listening". Same feed format; the id is the playlist's. The id check is widened
-- only while it still demands a UC… channel id.
alter table channel_feeds add column if not exists kind text not null default 'channel';
alter table channel_feeds add column if not exists owner text not null default '';

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'channel_feeds_channel_id_check'
       and pg_get_constraintdef(oid) like '%^UC%'
  ) then
    alter table channel_feeds drop constraint channel_feeds_channel_id_check;
    alter table channel_feeds add constraint channel_feeds_channel_id_check
      check (channel_id ~ '^[A-Za-z0-9_-]{12,80}$');
  end if;
end $$;

-- Facebook reels (2026-11-02): a video now has a source. For 'facebook' the
-- youtube_id column holds the reel's numeric id (the column keeps its name so
-- nothing else has to move). The id check is replaced only while it still knows
-- YouTube alone.
alter table videos add column if not exists source text not null default 'youtube';

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'videos_youtube_id_check'
       and pg_get_constraintdef(oid) not like '%facebook%'
  ) then
    alter table videos drop constraint videos_youtube_id_check;
    alter table videos add constraint videos_youtube_id_check check (
      (source = 'youtube' and youtube_id ~ '^[A-Za-z0-9_-]{11}$')
      or (source = 'facebook' and youtube_id ~ '^[0-9]{5,25}$')
    );
  end if;
end $$;
