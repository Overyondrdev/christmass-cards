// Built-in address rules (src/address.js). The free Census/OpenStreetMap lookups need the network and aren't tested here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAddress, basicIssues, changedFields, countryCode } from '../src/address.js';

const errors = (a) => basicIssues(cleanAddress(a)).filter((i) => i.severity === 'error').map((i) => i.field);

test('country names and codes are normalised; unknown or blank countries are not guessed', () => {
  assert.equal(countryCode('USA'), 'US');
  assert.equal(countryCode('United Kingdom'), 'GB');
  assert.equal(countryCode('uk'), 'GB');
  assert.equal(countryCode('Mexico'), 'MX');
  assert.equal(countryCode(''), '');
  assert.equal(countryCode('Narnia'), '');
});

test('safe clean-ups: state names, lost ZIP zeros, UK and Canadian postcode spacing', () => {
  const us = cleanAddress({ line1: '1 Main St', city: 'Boston', region: 'Massachusetts', postal_code: '2134', country: 'USA' });
  assert.equal(us.region, 'MA');
  assert.equal(us.postal_code, '02134');
  assert.equal(cleanAddress({ line1: 'x', city: 'London', postal_code: 'sw1a2aa', country: 'GB' }).postal_code, 'SW1A 2AA');
  const ca = cleanAddress({ line1: 'x', city: 'Toronto', region: 'Ontario', postal_code: 'm5h1a1', country: 'Canada' });
  assert.deepEqual([ca.region, ca.postal_code], ['ON', 'M5H 1A1']);
});

test('required fields', () => {
  assert.deepEqual(errors({ line1: '', city: '', region: 'TX', postal_code: '78701', country: 'US' }), ['line1', 'city']);
  assert.ok(errors({ line1: '1 Main St', city: 'Austin', region: 'TX', postal_code: '78701', country: '' }).includes('country'));
  assert.ok(errors({ line1: '1 Reforma', city: 'CDMX', region: '', postal_code: '06600', country: 'MX' }).includes('region'));
  assert.deepEqual(errors({ line1: '10 Downing St', city: 'London', region: '', postal_code: 'SW1A 2AA', country: 'GB' }), []);
});

test('ZIP that belongs to another state is a warning, not an error', () => {
  const issues = basicIssues(cleanAddress({ line1: '1 Broad St', city: 'Newark', region: 'NY', postal_code: '07102', country: 'US' }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warning');
  assert.match(issues[0].message, /New Jersey/);
});

test('formatting-only differences are not treated as corrections', () => {
  const a = { line1: '1600 Amphitheatre Parkway', line2: '', city: 'mountain view', region: 'CA', postal_code: '94043', country: 'US' };
  const b = { line1: '1600 Amphitheatre Pkwy', line2: '', city: 'Mountain View', region: 'CA', postal_code: '94043-1351', country: 'US' };
  assert.deepEqual(changedFields(a, b), []);
  assert.deepEqual(changedFields({ ...a, city: 'Mtn View', postal_code: '94044' }, b), ['city', 'postal_code']);
});
