import postgres from "postgres";

const connectionString = process.env["NEON_DATABASE_URL"];
if (!connectionString) {
  throw new Error("NEON_DATABASE_URL is not set");
}

export const sql = postgres(connectionString, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export async function migrate(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL,
      make            TEXT NOT NULL,
      model           TEXT NOT NULL,
      year            INTEGER NOT NULL,
      version         TEXT,
      nickname        TEXT,
      plate           TEXT,
      photo_uri       TEXT,
      overall_status  TEXT,
      fluids          JSONB,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS version TEXT`;
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS nickname TEXT`;
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS overall_status TEXT`;
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fluids JSONB`;
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_schedule JSONB`;
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km INTEGER`;

  await sql`
    CREATE TABLE IF NOT EXISTS scans (
      id              TEXT PRIMARY KEY,
      vehicle_id      TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      overall_status  TEXT NOT NULL,
      vehicle_detected TEXT NOT NULL,
      confidence      INTEGER NOT NULL,
      summary         TEXT NOT NULL,
      fluids          JSONB NOT NULL DEFAULT '[]',
      scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_history (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL,
      vehicle_id      TEXT,
      title           TEXT NOT NULL,
      messages        JSONB NOT NULL DEFAULT '[]',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("✅ Database schema ready");
}
