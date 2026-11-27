// Prints schema.sql from src/schema.js (the Worker applies src/schema.js itself; schema.sql is for people).
// Usage: npm run schema   (writes schema.sql)
import { SCHEMA } from '../src/schema.js';

export const schemaSql = () =>
  '-- Generated from src/schema.js by `npm run schema` (applied automatically by the Worker on first request).\n' +
  SCHEMA.map((s) => s.trim() + ';').join('\n\n') + '\n';

if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(schemaSql());
