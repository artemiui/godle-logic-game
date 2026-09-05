import { createClient, type Client } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

export let rawClient: Client;

if (isTurso) {
  const url = process.env.TURSO_DATABASE_URL!.trim();
  rawClient = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN!.trim(),
  });
  console.log('✅ Connected to Turso cloud database:', url);
} else {
  const dataDir = process.env.VERCEL
    ? '/tmp'
    : (process.env.DATABASE_DIR || path.resolve(process.cwd(), 'data'));

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }

  const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'goodle.db');
  rawClient = createClient({
    url: `file:${dbPath}`,
  });
  console.log('✅ Connected to local SQLite database:', dbPath);
}

export const db = {
  prepare: (sql: string) => ({
    get: async (...args: any[]) => {
      const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = await rawClient.execute({ sql, args: flatArgs });
      return res.rows[0];
    },
    all: async (...args: any[]) => {
      const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = await rawClient.execute({ sql, args: flatArgs });
      return res.rows;
    },
    run: async (...args: any[]) => {
      const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = await rawClient.execute({ sql, args: flatArgs });
      return { rowsAffected: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
    },
  }),
  exec: async (sql: string) => {
    await rawClient.executeMultiple(sql);
  },
};

let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await rawClient.executeMultiple(`
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

        CREATE TABLE IF NOT EXISTS community_theorems (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          title TEXT NOT NULL,
          difficulty TEXT DEFAULT 'medium',
          premises_json TEXT NOT NULL,
          conclusion_json TEXT NOT NULL,
          creator_username TEXT NOT NULL,
          proof_steps_count INTEGER DEFAULT 0,
          is_valid INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
        );

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

      const safeAlter = async (sql: string) => {
        try {
          await rawClient.execute(sql);
        } catch {}
      };
      await safeAlter("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';");
      await safeAlter("ALTER TABLE users ADD COLUMN avatar_icon TEXT DEFAULT '⊢';");
      await safeAlter("ALTER TABLE users ADD COLUMN avatar_image TEXT DEFAULT '';");
      await safeAlter("ALTER TABLE users ADD COLUMN opt_out_leaderboard INTEGER DEFAULT 0;");
      await safeAlter("ALTER TABLE users ADD COLUMN google_id TEXT DEFAULT NULL;");
      await safeAlter("ALTER TABLE users ADD COLUMN github_id TEXT DEFAULT NULL;");
      await safeAlter("ALTER TABLE users ADD COLUMN has_password INTEGER DEFAULT 1;");

      console.log('✅ Database schema verified');
    } catch (err: any) {
      console.error('Database initialization error:', err);
    }
  })();
  return initPromise;
}

// Auto-run initialization
initDb().catch(() => {});
