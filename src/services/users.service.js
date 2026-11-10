// User accounts, managed by a super admin: add, edit name / role, reset password, lock, unlock, remove.
// Guards: nobody can remove, lock or demote their own account, and the last super admin always stays.
const { adminUsers, activity } = require('../models');
const { validate } = require('../utils/validate');
const { badRequest, forbidden, notFound } = require('../utils/response');
const { hashPassword, checkUsername } = require('./auth.service');

const ROLES = ['superadmin', 'admin'];
// Passwords set by the super admin are temporary; the user changes them (10+ characters) after signing in.
const TEMP_PASSWORD = { type: 'text', required: true, min: 8, max: 128 };

async function get(id) {
  const user = await adminUsers.byId(id);
  if (!user) throw notFound('User');
  return user;
}

function notSelf(id, actorId, what) {
  if (id === actorId) throw forbidden(`You cannot ${what} your own account.`);
}

async function keepOneSuper(user) {
  if (user.role === 'superadmin' && (await adminUsers.countSuper()) <= 1) {
    throw forbidden('This is the only super admin. Make another user super admin first.');
  }
}

const usersService = {
  ROLES,
  list: () => adminUsers.list(),

  async create(body, actorId) {
    const clean = validate(body, {
      username: { type: 'string', required: true, min: 3, max: 50 },
      display_name: { type: 'string', max: 100, default: '' },
      role: { type: 'enum', values: ROLES, default: 'admin' },
      password: TEMP_PASSWORD,
    });
    checkUsername(clean.username);
    if (await adminUsers.byUsername(clean.username)) {
      throw badRequest('Please correct the highlighted fields', { username: 'This username is already used' });
    }
    await adminUsers.create(clean.username, await hashPassword(clean.password), clean.display_name, clean.role);
    const user = await adminUsers.byUsername(clean.username);
    await activity.add(actorId, 'create', 'user', user.id, `${user.username} (${user.role})`);
    return adminUsers.byId(user.id);
  },

  async update(id, body, actorId) {
    const user = await get(id);
    const clean = validate(body, {
      display_name: { type: 'string', max: 100, default: '' },
      role: { type: 'enum', values: ROLES, required: true },
    });
    if (clean.role !== user.role) {
      notSelf(id, actorId, 'change the role of');
      if (clean.role !== 'superadmin') await keepOneSuper(user);
    }
    await adminUsers.update(id, clean);
    await activity.add(actorId, 'update', 'user', id, `${user.username}: ${clean.role}`);
    return adminUsers.byId(id);
  },

  async resetPassword(id, body, actorId) {
    const user = await get(id);
    const clean = validate(body, { new_password: TEMP_PASSWORD });
    await adminUsers.setPassword(id, await hashPassword(clean.new_password));
    await adminUsers.unlock(id); // a new password also clears the lock
    await activity.add(actorId, 'password', 'user', id, `Password reset for ${user.username}`);
    return adminUsers.byId(id);
  },

  async setLocked(id, locked, actorId) {
    const user = await get(id);
    if (locked) {
      notSelf(id, actorId, 'lock');
      await adminUsers.lock(id);
    } else {
      await adminUsers.unlock(id);
    }
    await activity.add(actorId, locked ? 'lock' : 'unlock', 'user', id, user.username);
    return adminUsers.byId(id);
  },

  async remove(id, actorId) {
    const user = await get(id);
    notSelf(id, actorId, 'remove');
    await keepOneSuper(user);
    await adminUsers.remove(id);
    await activity.add(actorId, 'delete', 'user', id, user.username);
  },
};

module.exports = usersService;
