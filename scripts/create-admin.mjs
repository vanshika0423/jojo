// Creates (or updates the password of) a dashboard administrator.
// Usage: npm run db:create-admin
//        npm run db:create-admin -- you@example.com
import { randomBytes, scrypt } from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";
import postgres from "postgres";
import { requireDatabaseUrl } from "./env.mjs";

const scryptAsync = promisify(scrypt);

// Must match src/lib/password.ts
async function hashPassword(password) {
  const N = 16384,
    r = 8,
    p = 1;
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

// Prompts: hidden typing in a real terminal; plain line reading when piped.
const piped = !stdin.isTTY;
const pipedLines = piped ? createInterface({ input: stdin, terminal: false })[Symbol.asyncIterator]() : null;

async function ask(question) {
  if (piped) {
    stdout.write(question + "\n");
    return ((await pipedLines.next()).value ?? "").trim();
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

function askHidden(question) {
  if (piped) return ask(question);
  return new Promise((resolve) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") process.exit(130); // Ctrl+C
        if (ch === "\u007f" || ch === "\b") {
          if (value) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
        } else {
          value += ch;
          stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

const sql = postgres(requireDatabaseUrl(), { max: 1, prepare: false, onnotice: () => {} });

try {
  const email = (process.argv[2] || (await ask("Admin email: "))).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That doesn't look like an email address.");
  const password = await askHidden("Password (at least 10 characters): ");
  if (password.length < 10) throw new Error("Please use at least 10 characters.");
  const again = await askHidden("Repeat password: ");
  if (password !== again) throw new Error("The passwords didn't match.");

  const hash = await hashPassword(password);
  await sql`
    insert into public.admin_users (email, password_hash) values (${email}, ${hash})
    on conflict (email) do update set password_hash = excluded.password_hash`;
  // Signing in again is required after a password change.
  await sql`delete from public.admin_sessions where admin_id = (select id from public.admin_users where email = ${email})`;
  console.log(`✓ ${email} can now sign in at /admin`);
} catch (error) {
  console.error("✗", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
  stdin.destroy();
}
