import { promises as fs } from 'fs';
import path from 'path';
import pool from '../config/database';

/**
 * Lightweight forward-only migration runner.
 *
 * The baseline schema is created by `database/init.sql` on first DB creation
 * (mounted into the Postgres container). This runner applies incremental
 * `database/migrations/*.sql` files in filename order, recording each applied
 * file in the `schema_migrations` table so they run exactly once. Migrations
 * should be written idempotently (e.g. `IF NOT EXISTS`) so they are safe to run
 * against both fresh and existing databases.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../../database/migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations'
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function listMigrationFiles(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(MIGRATIONS_DIR);
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      console.warn(`⚠️  Migrations directory not found at ${MIGRATIONS_DIR}; skipping migrations.`);
      return [];
    }
    throw err;
  }

  return entries
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigration(filename: string): Promise<void> {
  const sql = await fs.readFile(path.join(MIGRATIONS_DIR, filename), 'utf-8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`✅ Applied migration: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to apply migration ${filename}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations. Resolves once the database schema is up to date.
 * Throws if any migration fails so the server can decide whether to abort start.
 */
export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const [applied, files] = await Promise.all([
    getAppliedMigrations(),
    listMigrationFiles(),
  ]);

  const pending = files.filter((file) => !applied.has(file));
  if (pending.length === 0) {
    console.log('📦 Database schema up to date; no migrations to apply.');
    return;
  }

  console.log(`📦 Applying ${pending.length} pending migration(s)...`);
  for (const file of pending) {
    await applyMigration(file);
  }
}
