-- ==============================================================================
-- Cloudflare D1 SQL Schema for YumeChan 16-Bit Retro Pastel Board
-- Database: Cloudflare D1 (SQLite compatible)
-- ==============================================================================

-- 1. Boards Table
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  jp_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  tagline TEXT NOT NULL,
  rules_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 2. Threads Table
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  title TEXT NOT NULL,
  replies_count INTEGER NOT NULL DEFAULT 0,
  images_count INTEGER NOT NULL DEFAULT 0,
  last_bump_time INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  is_sticky INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Index for quick sorting by bump time per board
CREATE INDEX IF NOT EXISTS idx_threads_board_bump ON threads(board_id, last_bump_time DESC);
CREATE INDEX IF NOT EXISTS idx_threads_created ON threads(created_at DESC);

-- 3. Posts Table (OP Posts & Replies)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Anonymous',
  tripcode TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'poetry' | 'pixel' | 'mixed'
  poetry_format TEXT, -- 'vertical' | 'stanza' | 'haiku'
  poetry_author_note TEXT,
  image_url TEXT,
  image_meta_json TEXT, -- JSON string: { name, size, dimensions, aspectRatio }
  pixel_art_data TEXT, -- Base64 / data URL string of pixel canvas
  pixel_art_grid_json TEXT, -- JSON 2D array of pixel color hex strings
  created_at INTEGER NOT NULL,
  sage INTEGER NOT NULL DEFAULT 0,
  is_op INTEGER NOT NULL DEFAULT 0,
  reply_to_post_id TEXT,
  replies_to_this_json TEXT DEFAULT '[]', -- JSON array of reply post IDs
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Indices for fast post retrieval
CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
