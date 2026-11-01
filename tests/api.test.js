// End-to-end API test. Run against a TEST database only (it creates and deletes rows):
//   1. start the app with a test .env:  npm start
//   2. in another window:               npm test            (or: node tests/api.test.js http://127.0.0.1:5600)
// On an empty test database it creates admin "tester" via the setup screen (needs SETUP_TOKEN); or set TEST_ADMIN_USER / TEST_ADMIN_PASSWORD.
const assert = require('assert/strict');

const BASE = process.argv[2] || process.env.TEST_URL || 'http://127.0.0.1:5600';
const SETUP_TOKEN = process.env.SETUP_TOKEN || 'local-setup-token-for-testing-only';
const USER = process.env.TEST_ADMIN_USER || 'tester';
const PASS = process.env.TEST_ADMIN_PASSWORD || 'Test-Password-123456';

let cookie = '';
let csrf = '';
let passed = 0;

async function call(method, path, { body, form, headers = {}, raw = false, noOrigin = false, ip } = {}) {
  const h = { ...headers };
  if (!noOrigin) h.Origin = BASE;
  if (cookie) h.Cookie = cookie;
  if (csrf) h['X-CSRF-Token'] = csrf;
  if (ip) h['X-Forwarded-For'] = ip;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect: 'manual' });
  const set = res.headers.get('set-cookie');
  if (set && set.includes('sv.sid=')) cookie = set.split(';')[0];
  if (raw) return res;
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { text };
  }
  return { status: res.status, ...json };
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}\n       ${err.message}`);
    process.exitCode = 1;
  }
}

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function main() {
  console.log(`Testing ${BASE}`);

  await test('health check reports database up', async () => {
    const r = await call('GET', '/api/health');
    assert.equal(r.ok, true);
  });

  await test('public endpoints answer', async () => {
    for (const p of ['home', 'settings', 'gold-rates', 'advertisements', 'feedback', 'products', 'faqs']) {
      const r = await call('GET', `/api/public/${p}`);
      assert.equal(r.ok, true, p);
    }
    const s = await call('GET', '/api/public/settings');
    assert.equal(s.data.business_name.mr, 'सुवर्णवर्षा गोल्ड', 'Marathi text is stored and read correctly');
    const f = await call('GET', '/api/public/faqs');
    assert.ok(f.data.length >= 12);
    assert.match(f.data[0].question.mr, /कागदपत्रे/);
  });

  await test('pages load with clean addresses and security headers', async () => {
    for (const p of ['/', '/about', '/services', '/sell-gold', '/release-pledged-gold', '/buy-gold', '/how-it-works', '/contact', '/booking', '/gold-rate', '/faq', '/feedback', '/store', '/privacy-policy', '/terms', '/mr', '/mr/about', '/mr/booking', '/mr/gold-rate', '/mr/feedback', '/mr/faq', '/admin/login']) {
      const r = await call('GET', p, { raw: true });
      assert.equal(r.status, 200, p);
      assert.ok(r.headers.get('content-security-policy'), `CSP on ${p}`);
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    }
    const old = await call('GET', '/about.html', { raw: true });
    assert.equal(old.status, 301);
    assert.equal(old.headers.get('location'), '/about');
    const missing = await call('GET', '/no-such-page', { raw: true });
    assert.equal(missing.status, 404);
  });

  await test('admin pages and API need sign-in', async () => {
    const page = await call('GET', '/admin/dashboard', { raw: true });
    assert.equal(page.status, 302);
    assert.equal(page.headers.get('location'), '/admin/login');
    const api = await call('GET', '/api/admin/dashboard');
    assert.equal(api.status, 401);
  });

  await test('status gives a CSRF token; requests without it are refused', async () => {
    const s = await call('GET', '/api/auth/status');
    assert.ok(s.data.csrfToken);
    const saved = s.data.csrfToken;
    const bad = await call('POST', '/api/auth/login', { body: { username: 'x', password: 'y' } });
    assert.equal(bad.status, 403, 'no token yet in header');
    csrf = saved;
  });

  await test('requests from another website are refused', async () => {
    const r = await call('POST', '/api/auth/login', { body: { username: 'x', password: 'y' }, headers: { Origin: 'https://evil.example' }, noOrigin: true });
    assert.equal(r.status, 403);
  });

  await test('first admin setup (wrong code refused, short password refused, then created)', async () => {
    const st = await call('GET', '/api/auth/status');
    if (!st.data.setupNeeded) {
      console.log('       (admin already exists, signing in instead)');
      return;
    }
    const wrong = await call('POST', '/api/auth/setup', { body: { username: USER, password: PASS, setup_token: 'nope' } });
    assert.equal(wrong.status, 400);
    assert.ok(wrong.fields.setup_token);
    const short = await call('POST', '/api/auth/setup', { body: { username: USER, password: 'short', setup_token: SETUP_TOKEN } });
    assert.equal(short.status, 400);
    assert.ok(short.fields.password);
    const okSetup = await call('POST', '/api/auth/setup', { body: { username: USER, password: PASS, setup_token: SETUP_TOKEN } });
    assert.equal(okSetup.status, 201, JSON.stringify(okSetup));
    csrf = okSetup.data.csrfToken;
    const again = await call('POST', '/api/auth/setup', { body: { username: 'second', password: PASS, setup_token: SETUP_TOKEN } });
    assert.equal(again.status, 403, 'setup closes once an admin exists');
    await call('POST', '/api/auth/logout', { body: {} });
    cookie = '';
    csrf = (await call('GET', '/api/auth/status')).data.csrfToken;
  });

  await test('too many wrong tries from one device are slowed down', async () => {
    const ip = '203.0.113.77';
    let last;
    for (let i = 0; i < 21; i += 1) {
      last = await call('POST', '/api/auth/login', { body: { username: `nobody${i}`, password: 'wrong-password' }, ip });
    }
    assert.equal(last.status, 429, 'per-device limit');
  });

  await test('sign in with the right password', async () => {
    const r = await call('POST', '/api/auth/login', { body: { username: USER, password: PASS } });
    assert.equal(r.status, 200, JSON.stringify(r));
    csrf = r.data.csrfToken;
    const me = await call('GET', '/api/auth/me');
    assert.equal(me.data.user.username, USER);
    assert.equal(me.data.user.password_hash, undefined, 'hash never sent');
  });

  await test('admin page opens after sign-in', async () => {
    const r = await call('GET', '/admin/dashboard', { raw: true });
    assert.equal(r.status, 200);
  });

  // Signs in with its own cookie (does not touch the main session). Returns { status, json, jar }.
  async function separateLogin(username, password, ip) {
    const st = await fetch(`${BASE}/api/auth/status`, { headers: { Origin: BASE, 'X-Forwarded-For': ip } });
    const jar = (st.headers.get('set-cookie') || '').split(';')[0];
    const token = (await st.json()).data.csrfToken;
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: BASE, Cookie: jar, 'X-CSRF-Token': token, 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ username, password }),
    });
    const setCookie = r.headers.get('set-cookie');
    return { status: r.status, json: await r.json(), jar: setCookie ? setCookie.split(';')[0] : jar };
  }

  await test('users: super admin adds a user; 5 wrong passwords lock it; super admin unlocks; roles limit access', async () => {
    const me = await call('GET', '/api/auth/me');
    assert.equal(me.data.user.role, 'superadmin', 'the first admin (setup) is a super admin');
    const short = await call('POST', '/api/admin/users', { body: { username: 'staff1', password: 'short', role: 'admin' } });
    assert.equal(short.status, 400);
    const add = await call('POST', '/api/admin/users', { body: { username: 'staff1', display_name: 'Staff One', password: 'Staff-Pass-1', role: 'admin' } });
    assert.equal(add.status, 201, JSON.stringify(add));
    const staff = add.data;
    assert.equal(staff.password_hash, undefined, 'hash never sent');
    const dup = await call('POST', '/api/admin/users', { body: { username: 'staff1', password: 'Staff-Pass-1' } });
    assert.equal(dup.status, 400);

    // 4 wrong passwords: still open, with a warning; the 5th locks the account
    for (let i = 1; i <= 4; i += 1) {
      const w = await separateLogin('staff1', 'wrong-pass', `198.51.100.${i}`);
      assert.equal(w.status, 401);
      assert.match(w.json.error, new RegExp(`${5 - i} tr(y|ies) left`));
    }
    const fifth = await separateLogin('staff1', 'wrong-pass', '198.51.100.5');
    assert.equal(fifth.status, 423, 'locked on the 5th wrong password');
    const right = await separateLogin('staff1', 'Staff-Pass-1', '198.51.100.6');
    assert.equal(right.status, 423, 'even the right password is refused while locked');
    const listed = await call('GET', '/api/admin/users');
    assert.ok(listed.data.items.find((u) => u.id === staff.id).locked_at, 'shown as locked');

    // super admin unlocks; the user can sign in, but only with admin (limited) access
    assert.equal((await call('PATCH', `/api/admin/users/${staff.id}/lock`, { body: { locked: false } })).ok, true);
    const ok = await separateLogin('staff1', 'Staff-Pass-1', '198.51.100.7');
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const asStaff = (method, path, body) =>
      fetch(BASE + path, { method, headers: { Origin: BASE, Cookie: ok.jar, 'X-CSRF-Token': ok.json.data.csrfToken, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    assert.equal((await asStaff('GET', '/api/admin/gold-rates')).status, 200, 'admin can work on rates');
    assert.equal((await asStaff('GET', '/api/admin/faqs')).status, 200, 'admin can work on FAQs');
    assert.equal((await asStaff('GET', '/api/admin/settings')).status, 403, 'admin cannot open settings');
    assert.equal((await asStaff('GET', '/api/admin/users')).status, 403, 'admin cannot manage users');
    assert.equal((await asStaff('POST', '/api/admin/users', { username: 'x1x', password: 'Staff-Pass-1' })).status, 403);
    const page = await fetch(`${BASE}/admin/users`, { headers: { Cookie: ok.jar }, redirect: 'manual' });
    assert.equal(page.status, 302, 'users page sends admins back to the dashboard');

    // locking signs the user out at once
    assert.equal((await call('PATCH', `/api/admin/users/${staff.id}/lock`, { body: { locked: true } })).ok, true);
    assert.equal((await asStaff('GET', '/api/admin/gold-rates')).status, 401, 'locked user is signed out');

    // reset password also unlocks; guards on own account and the last super admin
    const reset = await call('PUT', `/api/admin/users/${staff.id}/password`, { body: { new_password: 'New-Staff-Pass-2' } });
    assert.equal(reset.data.locked_at, null);
    assert.equal((await separateLogin('staff1', 'New-Staff-Pass-2', '198.51.100.8')).status, 200);
    assert.equal((await call('DELETE', `/api/admin/users/${me.data.user.id}`)).status, 403, 'cannot remove yourself');
    assert.equal((await call('PATCH', `/api/admin/users/${me.data.user.id}/lock`, { body: { locked: true } })).status, 403, 'cannot lock yourself');
    assert.equal((await call('PUT', `/api/admin/users/${me.data.user.id}`, { body: { role: 'admin' } })).status, 403, 'cannot demote yourself');
    assert.equal((await call('DELETE', `/api/admin/users/${staff.id}`)).ok, true);
  });

  let rateId;
  await test('gold rates: add, validate, edit, list, delete', async () => {
    const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
    const bad = await call('POST', '/api/admin/gold-rates', { body: { effective_date: today, gold_24k: 100, gold_22k: 200 } });
    assert.equal(bad.status, 400);
    assert.ok(bad.fields.gold_22k);
    const r = await call('POST', '/api/admin/gold-rates', { body: { effective_date: today, gold_24k: '13,000', gold_22k: 11900, gold_18k: '', silver_kg: 160000 } });
    assert.equal(r.status, 201, JSON.stringify(r));
    rateId = r.data.id;
    assert.equal(Number(r.data.gold_24k), 13000);
    const pub = await call('GET', '/api/public/gold-rates');
    assert.equal(pub.data.latest.gold_24k, 13000, 'website shows the newest rate');
    const u = await call('PUT', `/api/admin/gold-rates/${rateId}`, { body: { effective_date: today, gold_24k: 13100, gold_22k: 12000 } });
    assert.equal(Number(u.data.gold_24k), 13100);
    const list = await call('GET', '/api/admin/gold-rates?page=1&pageSize=5');
    assert.ok(list.data.items.length >= 1);
    assert.ok(list.data.total >= 2);
    const d = await call('DELETE', `/api/admin/gold-rates/${rateId}`);
    assert.equal(d.ok, true);
    const gone = await call('DELETE', `/api/admin/gold-rates/${rateId}`);
    assert.equal(gone.status, 404);
  });

  await test('advertisements: YouTube link checked, add, toggle, edit, delete', async () => {
    const bad = await call('POST', '/api/admin/advertisements', { body: { youtube_url: 'https://vimeo.com/123', title_en: 'X' } });
    assert.equal(bad.status, 400);
    assert.ok(bad.fields.youtube_url);
    const r = await call('POST', '/api/admin/advertisements', { body: { youtube_url: 'https://youtube.com/shorts/aqz-KE-bpKQ?feature=share', title_en: 'Diwali advert', title_mr: 'दिवाळी जाहिरात' } });
    assert.equal(r.status, 201, JSON.stringify(r));
    assert.equal(r.data.youtube_id, 'aqz-KE-bpKQ');
    assert.equal(r.data.is_short, 1);
    assert.match(r.data.embed_url, /^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/);
    const off = await call('PATCH', `/api/admin/advertisements/${r.data.id}/status`, { body: { status: 'inactive' } });
    assert.equal(off.data.status, 'inactive');
    const pub = await call('GET', '/api/public/advertisements');
    assert.ok(!pub.data.some((a) => a.id === r.data.id), 'inactive advert hidden');
    const e = await call('PUT', `/api/admin/advertisements/${r.data.id}`, { body: { youtube_url: 'https://youtu.be/M7lc1UVf-VE', title_en: 'Edited' } });
    assert.equal(e.data.youtube_id, 'M7lc1UVf-VE');
    assert.equal(e.data.is_short, 0);
    const s = await call('GET', '/api/admin/advertisements?q=Edited');
    assert.equal(s.data.items.length, 1);
    assert.equal((await call('DELETE', `/api/admin/advertisements/${r.data.id}`)).ok, true);
  });

  await test('feedback videos: approval needs consent; only approved + consent shown', async () => {
    const noConsent = await call('POST', '/api/admin/feedback', { body: { youtube_url: 'aqz-KE-bpKQ', customer_name: 'Test Customer', status: 'approved' } });
    assert.equal(noConsent.status, 400);
    const r = await call('POST', '/api/admin/feedback', { body: { youtube_url: 'aqz-KE-bpKQ', customer_name: 'Test Customer', consent: false } });
    assert.equal(r.status, 201);
    assert.equal(r.data.status, 'pending');
    const approve = await call('PATCH', `/api/admin/feedback/${r.data.id}/status`, { body: { status: 'approved' } });
    assert.equal(approve.status, 400, 'cannot approve without consent');
    await call('PUT', `/api/admin/feedback/${r.data.id}`, { body: { consent: true } });
    const ok2 = await call('PATCH', `/api/admin/feedback/${r.data.id}/status`, { body: { status: 'approved' } });
    assert.equal(ok2.data.status, 'approved');
    const pub = await call('GET', '/api/public/feedback');
    assert.ok(pub.data.some((f) => f.id === r.data.id));
    await call('PATCH', `/api/admin/feedback/${r.data.id}/status`, { body: { status: 'rejected' } });
    const pub2 = await call('GET', '/api/public/feedback');
    assert.ok(!pub2.data.some((f) => f.id === r.data.id));
    assert.equal((await call('DELETE', `/api/admin/feedback/${r.data.id}`)).ok, true);
  });

  await test('products: photo required, fake image refused, add, edit, delete', async () => {
    const fd = () => {
      const f = new FormData();
      f.append('code', 'test-c-005');
      f.append('category', 'coin');
      f.append('weight_grams', '5');
      f.append('name_en', '24K Gold Coin, 5 g');
      return f;
    };
    const noPhoto = await call('POST', '/api/admin/products', { form: fd() });
    assert.equal(noPhoto.status, 400);
    assert.ok(noPhoto.fields.image);
    const fake = fd();
    fake.append('image', new Blob(['<?php echo 1; ?>'], { type: 'image/png' }), 'evil.png');
    const fakeRes = await call('POST', '/api/admin/products', { form: fake });
    assert.equal(fakeRes.status, 400);
    const good = fd();
    good.append('image', new Blob([tinyPng], { type: 'image/png' }), 'coin.png');
    const r = await call('POST', '/api/admin/products', { form: good });
    assert.equal(r.status, 201, JSON.stringify(r));
    assert.equal(r.data.code, 'TEST-C-005');
    assert.match(r.data.image, /^\/uploads\/products\/[a-f0-9]{24}\.png$/);
    const img = await call('GET', r.data.image, { raw: true });
    assert.equal(img.status, 200);
    const dup = fd();
    dup.append('image', new Blob([tinyPng], { type: 'image/png' }), 'coin.png');
    const dupRes = await call('POST', '/api/admin/products', { form: dup });
    assert.equal(dupRes.status, 400, 'duplicate code refused');
    const edit = new FormData();
    edit.append('name_en', 'Edited coin');
    const e = await call('PUT', `/api/admin/products/${r.data.id}`, { form: edit });
    assert.equal(e.data.name_en, 'Edited coin');
    assert.equal(e.data.image, r.data.image, 'photo kept when not replaced');
    const pub = await call('GET', '/api/public/products');
    assert.ok(pub.data.some((p) => p.id === r.data.id));
    assert.equal(pub.data[0].price, undefined, 'no prices');
    assert.equal((await call('DELETE', `/api/admin/products/${r.data.id}`)).ok, true);
    const imgGone = await call('GET', r.data.image, { raw: true });
    assert.equal(imgGone.status, 404, 'photo file removed with the product');
  });

  await test('FAQs: add, edit, move, disable, delete', async () => {
    const r = await call('POST', '/api/admin/faqs', { body: { question_en: 'Test question?', answer_en: 'Test answer.', category: 'general' } });
    assert.equal(r.status, 201);
    const up = await call('PATCH', `/api/admin/faqs/${r.data.id}/move`, { body: { direction: 'up' } });
    const pos = up.data.findIndex((f) => f.id === r.data.id);
    assert.equal(pos, up.data.length - 2, 'moved up one place');
    const off = await call('PATCH', `/api/admin/faqs/${r.data.id}/status`, { body: { status: 'inactive' } });
    assert.equal(off.data.status, 'inactive');
    const pub = await call('GET', '/api/public/faqs');
    assert.ok(!pub.data.some((f) => f.id === r.data.id));
    const e = await call('PUT', `/api/admin/faqs/${r.data.id}`, { body: { answer_en: 'Changed.' } });
    assert.equal(e.data.answer_en, 'Changed.');
    assert.equal((await call('DELETE', `/api/admin/faqs/${r.data.id}`)).ok, true);
  });

  await test('settings: validation, save, public view', async () => {
    const bad = await call('PUT', '/api/admin/settings', { body: { phone_primary: '12345', map_embed_url: 'https://evil.example/map' } });
    assert.equal(bad.status, 400);
    assert.ok(bad.fields.phone_primary);
    const r = await call('PUT', '/api/admin/settings', { body: { hours_en: 'Mon–Sat 10:30 am – 7:30 pm', show_silver: false } });
    assert.equal(r.ok, true, JSON.stringify(r));
    const rates = await call('GET', '/api/public/gold-rates');
    assert.equal(rates.data.latest.silver_kg, null, 'silver hidden when switched off');
    await call('PUT', '/api/admin/settings', { body: { hours_en: '', show_silver: true } });
    const logo = new FormData();
    logo.append('image', new Blob([tinyPng], { type: 'image/png' }), 'logo.png');
    const l = await call('POST', '/api/admin/settings/logo', { form: logo });
    assert.match(l.data.logo_path, /^\/uploads\/logo\//);
  });

  await test('book a visit goes straight to WhatsApp (nothing stored, no booking API)', async () => {
    for (const p of ['/booking', '/mr/booking']) {
      const r = await call('GET', p, { raw: true });
      assert.equal(r.status, 200, p);
      const html = await r.text();
      assert.match(html, /id="booking-form"/, `${p} has the form`);
      assert.match(html, /data-wa="[^"]*wa\.me\/\d{10,15}/, `${p} has the WhatsApp number`);
      assert.match(html, /assets\/js\/booking\.js/, `${p} loads booking.js`);
    }
    const post = await call('POST', '/api/public/bookings', { body: { name: 'X' } });
    assert.equal(post.status, 404, 'old booking API removed');
    const admin = await call('GET', '/api/admin/bookings');
    assert.equal(admin.status, 404, 'admin bookings removed');
    const page = await call('GET', '/admin/bookings', { raw: true });
    assert.equal(page.status, 404, 'admin bookings page removed');
  });

  await test('dashboard stats and recent activity', async () => {
    const r = await call('GET', '/api/admin/dashboard');
    assert.equal(r.ok, true);
    assert.ok(r.data.counts.faqs_active >= 12);
    assert.ok(r.data.recent.length > 0);
  });

  await test('SQL injection attempt is treated as plain text', async () => {
    const r = await call('GET', `/api/admin/advertisements?q=${encodeURIComponent("' OR 1=1 -- ")}`);
    assert.equal(r.ok, true);
    assert.equal(r.data.total, 0);
    const id = await call('DELETE', '/api/admin/faqs/1%20OR%201=1');
    assert.equal(id.status, 400);
  });

  await test('change password (wrong current refused), then sign out', async () => {
    const wrong = await call('PUT', '/api/auth/password', { body: { current_password: 'nope-nope-nope', new_password: 'Another-Password-1' } });
    assert.equal(wrong.status, 400);
    const short = await call('PUT', '/api/auth/password', { body: { current_password: PASS, new_password: 'Short@1' } });
    assert.equal(short.status, 400, 'new passwords need 12+ characters');
    assert.ok(short.fields.new_password);
    // Change and change back (only when the test password itself meets the 12-character rule).
    if (PASS.length >= 12) {
      const ok1 = await call('PUT', '/api/auth/password', { body: { current_password: PASS, new_password: `${PASS}x` } });
      assert.equal(ok1.ok, true);
      await call('PUT', '/api/auth/password', { body: { current_password: `${PASS}x`, new_password: PASS } });
    }
    const out = await call('POST', '/api/auth/logout', { body: {} });
    assert.equal(out.ok, true);
    const after = await call('GET', '/api/admin/dashboard');
    assert.equal(after.status, 401);
  });

  console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ', all good'}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
