import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * gödle Database Restore Utility
 *
 * Usage:
 *   npm run db:restore
 *   npm run db:restore -- backups/goodle_backup_2026-09-05T10-15-00.json
 */

interface BackupData {
  version: string;
  timestamp: string;
  source: string;
  tables: Record<string, any[]>;
  summary: Record<string, number>;
}

async function runRestore() {
  const argFile = process.argv[2];
  const backupFile = argFile
    ? path.resolve(process.cwd(), argFile)
    : path.resolve(process.cwd(), 'backups/latest.json');

  if (!fs.existsSync(backupFile)) {
    console.error(`\n❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`\n📥 Reading backup file: ${backupFile}`);
  const content = fs.readFileSync(backupFile, 'utf-8');
  const backup = JSON.parse(content) as BackupData;

  const localDbPath =
    process.env.DATABASE_PATH ||
    path.resolve(process.cwd(), process.env.VERCEL ? '/tmp/goodle.db' : 'data/goodle.db');

  console.log(`🎯 Target database: ${localDbPath}`);
  console.log(`📅 Backup timestamp: ${backup.timestamp} (v${backup.version})`);

  const db = new DatabaseSync(localDbPath);

  for (const [tableName, rows] of Object.entries(backup.tables)) {
    if (!rows || rows.length === 0) {
      console.log(`  - Table '${tableName}': 0 rows to restore`);
      continue;
    }

    const firstRow = rows[0];
    const columns = Object.keys(firstRow);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);

    let count = 0;
    for (const row of rows) {
      const values = columns.map(c => row[c]);
      try {
        stmt.run(...values);
        count++;
      } catch (err: any) {
        console.warn(`    ⚠️ Row insert warning in '${tableName}': ${err.message}`);
      }
    }
    console.log(`  ✓ Table '${tableName}': Restored ${count} rows`);
  }

  console.log(`\n✅ Database restoration complete!\n`);
}

runRestore().catch(err => {
  console.error('\n❌ Restore failed:', err);
  process.exit(1);
});
