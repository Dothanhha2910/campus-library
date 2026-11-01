// Quick sanity check that the app boots and the main flows work.
// This is NOT the students' test suite - it only proves the system under test is alive.
process.env.DB_PATH = ':memory:';
process.env.GOOGLE_MOCK = '1';
process.env.INJECT_BUGS = '0'; // verify the CLEAN, spec-correct behaviour (bugs are guarded by this flag)

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

let server;
let base;
before(async () => {
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test('full flow', async () => {
  // Register validation + success
  let r = await call('POST', '/auth/register', { name: 'A', email: 'bad', password: 'short' });
  assert.equal(r.status, 400);
  assert.ok(r.body.fields.name && r.body.fields.email && r.body.fields.password);
  r = await call('POST', '/auth/register', { name: 'Test User', email: 'T@Example.com', password: 'Passw0rd1' });
  assert.equal(r.status, 201);
  const token = r.body.token;
  r = await call('POST', '/auth/register', { name: 'Test User', email: 't@example.com', password: 'Passw0rd1' });
  assert.equal(r.status, 409);

  // Login + lockout
  r = await call('POST', '/auth/login', { email: 't@example.com', password: 'Passw0rd1' });
  assert.equal(r.status, 200);
  for (let i = 0; i < 4; i++) {
    r = await call('POST', '/auth/login', { email: 't@example.com', password: 'wrong' });
    assert.equal(r.status, 401);
  }
  r = await call('POST', '/auth/login', { email: 't@example.com', password: 'wrong' });
  assert.equal(r.status, 423);

  // Google (mock)
  r = await call('POST', '/auth/google', { credential: 'mock:g@gmail.com:G User' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.google, true);

  // Books
  assert.equal((await call('GET', '/books')).status, 401);
  r = await call('GET', '/books?q=clean&sort=year&order=desc', null, token);
  assert.equal(r.status, 200);
  assert.equal(r.body.items[0].title, 'Clean Code');
  r = await call('POST', '/books', {}, token);
  assert.equal(r.status, 403);

  // Borrow rules
  r = await call('POST', '/loans', { bookId: 1 }, token);
  assert.equal(r.status, 201);
  const loanId = r.body.loan.id;
  assert.equal((await call('POST', '/loans', { bookId: 1 }, token)).status, 409);
  assert.equal((await call('POST', '/loans', { bookId: 26 }, token)).status, 409); // out of stock
  assert.equal((await call('POST', `/loans/${loanId}/renew`, null, token)).status, 200);
  assert.equal((await call('POST', `/loans/${loanId}/renew`, null, token)).status, 409);

  // Overdue + fine via admin hook
  const admin = (await call('POST', '/auth/login', { email: 'admin@library.test', password: 'Admin@123' })).body.token;
  const old = new Date(Date.now() - 4.5 * 86400000).toISOString();
  r = await call('PATCH', `/loans/${loanId}/due-date`, { dueAt: old }, admin);
  assert.equal(r.body.loan.status, 'overdue');
  assert.equal((await call('POST', '/loans', { bookId: 2 }, token)).status, 409);
  r = await call('POST', `/loans/${loanId}/return`, null, token);
  assert.equal(r.body.loan.fine, 2.5);

  // Profile + admin
  r = await call('PUT', '/profile/password', { currentPassword: 'Passw0rd1', newPassword: 'Passw0rd1' }, token);
  assert.equal(r.status, 400);
  r = await call('GET', '/admin/stats', null, admin);
  assert.equal(r.status, 200);
  assert.equal((await call('GET', '/admin/stats', null, token)).status, 403);
  r = await call('PATCH', '/admin/users/1/role', { role: 'member' }, admin);
  assert.equal(r.status, 409); // cannot change own role
});
