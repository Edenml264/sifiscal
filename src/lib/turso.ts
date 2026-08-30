import { createClient } from '@libsql/client';

const url = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.TURSO_DATABASE_URL
  : process.env.TURSO_DATABASE_URL;

const authToken = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.TURSO_AUTH_TOKEN
  : process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: url || 'file:local.db',
  authToken: authToken || undefined,
});

export { client };
