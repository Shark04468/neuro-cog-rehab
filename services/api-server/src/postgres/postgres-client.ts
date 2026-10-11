import { Pool, type QueryResultRow } from "pg";

export interface PostgresQueryResult<TRow extends QueryResultRow = QueryResultRow> {
  rows: TRow[];
}

export interface PostgresQueryClient {
  query<TRow extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<PostgresQueryResult<TRow>>;
}

export interface PostgresConnection extends PostgresQueryClient {
  close(): Promise<void>;
}

export interface PostgresConnectionOptions {
  connectionString: string;
}

/**
 * Creates the minimal PostgreSQL client surface used by api-server repositories.
 * Keep this boundary narrow so repositories stay easy to test without a live DB.
 */
export function createPostgresConnection(options: PostgresConnectionOptions): PostgresConnection {
  const pool = new Pool({
    connectionString: options.connectionString
  });

  return {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[]
    ): Promise<PostgresQueryResult<TRow>> {
      return pool.query<TRow>(text, values ? [...values] : undefined);
    },
    async close(): Promise<void> {
      await pool.end();
    }
  };
}
