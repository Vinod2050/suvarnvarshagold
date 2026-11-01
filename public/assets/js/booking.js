// Book a visit: checks the form, then opens WhatsApp with the details written in the message.
// Nothing is sent to or stored on the website; the visitor sends the message from WhatsApp.
(function () {
  'use strict';
  var form = document.getElementById('booking-form');
  if (!form) return;
  var errors = {};
  var wa = {};
  try { errors = JSON.parse(form.getAttribute('data-errors') || '{}'); } catch (e) { errors = {}; }
  try { wa = JSON.parse(form.getAttribute('data-wa') || '{}'); } catch (e) { wa = {}; }
  var NAMES = ['name', 'phone', 'service', 'booking_date', 'message'];

  function setError(name, message) {
    var input = form.elements[name];
    var box = document.getElementById('b-' + name + '-err');
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (box) box.textContent = message || '';
  }

  // "2026-11-05" -> "5-11-2026", easy to read in a message
  function dateText(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    return m ? Number(m[3]) + '-' + Number(m[2]) + '-' + m[1] : ymd;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    NAMES.forEach(function (n) { setError(n, ''); });
    var v = {
      name: form.elements.name.value.trim().replace(/\s+/g, ' '),
      phone: form.elements.phone.value.replace(/[\s\-()]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, ''),
      service: form.elements.service.value,
      booking_date: form.elements.booking_date.value,
      message: form.elements.message.value.trim(),
    };
    var bad = {};
    if (v.name.length < 2) bad.name = errors.name;
    if (!/^[6-9]\d{9}$/.test(v.phone)) bad.phone = errors.phone;
    if (!v.service) bad.service = errors.service;
    var d = form.elements.booking_date;
    if (!v.booking_date || v.booking_date < d.min || v.booking_date > d.max) bad.booking_date = errors.booking_date;
    var names = Object.keys(bad);
    if (names.length) {
      names.forEach(function (n) { setError(n, bad[n]); });
      form.elements[names[0]].focus();
      return;
    }

    var t = wa.text || {};
    var lines = [
      t.hello,
      t.name + ': ' + v.name,
      t.phone + ': ' + v.phone,
      t.service + ': ' + ((wa.services && wa.services[v.service]) || v.service),
      t.date + ': ' + dateText(v.booking_date),
    ];
    if (v.message) lines.push(t.message + ': ' + v.message.slice(0, 1000));
    var base = /^https:\/\/wa\.me\/\d{10,15}$/.test(wa.url || '') ? wa.url : 'https://wa.me/918805942424';
    var url = base + '?text=' + encodeURIComponent(lines.join('\n'));

    form.hidden = true;
    var done = document.getElementById('booking-done');
    document.getElementById('booking-wa').href = url;
    done.hidden = false;
    done.focus();
    // Same tab: works on every phone (new tabs opened by script are often blocked).
    window.location.href = url;
  });
})();
