// Creates an admin, or sets a new password for an existing one.
//   npm run create-admin                 (asks for username and password)
//   npm run create-admin -- <username>   (asks only for the password)
// The password is typed hidden and never stored in plain text.
const readline = require('readline');
const { Writable } = require('stream');

async function ask(question, { hidden = false } = {}) {
  const muted = new Writable({
    write(chunk, enc, cb) {
      if (!hidden) process.stdout.write(chunk, enc);
      cb();
    },
  });
  const rl = readline.createInterface({ input: process.stdin, output: muted, terminal: true });
  process.stdout.write(question);
  const answer = await new Promise((resolve) => rl.question('', resolve));
  rl.close();
  if (hidden) process.stdout.write('\n');
  return answer.trim();
}

async function main() {
  const db = require('../src/config/db');
  const { hashPassword, checkUsername, MIN_PASSWORD } = require('../src/services/auth.service');
  const { adminUsers, activity } = require('../src/models');
  try {
    const username = process.argv[2] || (await ask('Admin username: '));
    checkUsername(username);
    const password = await ask(`Password (${MIN_PASSWORD}+ characters): `, { hidden: true });
    if (password.length < MIN_PASSWORD) throw new Error(`Password must be at least ${MIN_PASSWORD} characters.`);
    const again = await ask('Type the password again: ', { hidden: true });
    if (again !== password) throw new Error('The two passwords are not the same.');

    const hash = await hashPassword(password);
    const existing = await adminUsers.byUsername(username);
    if (existing) {
      await adminUsers.setPassword(existing.id, hash);
      await activity.add(existing.id, 'password', 'account', existing.id, 'Password set from the command line');
      console.log(`Password changed for "${username}".`);
    } else {
      await adminUsers.create(username, hash);
      const user = await adminUsers.byUsername(username);
      await activity.add(user.id, 'create', 'account', user.id, 'Admin created from the command line');
      console.log(`Admin "${username}" created. Sign in at /admin/login`);
    }
  } catch (err) {
    console.error(`Error: ${err.fields ? Object.values(err.fields).join(' ') : err.message}`);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

main();
