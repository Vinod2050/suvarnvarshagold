# New Business Website — Phase 1 analysis and plan

Brief: `../todos.md` (Node.js 22 + Express + MySQL + Bootstrap 5, GoDaddy Node.js ZIP hosting).
Status: **Built and tested (1 Nov 2026).** Change on 1 Nov 2026: the client asked for the public site to look exactly like the current one, so the public pages are now the current site's own pages and assets with live data filled in on the server (see README). Bootstrap 5 is used for the admin panel only.

---

## 1. What the current project is

| Part | What it is today |
| --- | --- |
| Pages | Static HTML, English at `/` and Marathi in `/mr/`: Home, About, Services, Sell Gold, Release Pledged Gold, Buy Gold, Store, How It Works, FAQ, Contact, Privacy, Terms, 404 |
| Styling | Compiled Tailwind (`assets/css/site.css`, 103 KB), plum + foil-gold theme from the business card |
| Fonts | Self-hosted Playfair Display, Tiro Devanagari Marathi, Mukta (`assets/fonts/`) |
| JS | `assets/js/site.js` (menu, hero slides, FAQ, videos, animations), `assets/js/data.js` (fallback data) |
| Backend | PHP 8 + MySQL: `api/data.php` (public data), `admin/api.php` + `admin/admin.js` (panel), `admin/install.php` (installer) |
| Admin tabs | Today's rates · Advertisement videos (YouTube) · Customer feedback videos (YouTube, consent tick) · Store products (no prices) |
| Security already in place | `password_hash`, HttpOnly + SameSite=Strict session, CSRF token, 5 wrong logins → 15 min lock, salted SHA-256 IP hashes |
| SEO | Unique titles/descriptions, hreflang, JSON-LD (JewelryStore, FAQPage, Service), sitemap, robots, llms.txt |

### Static vs dynamic today

| Static (in HTML) | Dynamic (MySQL) |
| --- | --- |
| Services, About, How it works, FAQ, Contact, legal pages | Gold/silver rates (24K 999, 22K, 18K per g; silver per kg; history kept) |
| Address, phones, map link | Advert videos, feedback videos (YouTube ids) |
| | Store products, `show_silver` switch |

### Business content to reuse (exact)

- **Name:** Suvarnavarsha Gold Ventures Pvt. Ltd. / सुवर्णवर्षा गोल्ड व्हेंचर्स प्रा. लि.
- **Phones:** 8805-94-2424 (also WhatsApp, `918805942424`), 8805-98-2424
- **Address:** Second Floor – 239, VTP Altitude, Near Shell Petrol Pump, Dange Chowk, Pune – 411033, Maharashtra
- **Map:** `https://www.google.com/maps?q=VTP+Altitude,+Dange+Chowk,+Pune+411033&output=embed`
- **Hours:** not known yet; site says "Call us for today's timings"
- **Services:** Sell old gold & silver · Release pledged gold · Buy 24K gold (0.5–100 g, BIS Hallmark + HUID)
- **Why us:** purity test on German-technology machine in front of you · payment in ~5 min (bank transfer, or cash within legal limits) · any karat · transparent weighing
- **Steps:** Visit branch → Estimate → KYC → Purity test → Instant payment
- **Values:** Transparency · Fair rate · Respect
- **FAQ:** 12 questions in English and Marathi (seed data for the `faqs` table)
- **Saturday offer:** 5% off 24K gold on 1st & 3rd Saturday (only if client confirms it is active)

### Reusable assets (copy, never move)

- `logo/suvarnavarsha-logo-v2-transparent*.{png,webp}`, `logo/suvarnavarsha-logo.svg`, `icon.png`, `apple-icon.png`, `og/og-default.jpg`
- `assets/fonts/*.woff2` (3 families)
- `images/how/`, `images/services/`, `images/media/` photos and their resized copies
- `images/stock/` are **stock photos** (see `CREDITS.md`): fine as decoration, never shown as real customers or the real shop

### Rules carried over from CLAUDE.md and client decisions

- No investment scheme, returns, lucky draw or "100% safe" claims (D-08, Section 8.3).
- Claims still needing client approval are left out: "100% full value" (now on the About page), "highest rate", "0% deduction", "100% buyback".
- No invented testimonials: feedback shows only real customer entries approved in admin.
- Videos are YouTube links only (client decision, 23 Oct 2026).
- No prices on products (client decision). The new brief has no store page, so products are not carried over (see 5.6).

---

## 2. Conflicts found in the brief, and how this plan resolves them

| # | Conflict | Plan |
| --- | --- | --- |
| 1 | CLAUDE.md says PHP + Tailwind + Alpine; brief says Node + Express + Bootstrap | The new project gets its own rules in `new-business-website/README.md`. CLAUDE.md is not changed |
| 2 | Booking "redirects to WhatsApp" but admin has a bookings list with statuses; no `bookings` table in the brief's list | Form saves the booking to MySQL first, then opens WhatsApp with the details prefilled. Add a `bookings` table |
| 3 | Adverts: "Add videos on storage" vs "validate YouTube URLs" | YouTube links only (client decision). No video upload |
| 4 | Gold rates: brief says 22K and 24K only | 24K and 22K required; 18K and silver optional (blank = hidden), so today's content is not lost |
| 5 | Brief says "uploads not persistent" | Only the logo is uploaded. Saved under `UPLOAD_DIR` (env, default outside the app folder) and served by Express; documented for backups |

---

## 3. New project structure

```
new-business-website/
├── server.js                  # starts the app on process.env.PORT
├── package.json               # start + build scripts, Node 22 engines
├── .env.example  .gitignore  README.md  PLAN.md
├── scripts/
│   ├── build.js               # copies Bootstrap from node_modules into public/vendor
│   ├── create-admin.js        # sets/changes the admin password from the command line
│   └── make-zip.js            # builds the GoDaddy ZIP (no node_modules, no .env)
├── database/  schema.sql  seed.sql
├── src/
│   ├── app.js                 # express app: security, static, routes, errors
│   ├── config/   env.js  db.js
│   ├── middleware/ auth.js  csrf.js  rateLimits.js  validate.js  errorHandler.js
│   ├── utils/    youtube.js  response.js  activity.js  phone.js
│   ├── models/   one file per table (SQL only, parameterised)
│   ├── services/ business rules per module
│   ├── controllers/ request → service → response
│   └── routes/   public.routes.js  admin/*.routes.js
└── public/
    ├── index.html about.html contact.html booking.html gold-rate.html faq.html feedback.html 404.html
    ├── mr/ (same pages in Marathi)
    ├── admin/ login dashboard gold-rates advertisements feedback bookings faqs settings (.html)
    ├── css/ site.css admin.css      # Bootstrap variables overridden with the plum/gold tokens
    ├── js/  site.js admin.js api.js
    ├── vendor/bootstrap/            # copied by `npm run build`
    ├── fonts/ images/ logo/
```

---

## 4. Modules

### Public site (Bootstrap 5, plum + foil-gold theme, English + Marathi)

| Page | Content | Data |
| --- | --- | --- |
| Home | Hero, today's rates strip, 3 services, why us, steps, adverts (YouTube), approved feedback, FAQ preview, contact | `/api/public/home` |
| About | Company, values, contact | settings |
| Contact | Address, phones, WhatsApp, hours, map embed | settings |
| Booking | Name, phone, email (optional), date, service, message → saved → WhatsApp opens | `POST /api/public/bookings` |
| Gold Rates | Latest rates + last 30 days table | `/api/public/gold-rates` |
| FAQ | Active FAQs in display order, accordion, FAQPage schema | `/api/public/faqs` |
| Feedback | Approved customer YouTube videos (thumbnail, player loads on tap) | `GET /api/public/feedback` |
| Store | Active products, filter by type, "Ask price on WhatsApp" (no prices) | `GET /api/public/products` |

All pages: sticky header, floating Call + WhatsApp buttons, footer, language switch, one H1, meta tags, JSON-LD.

### Admin (`/admin`)

Sidebar layout, stat cards, tables with search / filter / pagination, confirm dialogs, toasts, loading and empty states.

| Section | Actions |
| --- | --- |
| Dashboard | Feedback total (pending/approved), current rates, active adverts, new bookings, last 10 activities |
| Gold rates | Add today's rate (pre-filled with last values), effective date, history, edit/delete a row |
| Advertisements | Add/edit/delete YouTube link + title + description (EN/MR), active on/off, order |
| Feedback | Add customer YouTube video (consent tick), approve/reject, edit, delete |
| Products | Add/edit/delete, photo upload, type, weight, EN/MR name + description, active on/off |
| Bookings | List, filter by status (pending/confirmed/completed/cancelled), change status, delete, CSV export |
| FAQs | Add/edit/delete, EN/MR text, active on/off, move up/down |
| Settings | Business name, logo upload, phones, WhatsApp, email, address, map link, social links, hours, Saturday offer on/off |
| Account | Change password, logout |

### API (JSON `{ ok, data }` / `{ ok:false, error, fields }`)

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/password`
- `GET|POST /api/admin/gold-rates`, `PUT|DELETE /api/admin/gold-rates/:id`
- `GET|POST /api/admin/advertisements`, `PUT|PATCH|DELETE /api/admin/advertisements/:id`
- `GET /api/admin/feedback`, `PATCH /api/admin/feedback/:id/status`, `PUT|DELETE /api/admin/feedback/:id`
- `GET /api/admin/bookings`, `PATCH /api/admin/bookings/:id/status`, `DELETE /api/admin/bookings/:id`, `GET /api/admin/bookings.csv`
- `GET|POST /api/admin/faqs`, `PUT|DELETE /api/admin/faqs/:id`, `PATCH /api/admin/faqs/order`
- `GET|PUT /api/admin/settings`, `POST /api/admin/settings/logo`
- `GET /api/admin/dashboard`
- Public: `GET /api/public/settings|gold-rates|advertisements|feedback|faqs|home`, `POST /api/public/bookings|feedback`

### Security

- bcrypt password hash (cost 12); session cookie `HttpOnly`, `SameSite=Strict`, `Secure` in production; sessions stored in MySQL
- CSRF token on every admin change and on public forms; honeypot field on public forms
- Login: 5 wrong tries → 15 min lock per IP hash + username; public forms: 5 per hour per IP hash
- Helmet headers with a strict Content-Security-Policy (YouTube-nocookie and Google Maps frames only)
- CORS: same origin only (configurable list in `.env`)
- mysql2 prepared statements only; all input validated server-side; output escaped in the browser (`textContent`, no `innerHTML` with user data)
- IPs stored only as salted SHA-256 hashes; `trust proxy` set for GoDaddy's proxy

### Database tables

`admin_users`, `gold_rates`, `advertisements`, `customer_feedback`, `products`, `bookings`, `faqs`, `website_settings`, `activity_logs` (FK → admin_users), `login_attempts`, `sessions`.
All with `created_at` / `updated_at`, status fields, indexes on status/date. `seed.sql`: settings, 12 FAQs (EN/MR), today's sample rate, no admin password (admin is created with `npm run create-admin` or the first-run setup screen, so no default password ever ships).

---

## 5. Decisions (confirmed 1 Nov 2026)

1. **Bilingual:** English + Marathi, like today (`/` English, `/mr/` Marathi; admin text fields in both).
2. **Booking:** saved to the database, then WhatsApp opens with the details prefilled.
3. **Feedback = YouTube videos only.** No public feedback form. Admin adds customer videos (YouTube link, customer name, title EN/MR, consent tick); status pending / approved / rejected; only approved + consented videos show.
4. **Rates:** 24K and 22K required, 18K and silver optional.
5. **Admin setup:** first visit to `/admin` with no admin user shows a one-time "create admin" screen; `npm run create-admin` also works.
6. **Store page included:** 24K coins / bars / Vedhani, **no prices**, "Ask price on WhatsApp" with product details prefilled. Admin: add/edit/delete products with photo (JPG/PNG/WebP, max 2 MB, no server-side resize so no native packages), active on/off. Table `products`.
7. **Hours, social links, email:** blank in settings until the client provides them.

## 6. Packages to install (approval needed)

| Package | Why |
| --- | --- |
| `express` 4.21.x | Web server |
| `mysql2` 3.x | MySQL with prepared statements |
| `express-session` + `express-mysql-session` | Login sessions stored in MySQL (memory store is not safe for production) |
| `bcryptjs` | Password hashing, pure JS (no native build on GoDaddy) |
| `helmet` | Security headers |
| `express-rate-limit` | Login and form limits |
| `cors` | Configurable allowed origins |
| `dotenv` | Reads `.env` |
| `multer` | Logo upload |
| `bootstrap` 5.3.x | UI (copied into `public/vendor` by `npm run build`) |
| dev: `archiver` | Builds the deployment ZIP |

No other frameworks. Validation, CSRF and CSV are small hand-written helpers.

Note: this PC has Node 20.19; the code targets Node 22 and also runs on 20, so local tests work.

---

## 7. Next phases

2 Structure + package.json · 3 Public pages · 4 Admin pages · 5 APIs · 6 Schema/seed + integration · 7 Wire everything · 8 CRUD tests · 9 Auth/security tests · 10 Responsive + ZIP build test.
Testing uses a throwaway MySQL in the scratchpad (port 3399), never the PC's own MySQL. Nothing is deployed without permission.
