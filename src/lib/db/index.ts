import "server-only";
import postgres from "postgres";

/**
 * The single PostgreSQL connection used by the whole site. Works with any
 * Postgres: Neon, Railway, Vercel Postgres, Supabase's database, or a local one.
 * Set DATABASE_URL to enable it; until then the site shows its placeholders.
 */
export const databaseUrl = process.env.DATABASE_URL ?? "";
export const isDatabaseConfigured = Boolean(databaseUrl);

export type Sql = postgres.Sql;

const globalForDb = globalThis as unknown as { __jojoSql?: Sql };

export function db(): Sql | null {
  if (!isDatabaseConfigured) return null;
  globalForDb.__jojoSql ??= postgres(databaseUrl, {
    // Small pool: serverless functions each keep their own connections.
    max: Number(process.env.DATABASE_POOL_SIZE) || 5,
    idle_timeout: 20,
    connect_timeout: 15,
    // Compatible with transaction-mode poolers (Neon, Supabase pooler, PgBouncer).
    prepare: false,
    types: {
      // Keep calendar dates as "YYYY-MM-DD" strings, never shifted by time zones.
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
    onnotice: () => {},
  }) as unknown as Sql;
  return globalForDb.__jojoSql;
}

/** Like db(), for code paths that must have a database. */
export function requireDb(): Sql {
  const sql = db();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  return sql;
}

/** Column list shared by every photo query (constant, safe to inline). */
export const PHOTO_SQL_COLUMNS =
  "p.id, p.public_id, p.version, p.width, p.height, p.caption, p.alt, p.taken_on, p.tags, p.is_favourite, p.allow_download, p.published, p.position";

export const VIDEO_SQL_COLUMNS =
  "v.id, v.public_id, v.version, v.width, v.height, v.duration, v.title, v.caption, v.recorded_on, v.poster_public_id, v.poster_version, v.poster_offset, v.is_featured, v.published, v.position";
