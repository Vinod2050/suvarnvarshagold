// Admin sign-in, first-run setup and password change.
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const db = require('../config/db');
const { adminUsers, loginAttempts, activity } = require('../models');
const { validate } = require('../utils/validate');
const { badRequest, forbidden, tooMany, AppError } = require('../utils/response');
const { safeEqual } = require('../utils/security');

const BCRYPT_COST = 12;
const MAX_FAILS = 5; // wrong passwords in a row before the account is locked
const MAX_IP_FAILS = 20; // wrong tries per device in LOCK_MINUTES, any username
const LOCK_MINUTES = 15;
const SUPER_LOCK_MINUTES = 15; // a locked super admin is unlocked automatically after this
const MIN_PASSWORD = 12;
// Compared against when the username does not exist, so the reply takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-placeholder', BCRYPT_COST);

const USERNAME = { type: 'string', required: true, min: 3, max: 50 };
const NEW_PASSWORD = { type: 'text', required: true, min: MIN_PASSWORD, max: 128 };

function checkUsername(username) {
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    throw badRequest('Please correct the highlighted fields', { username: 'Use 3–50 letters, numbers, dots, dashes or underscores' });
  }
}

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST);

async function status() {
  const count = await adminUsers.count();
  return { setupNeeded: count === 0, setupEnabled: count === 0 && Boolean(env.setupToken) };
}

// Creates the first admin. Only works while there is no admin and with the SETUP_TOKEN from the settings.
async function setup(body) {
  const clean = validate(body, { username: USERNAME, password: NEW_PASSWORD, setup_token: { type: 'text', required: true, max: 200 } });
  checkUsername(clean.username);
  if (!env.setupToken) throw forbidden('Setup screen is turned off. Use `npm run create-admin` on the server.');
  if (!safeEqual(clean.setup_token, env.setupToken)) {
    throw badRequest('Please correct the highlighted fields', { setup_token: 'Setup code is not correct' });
  }
  const hash = await hashPassword(clean.password);
  // Lock the table so two people cannot both create "the first" admin at the same moment.
  await db.transaction(async (conn) => {
    const [rows] = await conn.execute('SELECT COUNT(*) AS n FROM admin_users FOR UPDATE');
    if (rows[0].n > 0) throw forbidden('An admin already exists. Please sign in.');
    await conn.execute("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'superadmin')", [clean.username, hash]);
  });
  const user = await adminUsers.byUsername(clean.username);
  await activity.add(user.id, 'create', 'account', user.id, 'First admin created');
  return { id: user.id, username: user.username };
}

// Sign-in rules:
// - 5 wrong passwords in a row lock the ACCOUNT. Only a super admin can unlock it (Users page).
//   A super admin who locks themselves out is unlocked automatically after SUPER_LOCK_MINUTES,
//   because nobody else may be able to unlock them.
// - Per device (IP hash): at most MAX_IP_FAILS wrong tries in LOCK_MINUTES, for any usernames.
async function login(body, ipHash) {
  const clean = validate(body, { username: { type: 'string', required: true, max: 50 }, password: { type: 'text', required: true, max: 128 } });
  const recent = await loginAttempts.recent(ipHash, clean.username, LOCK_MINUTES);
  if (recent.by_ip >= MAX_IP_FAILS) {
    throw tooMany(`Too many wrong tries from this device. Please wait ${LOCK_MINUTES} minutes and try again.`);
  }
  const user = await adminUsers.byUsername(clean.username);
  if (user && user.locked_at) {
    const minutes = (Date.now() - new Date(user.locked_at).getTime()) / 60000;
    if (user.role === 'superadmin' && minutes >= SUPER_LOCK_MINUTES) {
      await adminUsers.unlock(user.id);
      user.locked_at = null;
      user.failed_attempts = 0;
    } else {
      const wait = user.role === 'superadmin' ? ` It unlocks by itself in ${Math.ceil(SUPER_LOCK_MINUTES - minutes)} minutes.` : ' Please ask the super admin to unlock it.';
      throw new AppError(423, `This account is locked after ${MAX_FAILS} wrong passwords.${wait}`);
    }
  }
  const match = await bcrypt.compare(clean.password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !match || user.status !== 'active') {
    await loginAttempts.add(ipHash, clean.username);
    if (user && !match) {
      const r = await adminUsers.addFailure(user.id, MAX_FAILS);
      if (r.locked_at) {
        await activity.add(user.id, 'lock', 'account', user.id, `Locked after ${MAX_FAILS} wrong passwords`);
        const how = user.role === 'superadmin' ? ` It unlocks by itself in ${SUPER_LOCK_MINUTES} minutes.` : ' Please ask the super admin to unlock it.';
        throw new AppError(423, `Too many wrong passwords: this account is now locked.${how}`);
      }
      const left = MAX_FAILS - r.failed_attempts;
      throw new AppError(401, `Username or password is not correct. ${left} ${left === 1 ? 'try' : 'tries'} left before the account is locked.`);
    }
    throw new AppError(401, 'Username or password is not correct');
  }
  await loginAttempts.clear(ipHash, clean.username);
  await adminUsers.touchLogin(user.id);
  await activity.add(user.id, 'login', 'account', user.id, 'Signed in');
  loginAttempts.prune().catch(() => {});
  return { id: user.id, username: user.username, display_name: user.display_name, role: user.role };
}

async function changePassword(adminId, body) {
  const clean = validate(body, { current_password: { type: 'text', required: true, max: 128 }, new_password: NEW_PASSWORD });
  const hash = await adminUsers.hashById(adminId);
  if (!hash || !(await bcrypt.compare(clean.current_password, hash))) {
    throw badRequest('Please correct the highlighted fields', { current_password: 'Current password is not correct' });
  }
  if (clean.current_password === clean.new_password) {
    throw badRequest('Please correct the highlighted fields', { new_password: 'Choose a password different from the current one' });
  }
  await adminUsers.setPassword(adminId, await hashPassword(clean.new_password));
  await activity.add(adminId, 'password', 'account', adminId, 'Password changed');
}

module.exports = { status, setup, login, changePassword, hashPassword, checkUsername, MIN_PASSWORD };
