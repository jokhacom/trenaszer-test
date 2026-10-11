// Cloud database (Supabase Postgres, connected through the Vercel integration).
// Without a connection string the app keeps working on its local storage.

import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

let sql: Sql | null | undefined;
let ready: Promise<void> | null = null;

/** The database client, or null when no database is connected. */
export function db(): Sql | null {
  if (sql !== undefined) return sql;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  // The Supabase pooler runs in transaction mode: prepared statements must be off.
  sql = url ? postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 }) : null;
  return sql;
}

/**
 * Creates the tables on first use. Row level security is on with no policies,
 * so only the server (this connection) can read or write them — not the public
 * Supabase API.
 */
export function migrate(s: Sql): Promise<void> {
  ready ??= (async () => {
    await s`
      create table if not exists lessons (
        key text primary key,
        lesson jsonb not null,
        hits integer not null default 0,
        created_at timestamptz not null default now()
      )`;
    await s`alter table lessons enable row level security`;
  })().catch((e) => {
    ready = null; // try again on the next request
    throw e;
  });
  return ready;
}
