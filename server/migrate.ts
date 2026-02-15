import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping migrations');
    return;
  }

  console.log('Running database migrations...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);

  try {
    // Create tables using raw SQL since we don't have migration files
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR,
        name TEXT NOT NULL,
        is_favorite BOOLEAN NOT NULL DEFAULT false,
        silence_threshold INTEGER NOT NULL DEFAULT -40,
        min_silence_duration INTEGER NOT NULL DEFAULT 500,
        output_format TEXT NOT NULL DEFAULT 'mp3',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_files (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        original_file_name TEXT NOT NULL,
        original_file_path TEXT,
        processed_file_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        silence_threshold INTEGER NOT NULL DEFAULT -40,
        min_silence_duration INTEGER NOT NULL DEFAULT 500,
        output_format TEXT NOT NULL DEFAULT 'mp3',
        file_type TEXT DEFAULT 'audio',
        file_size_bytes INTEGER,
        original_duration_sec REAL,
        processed_duration_sec REAL,
        processing_time_ms INTEGER,
        processing_progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_presets (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        name TEXT NOT NULL,
        silence_threshold INTEGER NOT NULL DEFAULT -40,
        min_silence_duration INTEGER NOT NULL DEFAULT 500,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('Migrations complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export { runMigrations };
