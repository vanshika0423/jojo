// Applies every SQL file in db/migrations that hasn't been applied yet.
// Usage: npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { requireDatabaseUrl } from "./env.mjs";

const sql = postgres(requireDatabaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
const dir = join(process.cwd(), "db", "migrations");

try {
  await sql`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`;
  const applied = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name));
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    process.stdout.write(`Applying ${file} … `);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, file), "utf8"));
      await tx`insert into public.schema_migrations (name) values (${file})`;
    });
    console.log("done");
    count++;
  }
  console.log(count ? `✓ ${count} migration(s) applied.` : "✓ Database is already up to date.");
} catch (error) {
  console.error("\n✗ Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
