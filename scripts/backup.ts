import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * gödle Database Backup Utility
 *
 * Supports:
 *  - Local SQLite (default: data/goodle.db)
 *  - Remote Turso libSQL (via TURSO_DATABASE_URL & TURSO_AUTH_TOKEN)
 *
 * Usage:
 *   npm run db:backup
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:backup
 */

const TABLES = [
  'users',
  'wordle_completions',
  'frenzy_records',
  'user_saved_proofs',
  'community_theorems',
  'reports',
];

interface BackupData {
  version: string;
  timestamp: string;
  source: string;
  tables: Record<string, any[]>;
  summary: Record<string, number>;
}

async function fetchTursoRows(url: string, token: string, tableName: string): Promise<any[]> {
  const httpUrl = url.replace(/^libsql:\/\//, 'https://') + '/v2/pipeline';
  const response = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: { sql: `SELECT * FROM ${tableName}` },
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Turso query failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as any;
  const result = json.results?.[0]?.response?.result;
  if (!result || !result.rows) return [];

  const cols = result.cols.map((c: any) => c.name);
  return result.rows.map((row: any[]) => {
    const obj: Record<string, any> = {};
    cols.forEach((col: string, idx: number) => {
      const cell = row[idx];
      obj[col] = cell && typeof cell === 'object' && 'value' in cell ? cell.value : cell;
    });
    return obj;
  });
}

function fetchLocalRows(dbPath: string, tableName: string): any[] {
  if (!fs.existsSync(dbPath)) {
    return [];
  }
  const db = new DatabaseSync(dbPath);
  try {
    const stmt = db.prepare(`SELECT * FROM ${tableName}`);
    return stmt.all();
  } catch (err: any) {
    if (err.message && err.message.includes('no such table')) {
      return [];
    }
    throw err;
  }
}

async function runBackup() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const isTurso = Boolean(tursoUrl && tursoToken);

  const localDbPath =
    process.env.DATABASE_PATH ||
    path.resolve(process.cwd(), process.env.VERCEL ? '/tmp/goodle.db' : 'data/goodle.db');

  const sourceName = isTurso ? `Turso (${tursoUrl})` : `Local SQLite (${localDbPath})`;
  console.log(`\n📦 Starting gödle database backup from: ${sourceName}`);

  const backupPayload: BackupData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: isTurso ? 'turso' : 'local',
    tables: {},
    summary: {},
  };

  for (const table of TABLES) {
    try {
      let rows: any[] = [];
      if (isTurso) {
        rows = await fetchTursoRows(tursoUrl!, tursoToken!, table);
      } else {
        rows = fetchLocalRows(localDbPath, table);
      }
      backupPayload.tables[table] = rows;
      backupPayload.summary[table] = rows.length;
      console.log(`  ✓ Table '${table}': ${rows.length} records`);
    } catch (err: any) {
      console.warn(`  ⚠️ Table '${table}' skipped: ${err.message}`);
      backupPayload.tables[table] = [];
      backupPayload.summary[table] = 0;
    }
  }

  // Ensure backups directory exists
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `goodle_backup_${dateStr}.json`;
  const targetPath = path.join(backupsDir, filename);
  const latestPath = path.join(backupsDir, 'latest.json');

  const jsonContent = JSON.stringify(backupPayload, null, 2);
  fs.writeFileSync(targetPath, jsonContent, 'utf-8');
  fs.writeFileSync(latestPath, jsonContent, 'utf-8');

  console.log(`\n✅ Backup complete!`);
  console.log(`   File: ${targetPath}`);
  console.log(`   Latest pointer updated: ${latestPath}\n`);
}

runBackup().catch(err => {
  console.error('\n❌ Backup failed:', err);
  process.exit(1);
});
