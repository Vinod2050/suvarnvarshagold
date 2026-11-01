// Admin panel pages. The server renders the shell (sidebar, header, page frame); public/js/admin/*.js loads
// the data from /api/admin and fills tables and forms. No inline scripts or styles (strict CSP).
const { esc } = require('./util');
const { icon } = require('./icons');
// Bump to make browsers fetch new admin CSS/JS after a change.
const ASSET_VERSION = '13';

const NAV = [
  ['dashboard', 'Dashboard', 'layout'],
  ['gold-rates', 'Gold rates', 'trending'],
  ['advertisements', 'Advertisements', 'video'],
  ['feedback', 'Customer feedback', 'message'],
  ['products', 'Store products', 'box'],
  ['faqs', 'FAQs', 'help'],
  // [slug, label, icon, super admin only]
  ['users', 'Users', 'user', true],
  ['settings', 'Settings', 'settings', true],
];
const PAGES = new Set(NAV.map((n) => n[0]));
const SUPER_PAGES = new Set(NAV.filter((n) => n[3]).map((n) => n[0]));

function head(title, csrf = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${csrf ? `<meta name="csrf-token" content="${esc(csrf)}">` : ''}
<title>${esc(title)} · Suvarnavarsha Admin</title>
<link rel="icon" href="/icon.png" type="image/png">
<link rel="stylesheet" href="/css/fonts.css?v=${ASSET_VERSION}">
<link rel="stylesheet" href="/vendor/bootstrap/bootstrap.min.css?v=5.3.8">
<link rel="stylesheet" href="/css/admin.css?v=${ASSET_VERSION}">
</head>`;
}

const scripts = (extra) =>
  [`/vendor/bootstrap/bootstrap.bundle.min.js?v=5.3.8`, `/js/admin/core.js?v=${ASSET_VERSION}`, ...extra]
    .map((src) => `<script src="${src}" defer></script>`)
    .join('\n');

// Shared modal for confirmations and the toast area (filled by core.js).
const overlays = `<div class="modal fade" id="confirm-modal" tabindex="-1" aria-labelledby="confirm-title" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-header"><h2 class="modal-title h5" id="confirm-title">Please confirm</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
    <div class="modal-body"><p id="confirm-text" class="mb-0"></p></div>
    <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" id="confirm-ok">Yes, continue</button></div>
  </div></div>
</div>
<div class="modal fade" id="edit-modal" tabindex="-1" aria-labelledby="edit-title" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><form class="modal-content" id="edit-form" novalidate>
    <div class="modal-header"><h2 class="modal-title h5" id="edit-title">Edit</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
    <div class="modal-body"><div class="alert alert-danger d-none" role="alert" id="edit-alert"></div><div class="row g-3" id="edit-fields"></div></div>
    <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn adm-btn-primary" id="edit-save">Save</button></div>
  </form></div>
</div>
<div class="modal fade" id="password-modal" tabindex="-1" aria-labelledby="password-title" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered"><form class="modal-content" id="password-form" novalidate>
    <div class="modal-header"><h2 class="modal-title h5" id="password-title">Change password</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
    <div class="modal-body">
      <div class="alert alert-danger d-none" role="alert" id="password-alert"></div>
      <div class="mb-3"><label class="form-label" for="pw-current">Current password</label><input class="form-control" type="password" id="pw-current" name="current_password" autocomplete="current-password" required><div class="invalid-feedback"></div></div>
      <div class="mb-3"><label class="form-label" for="pw-new">New password</label><input class="form-control" type="password" id="pw-new" name="new_password" autocomplete="new-password" required minlength="12"><div class="form-text">At least 12 characters. A short sentence is easy to remember.</div><div class="invalid-feedback"></div></div>
      <div class="mb-0"><label class="form-label" for="pw-again">Type the new password again</label><input class="form-control" type="password" id="pw-again" name="again" autocomplete="new-password" required><div class="invalid-feedback"></div></div>
    </div>
    <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn adm-btn-primary">Change password</button></div>
  </form></div>
</div>
<div class="toast-container position-fixed bottom-0 end-0 p-3" id="toasts" aria-live="polite" aria-atomic="false"></div>`;

// Page bodies. Resource pages share one frame: toolbar + table + pagination.
const tableFrame = (addLabel) => `<div class="adm-card">
  <div class="adm-toolbar" id="toolbar">
    <div class="adm-search"><label class="visually-hidden" for="search">Search</label>${icon('search', '', 18)}<input type="search" class="form-control" id="search" placeholder="Search…" autocomplete="off"></div>
    <div class="adm-filters" id="filters"></div>
    ${addLabel ? `<button type="button" class="btn adm-btn-primary ms-auto" id="add-btn">${icon('plus', '', 18)} ${esc(addLabel)}</button>` : '<div class="ms-auto" id="toolbar-extra"></div>'}
  </div>
  <div id="table-area" aria-live="polite"></div>
  <div class="adm-pager" id="pager"></div>
</div>`;

const BODIES = {
  dashboard: () => `<div class="row g-3 mb-4" id="stats" aria-live="polite">${'<div class="col-6 col-xl-3"><div class="adm-stat placeholder-glow"><span class="placeholder col-8"></span><span class="placeholder col-4"></span></div></div>'.repeat(4)}</div>
<div class="row g-4">
  <div class="col-lg-5"><div class="adm-card h-100"><div class="adm-card-head"><h2 class="h5 mb-0">Current gold rate</h2><a href="/admin/gold-rates" class="btn btn-sm adm-btn-primary">Update rate</a></div><div id="rate-box"></div></div></div>
  <div class="col-lg-7"><div class="adm-card h-100"><div class="adm-card-head"><h2 class="h5 mb-0">Recent activity</h2></div><div id="activity"></div></div></div>
</div>`,
  'gold-rates': () => `<div class="row g-4">
  <div class="col-xxl-5"><form class="adm-card" id="rate-form" novalidate>
    <div class="adm-card-head"><h2 class="h5 mb-0">Add today's rate</h2></div>
    <p class="text-muted small">Filled in with the last saved rate. Change what is different and press Save. The website shows it at once.</p>
    <div class="alert alert-danger d-none" role="alert" id="rate-alert"></div>
    <div class="row g-3" id="rate-fields"></div>
    <button type="submit" class="btn adm-btn-primary btn-lg w-100 mt-4">Save rate</button>
  </form></div>
  <div class="col-xxl-7"><div class="adm-card"><div class="adm-card-head"><h2 class="h5 mb-0">Rate history</h2></div><div id="table-area" aria-live="polite"></div><div class="adm-pager" id="pager"></div></div></div>
</div>`,
  advertisements: () => tableFrame('Add video'),
  feedback: () => `<p class="text-muted">Only videos that are <strong>approved</strong> and where the customer gave <strong>consent</strong> are shown on the website.</p>${tableFrame('Add customer video')}`,
  products: () => `<p class="text-muted">No prices are shown on the website. Each product has an “Ask price on WhatsApp” button.</p>${tableFrame('Add product')}`,
  faqs: () => tableFrame('Add question'),
  users: () => `<p class="text-muted">Super admins can do everything. Admins can only update rates, videos, customer feedback, store products and FAQs. Wrong passwords in a row: after <strong>3</strong> the user waits 1 minute, after <strong>5</strong> 5 minutes, and after <strong>8</strong> the account is locked until a super admin unlocks it here.</p>${tableFrame('Add user')}`,
  settings: () => `<p class="text-muted">Shown on the website straight away: phones, WhatsApp number, address, map links, opening hours, logo, the 18K / silver rate switches and the Saturday offer. Business names, email and social media links are saved here for records; the current website design has no place for them yet.</p>
<form id="settings-form" novalidate>
  <div class="alert alert-danger d-none" role="alert" id="settings-alert"></div>
  <div id="settings-groups" class="row g-4"></div>
  <div class="adm-savebar"><button type="submit" class="btn adm-btn-primary btn-lg">Save settings</button></div>
</form>
<div class="row g-4 mt-1">
  <div class="col-lg-6"><form class="adm-card h-100" id="logo-form" novalidate>
    <div class="adm-card-head"><h2 class="h5 mb-0">Logo</h2></div>
    <div class="adm-logo-preview"><img id="logo-preview" src="" alt="Current logo" width="192" height="96"></div>
    <label class="form-label" for="logo-file">New logo (PNG, WebP or JPG, up to 2 MB; transparent PNG works best on the dark header)</label>
    <input class="form-control" type="file" id="logo-file" name="image" accept="image/png,image/webp,image/jpeg" required>
    <div class="invalid-feedback"></div>
    <button type="submit" class="btn adm-btn-primary mt-3">Upload logo</button>
  </form></div>
  <div class="col-lg-6"><div class="adm-card h-100">
    <div class="adm-card-head"><h2 class="h5 mb-0">Your account</h2></div>
    <p id="account-info" class="text-muted"></p>
    <button type="button" class="btn btn-outline-dark" data-bs-toggle="modal" data-bs-target="#password-modal">${icon('key', '', 18)} Change password</button>
  </div></div>
</div>`,
};

function adminPage(page, { user, csrf }) {
  const item = NAV.find((n) => n[0] === page);
  const title = item[1];
  const isSuper = user.role === 'superadmin';
  const nav = NAV.filter((n) => isSuper || !n[3]).map(
    ([slug, label, ic]) =>
      `<li><a class="adm-nav-link${slug === page ? ' active' : ''}" href="/admin/${slug}"${slug === page ? ' aria-current="page"' : ''}>${icon(ic, '', 20)}<span>${esc(label)}</span></a></li>`,
  ).join('');
  const name = user.display_name || user.username;
  return `${head(title, csrf)}
<body class="adm" data-page="${esc(page)}" data-role="${esc(user.role)}" data-user-id="${esc(user.id)}">
<a class="visually-hidden-focusable adm-skip" href="#main">Skip to content</a>
<div class="adm-shell">
  <aside class="adm-sidebar offcanvas-lg offcanvas-start" tabindex="-1" id="adm-nav" aria-labelledby="adm-brand">
    <div class="adm-brand" id="adm-brand">
      <img src="/logo/suvarnavarsha-logo-v2-transparent-256.webp" alt="Suvarnavarsha Gold" width="112" height="56">
      <span>Admin</span>
      <button type="button" class="btn-close btn-close-white d-lg-none ms-auto" data-bs-dismiss="offcanvas" data-bs-target="#adm-nav" aria-label="Close menu"></button>
    </div>
    <nav aria-label="Admin"><ul class="adm-nav">${nav}</ul></nav>
    <a class="adm-nav-link adm-view-site" href="/" target="_blank" rel="noopener">${icon('external', '', 20)}<span>View website</span></a>
  </aside>
  <div class="adm-main">
    <header class="adm-topbar">
      <button class="btn adm-menu-btn d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#adm-nav" aria-controls="adm-nav" aria-label="Open menu">${icon('menu')}</button>
      <h1 class="adm-title">${esc(title)}</h1>
      <div class="dropdown ms-auto">
        <button class="btn adm-user dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">${icon('user', '', 18)}<span class="d-none d-sm-inline">${esc(name)}</span><span class="adm-role ${isSuper ? 'super' : ''}">${isSuper ? 'Super admin' : 'Admin'}</span></button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><button class="dropdown-item" type="button" data-bs-toggle="modal" data-bs-target="#password-modal">${icon('key', '', 16)} Change password</button></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item" type="button" id="logout-btn">${icon('logout', '', 16)} Sign out</button></li>
        </ul>
      </div>
    </header>
    <main id="main" class="adm-content" tabindex="-1">${BODIES[page]()}</main>
  </div>
</div>
${overlays}
${scripts([`/js/admin/pages.js?v=${ASSET_VERSION}`])}
</body>
</html>`;
}

// Sign-in page: the same design as the current website's admin sign-in (dark plum, gold lattice,
// card with a gold border, logo header, gold button), with the new app's sign-in and first-run setup.
// Each field: icon, input, optional Show/Hide link, help text and an error line.
function loginField({ id, name, label, type = 'text', autocomplete, ic, help, attrs = '', reveal = false }) {
  return `<div class="adm-group mb-0">
  <label for="${id}">${label}</label>
  <div class="adm-field${reveal ? ' adm-pass' : ''}">
    ${icon(ic, 'adm-ico', 18)}
    <input type="${type}" id="${id}" name="${name}" autocomplete="${autocomplete}" required ${attrs}${help ? ` aria-describedby="${id}-help"` : ''}>
    ${reveal ? `<button type="button" class="adm-link" data-reveal="${id}" aria-label="Show password" aria-pressed="false">Show</button>` : ''}
  </div>
  ${reveal ? `<p class="adm-caps" id="${id}-caps" hidden>${icon('alert', 'adm-ico', 15)}Caps Lock is on</p>` : ''}
  ${help ? `<p class="adm-help" id="${id}-help">${help}</p>` : ''}
  <div class="invalid-feedback adm-field-error"></div>
</div>`;
}

function loginPage() {
  return `${head('Sign in').replace('</head>', `<link rel="stylesheet" href="/css/login.css?v=${ASSET_VERSION}">
</head>`)}
<body class="adm-login-page" data-page="login">
<main id="main" class="adm-login">
  <div class="adm-login-bg" aria-hidden="true"></div>
  <div class="adm-login-wrap">
    <div class="adm-login-card">
      <div class="adm-login-head">
        <img class="adm-login-logo" src="/logo/suvarnavarsha-logo-v2-transparent.png" alt="Suvarnavarsha Gold" width="215" height="112">
      </div>
      <div class="adm-login-body">
        <div id="login-loading" class="adm-loading" role="status"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading…</div>

        <form id="login-form" class="d-none" novalidate>
          <p class="adm-eyebrow">Staff area</p>
          <h1>Sign in</h1>
          <p class="adm-login-sub">Update today's rates, videos and store products.</p>
          ${loginField({ id: 'l-username', name: 'username', label: 'Username', autocomplete: 'username', ic: 'user', attrs: 'autocapitalize="none" spellcheck="false"' })}
          ${loginField({ id: 'l-password', name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password', ic: 'lock', reveal: true })}
          <p class="adm-error d-none" role="alert" id="login-alert"></p>
          <button type="submit" class="adm-btn adm-btn-gold adm-block"><span class="lg-btn-label">Sign in</span></button>
        </form>

        <form id="setup-form" class="d-none" novalidate>
          <p class="adm-eyebrow">First-time setup</p>
          <h1>Create the admin</h1>
          <p class="adm-login-sub">This screen appears only once, while no admin exists. You need the setup code from the app settings (SETUP_TOKEN).</p>
          ${loginField({ id: 's-token', name: 'setup_token', label: 'Setup code', autocomplete: 'off', ic: 'key', attrs: 'spellcheck="false"' })}
          ${loginField({ id: 's-username', name: 'username', label: 'Username', autocomplete: 'username', ic: 'user', help: '3–50 letters, numbers, dots, dashes or underscores.', attrs: 'autocapitalize="none" spellcheck="false"' })}
          ${loginField({ id: 's-password', name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password', ic: 'lock', reveal: true, help: 'At least 12 characters.', attrs: 'minlength="12"' })}
          ${loginField({ id: 's-again', name: 'again', label: 'Type the password again', type: 'password', autocomplete: 'new-password', ic: 'lock', reveal: true })}
          <p class="adm-error d-none" role="alert" id="setup-alert"></p>
          <button type="submit" class="adm-btn adm-btn-gold adm-block"><span class="lg-btn-label">Create admin and sign in</span></button>
        </form>

        <div id="setup-off" class="d-none">
          <p class="adm-eyebrow">Setup needed</p>
          <h1>No admin yet</h1>
          <p class="adm-login-sub">Create one on the server with <code>npm run create-admin</code>, or set <code>SETUP_TOKEN</code> in the app settings and reload this page.</p>
        </div>
      </div>
      <p class="adm-login-foot">${icon('shield', 'adm-ico', 15)}Secure staff access · you are signed out after 8 hours</p>
    </div>
    <a class="adm-back" href="/">${icon('arrowLeft', 'adm-ico', 16)}Back to the website</a>
  </div>
</main>
${scripts([`/js/admin/login.js?v=${ASSET_VERSION}`])}
</body>
</html>`;
}

module.exports = { adminPage, loginPage, ADMIN_PAGES: PAGES, SUPER_PAGES };
