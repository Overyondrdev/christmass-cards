import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { schemaSql } from '../scripts/schema-sql.mjs';

test('schema.sql matches src/schema.js (run `npm run schema` after changing the schema)', () => {
  assert.equal(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'), schemaSql());
});
