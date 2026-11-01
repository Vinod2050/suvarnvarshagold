# Connect the database on GoDaddy

For the ZIP `dist/suvarnavarsha-website-2026-11-01.zip`. The app prepares the database by itself:
on start it creates all tables and the starting content (settings, 12 FAQs, the 10 g coin, a first rate),
and the admin account from the private ADMIN_PASSWORD setting. Normally there is nothing to import by hand.
No password is kept in any file of the project.

Settings to enter: see `deploy/godaddy-env.txt`.

## Steps

1. **Upload the ZIP** to the Node.js app and deploy it (start command `npm start`, Node.js 22).
2. **Attach the hosted MySQL database** to the app (if it is not attached yet).
   Then open the **Secrets** card and check these five are listed: `DB_HOST`, `DB_PORT`, `DB_NAME`,
   `DB_USER`, `DB_PASSWORD`. Do not type or change them; GoDaddy fills them in.
3. **Add the account settings** in the Secrets card (private, 8+ characters each). GoDaddy sets
   `NODE_ENV` itself (it is reserved), so do not add it.
   - `SUPERADMIN_PASSWORD` = temporary password for **superadmin** (full access, manages users)
   - `ADMIN_PASSWORD` = password for **admin** (rates, videos, feedback, products, FAQs only)
   (`SITE_URL` comes later, with the domain.)
4. **Restart / redeploy** the app so it picks up the database settings.
5. **Check the app log.** You should see:
   ```
   Suvarnavarsha Gold website running on port ... (production)
   Account created: super admin "superadmin"
   Database connected and ready (2 accounts, 1 super admin)
   ```
6. **Check in the browser** (use the app's temporary GoDaddy address until the domain is added):
   - `<app address>/api/health` shows `{"ok":true,"data":{"db":"up"}}`
   - `<app address>/` shows the website with today's rate
   - `<app address>/admin` → sign in as **superadmin** with the password from `SUPERADMIN_PASSWORD`
7. **Change the passwords** after the first sign-in (top-right menu → Change password, 12+ characters).
   The password settings are only used while an account does not exist; you can delete them afterwards.

## Users and access

- **Super admin** (Users page): add, edit, remove users, reset passwords, lock and unlock accounts.
- **Admin**: Dashboard, Gold rates, Advertisements, Customer feedback, Store products and FAQs only.
- Wrong passwords in a row: after **3** wait 1 minute, after **5** wait 5 minutes, after **8** the account
  is locked until a super admin unlocks it (Users page → Unlock). The sign-in button counts down the wait.
  A super admin who locks themselves out is unlocked automatically after 15 minutes.
- **Make an existing account a super admin** (e.g. `admin`): add the setting `MAKE_SUPERADMIN` = `admin`
  (several names: comma-separated) and save. On restart the log shows
  `Account "admin" is now a super admin (full access, unlocked)`. No password is needed; the password
  stays the same. The setting can stay or be deleted afterwards.
- Lost the last super admin password: `npm run create-admin -- superadmin --super` (hosting terminal),
  or ask the developer.

## If something is wrong: what the log line means

| Log line | Meaning | Fix |
| --- | --- | --- |
| `Missing setting DB_USER` / `DB_NAME` | The database is not attached, or the app started before it was | Attach the database, check the Secrets card, restart |
| `Database setup failed: ECONNREFUSED` or `ETIMEDOUT` / `ENOTFOUND` | The app cannot reach the database host | Check `DB_HOST` / `DB_PORT` in Secrets match the database page; restart |
| `Database setup failed: ER_ACCESS_DENIED_ERROR` | Wrong database user or password | Re-attach the database (GoDaddy refreshes the secrets) and restart |
| `Database setup failed: ER_BAD_DB_ERROR` | The database name does not exist | Check `DB_NAME`; create the database or re-attach |
| `Database setup failed: ER_TABLEACCESS_DENIED_ERROR` / `CREATE command denied` | The user may not create tables | Use **Manual setup** below |
| Error mentioning `SSL` / `secure transport` | The database requires an encrypted connection | Tell the developer: a small `DB_SSL` option is needed (new ZIP) |
| `No super admin yet: add the SUPERADMIN_PASSWORD setting` | No super admin exists | Add `SUPERADMIN_PASSWORD` and restart |
| `SUPERADMIN_PASSWORD must be at least 8 characters` | The password setting is too short | Use 8+ characters and restart |

While the database is not reachable, the website still opens with its built-in content, but the
admin panel cannot sign in.

## Manual setup (only if the app cannot create tables)

1. Open the database tool in GoDaddy (phpMyAdmin or the database console) for the hosted database.
2. **Import** `database/setup-all.sql` (one file: tables + starting content). It is safe to run
   again; nothing is duplicated or overwritten.
3. Add the setting `AUTO_MIGRATE` = `false` and restart. The accounts are still created from the password settings.
   The log then shows `Database: automatic table setup turned off (AUTO_MIGRATE=false)`; check `/api/health`
   and sign in as above.

## Later: the domain

1. Connect the domain to the app in GoDaddy and turn on SSL (HTTPS).
2. Add `SITE_URL` = `https://suvarnvarshagold.com` (no slash at the end) and restart.
   This sets the correct addresses for Google (canonical links, sitemap) and sends `www.` to the main address.
3. In Google Search Console, submit `https://suvarnvarshagold.com/sitemap.xml`.

## Updating the site later

Build a new ZIP (`npm run zip`) and upload it. Everything the admin changes (rates, videos, products,
photos, FAQs, settings, admin accounts) is in the database, so nothing is lost when the app files are replaced.

## Super admin password not working or forgotten

The password settings only create accounts; they never change an existing one. To set the super admin
password again (this also unlocks the account):

1. In Secrets, type the new password by hand into `SUPERADMIN_PASSWORD` (browser autofill is not picked up),
   and add `RESET_SUPERADMIN_PASSWORD` = `yes`. Save.
2. The log shows `Password of super admin "superadmin" set from SUPERADMIN_PASSWORD (account unlocked)`.
3. Sign in, then **delete** `RESET_SUPERADMIN_PASSWORD` (otherwise every restart sets the password again).
