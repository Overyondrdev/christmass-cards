// Spreadsheet upload parsing (public/sheet.js): CSV/TSV text and column matching. (.xlsx reading needs a browser.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimited, looksLikeHeader, guessMapping, applyMapping } from '../public/sheet.js';

test('CSV with quotes, commas and newlines inside cells', () => {
  const rows = parseDelimited('Name,Notes\r\n"Smith, Jane","Line one\nline two ""quoted"""\r\n');
  assert.deepEqual(rows, [['Name', 'Notes'], ['Smith, Jane', 'Line one\nline two "quoted"']]);
});

test('cells pasted from a spreadsheet (tab-separated)', () => {
  assert.deepEqual(parseDelimited('Name\tCity\nAna\tGuadalajara\n'), [['Name', 'City'], ['Ana', 'Guadalajara']]);
});

test('the address spreadsheet headers are all recognised', () => {
  const headers = ['Name', 'Organization', 'Job title', 'Department', 'Street address', 'Address line 2', 'City',
    'State / region', 'ZIP / postal code', 'Country', 'Email', 'Notes'];
  assert.ok(looksLikeHeader(headers));
  const map = guessMapping(headers);
  for (const key of ['name', 'company', 'title', 'department', 'line1', 'line2', 'city', 'region', 'postal_code', 'country', 'email', 'notes']) {
    assert.notEqual(map[key], undefined, `${key} should be matched`);
  }
});

test('first and last name columns are combined', () => {
  const headers = ['First Name', 'Last Name', 'Company Name', 'Street', 'City'];
  const map = guessMapping(headers);
  const [row] = applyMapping([['Jane', 'Smith', 'Acme', '1 Main St', 'Austin']], map);
  assert.equal(row.name, 'Jane Smith');
  assert.equal(row.company, 'Acme');
});
