// Admin sign-in page. Shows the one-time "create admin" form while no admin exists (and SETUP_TOKEN is set).
// Also: show / hide password, Caps Lock warning, button loading state.
(function () {
  'use strict';
  var SV = window.SV;

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': SV.csrf },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    })
      .catch(function () { throw { error: 'No connection. Check the internet and try again.' }; })
      .then(function (res) { return res.json().catch(function () { return { ok: false, error: 'Unexpected reply (' + res.status + ')' }; }); })
      .then(function (json) { if (!json.ok) throw json; return json.data; });
  }

  // Loading state that keeps the button's icon.
  function busy(btn, on, text) {
    var label = btn.querySelector('.lg-btn-label');
    if (!btn.dataset.label) btn.dataset.label = label.textContent;
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    label.textContent = on ? text : btn.dataset.label;
    var spin = btn.querySelector('.spinner-border');
    if (on && !spin) btn.insertBefore(SV.h('span', { class: 'spinner-border spinner-border-sm', 'aria-hidden': 'true' }), label);
    if (!on && spin) spin.remove();
  }

  function wire(form, alertEl, url, read, busyText) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      SV.clearErrors(form, alertEl);
      var body = read();
      if (!body) return;
      var btn = form.querySelector('[type=submit]');
      busy(btn, true, busyText);
      post(url, body)
        .then(function () { window.location.href = '/admin/dashboard'; })
        .catch(function (err) { busy(btn, false); SV.showErrors(form, err, alertEl); });
    });
  }

  // Show / hide password buttons.
  function setupReveal() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), function (btn) {
      var input = document.getElementById(btn.getAttribute('data-reveal'));
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.textContent = show ? 'Hide' : 'Show';
        input.focus();
      });
      // Caps Lock warning while typing a password.
      var caps = document.getElementById(input.id + '-caps');
      if (!caps) return;
      function check(e) { if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock'); }
      input.addEventListener('keydown', check);
      input.addEventListener('keyup', check);
      input.addEventListener('blur', function () { caps.hidden = true; });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var loading = SV.$('#login-loading');
    var login = SV.$('#login-form');
    var setup = SV.$('#setup-form');
    setupReveal();
    fetch('/api/auth/status', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        var s = json.data;
        SV.csrf = s.csrfToken;
        if (s.loggedIn) { window.location.href = '/admin/dashboard'; return; }
        loading.classList.add('d-none');
        if (s.setupNeeded && s.setupEnabled) {
          setup.classList.remove('d-none');
          setup.elements.setup_token.focus();
        } else if (s.setupNeeded) {
          SV.$('#setup-off').classList.remove('d-none');
        } else {
          login.classList.remove('d-none');
          // Only focus with a mouse: on phones and tablets it would pop the keyboard and scroll the page.
          if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) login.elements.username.focus();
        }
      })
      .catch(function () { loading.textContent = 'Could not reach the server. Please reload the page.'; });

    wire(login, SV.$('#login-alert'), '/api/auth/login', function () {
      var u = login.elements.username.value.trim();
      var p = login.elements.password.value;
      var f = {};
      if (!u) f.username = 'Enter your username';
      if (!p) f.password = 'Enter your password';
      if (Object.keys(f).length) { SV.showErrors(login, { fields: f }); return null; }
      return { username: u, password: p };
    }, 'Signing in…');

    wire(setup, SV.$('#setup-alert'), '/api/auth/setup', function () {
      var el = setup.elements;
      var f = {};
      if (!el.setup_token.value.trim()) f.setup_token = 'Enter the setup code';
      if (!/^[a-zA-Z0-9._-]{3,50}$/.test(el.username.value.trim())) f.username = 'Use 3–50 letters, numbers, dots, dashes or underscores';
      if (el.password.value.length < 12) f.password = 'Use at least 12 characters';
      else if (el.password.value !== el.again.value) f.again = 'The two passwords are not the same';
      if (Object.keys(f).length) { SV.showErrors(setup, { fields: f }); return null; }
      return { setup_token: el.setup_token.value.trim(), username: el.username.value.trim(), password: el.password.value };
    }, 'Creating…');
  });
})();
