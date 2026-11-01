# Suvarnavarsha Gold website (Node.js + Express + MySQL)

The Suvarnavarsha Gold website with an admin panel, as one Node.js app for GoDaddy Node.js hosting.

- **Public website:** the current website's design, unchanged: same pages, images, hero slides, scroll
  animations and mobile layout, in English (`/`) and Marathi (`/mr`). The server fills in live data
  from MySQL: today's rate, FAQs, contact details, opening hours, logo, Saturday offer, videos and products.
- **New pages** in the same design: Book a visit (`/booking`: opens WhatsApp with the visitor's details; nothing is stored), Today's rate with 30-day history
  (`/gold-rate`), Customer videos (`/feedback`). Linked from the footer of every page.
- **Admin panel** (`/admin`, Bootstrap 5): dashboard, gold rates, advertisement videos,
  customer feedback videos, store products, FAQs, settings, password change.

## How it is built

| Part | Where | Notes |
| --- | --- | --- |
| Server start | `server.js` | Listens on `process.env.PORT` |
| App setup | `src/app.js` | Security headers (CSP, HSTS), sessions in MySQL, routes, static files |
| Public pages | `public/*.html`, `public/mr/*.html` | Copies of the current website's pages (do not edit by hand unless you mean to change the design) |
| Live data in pages | `src/site/live.js` | Swaps in phones, WhatsApp, address, hours, map, logo, rates, FAQs; hides the offer when switched off |
| New pages | `src/site/newPages.js` | Booking, Gold rate, Customer videos, built from the original page shell |
| Page routes + `data.js` | `src/routes/site.routes.js` | `/assets/js/data.js` is generated from MySQL (rates, videos, products) for the original `site.js` |
| Design files | `public/assets/` | Original CSS, fonts, `site.js` (slides, menu, animations), plus `extra.css` and `booking.js` for the new pages |
| API | `src/routes/index.js` | `/api/public/*`, `/api/auth/*`, `/api/admin/*` (JSON `{ ok, data }` or `{ ok:false, error, fields }`) |
| Business rules | `src/services/` | One file per module |
| SQL | `src/models/` | mysql2 prepared statements only |
| Admin pages | `src/views/admin.js`, `public/js/admin/`, `public/css/admin.css` | Bootstrap 5 from `public/vendor/bootstrap` |
| Database | `database/schema.sql`, `database/seed.sql` | `sample-data.sql` is test data only, never import it on the live site |

FAQ items in the pages carry `data-faq-id` (their row in the `faqs` table). Each page keeps the same
questions as the original design; new FAQs added in the admin appear on the FAQ page under their topic.

## Run on your PC

Needs Node.js 20 or 22 and a MySQL 8 (or MariaDB 10.6+) database.

1. `npm install` (also copies Bootstrap into `public/vendor`)
2. Create an empty database. Copy `.env.example` to `.env` and fill in the `DB_*` values.
   For local use set `NODE_ENV=development` and `SITE_URL=http://127.0.0.1:3000`.
3. `npm start`, then open http://127.0.0.1:3000. On start the app creates the tables, the starting
   content and the first admin by itself (`database/schema.sql` + `database/seed.sql`).
4. Sign in at `/admin` (see "Admin login" below).

## Deploy to GoDaddy (ZIP upload, hosted database)

1. On your PC: `npm install`, then `npm run zip` → `dist/suvarnavarsha-website-<date>.zip`
   (no `node_modules`, no `.env`, no test data).
2. In GoDaddy, create the Node.js app (Node.js **22**, start command `npm start`, startup file `server.js`)
   and **attach a hosted MySQL database**. GoDaddy then sets `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`
   and `DB_PASSWORD` by itself (Secrets card); do not enter them again.
3. Add these environment variables (Secrets / Environment): `NODE_ENV=production`,
   `ADMIN_PASSWORD=<admin password>` and later `SITE_URL=https://your-domain` (no slash at the end):
   `SESSION_SECRET` / `IP_HASH_SALT` are derived from the database password when not set.
4. Upload the ZIP and deploy / restart. On start the app creates all tables, the starting content
   (settings, FAQs, the 10 g coin, a first rate) and the admin account. Check
   `https://your-domain/api/health` shows `"db":"up"`, then sign in at `https://your-domain/admin`.
5. Connect the domain and turn on SSL (HTTPS). The app sends HSTS and secure cookies in production.

To update later: build a new ZIP and upload it again. All content (rates, videos, products, photos,
FAQs, settings, admin accounts) lives in the database, so nothing is lost when the app files are replaced.
Uploaded logo and product photos are stored in the database too (table `uploaded_files`).

cPanel hosting without a hosted database: create a MySQL database and user in cPanel, then add the five
`DB_*` values as environment variables yourself. Everything else is the same.

Back up the database regularly (GoDaddy database backups or an SQL export).

## Admin login

No password is kept in any file of the project. The first admin is created on start from the private
hosting setting `ADMIN_PASSWORD` (username `admin`, or `ADMIN_USERNAME`), only while the database has no
admin; it never overwrites one. Change the password after the first sign-in (top-right menu → Change
password; new passwords need 12+ characters), then the setting can be deleted.

- More admins or a forgotten password: `npm run create-admin` in the app folder (hosting terminal / SSH).
- The one-time setup screen (`SETUP_TOKEN`) is only used if a database has no admin at all.

Security: bcrypt (cost 12), session cookie HttpOnly + SameSite=Strict (+ Secure over HTTPS in production),
sessions stored in MySQL, CSRF token on every admin change, 5 wrong passwords → 15-minute lock,
rate limits on login and the API, salted SHA-256 IP hashes only, strict Content-Security-Policy.

## What the admin controls on the website

| Admin section | Shows on the website |
| --- | --- |
| Gold rates | Rate cards on Home, Sell Gold, Services, Gold rate page; 30-day history; "Last updated" time |
| Advertisements | "See how we work" videos on Home and Customer videos page (YouTube links) |
| Customer feedback | Customer videos on Home and Customer videos page, only when approved **and** consent ticked |
| Store products | 24K store cards with "Ask price on WhatsApp" (no prices). While empty, the original sample cards show |
| FAQs | Question text everywhere it appears; turn off to hide; new ones go on the FAQ page |
| Settings | Phones, WhatsApp, address, maps, opening hours, logo, 18K/silver switches, Saturday offer on/off |

Business names, email and social links are stored in Settings, but the current design has no place for them.

## SEO and speed (built in)

- Lighthouse (mobile): SEO 100, Accessibility 100, Best Practices 100 on Home and the new pages.
- Brotli / gzip compression without extra packages (`src/middleware/compress.js`): home page 140 KB → 16 KB.
- One address per page: `/about/`, `/about.html`, `/mr/index.html` redirect (301) to `/about`, `/mr`;
  with `NODE_ENV=production` and `SITE_URL` set, `www.` redirects to the main address (or the reverse).
- Canonical, `og:url` and schema links follow `SITE_URL` (set it to the live https address).
- `sitemap.xml` (both languages with hreflang; real dates for the rate and FAQ pages), `robots.txt`, `llms.txt`.
- Structured data on every page (JewelryStore / Organization / WebSite / Breadcrumb / Service / FAQPage),
  FAQ data always matches the FAQs shown. Admin and API send `X-Robots-Tag: noindex`.
- After launch: add the site in Google Search Console, submit the sitemap, link the Google Business Profile.

If the database cannot be reached, public pages still open with their built-in content (original
contact details and FAQs) and the problem is written to the server log.

## Tests

Run against a **test database only** (the tests create and delete rows):

1. Start the app with a test `.env` (`SETUP_TOKEN` set, empty `admin_users` table for the first run)
2. `npm test` (or `node tests/api.test.js http://127.0.0.1:5600`)

The 20 checks cover: every public page in both languages, clean addresses and security headers,
sign-in, setup, lockout, CSRF and other-website refusal, and add/edit/delete for rates, videos,
products (image checks), FAQs, settings, the WhatsApp-only booking page,
dashboard, SQL-injection input and password change.

## Launch checklist

- [ ] All pages open in English and Marathi; language switch works on every page
- [ ] Rate saved in admin from a phone shows on the website at once
- [ ] Book a visit opens WhatsApp with the details filled in (phone and desktop)
- [ ] Call and WhatsApp buttons work on Android and iPhone
- [ ] Settings changes (hours, phones, offer) appear on the website within a minute
- [ ] HTTPS on, `/api/health` up, admin password changed to a strong one after first sign-in
- [ ] Database backup in place
- [ ] Privacy Policy and Terms approved by the client (they still describe an enquiry form;
      the site now stores no visitor details - Book a visit sends them through WhatsApp)
- [ ] Google Search Console: submit `https://your-domain/sitemap.xml`
