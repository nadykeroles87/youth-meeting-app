import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __youthMeetingDb?: any;
  __youthMeetingPglite?: PGlite;
  __youthMeetingInitPromise?: Promise<void>;
};

const INIT_STATEMENTS = [
  `DO $$ BEGIN CREATE TYPE gender AS ENUM ('male', 'female'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE role AS ENUM ('admin', 'servant', 'viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE member_status AS ENUM ('active', 'inactive', 'transferred'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  `ALTER TABLE servants DROP COLUMN IF EXISTS family_id;`,
  `ALTER TABLE members DROP COLUMN IF EXISTS family_id;`,

  `CREATE TABLE IF NOT EXISTS servants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    role role DEFAULT 'servant' NOT NULL,
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20) DEFAULT 'male' NOT NULL,
    college VARCHAR(200),
    job VARCHAR(200),
    address TEXT,
    confession_father VARCHAR(150),
    assigned_servant_id INTEGER REFERENCES servants(id) ON DELETE SET NULL,
    qr_code VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    password_hash VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    topic TEXT,
    speaker VARCHAR(150),
    meeting_date DATE NOT NULL,
    location VARCHAR(200) DEFAULT 'كنيسة العذراء - العاشر من رمضان',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    recorded_by INTEGER REFERENCES servants(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMP DEFAULT NOW() NOT NULL,
    notes TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS prayer_requests (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
    request TEXT NOT NULL,
    is_prayed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS followup_notes (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    servant_id INTEGER REFERENCES servants(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS media_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) DEFAULT 'pdf' NOT NULL,
    category VARCHAR(100) DEFAULT 'general' NOT NULL,
    uploaded_by INTEGER REFERENCES servants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );`,

  `ALTER TABLE members ADD COLUMN IF NOT EXISTS assigned_servant_id INTEGER REFERENCES servants(id) ON DELETE SET NULL;`,
  `ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`,
  `ALTER TABLE servants ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`,
];

let dbInstance: any;

if (databaseUrl) {
  if (!globalForDb.__youthMeetingDb) {
    const pool = new Pool({ connectionString: databaseUrl });
    globalForDb.__youthMeetingDb = drizzlePg(pool, { schema });
  }
  dbInstance = globalForDb.__youthMeetingDb;
} else {
  if (!globalForDb.__youthMeetingPglite) {
    const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
    const dbPath = isVercel ? "memory://" : "./youth_meeting_db";
    const pglite = new PGlite(dbPath);
    globalForDb.__youthMeetingPglite = pglite;
    globalForDb.__youthMeetingInitPromise = (async () => {
      for (const stmt of INIT_STATEMENTS) {
        try {
          await pglite.exec(stmt);
        } catch (e) {
          // ignore column/table already exists errors
        }
      }
    })();
  }
  dbInstance = drizzlePglite(globalForDb.__youthMeetingPglite, { schema });
}

export const initDb = async () => {
  if (globalForDb.__youthMeetingInitPromise) {
    await globalForDb.__youthMeetingInitPromise;
  }
};

export const db = dbInstance;
