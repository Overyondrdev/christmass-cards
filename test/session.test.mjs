// The shared Yondr sign-in cookie (src/yondr-session.js): only valid, unexpired tokens for @overyondr.com are accepted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifySession, SESSION_ISSUER, SESSION_AUDIENCE } from '../src/yondr-session.js';
import { validEmail } from '../src/signin.js';

const b64u = (bytes) => Buffer.from(bytes).toString('base64url');
const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'test-key' };
const env = { YONDR_AUTH_PUBLIC_JWK: JSON.stringify(jwk), ALLOWED_EMAIL_DOMAINS: 'overyondr.com' };

async function token(claims, kid = 'test-key') {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'ES256', kid }));
  const p = b64u(JSON.stringify({ typ: 'session', iss: SESSION_ISSUER, aud: SESSION_AUDIENCE, exp: now + 600, email: 'jane@overyondr.com', ...claims }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(new Uint8Array(sig))}`;
}

test('a valid Yondr session is accepted', async () => {
  assert.deepEqual(await verifySession(await token({ name: 'Jane' }), env), { email: 'jane@overyondr.com', name: 'Jane' });
});

test('expired, wrong-audience, wrong-domain, wrong-key or tampered tokens are rejected', async () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(await verifySession(await token({ exp: now - 1 }), env), null);
  assert.equal(await verifySession(await token({ aud: 'example.com' }), env), null);
  assert.equal(await verifySession(await token({ email: 'eve@gmail.com' }), env), null);
  assert.equal(await verifySession(await token({}, 'other-key'), env), null);
  const t = await token({});
  const [h, , s] = t.split('.');
  assert.equal(await verifySession(`${h}.${b64u(JSON.stringify({ typ: 'session', email: 'eve@overyondr.com' }))}.${s}`, env), null);
  assert.equal(await verifySession('', env), null);
});

test('only @overyondr.com addresses can request a sign-in code', () => {
  assert.ok(validEmail('jane.smith@overyondr.com'));
  assert.ok(!validEmail('jane@overyondr.com.evil.com'));
  assert.ok(!validEmail('jane@gmail.com'));
});
