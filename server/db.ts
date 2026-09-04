import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = process.env.VERCEL
  ? '/tmp'
  : (process.env.DATABASE_DIR || path.resolve(process.cwd(), 'data'));

if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'goodle.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch {}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#2563EB',
    avatar_icon TEXT DEFAULT '⊢',
    bio TEXT DEFAULT '',
    streak_count INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_played_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wordle_completions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    date TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    step_count INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS frenzy_records (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    player_name TEXT,
    seed TEXT NOT NULL,
    hearts_left INTEGER NOT NULL,
    score INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL,
    won INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS shared_puzzles (
    id TEXT PRIMARY KEY,
    share_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    premises_json TEXT NOT NULL,
    conclusion_json TEXT NOT NULL,
    creator_username TEXT DEFAULT 'Anonymous Logician',
    plays_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_saved_proofs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT DEFAULT 'custom',
    premises_json TEXT NOT NULL,
    conclusion_json TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Safe migrations for existing users table
try {
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN avatar_icon TEXT DEFAULT '⊢';");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN avatar_image TEXT DEFAULT '';");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN opt_out_leaderboard INTEGER DEFAULT 0;");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN google_id TEXT DEFAULT NULL;");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN github_id TEXT DEFAULT NULL;");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN has_password INTEGER DEFAULT 1;");
} catch {}

// Create profile_reports table for moderation flagging
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_reports (
      id TEXT PRIMARY KEY,
      reporter_user_id TEXT,
      reported_username TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch {}

console.log('✅ SQLite Database initialized at:', dbPath);
