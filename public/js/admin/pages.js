// Admin sections. Each one is set up from <body data-page="...">, using the helpers in core.js.
(function () {
  'use strict';
  var SV = window.SV;
  var h = SV.h;
  var page = document.body.getAttribute('data-page');

  var ACTIVE = [['active', 'Active (shown)'], ['inactive', 'Inactive (hidden)']];

  function thumb(row) {
    return h('a', { href: row.watch_url, target: '_blank', rel: 'noopener', title: 'Open on YouTube' }, h('img', { class: 'adm-thumb', src: row.thumbnail_url, alt: '', width: 96, height: 54, loading: 'lazy' }));
  }
  function bilingual(en, mr) { return [h('div', { class: 'fw-semibold' }, en || '–'), mr ? h('div', { class: 'adm-muted', lang: 'mr' }, mr) : null]; }
  function toggleBtn(url, row, reload, label) {
    var on = row.status === 'active';
    return SV.iconBtn(on ? 'eyeOff' : 'eye', on ? 'Hide from website' : 'Show on website', function () {
      SV.api('PATCH', url, { status: on ? 'inactive' : 'active' }).then(function () { SV.toast(on ? label + ' hidden' : label + ' shown on website'); reload(); }).catch(SV.fail);
    });
  }

  var ACTIONS = { create: 'added', update: 'updated', delete: 'deleted', status: 'changed the status of', lock: 'locked', unlock: 'unlocked' };
  var ENTITIES = { gold_rate: 'a gold rate', advertisement: 'an advertisement', feedback: 'a customer video', product: 'a product', faq: 'a question', settings: 'the settings', account: 'the account', user: 'a user' };
  function activityText(a) {
    if (a.action === 'login') return 'signed in';
    if (a.action === 'logout') return 'signed out';
    if (a.action === 'password') return a.entity === 'user' ? 'reset a user password' : 'changed the password';
    if (a.action === 'lock' && a.entity === 'account') return 'was locked (wrong passwords)';
    return (ACTIONS[a.action] || a.action) + ' ' + (ENTITIES[a.entity] || a.entity);
  }

  // ======================= Dashboard =======================
  function dashboard() {
    var stats = SV.$('#stats');
    var rateBox = SV.$('#rate-box');
    var act = SV.$('#activity');
    SV.api('GET', '/api/admin/dashboard').then(function (d) {
      var c = d.counts;
      var cards = [
        ['message', 'Customer feedback', c.feedback_total, c.feedback_approved + ' approved · ' + c.feedback_pending + ' waiting', '/admin/feedback'],
        ['video', 'Advertisements', c.ads_total, c.ads_active + ' shown on website', '/admin/advertisements'],
        ['inbox', 'Store products', c.products_active, 'shown in the 24K store', '/admin/products'],
        ['message', 'FAQs', c.faqs_active, 'questions shown on the website', '/admin/faqs'],
      ];
      SV.clear(stats);
      cards.forEach(function (x) {
        stats.appendChild(h('div', { class: 'col-6 col-xl-3' }, h('a', { href: x[4], class: 'adm-stat text-decoration-none text-reset' },
          h('span', { class: 'adm-stat-label' }, SV.icon(x[0]), x[1]), h('span', { class: 'adm-stat-value' }, String(x[2])), h('span', { class: 'adm-stat-sub' }, x[3]))));
      });
      SV.clear(rateBox);
      if (!d.rate) rateBox.appendChild(h('div', { class: 'adm-empty' }, SV.icon('rate', 36), h('p', null, 'No rate saved yet. The website asks visitors to call for the rate.')));
      else {
        var r = d.rate;
        rateBox.appendChild(h('p', { class: 'adm-muted' }, 'Rate for ' + SV.date(r.effective_date) + ' · saved ' + SV.dateTime(r.updated_at)));
        rateBox.appendChild(h('div', { class: 'adm-rate-grid' },
          [['24K (999) / g', r.gold_24k], ['22K / g', r.gold_22k], ['18K / g', r.gold_18k], ['Silver / kg', r.silver_kg]].map(function (x) {
            return h('div', { class: 'adm-rate-cell' }, h('span', null, x[0]), h('strong', null, SV.inr(x[1])));
          })));
        if (r.effective_date !== SV.todayIndia()) rateBox.appendChild(h('div', { class: 'alert alert-warning mt-3 mb-0' }, 'Today’s rate is not saved yet. The website shows the rate from ' + SV.date(r.effective_date) + '.'));
      }
      SV.clear(act);
      if (!d.recent.length) act.appendChild(h('p', { class: 'adm-muted' }, 'No activity yet.'));
      else act.appendChild(h('ul', { class: 'adm-activity' }, d.recent.map(function (a) {
        return h('li', null, h('time', null, SV.dateTime(a.created_at)), h('div', null, h('span', { class: 'fw-semibold' }, (a.username || 'admin') + ' ' + activityText(a)), a.details ? h('div', { class: 'adm-muted' }, a.details) : null));
      })));
    }).catch(function (err) {
      SV.clear(stats).appendChild(h('div', { class: 'col-12' }, h('div', { class: 'adm-error' }, (err && err.error) || 'Could not load the dashboard.')));
    });
  }

  // ======================= Gold rates =======================
  var RATE_FIELDS = [
    { name: 'effective_date', label: 'Rate for date', type: 'date', required: true, col: 'col-12' },
    { name: 'gold_24k', label: '24K (999) gold, per gram', type: 'number', required: true, min: 1, step: '0.01', prefix: '₹', inputmode: 'decimal', big: true, col: 'col-sm-6' },
    { name: 'gold_22k', label: '22K gold, per gram', type: 'number', required: true, min: 1, step: '0.01', prefix: '₹', inputmode: 'decimal', big: true, col: 'col-sm-6' },
    { name: 'gold_18k', label: '18K gold, per gram (optional)', type: 'number', min: 1, step: '0.01', prefix: '₹', inputmode: 'decimal', big: true, col: 'col-sm-6' },
    { name: 'silver_kg', label: 'Silver, per kg (optional)', type: 'number', min: 1, step: '0.01', prefix: '₹', inputmode: 'decimal', big: true, col: 'col-sm-6' },
  ];
  function rateValues(r) {
    return r ? { effective_date: r.effective_date, gold_24k: r.gold_24k, gold_22k: r.gold_22k, gold_18k: r.gold_18k, silver_kg: r.silver_kg } : {};
  }

  function goldRates() {
    var form = SV.$('#rate-form');
    var box = SV.$('#rate-fields');
    var alertEl = SV.$('#rate-alert');
    function fill(last) {
      SV.clear(box);
      var v = rateValues(last);
      v.effective_date = SV.todayIndia();
      RATE_FIELDS.forEach(function (f) { box.appendChild(SV.field(f, v[f.name])); });
    }
    var list = SV.listPage({
      endpoint: '/api/admin/gold-rates',
      pageSize: 15,
      search: false,
      emptyIcon: 'rate',
      empty: 'No rates saved yet. Add today’s rate on the left.',
      columns: [
        { label: 'Date', render: function (r) { return h('span', { class: 'fw-semibold text-nowrap' }, SV.date(r.effective_date)); } },
        { label: '24K', half: true, cls: 'num', render: function (r) { return SV.inr(r.gold_24k); } },
        { label: '22K', half: true, cls: 'num', render: function (r) { return SV.inr(r.gold_22k); } },
        { label: '18K', half: true, cls: 'num', render: function (r) { return SV.inr(r.gold_18k); } },
        { label: 'Silver/kg', half: true, cls: 'num', render: function (r) { return SV.inr(r.silver_kg); } },
        { label: 'Saved', half: true, render: function (r) { return h('span', { class: 'adm-muted text-nowrap' }, SV.dateTime(r.updated_at)); } },
      ],
      actions: function (r, reload) {
        return [
          SV.iconBtn('edit', 'Edit rate', function () {
            SV.editModal({
              title: 'Edit rate for ' + SV.date(r.effective_date),
              fields: RATE_FIELDS,
              values: rateValues(r),
              submit: function (v) { return SV.api('PUT', '/api/admin/gold-rates/' + r.id, v).then(function () { SV.toast('Rate updated'); reload(); }); },
            });
          }),
          SV.iconBtn('trash', 'Delete rate', function () { SV.removeRow('/api/admin/gold-rates/' + r.id, 'the rate for ' + SV.date(r.effective_date), reload); }, true),
        ];
      },
    });
    SV.api('GET', '/api/admin/gold-rates?page=1&pageSize=1').then(function (d) { fill(d.items[0]); }).catch(function () { fill(null); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      SV.clearErrors(form, alertEl);
      var btn = form.querySelector('[type=submit]');
      SV.busy(btn, true);
      SV.api('POST', '/api/admin/gold-rates', SV.values(form, RATE_FIELDS))
        .then(function () { SV.toast('Rate saved. The website now shows it.'); list.reload(); })
        .catch(function (err) { SV.showErrors(form, err, alertEl); })
        .then(function () { SV.busy(btn, false); });
    });
  }

  // ======================= Advertisements =======================
  function advertisements() {
    var fields = [
      { name: 'youtube_url', label: 'YouTube link', required: true, placeholder: 'https://youtu.be/…', help: 'Paste the link from YouTube’s Share button. Shorts links work too.', type: 'url' },
      { name: 'title_en', label: 'Title (English)', required: true, max: 150, col: 'col-md-6' },
      { name: 'title_mr', label: 'Title (Marathi)', max: 150, col: 'col-md-6' },
      { name: 'description_en', label: 'Short description (English)', type: 'textarea', max: 500, col: 'col-md-6' },
      { name: 'description_mr', label: 'Short description (Marathi)', type: 'textarea', max: 500, col: 'col-md-6' },
      { name: 'status', label: 'Show on website?', type: 'select', options: ACTIVE, col: 'col-md-6' },
      { name: 'sort_order', label: 'Order (smaller numbers first)', type: 'number', step: 1, col: 'col-md-6', default: 0 },
    ];
    var open = function (row, reload) {
      SV.editModal({
        title: row ? 'Edit advertisement' : 'Add advertisement video',
        fields: fields,
        values: row ? Object.assign({}, row, { youtube_url: row.watch_url }) : { status: 'active', sort_order: 0 },
        submit: function (v) {
          return SV.api(row ? 'PUT' : 'POST', '/api/admin/advertisements' + (row ? '/' + row.id : ''), v).then(function () { SV.toast(row ? 'Advertisement updated' : 'Advertisement added'); reload(); });
        },
      });
    };
    SV.listPage({
      endpoint: '/api/admin/advertisements',
      filters: [{ name: 'status', label: 'Status', options: [['', 'All'], ['active', 'Active'], ['inactive', 'Inactive']] }],
      emptyIcon: 'video',
      empty: 'No advertisement videos yet.',
      addLabel: 'Add video',
      onAdd: function (reload) { open(null, reload); },
      columns: [
        { label: 'Video', render: thumb },
        { label: 'Title', render: function (r) { return [bilingual(r.title_en, r.title_mr), r.is_short ? h('span', { class: 'adm-badge pending mt-1' }, 'Short') : null]; } },
        { label: 'Status', half: true, render: function (r) { return SV.badge(r.status); } },
        { label: 'Order', half: true, cls: 'num', render: function (r) { return String(r.sort_order); } },
      ],
      actions: function (r, reload) {
        return [
          toggleBtn('/api/admin/advertisements/' + r.id + '/status', r, reload, 'Advertisement'),
          SV.iconBtn('edit', 'Edit', function () { open(r, reload); }),
          SV.iconBtn('trash', 'Delete', function () { SV.removeRow('/api/admin/advertisements/' + r.id, '“' + r.title_en + '”', reload); }, true),
        ];
      },
    });
  }

  // ======================= Customer feedback =======================
  function feedback() {
    var STAT = [['pending', 'Waiting for approval'], ['approved', 'Approved (shown)'], ['rejected', 'Rejected (hidden)']];
    var fields = [
      { name: 'youtube_url', label: 'YouTube link', required: true, placeholder: 'https://youtu.be/…', type: 'url', help: 'Upload the customer’s video to the shop’s YouTube channel first, then paste its link.' },
      { name: 'customer_name', label: 'Customer name (as shown on the website)', required: true, max: 100 },
      { name: 'title_en', label: 'Title (English)', max: 150, col: 'col-md-6' },
      { name: 'title_mr', label: 'Title (Marathi)', max: 150, col: 'col-md-6' },
      { name: 'consent', label: 'The customer agreed in writing to be shown on the website', type: 'checkbox', help: 'Required before the video can be approved.' },
      { name: 'status', label: 'Status', type: 'select', options: STAT, col: 'col-md-6' },
      { name: 'sort_order', label: 'Order (smaller numbers first)', type: 'number', step: 1, col: 'col-md-6', default: 0 },
    ];
    var open = function (row, reload) {
      SV.editModal({
        title: row ? 'Edit customer video' : 'Add customer video',
        fields: fields,
        values: row ? Object.assign({}, row, { youtube_url: row.watch_url, consent: Boolean(row.consent) }) : { status: 'pending', sort_order: 0 },
        submit: function (v) {
          return SV.api(row ? 'PUT' : 'POST', '/api/admin/feedback' + (row ? '/' + row.id : ''), v).then(function () { SV.toast(row ? 'Video updated' : 'Video added'); reload(); });
        },
      });
    };
    var setStatus = function (r, status, reload) {
      SV.api('PATCH', '/api/admin/feedback/' + r.id + '/status', { status: status }).then(function () { SV.toast(status === 'approved' ? 'Approved: now shown on the website' : 'Marked ' + status); reload(); }).catch(SV.fail);
    };
    SV.listPage({
      endpoint: '/api/admin/feedback',
      filters: [{ name: 'status', label: 'Status', options: [['', 'All'], ['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected']] }],
      emptyIcon: 'message',
      empty: 'No customer videos yet.',
      addLabel: 'Add customer video',
      onAdd: function (reload) { open(null, reload); },
      columns: [
        { label: 'Video', render: thumb },
        { label: 'Customer', render: function (r) { return bilingual(r.customer_name, r.title_en); } },
        { label: 'Consent', half: true, render: function (r) { return SV.badge(r.consent ? 'yes' : 'no', r.consent ? 'Given' : 'Not given'); } },
        { label: 'Status', half: true, render: function (r) { return SV.badge(r.status, r.status === 'pending' ? 'Waiting' : null); } },
      ],
      actions: function (r, reload) {
        return [
          r.status !== 'approved' ? SV.iconBtn('check', 'Approve', function () { setStatus(r, 'approved', reload); }) : SV.iconBtn('x', 'Reject (hide)', function () { setStatus(r, 'rejected', reload); }),
          SV.iconBtn('edit', 'Edit', function () { open(r, reload); }),
          SV.iconBtn('trash', 'Delete', function () { SV.removeRow('/api/admin/feedback/' + r.id, 'the video from ' + r.customer_name, reload); }, true),
        ];
      },
    });
  }

  // ======================= Products =======================
  function products() {
    var CATS = [['coin', 'Coin'], ['bar', 'Bar'], ['biscuit', 'Vedhani / biscuit']];
    var catName = function (k) { var x = CATS.filter(function (c) { return c[0] === k; })[0]; return x ? x[1] : k; };
    function fields(row) {
      var preview = row && row.image ? h('img', { class: 'adm-preview-img', src: row.image, alt: 'Current photo', width: 160, height: 160 }) : null;
      return [
        { name: 'image', label: row ? 'Replace photo (optional)' : 'Photo', type: 'file', required: !row, accept: 'image/jpeg,image/png,image/webp', help: 'JPG, PNG or WebP, up to 2 MB. A square photo looks best.', preview: preview },
        { name: 'code', label: 'Product code', required: true, max: 40, col: 'col-md-4', placeholder: 'COIN-10G' },
        { name: 'category', label: 'Type', type: 'select', options: CATS, col: 'col-md-4' },
        { name: 'weight_grams', label: 'Weight', type: 'number', required: true, min: 0.001, step: '0.001', suffix: 'g', col: 'col-md-4', inputmode: 'decimal' },
        { name: 'name_en', label: 'Name (English)', required: true, max: 150, col: 'col-md-6' },
        { name: 'name_mr', label: 'Name (Marathi)', max: 150, col: 'col-md-6' },
        { name: 'description_en', label: 'Description (English)', type: 'textarea', max: 1000, col: 'col-md-6' },
        { name: 'description_mr', label: 'Description (Marathi)', type: 'textarea', max: 1000, col: 'col-md-6' },
        { name: 'status', label: 'Show on website?', type: 'select', options: ACTIVE, col: 'col-md-6' },
        { name: 'sort_order', label: 'Order (smaller numbers first)', type: 'number', step: 1, col: 'col-md-6', default: 0 },
      ];
    }
    var open = function (row, reload) {
      var fs = fields(row);
      SV.editModal({
        title: row ? 'Edit product' : 'Add product',
        fields: fs,
        values: row ? Object.assign({}, row, { weight_grams: Number(row.weight_grams) }) : { status: 'active', category: 'coin', sort_order: 0 },
        submit: function (v, form) {
          var fd = new FormData();
          Object.keys(v).forEach(function (k) { fd.append(k, v[k] === null ? '' : v[k]); });
          var file = form.elements.image.files[0];
          if (file) {
            if (file.size > 2 * 1024 * 1024) return Promise.reject({ fields: { image: 'The photo is larger than 2 MB. Please choose a smaller one.' } });
            fd.append('image', file);
          }
          return SV.api(row ? 'PUT' : 'POST', '/api/admin/products' + (row ? '/' + row.id : ''), fd).then(function () { SV.toast(row ? 'Product updated' : 'Product added'); reload(); });
        },
      });
    };
    SV.listPage({
      endpoint: '/api/admin/products',
      filters: [
        { name: 'category', label: 'Type', options: [['', 'All types']].concat(CATS) },
        { name: 'status', label: 'Status', options: [['', 'All'], ['active', 'Active'], ['inactive', 'Inactive']] },
      ],
      empty: 'No products yet.',
      addLabel: 'Add product',
      onAdd: function (reload) { open(null, reload); },
      columns: [
        { label: 'Photo', render: function (r) { return h('img', { class: 'adm-thumb-sq', src: r.image, alt: '', width: 56, height: 56, loading: 'lazy' }); } },
        { label: 'Product', render: function (r) { return bilingual(r.name_en, r.name_mr); } },
        { label: 'Code', half: true, render: function (r) { return h('code', null, r.code); } },
        { label: 'Type', half: true, render: function (r) { return catName(r.category); } },
        { label: 'Weight', half: true, cls: 'num', render: function (r) { return String(Number(r.weight_grams)) + ' g'; } },
        { label: 'Status', half: true, render: function (r) { return SV.badge(r.status); } },
      ],
      actions: function (r, reload) {
        return [
          toggleBtn('/api/admin/products/' + r.id + '/status', r, reload, 'Product'),
          SV.iconBtn('edit', 'Edit', function () { open(r, reload); }),
          SV.iconBtn('trash', 'Delete', function () { SV.removeRow('/api/admin/products/' + r.id, '“' + r.name_en + '”', reload); }, true),
        ];
      },
    });
  }

  // ======================= FAQs =======================
  function faqs() {
    var CATS = [['selling', 'Selling gold'], ['pledged', 'Pledged gold'], ['buying', 'Buying 24K gold'], ['general', 'General']];
    var catName = function (k) { var x = CATS.filter(function (c) { return c[0] === k; })[0]; return x ? x[1] : k; };
    var fields = [
      { name: 'category', label: 'Topic', type: 'select', options: CATS, col: 'col-md-6' },
      { name: 'status', label: 'Show on website?', type: 'select', options: ACTIVE, col: 'col-md-6' },
      { name: 'question_en', label: 'Question (English)', required: true, max: 300 },
      { name: 'answer_en', label: 'Answer (English)', type: 'textarea', required: true, max: 3000, rows: 4 },
      { name: 'question_mr', label: 'Question (Marathi)', max: 300 },
      { name: 'answer_mr', label: 'Answer (Marathi)', type: 'textarea', max: 3000, rows: 4, help: 'If Marathi is empty, the Marathi page shows the English text.' },
    ];
    var open = function (row, reload) {
      SV.editModal({
        title: row ? 'Edit question' : 'Add question',
        fields: fields,
        values: row || { status: 'active', category: 'general' },
        submit: function (v) { return SV.api(row ? 'PUT' : 'POST', '/api/admin/faqs' + (row ? '/' + row.id : ''), v).then(function () { SV.toast(row ? 'Question updated' : 'Question added'); reload(); }); },
      });
    };
    var move = function (r, dir, reload) { SV.api('PATCH', '/api/admin/faqs/' + r.id + '/move', { direction: dir }).then(reload).catch(SV.fail); };
    SV.listPage({
      endpoint: '/api/admin/faqs',
      pageSize: 200,
      filters: [
        { name: 'category', label: 'Topic', options: [['', 'All topics']].concat(CATS) },
        { name: 'status', label: 'Status', options: [['', 'All'], ['active', 'Active'], ['inactive', 'Inactive']] },
      ],
      emptyIcon: 'message',
      empty: 'No questions yet.',
      addLabel: 'Add question',
      onAdd: function (reload) { open(null, reload); },
      columns: [
        { label: '#', half: true, render: function (r, i) { return String(i + 1); } },
        { label: 'Question', render: function (r) { return bilingual(r.question_en, r.question_mr); } },
        { label: 'Topic', half: true, render: function (r) { return catName(r.category); } },
        { label: 'Status', half: true, render: function (r) { return SV.badge(r.status); } },
      ],
      actions: function (r, reload, i, data) {
        var up = SV.iconBtn('up', 'Move up', function () { move(r, 'up', reload); });
        var down = SV.iconBtn('down', 'Move down', function () { move(r, 'down', reload); });
        if (i === 0) up.disabled = true;
        if (i === data.items.length - 1) down.disabled = true;
        return [up, down, toggleBtn('/api/admin/faqs/' + r.id + '/status', r, reload, 'Question'), SV.iconBtn('edit', 'Edit', function () { open(r, reload); }),
          SV.iconBtn('trash', 'Delete', function () { SV.removeRow('/api/admin/faqs/' + r.id, 'this question', reload); }, true)];
      },
    });
  }

  // ======================= Users (super admin only) =======================
  function users() {
    var ROLES = [['admin', 'Admin (rates, videos, products, FAQs)'], ['superadmin', 'Super admin (everything)']];
    var me = Number(document.body.getAttribute('data-user-id'));
    var TEMP_HELP = 'Temporary password, 8+ characters. Tell it to the user privately; they change it after signing in.';
    var call = function (method, url, body, okText, reload) {
      return SV.api(method, url, body).then(function () { SV.toast(okText); reload(); }).catch(SV.fail);
    };
    var add = function (reload) {
      SV.editModal({
        title: 'Add user',
        saveLabel: 'Add user',
        fields: [
          { name: 'username', label: 'Username', required: true, max: 50, col: 'col-md-6', help: '3–50 letters, numbers, dots, dashes or underscores.' },
          { name: 'display_name', label: 'Name (shown in the panel)', max: 100, col: 'col-md-6' },
          { name: 'role', label: 'Access', type: 'select', options: ROLES },
          { name: 'password', label: 'Temporary password', type: 'password', required: true, autocomplete: 'new-password', help: TEMP_HELP },
        ],
        values: { role: 'admin' },
        submit: function (v) { return SV.api('POST', '/api/admin/users', v).then(function () { SV.toast('User added'); reload(); }); },
      });
    };
    var edit = function (u, reload) {
      SV.editModal({
        title: 'Edit ' + u.username,
        fields: [
          { name: 'display_name', label: 'Name (shown in the panel)', max: 100 },
          { name: 'role', label: 'Access', type: 'select', options: ROLES, help: u.id === me ? 'You cannot change your own access.' : '' },
        ],
        values: u,
        submit: function (v) { return SV.api('PUT', '/api/admin/users/' + u.id, v).then(function () { SV.toast('User updated'); reload(); }); },
      });
    };
    var reset = function (u, reload) {
      SV.editModal({
        title: 'Reset password for ' + u.username,
        saveLabel: 'Set new password',
        fields: [{ name: 'new_password', label: 'New temporary password', type: 'password', required: true, autocomplete: 'new-password', help: TEMP_HELP + ' This also unlocks the account.' }],
        submit: function (v) { return SV.api('PUT', '/api/admin/users/' + u.id + '/password', v).then(function () { SV.toast('Password changed for ' + u.username); reload(); }); },
      });
    };
    SV.listPage({
      endpoint: '/api/admin/users',
      search: false,
      empty: 'No users yet.',
      addLabel: 'Add user',
      onAdd: add,
      columns: [
        { label: 'User', render: function (u) { return [h('div', { class: 'fw-semibold' }, u.username + (u.id === me ? ' (you)' : '')), u.display_name ? h('div', { class: 'adm-muted' }, u.display_name) : null]; } },
        { label: 'Access', half: true, render: function (u) { return SV.badge(u.role, u.role === 'superadmin' ? 'Super admin' : 'Admin'); } },
        {
          label: 'Status',
          half: true,
          render: function (u) {
            if (u.locked_at) return [SV.badge('locked', 'Locked'), h('div', { class: 'adm-muted' }, 'since ' + SV.dateTime(u.locked_at))];
            return [SV.badge('active', 'Active'), u.failed_attempts ? h('div', { class: 'adm-muted' }, u.failed_attempts + ' wrong password' + (u.failed_attempts === 1 ? '' : 's')) : null];
          },
        },
        { label: 'Last sign-in', render: function (u) { return h('span', { class: 'adm-muted text-nowrap' }, u.last_login_at ? SV.dateTime(u.last_login_at) : 'Never'); } },
      ],
      actions: function (u, reload) {
        var list = [];
        if (u.locked_at) {
          list.push(h('button', { type: 'button', class: 'btn btn-sm btn-success', onclick: function () { call('PATCH', '/api/admin/users/' + u.id + '/lock', { locked: false }, u.username + ' unlocked', reload); } }, 'Unlock'));
        } else if (u.id !== me) {
          list.push(h('button', { type: 'button', class: 'btn btn-sm btn-outline-dark', onclick: function () {
            SV.confirm('Lock ' + u.username + '? They are signed out at once and cannot sign in until unlocked.', 'Lock').then(function (yes) {
              if (yes) call('PATCH', '/api/admin/users/' + u.id + '/lock', { locked: true }, u.username + ' locked', reload);
            });
          } }, 'Lock'));
        }
        list.push(SV.iconBtn('edit', 'Edit name or access', function () { edit(u, reload); }));
        list.push(h('button', { type: 'button', class: 'btn btn-sm btn-outline-dark', onclick: function () { reset(u, reload); } }, 'Reset password'));
        if (u.id !== me) list.push(SV.iconBtn('trash', 'Remove user', function () { SV.removeRow('/api/admin/users/' + u.id, 'user ' + u.username, reload); }, true));
        return list;
      },
    });
  }

  // ======================= Settings =======================
  function settings() {
    var GROUPS = [
      ['Business', [
        { name: 'business_name_en', label: 'Business name (English)', required: true, max: 100, col: 'col-md-6' },
        { name: 'business_name_mr', label: 'Business name (Marathi)', max: 100, col: 'col-md-6' },
        { name: 'company_name_en', label: 'Company name (English)', max: 150, col: 'col-md-6' },
        { name: 'company_name_mr', label: 'Company name (Marathi)', max: 150, col: 'col-md-6' },
      ]],
      ['Contact', [
        { name: 'phone_primary', label: 'Main phone', type: 'tel', required: true, col: 'col-md-6', inputmode: 'numeric', help: '10-digit mobile number' },
        { name: 'phone_secondary', label: 'Second phone', type: 'tel', col: 'col-md-6', inputmode: 'numeric' },
        { name: 'whatsapp_number', label: 'WhatsApp number', type: 'tel', required: true, col: 'col-md-6', inputmode: 'numeric', help: 'All WhatsApp buttons on the website open this number.' },
        { name: 'email', label: 'Email', type: 'email', col: 'col-md-6' },
      ]],
      ['Address and map', [
        { name: 'address_en', label: 'Address (English)', type: 'textarea', required: true, max: 300, rows: 2, col: 'col-md-6' },
        { name: 'address_mr', label: 'Address (Marathi)', type: 'textarea', max: 300, rows: 2, col: 'col-md-6' },
        { name: 'map_link', label: 'Google Maps link (for “Get directions”)', type: 'url', col: 'col-md-6' },
        { name: 'map_embed_url', label: 'Google Maps embed link (the map on the page)', type: 'url', col: 'col-md-6', help: 'Google Maps → Share → Embed a map → copy only the link inside src="…".' },
      ]],
      ['Opening hours', [
        { name: 'hours_en', label: 'Hours (English)', type: 'textarea', max: 300, rows: 3, col: 'col-md-6', placeholder: 'Mon–Sat: 10:30 am – 7:30 pm', help: 'Leave empty to show “Call us for today’s timings”.' },
        { name: 'hours_mr', label: 'Hours (Marathi)', type: 'textarea', max: 300, rows: 3, col: 'col-md-6' },
      ]],
      ['Social media', [
        { name: 'facebook_url', label: 'Facebook page link', type: 'url', col: 'col-md-4' },
        { name: 'instagram_url', label: 'Instagram link', type: 'url', col: 'col-md-4' },
        { name: 'youtube_url', label: 'YouTube channel link', type: 'url', col: 'col-md-4' },
      ]],
      ['What the website shows', [
        { name: 'show_18k', label: 'Show the 18K gold rate', type: 'checkbox', col: 'col-md-4' },
        { name: 'show_silver', label: 'Show the silver rate', type: 'checkbox', col: 'col-md-4' },
        { name: 'saturday_offer_active', label: 'Show the Saturday 5% offer on 24K gold', type: 'checkbox', col: 'col-md-4', help: 'Turn on only while the offer is really running.' },
      ]],
    ];
    var all = [];
    GROUPS.forEach(function (g) { all = all.concat(g[1]); });
    var form = SV.$('#settings-form');
    var box = SV.$('#settings-groups');
    var alertEl = SV.$('#settings-alert');
    var logo = SV.$('#logo-preview');
    function fill(s) {
      SV.clear(box);
      GROUPS.forEach(function (g) {
        box.appendChild(h('div', { class: 'col-12' }, h('section', { class: 'adm-card' }, h('h2', { class: 'adm-group-title mb-3' }, g[0]),
          h('div', { class: 'row g-3' }, g[1].map(function (f) { return SV.field(f, s[f.name]); })))));
      });
      logo.src = s.logo_path;
    }
    box.appendChild(h('div', { class: 'adm-loading', role: 'status' }, 'Loading…'));
    SV.api('GET', '/api/admin/settings').then(fill).catch(SV.fail);
    SV.api('GET', '/api/auth/me').then(function (d) {
      SV.$('#account-info').textContent = 'Signed in as ' + d.user.username + (d.user.last_login_at ? ' · last sign-in ' + SV.dateTime(d.user.last_login_at) : '');
    }).catch(function () {});
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      SV.clearErrors(form, alertEl);
      var btn = form.querySelector('[type=submit]');
      SV.busy(btn, true);
      SV.api('PUT', '/api/admin/settings', SV.values(form, all))
        .then(function (s) { fill(s); SV.toast('Settings saved. The website shows them within a minute.'); })
        .catch(function (err) { SV.showErrors(form, err, alertEl); SV.fail(err); })
        .then(function () { SV.busy(btn, false); });
    });
    var logoForm = SV.$('#logo-form');
    logoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      SV.clearErrors(logoForm);
      var file = logoForm.elements.image.files[0];
      if (!file) return SV.showErrors(logoForm, { fields: { image: 'Choose an image first' } });
      if (file.size > 2 * 1024 * 1024) return SV.showErrors(logoForm, { fields: { image: 'The image is larger than 2 MB' } });
      var fd = new FormData();
      fd.append('image', file);
      var btn = logoForm.querySelector('[type=submit]');
      SV.busy(btn, true, 'Uploading…');
      SV.api('POST', '/api/admin/settings/logo', fd)
        .then(function (s) { logo.src = s.logo_path; logoForm.reset(); SV.toast('Logo changed'); })
        .catch(function (err) { SV.showErrors(logoForm, err); })
        .then(function () { SV.busy(btn, false); });
    });
  }

  var PAGES = { dashboard: dashboard, 'gold-rates': goldRates, advertisements: advertisements, feedback: feedback, products: products, faqs: faqs, users: users, settings: settings };
  document.addEventListener('DOMContentLoaded', function () { if (PAGES[page]) PAGES[page](); });
})();
