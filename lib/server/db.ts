import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const defaultDatabaseUrl =
  "postgresql://hellfire:hellfire_dev_password@localhost:5432/hellfire";

type GlobalWithPgPool = typeof globalThis & {
  __hellfirePgPool?: Pool;
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL || defaultDatabaseUrl;
}

export function getPool() {
  const globalForPool = globalThis as GlobalWithPgPool;

  if (!globalForPool.__hellfirePgPool) {
    globalForPool.__hellfirePgPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 8,
      idleTimeoutMillis: 30_000
    });
  }

  return globalForPool.__hellfirePgPool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function withClient<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function isDbAvailable() {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
