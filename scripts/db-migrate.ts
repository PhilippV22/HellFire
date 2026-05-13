import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://hellfire:hellfire_dev_password@localhost:5432/hellfire";

async function main() {
  const migrationsDir = path.join(process.cwd(), "database", "migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      process.stdout.write(`Applying ${file}...\n`);
      await pool.query(sql);
    }

    process.stdout.write(`Applied ${files.length} migration(s).\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exit(1);
});
