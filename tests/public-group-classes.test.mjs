import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Date, Intl, URLSearchParams, Headers, Response, ...extra });
  return exports;
}
test('Warsaw wall-clock dates stay unchanged and explicit offsets are respected', () => {
  const dates = load('app/lib/public/studio-date.ts');
  assert.equal(dates.studioTime('2026-09-10T18:00:00'), '18:00');
  assert.equal(dates.studioTime('2026-09-10T16:00:00Z'), '18:00');
  assert.equal(dates.studioTime('2026-01-10T17:00:00Z'), '18:00');
  assert.equal(dates.addStudioDays('2026-03-28', 1), '2026-03-29');
  assert.equal(dates.durationMinutes('2026-09-10T18:00:00', '2026-09-10T19:00:00'), 60);
});
test('backend wrapper handles empty 204 cancellation and opt-out from auth redirects', async () => {
  let redirects = 0;
  const api = load('app/lib/backend.ts', { fetch: async () => new Response(null, { status: 204 }), window: { location: { assign: () => redirects++ } } });
  assert.equal(await api.backendFetch('public/group-classes/88/bookings/me', { method: 'DELETE', skipUnauthorizedRedirect: true }), null);
  const denied = load('app/lib/backend.ts', { fetch: async () => new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } }), window: { location: { assign: () => redirects++ } } });
  await assert.rejects(denied.backendFetch('public/group-classes/88/bookings/me', { skipUnauthorizedRedirect: true }), { status: 401 });
  assert.equal(redirects, 0);
});

const origin = process.env.PUBLIC_TEST_ORIGIN;
test('BFF: public GET, protected mutation, registration cookies, booking, 204 and unpaid purchase', { skip: !origin }, async () => {
  const base = `${origin}/api/backend/public/group-classes`;
  const locations = await fetch(`${base}/locations`);
  assert.equal(locations.status, 200);
  assert.equal((await locations.json())[0].id, 4);
  assert.equal((await fetch(`${base}/88/bookings/me`, { method: 'POST' })).status, 401);
  const registered = await fetch(`${origin}/api/auth/public-register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'fixture@example.test', password: 'FixtureOnly123!', firstName: 'Test', lastName: 'Client', phoneNumber: '000000000', locationId: 4 }) });
  assert.equal(registered.status, 200);
  const data = await registered.json();
  assert.equal(data.user.role, 'client');
  assert.equal('token' in data, false);
  const cookies = registered.headers.getSetCookie();
  assert.equal(cookies.length, 4);
  assert.ok(cookies.every(c => /HttpOnly/i.test(c) && /SameSite=lax/i.test(c)));
  const headers = { Cookie: cookies.map(c => c.split(';')[0]).join('; ') };
  assert.equal((await fetch(`${base}/88/bookings/me`, { method: 'POST', headers })).status, 200);
  const sessions = await (await fetch(`${base}?locationId=4&from=2026-09-11T00:00:00&to=2026-09-11T23:59:59`, { headers })).json();
  assert.equal(sessions[0].isBookedByCurrentClient, true);
  assert.equal(sessions[0].availableSeats, 7);
  const cancelled = await fetch(`${base}/88/bookings/me`, { method: 'DELETE', headers });
  assert.equal(cancelled.status, 204);
  assert.equal(await cancelled.text(), '');
  const purchase = await (await fetch(`${base}/packages/12/purchases/me`, { method: 'POST', headers })).json();
  assert.equal(purchase.paymentStatus, 'Unpaid');
  assert.equal((await fetch(`${base}/91/bookings/me`, { method: 'POST', headers })).status, 409);
  const expired = await fetch(`${base}/locations`, { headers: { Cookie: 'accessToken=expired' } });
  assert.equal(expired.status, 200);
  assert.ok(expired.headers.getSetCookie().some(c => c.startsWith('accessToken=;')));
});
