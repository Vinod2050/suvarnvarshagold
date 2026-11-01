// Admin panel core: API calls (with CSRF token), DOM helper, toasts, confirm dialog, forms and a
// reusable list page (search, filters, pagination, add / edit modal). Text from the database is always
// inserted with textContent, never as HTML.
(function () {
  'use strict';

  var SV = (window.SV = {});
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  SV.csrf = csrfMeta ? csrfMeta.getAttribute('content') : '';

  // ---------- DOM ----------
  // h('a', { href: '#', class: 'x', onclick: fn }, 'text', childNode, [more])
  SV.h = function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'class') el.className = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    for (var i = 2; i < arguments.length; i += 1) append(el, arguments[i]);
    return el;
  };
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  SV.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  SV.$ = function (sel, el) { return (el || document).querySelector(sel); };

  // Fixed icon shapes (constant strings, not user data).
  var ICONS = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c7 0 10 8 10 8a13 13 0 0 1-1.7 2.7"/><path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="m2 2 20 20"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    rate: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    video: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  };
  SV.icon = function (name, size) {
    var s = size || 18;
    var span = document.createElement('span');
    span.innerHTML = '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
    return span.firstChild;
  };

  // ---------- formatting ----------
  SV.inr = function (n) {
    if (n === null || n === undefined || n === '') return '–';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  SV.date = function (ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
    return m ? Number(m[3]) + ' ' + MON[Number(m[2]) - 1] + ' ' + m[1] : '';
  };
  // MySQL UTC datetime -> Indian time text
  SV.dateTime = function (v) {
    var d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  SV.todayIndia = function () { return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10); };
  SV.badge = function (status, label) { return SV.h('span', { class: 'adm-badge ' + status }, label || status.charAt(0).toUpperCase() + status.slice(1)); };

  // ---------- API ----------
  SV.api = function (method, url, body) {
    var opts = { method: method, headers: { Accept: 'application/json', 'X-CSRF-Token': SV.csrf }, credentials: 'same-origin' };
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts)
      .catch(function () { throw { error: 'No connection. Check the internet and try again.' }; })
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          throw { error: 'Please sign in again.' };
        }
        return res.json().catch(function () { return { ok: false, error: 'Unexpected reply from the server (' + res.status + ').' }; }).then(function (json) {
          if (!json.ok) throw json;
          return json.data;
        });
      });
  };

  // ---------- toasts ----------
  SV.toast = function (message, ok) {
    var box = SV.$('#toasts');
    if (!box) return;
    var t = SV.h('div', { class: 'toast adm-toast align-items-center ' + (ok === false ? 'err' : 'ok'), role: ok === false ? 'alert' : 'status' },
      SV.h('div', { class: 'd-flex' }, SV.h('div', { class: 'toast-body' }, message), SV.h('button', { type: 'button', class: 'btn-close me-2 m-auto', 'data-bs-dismiss': 'toast', 'aria-label': 'Close' })));
    box.appendChild(t);
    var toast = new bootstrap.Toast(t, { delay: ok === false ? 7000 : 3500 });
    t.addEventListener('hidden.bs.toast', function () { t.remove(); });
    toast.show();
  };
  SV.fail = function (err) { SV.toast((err && err.error) || 'Something went wrong. Please try again.', false); };

  // ---------- confirm dialog ----------
  SV.confirm = function (text, okLabel) {
    return new Promise(function (resolve) {
      var el = SV.$('#confirm-modal');
      var modal = bootstrap.Modal.getOrCreateInstance(el);
      SV.$('#confirm-text').textContent = text;
      var ok = SV.$('#confirm-ok');
      ok.textContent = okLabel || 'Yes, continue';
      var answered = false;
      function yes() { answered = true; modal.hide(); }
      ok.addEventListener('click', yes, { once: true });
      el.addEventListener('hidden.bs.modal', function () { ok.removeEventListener('click', yes); resolve(answered); }, { once: true });
      modal.show();
    });
  };

  // ---------- forms ----------
  // Field definition: { name, label, type: text|textarea|number|date|select|checkbox|file|url|email|tel, required, options:[[value,label]], help, col, min, max, step, placeholder, accept }
  SV.field = function (f, value) {
    var id = 'f-' + f.name;
    var col = SV.h('div', { class: f.col || 'col-12' });
    var input;
    var helpId = f.help ? id + '-help' : null;
    if (f.type === 'checkbox') {
      input = SV.h('input', { class: 'form-check-input', type: 'checkbox', id: id, name: f.name, 'aria-describedby': helpId });
      input.checked = Boolean(value);
      col.appendChild(SV.h('div', { class: 'form-check form-switch' }, input, SV.h('label', { class: 'form-check-label fw-semibold', for: id }, f.label),
        f.help ? SV.h('div', { class: 'form-text', id: helpId }, f.help) : null, SV.h('div', { class: 'invalid-feedback' })));
      return col;
    }
    col.appendChild(SV.h('label', { class: 'form-label fw-semibold', for: id }, f.label, f.required ? SV.h('span', { class: 'text-danger', 'aria-hidden': 'true' }, ' *') : null));
    if (f.type === 'textarea') {
      input = SV.h('textarea', { class: 'form-control', id: id, name: f.name, rows: f.rows || 3, maxlength: f.max, required: f.required, 'aria-describedby': helpId });
      input.value = value === null || value === undefined ? '' : value;
    } else if (f.type === 'select') {
      input = SV.h('select', { class: 'form-select', id: id, name: f.name, required: f.required, 'aria-describedby': helpId },
        f.options.map(function (o) { return SV.h('option', { value: o[0] }, o[1]); }));
      input.value = value === null || value === undefined ? f.options[0][0] : String(value);
    } else {
      input = SV.h('input', {
        class: 'form-control', id: id, name: f.name, type: f.type || 'text', required: f.required, min: f.min, max: f.max && f.type !== 'text' ? f.max : null,
        maxlength: f.type === 'text' || !f.type ? f.max : null, step: f.step, placeholder: f.placeholder, accept: f.accept, inputmode: f.inputmode,
        autocomplete: f.autocomplete || 'off', 'aria-describedby': helpId,
      });
      if (f.type !== 'file') input.value = value === null || value === undefined ? '' : value;
    }
    if (f.prefix || f.suffix) {
      col.appendChild(SV.h('div', { class: 'input-group' + (f.big ? ' adm-rate-input' : '') }, f.prefix ? SV.h('span', { class: 'input-group-text' }, f.prefix) : null, input, f.suffix ? SV.h('span', { class: 'input-group-text' }, f.suffix) : null));
    } else col.appendChild(input);
    if (f.help) col.appendChild(SV.h('div', { class: 'form-text', id: helpId }, f.help));
    if (f.preview) col.appendChild(f.preview);
    col.appendChild(SV.h('div', { class: 'invalid-feedback d-block' }));
    return col;
  };

  // Reads values from a form; checkboxes give true/false, files are left to the caller.
  SV.values = function (form, fields) {
    var out = {};
    fields.forEach(function (f) {
      var el = form.elements[f.name];
      if (!el || f.type === 'file') return;
      out[f.name] = f.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  };

  SV.clearErrors = function (form, alertEl) {
    Array.prototype.forEach.call(form.querySelectorAll('.is-invalid'), function (el) { el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); });
    Array.prototype.forEach.call(form.querySelectorAll('.invalid-feedback'), function (el) { el.textContent = ''; });
    if (alertEl) { alertEl.classList.add('d-none'); alertEl.textContent = ''; }
  };

  // Shows { fields: { name: message } } next to the inputs; anything else goes to the alert box.
  SV.showErrors = function (form, err, alertEl) {
    var fields = (err && err.fields) || {};
    var first = null;
    var unplaced = [];
    Object.keys(fields).forEach(function (name) {
      var el = form.elements[name];
      if (!el || !el.closest) { unplaced.push(fields[name]); return; }
      el.classList.add('is-invalid');
      el.setAttribute('aria-invalid', 'true');
      var box = el.closest('[class*="col"], .mb-3, .mb-4, .mb-0, .form-check');
      var fb = box && box.querySelector('.invalid-feedback');
      if (fb) fb.textContent = fields[name];
      first = first || el;
    });
    if (alertEl && (!first || unplaced.length)) {
      alertEl.textContent = unplaced.length ? unplaced.join(' ') : (err && err.error) || 'Something went wrong. Please try again.';
      alertEl.classList.remove('d-none');
    }
    if (first) first.focus();
  };

  SV.busy = function (btn, on, text) {
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.textContent;
      btn.disabled = true;
      SV.clear(btn).appendChild(SV.h('span', { class: 'spinner-border spinner-border-sm', 'aria-hidden': 'true' }));
      btn.appendChild(document.createTextNode(' ' + (text || 'Saving…')));
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  };

  // ---------- edit modal ----------
  // SV.editModal({ title, fields, values, submit(values, form) -> Promise })
  SV.editModal = function (opts) {
    var el = SV.$('#edit-modal');
    var form = SV.$('#edit-form');
    var area = SV.clear(SV.$('#edit-fields'));
    var alertEl = SV.$('#edit-alert');
    var save = SV.$('#edit-save');
    SV.$('#edit-title').textContent = opts.title;
    save.textContent = opts.saveLabel || 'Save';
    SV.clearErrors(form, alertEl);
    opts.fields.forEach(function (f) { area.appendChild(SV.field(f, opts.values ? opts.values[f.name] : f.default)); });
    SV.addReveal(area);
    var modal = bootstrap.Modal.getOrCreateInstance(el);
    form.onsubmit = function (e) {
      e.preventDefault();
      SV.clearErrors(form, alertEl);
      var missing = opts.fields.filter(function (f) {
        var x = form.elements[f.name];
        return f.required && x && f.type !== 'checkbox' && !(f.type === 'file' ? x.files.length : String(x.value).trim());
      });
      if (missing.length) {
        var fe = {};
        missing.forEach(function (f) { fe[f.name] = 'This field is required'; });
        SV.showErrors(form, { fields: fe }, alertEl);
        return;
      }
      SV.busy(save, true);
      Promise.resolve(opts.submit(SV.values(form, opts.fields), form))
        .then(function () { modal.hide(); })
        .catch(function (err) { SV.showErrors(form, err, alertEl); })
        .then(function () { SV.busy(save, false); });
    };
    el.addEventListener('shown.bs.modal', function () { var first = area.querySelector('input:not([type=checkbox]), textarea, select'); if (first) first.focus(); }, { once: true });
    modal.show();
  };

  // ---------- list page ----------
  // SV.listPage({ endpoint, pageSize, filters:[{name,label,options}], columns:[{label, cls, render(row)}], actions(row, reload) -> [nodes], onAdd, empty })
  SV.listPage = function (cfg) {
    var state = { page: 1, q: '', filters: {} };
    var area = SV.$('#table-area');
    var pager = SV.$('#pager');
    var search = SV.$('#search');
    var filtersBox = SV.$('#filters');

    (cfg.filters || []).forEach(function (f) {
      var sel = SV.h('select', { class: 'form-select', 'aria-label': f.label, onchange: function () { state.filters[f.name] = sel.value; state.page = 1; load(); } },
        f.options.map(function (o) { return SV.h('option', { value: o[0] }, o[1]); }));
      filtersBox.appendChild(sel);
    });
    if (search) {
      if (cfg.search === false) search.closest('.adm-search').classList.add('d-none');
      var timer;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { state.q = search.value.trim(); state.page = 1; load(); }, 300);
      });
    }
    var add = SV.$('#add-btn');
    if (add && cfg.onAdd) add.addEventListener('click', function () { cfg.onAdd(load); });

    function query() {
      var p = new URLSearchParams({ page: state.page, pageSize: cfg.pageSize || 20 });
      if (state.q) p.set('q', state.q);
      Object.keys(state.filters).forEach(function (k) { if (state.filters[k]) p.set(k, state.filters[k]); });
      return p;
    }

    function load() {
      SV.clear(area).appendChild(SV.h('div', { class: 'adm-loading', role: 'status' }, SV.h('span', { class: 'spinner-border spinner-border-sm me-2', 'aria-hidden': 'true' }), 'Loading…'));
      return SV.api('GET', cfg.endpoint + '?' + query().toString())
        .then(function (data) { render(data); })
        .catch(function (err) {
          SV.clear(area).appendChild(SV.h('div', { class: 'adm-error', role: 'alert' }, (err && err.error) || 'Could not load the list.', ' ',
            SV.h('button', { type: 'button', class: 'btn btn-sm btn-outline-dark ms-2', onclick: load }, 'Try again')));
          SV.clear(pager);
        });
    }

    function render(data) {
      SV.clear(area);
      SV.clear(pager);
      if (!data.items.length) {
        var filtered = state.q || Object.keys(state.filters).some(function (k) { return state.filters[k]; });
        area.appendChild(SV.h('div', { class: 'adm-empty' }, SV.icon(cfg.emptyIcon || 'inbox', 40), SV.h('p', { class: 'fw-semibold mb-1' }, filtered ? 'Nothing matches your search.' : cfg.empty || 'Nothing here yet.'),
          !filtered && cfg.onAdd ? SV.h('button', { type: 'button', class: 'btn adm-btn-primary mt-2', onclick: function () { cfg.onAdd(load); } }, cfg.addLabel || 'Add the first one') : null));
        return;
      }
      var head = SV.h('tr', null, cfg.columns.map(function (c) { return SV.h('th', { scope: 'col', class: c.cls }, c.label); }), cfg.actions ? SV.h('th', { scope: 'col', class: 'text-end' }, 'Actions') : null);
      var rows = data.items.map(function (row, i) {
        return SV.h('tr', null,
          cfg.columns.map(function (c) { return SV.h('td', { class: [c.cls, c.half ? 'half' : ''].join(' ').trim() || null, 'data-label': c.label }, c.render(row, i, data)); }),
          cfg.actions ? SV.h('td', { class: 'text-end' }, SV.h('div', { class: 'adm-actions' }, cfg.actions(row, load, i, data))) : null);
      });
      area.appendChild(SV.h('div', { class: 'table-responsive' }, SV.h('table', { class: 'table adm-table table-hover' }, SV.h('thead', null, head), SV.h('tbody', null, rows))));
      var from = (data.page - 1) * data.pageSize + 1;
      var to = Math.min(data.total, data.page * data.pageSize);
      pager.appendChild(SV.h('span', null, 'Showing ' + from + '–' + to + ' of ' + data.total));
      if (data.pages > 1) {
        pager.appendChild(SV.h('div', { class: 'btn-group', role: 'group', 'aria-label': 'Pages' },
          SV.h('button', { type: 'button', class: 'btn btn-outline-dark btn-sm', disabled: data.page <= 1, onclick: function () { state.page -= 1; load(); } }, '‹ Previous'),
          SV.h('span', { class: 'btn btn-sm disabled border' }, 'Page ' + data.page + ' of ' + data.pages),
          SV.h('button', { type: 'button', class: 'btn btn-outline-dark btn-sm', disabled: data.page >= data.pages, onclick: function () { state.page += 1; load(); } }, 'Next ›')));
      }
    }

    load();
    return { reload: load, state: state, query: query };
  };

  SV.iconBtn = function (icon, label, onclick, danger) {
    return SV.h('button', { type: 'button', class: 'adm-icon-btn' + (danger ? ' danger' : ''), title: label, 'aria-label': label, onclick: onclick }, SV.icon(icon));
  };

  // Delete with confirmation, then reload.
  SV.removeRow = function (url, what, reload) {
    return SV.confirm('Delete ' + what + '? This cannot be undone.', 'Delete').then(function (yes) {
      if (!yes) return;
      return SV.api('DELETE', url).then(function () { SV.toast('Deleted'); reload(); }).catch(SV.fail);
    });
  };

  // ---------- show / hide password (eye button on every password box) ----------
  var EYE = '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path class="eye-open" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle class="eye-open" cx="12" cy="12" r="3"/><path class="eye-off" d="M9.9 4.2A10 10 0 0 1 12 4c7 0 10 8 10 8a13 13 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/></svg>';
  SV.addReveal = function (root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('input[type="password"]:not([data-reveal-ready])'), function (input) {
      input.setAttribute('data-reveal-ready', '');
      var wrap = SV.h('div', { class: 'adm-pw' });
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      var btn = SV.h('button', { type: 'button', class: 'adm-pw-toggle', 'aria-label': 'Show password', 'aria-pressed': 'false', title: 'Show password' });
      btn.innerHTML = EYE; // constant markup
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.title = show ? 'Hide password' : 'Show password';
        input.focus();
      });
      wrap.appendChild(btn);
    });
  };
  // Hide passwords again when a window closes (so they are not left visible).
  document.addEventListener('hidden.bs.modal', function (e) {
    Array.prototype.forEach.call(e.target.querySelectorAll('.adm-pw-toggle[aria-pressed="true"]'), function (b) { b.click(); });
  });

  // ---------- header: sign out, change password ----------
  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-page') !== 'login') SV.addReveal(document);
    var logout = SV.$('#logout-btn');
    if (logout) logout.addEventListener('click', function () {
      SV.api('POST', '/api/auth/logout').catch(function () {}).then(function () { window.location.href = '/admin/login'; });
    });
    var pw = SV.$('#password-form');
    if (pw) {
      var pwAlert = SV.$('#password-alert');
      pw.addEventListener('submit', function (e) {
        e.preventDefault();
        SV.clearErrors(pw, pwAlert);
        var cur = pw.elements.current_password.value;
        var nw = pw.elements.new_password.value;
        if (nw !== pw.elements.again.value) return SV.showErrors(pw, { fields: { again: 'The two new passwords are not the same' } }, pwAlert);
        if (nw.length < 12) return SV.showErrors(pw, { fields: { new_password: 'Use at least 12 characters' } }, pwAlert);
        var btn = pw.querySelector('[type=submit]');
        SV.busy(btn, true);
        SV.api('PUT', '/api/auth/password', { current_password: cur, new_password: nw })
          .then(function () {
            bootstrap.Modal.getOrCreateInstance(SV.$('#password-modal')).hide();
            pw.reset();
            SV.toast('Password changed');
          })
          .catch(function (err) { SV.showErrors(pw, err, pwAlert); })
          .then(function () { SV.busy(btn, false); });
      });
    }
  });
})();
