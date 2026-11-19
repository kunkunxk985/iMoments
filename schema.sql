-- iMoments · 拾光房间 — application schema (Function-owned backend).
-- Reviewed migration contract: only NULL / NOT NULL / PRIMARY KEY / UNIQUE are supported.
-- Generated values (ids, timestamps, counters, AI fields) are supplied by functions/routes.mjs;
-- referential integrity is enforced by the Function's business checks, not DB foreign keys.
CREATE TABLE app.rooms (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  code text UNIQUE,
  share_code text UNIQUE,
  title text NOT NULL,
  tagline text NOT NULL,
  visibility text NOT NULL,
  mode text NOT NULL,
  theme text NOT NULL,
  tags jsonb NOT NULL,
  cover_seed_key text,
  cover_thumb_path text,
  revealed boolean NOT NULL,
  ai_curator_note text NOT NULL,
  creator_id text NOT NULL,
  creator_name text NOT NULL,
  idempotency_key uuid NOT NULL,
  moment_count integer NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (creator_id, idempotency_key)
);
CREATE INDEX rooms_visibility_created_at_idx ON app.rooms (visibility, created_at);

CREATE TABLE app.moments (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL,
  place text NOT NULL,
  tag text NOT NULL,
  story text NOT NULL,
  seed_key text,
  object_path text UNIQUE,
  thumb_path text,
  original_path text,
  original_width integer NOT NULL,
  original_height integer NOT NULL,
  ai_score integer NOT NULL,
  ai_caption text NOT NULL,
  status text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  likes integer NOT NULL,
  votes integer NOT NULL,
  comment_count integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX moments_room_status_created_at_idx ON app.moments (room_id, status, created_at);
CREATE INDEX moments_room_votes_idx ON app.moments (room_id, votes);

CREATE TABLE app.likes (
  id uuid PRIMARY KEY,
  moment_id uuid NOT NULL,
  room_id uuid NOT NULL,
  voter_id text NOT NULL,
  active boolean NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (moment_id, voter_id)
);
CREATE INDEX likes_room_voter_idx ON app.likes (room_id, voter_id);

CREATE TABLE app.votes (
  id uuid PRIMARY KEY,
  moment_id uuid NOT NULL,
  room_id uuid NOT NULL,
  voter_id text NOT NULL,
  active boolean NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (moment_id, voter_id)
);
CREATE INDEX votes_room_voter_idx ON app.votes (room_id, voter_id);

CREATE TABLE app.ballots (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL,
  voter_id text NOT NULL,
  used integer NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (room_id, voter_id)
);

CREATE TABLE app.comments (
  id uuid PRIMARY KEY,
  moment_id uuid NOT NULL,
  room_id uuid NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  floor integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX comments_moment_floor_idx ON app.comments (moment_id, floor);

CREATE TABLE app.gate_attempts (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL,
  voter_id text NOT NULL,
  fails integer NOT NULL,
  window_start timestamptz NOT NULL,
  UNIQUE (room_id, voter_id)
);

CREATE TABLE app.accounts (
  id uuid PRIMARY KEY,
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text NOT NULL,
  bio text NOT NULL,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  unlocked_codes jsonb NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE app.sessions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  account_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX sessions_account_id_idx ON app.sessions (account_id);
