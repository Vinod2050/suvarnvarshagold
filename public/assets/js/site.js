/*
 * Suvarnavarsha Gold - plain JavaScript for the static site.
 * Does what React did on the Next.js site: menu, dropdowns, hero slides, FAQ accordion,
 * product pop-up, videos, scroll animations, and today's rates / videos / products from data.js
 * (or from the admin panel's saved changes in this browser).
 */
// Opened straight from the disk (file://): clean links such as "about" or "admin/" have no
// server to find the file, so point them at the real .html file. On the hosting this does nothing.
(function () {
  if (location.protocol !== 'file:') return
  function fix(a) {
    var href = a.getAttribute('href')
    if (!href || /^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) || a.hasAttribute('data-file-fixed')) return
    var i = href.search(/[?#]/), path = i < 0 ? href : href.slice(0, i), rest = i < 0 ? '' : href.slice(i)
    var last = path.split('/').pop()
    if (path === '' || path === '.' || path === '..' || last === '' || last === '.' || last === '..') path = path.replace(/\/?$/, '/') + 'index.html'
    else if (last === 'mr') path += '/index.html'
    else if (last.indexOf('.') < 0) path += '.html'
    else return
    a.setAttribute('href', path + rest)
    a.setAttribute('data-file-fixed', '')
  }
  function fixAll() { Array.prototype.forEach.call(document.querySelectorAll('a[href]'), fix) }
  function onClick(e) { var a = e.target.closest && e.target.closest('a[href]'); if (a) fix(a) }
  document.addEventListener('click', onClick, true)
  document.addEventListener('auxclick', onClick, true)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixAll); else fixAll()
})()

;(function () {
  'use strict'

  var body = document.body
  var LANG = body.getAttribute('data-lang') === 'mr' ? 'mr' : 'en'
  var ROOT = body.getAttribute('data-root') || ''
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  var T = {
    en: {
      gold24: 'Gold 24K (999)', gold22: 'Gold 22K', gold18: 'Gold 18K', silver: 'Silver',
      perGram: 'per gram', perKg: 'per kg', updated: 'Last updated: {time}',
      advertsEyebrow: 'Advertisements', advertsTitle: 'See how we work',
      feedbackEyebrow: 'Customer feedback', feedbackTitle: 'Hear it from our customers',
      sample: 'Sample', close: 'Close',
      priceNote: 'Price as per today’s rate. Ask us on WhatsApp.',
      askPrice: 'Ask price on WhatsApp', playVideo: 'Play video: {title}',
      categories: { coin: 'Gold coin', bar: 'Gold bar', biscuit: 'Gold Vedhani' },
      weightValue: '{weight} g',
      whatsappMessage: 'Hello, please tell me today’s price for this product.\n\nProduct: {name}\nCategory: {category}\nProduct code: {code}\nWeight: {weight}',
      pause: 'Pause slides', play: 'Play slides'
    },
    mr: {
      gold24: 'सोने 24K (999)', gold22: 'सोने 22K', gold18: 'सोने 18K', silver: 'चांदी',
      perGram: 'प्रति ग्रॅम', perKg: 'प्रति किलो', updated: 'शेवटचे अपडेट: {time}',
      advertsEyebrow: 'जाहिराती', advertsTitle: 'आमचे काम पहा',
      feedbackEyebrow: 'ग्राहकांचा अभिप्राय', feedbackTitle: 'ग्राहकांच्या तोंडून ऐका',
      sample: 'नमुना', close: 'बंद करा',
      priceNote: 'किंमत आजच्या दरानुसार. व्हॉट्सॲपवर विचारा.',
      askPrice: 'किंमत व्हॉट्सॲपवर विचारा', playVideo: 'व्हिडिओ पहा: {title}',
      categories: { coin: 'सोन्याचे नाणे', bar: 'सोन्याचा बार', biscuit: 'सोन्याची वेढणी' },
      weightValue: '{weight} ग्रॅम',
      whatsappMessage: 'नमस्कार, कृपया या उत्पादनाची आजची किंमत कळवा.\n\nउत्पादन: {name}\nप्रकार: {category}\nउत्पादन कोड: {code}\nवजन: {weight}',
      pause: 'स्लाइड थांबवा', play: 'स्लाइड सुरू करा'
    }
  }[LANG]

  // ---------- helpers ----------
  function $all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)) }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function fill(str, vars) { return str.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] }) }
  function local(v) { return v && typeof v === 'object' ? (v[LANG] || '') : (v || '') }
  /** A path saved in data.js ("images/x.webp") made relative to this page. Data URLs and full URLs stay as they are. */
  function url(p) {
    if (!p) return ''
    if (/^(data:|blob:|https?:|\/)/.test(p)) return p
    return ROOT + p
  }
  var inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
  function formatINR(n) { return inr.format(Number(n) || 0) }
  function formatDateTime(iso) {
    var d = new Date(iso)
    if (isNaN(d)) return ''
    var time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(d).toUpperCase()
    var day = new Intl.DateTimeFormat(LANG === 'mr' ? 'mr-IN-u-nu-latn' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d)
    return time + ', ' + day
  }
  function whatsappUrl(number, message) { return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message) }

  var ICON_X = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x size-5" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>'
  var ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.34zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.48-8.4z"></path></svg>'
  var ICON_ARROW = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right transition-transform group-hover/book:translate-x-1" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>'
  var ICON_PLAY = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play size-4" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>'
  var ORNAMENT = '<svg aria-hidden="true" viewBox="0 0 120 12" class="block h-3 w-[120px] text-accent mt-4 lg:xshort:mt-2 mx-auto" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M0 6h44M76 6h44"></path><path d="M60 1l5 5-5 5-5-5z" fill="currentColor"></path><circle cx="50" cy="6" r="1" fill="currentColor" stroke="none"></circle><circle cx="70" cy="6" r="1" fill="currentColor" stroke="none"></circle></svg>'
  var BTN = 't-label inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 text-center btn-motion disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-5 [&_svg]:shrink-0'

  // ---------- data (assets/js/data.js: on the hosting it comes from the database, see api/data.php) ----------
  var DATA = window.SV_DEFAULT_DATA || {}

  // ---------- today's rates ----------
  function renderRates() {
    var r = DATA.rates
    $all('[data-sv="rates"]').forEach(function (dl) {
      if (!r) return
      var cells = [
        { mark: '24K', label: T.gold24, value: r.gold24k999, unit: T.perGram },
        { mark: '22K', label: T.gold22, value: r.gold22k, unit: T.perGram }
      ]
      // 18K and silver are optional (admin settings); skip them when not given
      if (r.gold18k) cells.push({ mark: '18K', label: T.gold18, value: r.gold18k, unit: T.perGram })
      if (DATA.showSilver && r.silverKg) cells.push({ mark: 'Ag', label: T.silver, value: r.silverKg, unit: T.perKg })
      dl.className = 'grid grid-cols-2 gap-3 ' + (cells.length === 4 ? 'lg:grid-cols-4' : cells.length === 3 ? 'lg:grid-cols-3' : '')
      dl.innerHTML = cells.map(function (c, i) {
        return '<div class="hover-lift rounded-md border bg-surface-sunken px-4 py-4 ' + (i === 0 ? 'border-accent/60' : 'border-line') + '">' +
          '<dt class="flex items-center gap-2 t-label text-ink-muted"><span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-full bg-cta text-xs font-bold text-on-cta">' + c.mark + '</span>' + esc(c.label) + '</dt>' +
          '<dd class="mt-3 flex flex-wrap items-baseline gap-x-2"><span class="t-rate text-ink">' + formatINR(c.value) + '</span><span class="text-sm text-ink-muted">' + esc(c.unit) + '</span></dd></div>'
      }).join('')
    })
    $all('[data-sv="rates-updated"]').forEach(function (p) {
      if (!r) return
      var last = p.lastChild
      if (last && last.nodeType === 3) last.nodeValue = fill(T.updated, { time: formatDateTime(r.updatedAt) })
    })
    $all('[data-sv="rates-sample"]').forEach(function (p) { p.remove() })
  }

  // ---------- videos (home page, YouTube) ----------
  // Only the thumbnail loads with the page. The YouTube player (privacy-enhanced youtube-nocookie.com)
  // loads when the visitor taps play, which keeps the page fast on phones.
  function ytButton(v) {
    var id = esc(v.youtubeId)
    return '<button type="button" class="sv-yt-btn" data-yt="' + id + '" data-title="' + esc(local(v.title)) + '" aria-label="' + esc(fill(T.playVideo, { title: local(v.title) })) + '">' +
      '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360">' +
      '<span class="sv-yt-icon" aria-hidden="true">' + ICON_PLAY + '</span></button>'
  }
  function playYoutube(btn) {
    // Only one video plays at a time: put the other players back to their thumbnails
    $all('.sv-yt iframe').forEach(function (f) {
      f.parentNode.innerHTML = f.getAttribute('data-button')
    })
    var holder = btn.parentNode
    var iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(btn.getAttribute('data-yt')) + '?autoplay=1&rel=0&playsinline=1'
    iframe.title = btn.getAttribute('data-title') || 'YouTube video'
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    iframe.allowFullscreen = true
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    iframe.setAttribute('data-button', holder.innerHTML)
    holder.innerHTML = ''
    holder.appendChild(iframe)
    iframe.focus()
  }

  function renderVideos() {
    $all('[data-sv-videos]').forEach(function (slot) {
      var kind = slot.getAttribute('data-sv-videos')
      var list = (kind === 'adverts' ? DATA.adverts : DATA.feedback) || []
      var shown = list.filter(function (v) {
        return v.active !== false && v.youtubeId && local(v.title) && (kind === 'adverts' || v.consent)
      })
      // Newest first: the home page shows the 4 newest adverts and the 6 newest feedback videos
      shown.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')) })
      // data-limit on the slot overrides (the Customer Videos page shows all)
      shown = shown.slice(0, Number(slot.getAttribute('data-limit')) || (kind === 'adverts' ? 4 : 6))
      if (shown.length === 0) { slot.remove(); return }
      var dark = kind === 'feedback'
      var id = 'videos-' + kind + '-title'
      var html = '<section aria-labelledby="' + id + '" class="bg-surface section-y text-ink' + (dark ? ' theme-dark' : '') + '"><div class="container-site">' +
        '<div class="mb-8 md:mb-12 md:short:mb-8 lg:short:mb-8 lg:xshort:mb-5 mx-auto max-w-2xl text-center" style="opacity:0;transform:translateY(24px)"><p class="mb-2 t-eyebrow">' + esc(T[kind + 'Eyebrow']) + '</p><h2 id="' + id + '" class="t-h2">' + esc(T[kind + 'Title']) + '</h2>' + ORNAMENT + '</div>' +
        '<ul class="flex flex-wrap items-start justify-center gap-6">' +
        shown.map(function (v, i) {
          var title = esc(local(v.title))
          return '<li class="w-full sm:w-[calc(50%-12px)] lg:w-[calc((100%-48px)/3)]"><div style="opacity:0;transform:translateY(24px)" data-delay="' + ((i % 3) * 0.08) + '">' +
            '<figure class="hover-lift overflow-hidden rounded-md border bg-surface-raised ' + (dark ? 'border-line' : 'border-transparent shadow-card') + '">' +
            '<div class="sv-yt' + (v.short ? ' sv-yt-short' : '') + '">' + ytButton(v) + '</div>' +
            '<figcaption class="min-w-0 p-4"><p class="t-label break-words text-ink">' + title + '</p>' +
            (v.customerName ? '<p class="mt-1 text-sm break-words text-ink-muted">' + esc(v.customerName) + '</p>' : '') +
            '</figcaption></figure></div></li>'
        }).join('') + '</ul></div></section>'
      slot.insertAdjacentHTML('beforebegin', html)
      var section = slot.previousElementSibling
      slot.remove()
      section.addEventListener('click', function (e) {
        var btn = e.target.closest('.sv-yt-btn')
        if (btn) playYoutube(btn)
      })
    })
  }

  function setupVideos() {
    $all('video').forEach(function (video) {
      video.addEventListener('loadedmetadata', function () {
        if (video.videoHeight > video.videoWidth) {
          video.classList.remove('aspect-video')
          video.classList.add('aspect-[3/4]', 'max-h-[80dvh]')
        }
      })
      // Only one video with sound at a time
      video.addEventListener('play', function () {
        if (video.muted) return
        $all('video').forEach(function (other) { if (other !== video && !other.paused && !other.muted) other.pause() })
      })
      // Feedback videos show their first frame, fetched only when the visitor scrolls near them
      if (video.hasAttribute('data-preload') && 'IntersectionObserver' in window) {
        var near = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { near.disconnect(); video.preload = video.getAttribute('data-preload'); if (video.readyState === 0) video.load() }
        }, { rootMargin: '400px 0px' })
        near.observe(video)
      }
      var auto = video.hasAttribute('data-autoplay') && !reducedMotion && !(navigator.connection && navigator.connection.saveData)
      if (!auto || !('IntersectionObserver' in window)) return
      video.muted = true
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { var p = video.play(); if (p && p.catch) p.catch(function () {}) }
          else if (!video.paused) video.pause()
        })
      }, { threshold: 0.5 }).observe(video)
    })
  }

  // ---------- store products (no prices: customers ask on WhatsApp) ----------
  function productList() {
    var real = (DATA.products || []).filter(function (p) { return p.active !== false && p.image && local(p.name) })
    if (real.length) return real.map(function (p) { return { p: p, sample: false } })
    return (window.SV_SAMPLE_PRODUCTS || []).map(function (p) { return { p: p, sample: true } })
  }

  /** WhatsApp link with the product's details already written in the message. */
  function askPriceUrl(p) {
    var message = fill(T.whatsappMessage, {
      name: local(p.name),
      category: T.categories[p.category] || p.category,
      code: p.code,
      weight: fill(T.weightValue, { weight: String(p.weightGrams) })
    })
    return whatsappUrl(DATA.whatsapp || '918805942424', message)
  }

  function renderProducts() {
    $all('[data-sv="products"]').forEach(function (ul) {
      var items = productList()
      ul.innerHTML = items.map(function (item, index) {
        var p = item.p
        var category = T.categories[p.category] || p.category
        var weight = fill(T.weightValue, { weight: String(p.weightGrams) })
        return '<li class="w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"><div class="h-full" style="opacity:0;transform:translateY(24px)" data-delay="' + ((index % 3) * 0.1) + '">' +
          '<article class="group flex h-full hover-lift flex-col overflow-hidden rounded-lg border border-line bg-surface-raised shadow-card hover:border-accent/60">' +
          '<div class="theme-dark relative aspect-[4/3] overflow-hidden bg-surface"><img alt="" loading="lazy" decoding="async" class="object-cover transition-transform duration-700 ease-out group-hover:scale-110" style="position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent" src="' + esc(url(p.image)) + '">' +
          '<span aria-hidden="true" class="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/15 transition-[left] duration-1000 ease-out group-hover:left-[130%]"></span>' +
          '<span aria-hidden="true" class="pointer-events-none absolute inset-3 rounded-md border border-accent/40 transition-all duration-500 ease-out group-hover:inset-2 group-hover:border-accent"></span>' +
          '<span class="absolute top-5 left-5 rounded-full border border-accent/50 bg-plum-950/80 px-3 py-1 t-label text-accent">' + esc(category) + '</span>' +
          '<span class="absolute top-4 right-4 grid size-16 place-items-center rounded-full border-2 border-gold-500 bg-accent text-center text-sm leading-4 font-bold text-on-cta shadow-foil transition-transform duration-500 group-hover:rotate-[-8deg]">' + esc(weight) + '</span>' +
          (item.sample ? '<span class="absolute bottom-5 left-5 rounded-sm bg-peacock-pink px-2 py-0.5 text-xs font-semibold text-white">' + esc(T.sample) + '</span>' : '') +
          '</div><div class="flex flex-1 flex-col p-5 md:p-6"><p class="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">' + esc(p.code) + '</p>' +
          '<h3 class="mt-1 t-h3 transition-colors group-hover:text-accent">' + esc(local(p.name)) + '</h3>' +
          '<p class="mt-2 line-clamp-2 min-h-[2lh] text-ink-muted">' + esc(local(p.description)) + '</p>' +
          '<p class="mt-5 border-t border-line pt-4 text-sm text-ink-muted">' + esc(T.priceNote) + '</p>' +
          '<a href="' + esc(askPriceUrl(p)) + '" target="_blank" rel="noopener noreferrer" class="' + BTN + ' bg-peacock-green text-white hover:bg-peacock-green/90 group/book mt-4 w-full">' + ICON_WA + esc(T.askPrice) + ICON_ARROW + '</a>' +
          '</div></article></div></li>'
      }).join('')
    })
  }

  // ---------- pop-up layers (product dialog, mobile menu) ----------
  var layer = null
  function openLayer(html, trigger, animatedClose) {
    if (layer) layer.close()
    var wrap = document.createElement('div')
    wrap.innerHTML = html
    var nodes = Array.prototype.slice.call(wrap.childNodes)
    nodes.forEach(function (n) { body.appendChild(n) })
    var overlay = nodes[0]
    var panel = nodes[nodes.length - 1]
    var oldOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    if (trigger) trigger.setAttribute('aria-expanded', 'true')

    function close() {
      if (!layer || layer.panel !== panel) return
      layer = null
      document.removeEventListener('keydown', onKey)
      if (trigger) { trigger.setAttribute('aria-expanded', 'false'); trigger.focus() }
      body.style.overflow = oldOverflow
      var done = function () { overlay.remove(); panel.remove() }
      if (animatedClose && !reducedMotion) {
        overlay.setAttribute('data-state', 'closed')
        panel.setAttribute('data-state', 'closed')
        setTimeout(done, 230)
      } else done()
    }
    function onKey(e) {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        var f = $all('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', panel).filter(function (el) { return !el.closest('[hidden]') })
        if (!f.length) return
        var first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    overlay.addEventListener('click', close)
    panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) close()
      else if (e.target.closest('a[href]') && !e.target.closest('a[target="_blank"]')) close()
    })
    document.addEventListener('keydown', onKey)
    layer = { panel: panel, close: close }
    var focusTarget = panel.querySelector('[data-close]') || panel
    setTimeout(function () { focusTarget.focus() }, 0)
    return panel
  }

  // ---------- header: desktop dropdowns ----------
  function setupDropdowns() {
    $all('header nav li.relative').forEach(function (li) {
      var btn = li.querySelector(':scope > button[aria-expanded]')
      var panel = li.querySelector(':scope > div')
      if (!btn || !panel) return
      var chevron = btn.querySelector('svg')
      function set(open) {
        btn.setAttribute('aria-expanded', String(open))
        panel.classList.toggle('hidden', !open)
        if (chevron) chevron.classList.toggle('rotate-180', open)
      }
      li.addEventListener('mouseenter', function () { set(true) })
      li.addEventListener('mouseleave', function () { set(false) })
      btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true') })
      li.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus() } })
      li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) set(false) })
    })
  }

  // ---------- header: mobile menu drawer ----------
  /** Page name from an address: "/mr/about" or "about.html" → "about", "/", "./", "index.html" → "". */
  function pageName(p) {
    var f = String(p || '').split('#')[0].split('?')[0].split('/').pop() || ''
    f = f.replace(/\.html$/, '')
    return f === 'index' || f === '.' ? '' : f
  }
  function currentFile() { return pageName(location.pathname) }

  function setupMobileMenu() {
    var tpl = document.getElementById('sv-sheet')
    var trigger = document.querySelector('header button[aria-haspopup="dialog"]')
    if (!tpl || !trigger) return
    trigger.addEventListener('click', function () {
      var panel = openLayer(tpl.innerHTML, trigger, true)
      var closeBtn = panel.querySelector('button[aria-label]')
      if (closeBtn) closeBtn.setAttribute('data-close', '')
      var here = currentFile()
      var TOP_ON = ['bg-surface-raised', 'text-accent'], TOP_OFF = ['text-ink', 'hover:bg-surface-raised']
      var SUB_ON = ['bg-surface-raised', 'text-accent'], SUB_OFF = ['text-ink-muted', 'hover:bg-surface-raised', 'hover:text-ink']
      $all('nav a[href]', panel).forEach(function (a) {
        var file = pageName(a.getAttribute('href'))
        var sub = !!a.closest('ul[id^="menu-group-"]')
        var on = file === here
        var add = sub ? (on ? SUB_ON : SUB_OFF) : (on ? TOP_ON : TOP_OFF)
        var remove = sub ? (on ? SUB_OFF : SUB_ON) : (on ? TOP_OFF : TOP_ON)
        remove.forEach(function (c) { a.classList.remove(c) })
        add.forEach(function (c) { a.classList.add(c) })
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current')
      })
      // Groups (Services): open the one holding the current page; the button folds it
      $all('button[aria-controls^="menu-group-"]', panel).forEach(function (btn) {
        var list = panel.querySelector('#' + btn.getAttribute('aria-controls'))
        var chevron = btn.querySelectorAll('svg')[1]
        function set(open) {
          btn.setAttribute('aria-expanded', String(open))
          if (open) list.removeAttribute('hidden'); else list.setAttribute('hidden', '')
          if (chevron) { chevron.classList.toggle('rotate-180', open); chevron.classList.toggle('text-accent', open) }
        }
        set(!!list.querySelector('[aria-current="page"]'))
        btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true') })
      })
      // Language links: same page in the other language, taken from this page's own switch
      var pageLinks = {}
      $all('a[hreflang]').forEach(function (a) { if (!panel.contains(a)) pageLinks[a.getAttribute('hreflang')] = a.getAttribute('href') })
      $all('a[hreflang]', panel).forEach(function (a) {
        var code = a.getAttribute('hreflang')
        if (pageLinks[code]) a.setAttribute('href', pageLinks[code])
      })
    })
  }

  // ---------- hero slides ----------
  function setupSliders() {
    $all('[role="region"]').forEach(function (region) {
      var slides = $all(':scope > .grid > [role="group"]', region)
      if (slides.length < 2) return
      var controls = region.querySelector(':scope > div:not(.grid)')
      if (!controls) return
      var buttons = $all('button', controls)
      var prev = buttons[0], next = buttons[buttons.length - 2], toggle = buttons[buttons.length - 1]
      var dots = buttons.slice(1, buttons.length - 2)
      var pauseIcon = toggle.innerHTML
      var index = 0, playing = true, engaged = false, timer = null, touchX = null

      function render() {
        slides.forEach(function (s, i) {
          var on = i === index
          s.setAttribute('data-active', String(on))
          if (on) s.removeAttribute('inert'); else s.setAttribute('inert', '')
          s.classList.toggle('opacity-100', on)
          s.classList.toggle('opacity-0', !on)
          s.classList.toggle('pointer-events-none', !on)
        })
        var running = playing && !engaged
        dots.forEach(function (d, i) {
          var on = i === index
          var bar = d.firstElementChild
          if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current')
          bar.classList.toggle('w-10', on)
          bar.classList.toggle('w-3', !on)
          bar.innerHTML = on ? '<span class="block h-full origin-left bg-accent' + (running ? ' animate-slide-progress' : '') + '"></span>' : ''
        })
        toggle.setAttribute('aria-label', playing ? T.pause : T.play)
        toggle.innerHTML = playing ? pauseIcon : ICON_PLAY
        schedule()
      }
      function schedule() {
        clearTimeout(timer)
        if (!playing || engaged || reducedMotion) return
        timer = setTimeout(function () { index = (index + 1) % slides.length; render() }, 3500)
      }
      function go(step) { index = (index + step + slides.length) % slides.length; render() }

      prev.addEventListener('click', function () { go(-1) })
      next.addEventListener('click', function () { go(1) })
      toggle.addEventListener('click', function () { playing = !playing; render() })
      dots.forEach(function (d, i) { d.addEventListener('click', function () { index = i; render() }) })
      // Only keyboard focus holds the slides
      region.addEventListener('focusin', function (e) {
        var kb = false
        try { kb = e.target.matches(':focus-visible') } catch (err) { kb = false }
        if (kb !== engaged) { engaged = kb; render() }
      })
      region.addEventListener('focusout', function () { if (engaged) { engaged = false; render() } })
      region.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX }, { passive: true })
      region.addEventListener('touchend', function (e) {
        if (touchX === null) return
        var moved = e.changedTouches[0].clientX - touchX
        touchX = null
        if (Math.abs(moved) > 48) go(moved < 0 ? 1 : -1)
      })
      render()
    })
  }

  // ---------- FAQ and other accordions ----------
  function setupAccordions() {
    $all('h3[data-orientation] > button[aria-expanded], [data-orientation] > h3 > button[data-state]').forEach(function (btn) {
      if (btn.__sv) return
      btn.__sv = true
      var header = btn.parentElement
      var item = header.parentElement
      var content = header.nextElementSibling
      var root = item.parentElement
      if (!content) return

      function set(it, open) {
        var h = it.querySelector(':scope > h3')
        var b = h && h.querySelector('button')
        var c = h && h.nextElementSibling
        if (!b || !c) return
        var state = open ? 'open' : 'closed'
        ;[it, h, b, c].forEach(function (el) { el.setAttribute('data-state', state) })
        b.setAttribute('aria-expanded', String(open))
        if (open) {
          c.removeAttribute('hidden')
          c.style.setProperty('--radix-collapsible-content-height', c.scrollHeight + 'px')
        } else if (!c.hasAttribute('hidden')) {
          c.style.setProperty('--radix-collapsible-content-height', c.scrollHeight + 'px')
          var hide = function () { if (c.getAttribute('data-state') === 'closed') c.setAttribute('hidden', '') }
          if (reducedMotion) hide(); else setTimeout(hide, 200)
        }
      }
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true'
        // One open at a time in each list
        $all(':scope > [data-state]', root).forEach(function (other) {
          if (other !== item && other.getAttribute('data-state') === 'open') set(other, false)
        })
        set(item, open)
      })
    })
  }

  // ---------- scroll-in animations ----------
  function setupReveal() {
    var els = $all('[style*="opacity:0"]').filter(function (el) { return !el.__sv })
    if (!('IntersectionObserver' in window)) { els.forEach(show); return }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.unobserve(e.target); show(e.target) }
      })
    }, { rootMargin: '0px 0px -60px 0px' })
    els.forEach(function (el) {
      el.__sv = true
      var delay = el.getAttribute('data-delay')
      if (delay == null) {
        // Cards in a row come in one after another, as on the Next.js site
        var li = el.parentElement && el.parentElement.tagName === 'LI' ? el.parentElement : null
        var i = li ? Array.prototype.indexOf.call(li.parentElement.children, li) : 0
        delay = li ? (i % 4) * 0.08 : 0
      }
      if (reducedMotion) el.style.transform = 'none'
      el.style.transition = 'opacity .6s cubic-bezier(.22,1,.36,1) ' + delay + 's, transform .6s cubic-bezier(.22,1,.36,1) ' + delay + 's'
      io.observe(el)
    })
    function show(el) { el.__shown = true; el.style.opacity = '1'; el.style.transform = 'none' }
    // A fast jump down the page can skip a block entirely; show anything already scrolled past
    var pending = false
    window.addEventListener('scroll', function () {
      if (pending) return
      pending = true
      requestAnimationFrame(function () {
        pending = false
        els.forEach(function (el) {
          if (!el.__shown && el.getBoundingClientRect().bottom < 0) { io.unobserve(el); show(el) }
        })
      })
    }, { passive: true })
  }

  // ---------- Lakshmi coin (home page "about" panel) ----------
  function setupCoins() {
    $all('.perspective-\\[800px\\]').forEach(function (coin) {
      if (/animate-/.test(coin.className)) return
      var inner = coin.firstElementChild
      if (!inner) return
      var front = inner.children[0]
      var back = inner.children[1]
      var logo = back && back.querySelector('img')
      function pour() {
        var old = inner.querySelector('[data-pour]')
        if (old) old.remove()
        var box = document.createElement('div')
        box.setAttribute('data-pour', '')
        box.className = 'pointer-events-none absolute top-[48%] left-[34%] h-[55%] w-[12%] backface-hidden motion-reduce:hidden'
        box.style.transform = 'translateZ(1px)'
        var lefts = [25, 0, 50, 10, 40], html = ''
        for (var i = 0; i < 40; i++) {
          html += '<span class="absolute top-0 aspect-square w-3/5 animate-coin-drop rounded-full border border-gold-800 bg-linear-to-br from-gold-200 via-gold-400 to-gold-500 shadow-foil" style="left:' + lefts[i % 5] + '%;animation-delay:' + (1 + i * 0.07).toFixed(2) + 's"></span>'
        }
        box.innerHTML = html
        inner.insertBefore(box, back)
      }
      function play() {
        coin.classList.add('animate-loader-coin-in')
        inner.classList.add('animate-coin-loop', 'motion-reduce:rotate-y-180', 'motion-reduce:animate-none')
        if (front) front.insertAdjacentHTML('beforeend', '<span class="absolute inset-y-0 -left-1/2 w-1/3 animate-loader-coin-shine bg-linear-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden"></span>')
        if (logo) logo.classList.add('animate-loader-glow')
        pour()
        inner.addEventListener('animationiteration', function (e) {
          if (e.target === inner && e.animationName === 'coin-loop') pour()
        })
      }
      if (!('IntersectionObserver' in window)) { play(); return }
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); play() }
      }, { threshold: 0.5 })
      io.observe(coin)
    })
  }

  // ---------- floating Call / WhatsApp buttons ----------
  function setupFloating() {
    var shell = document.querySelector('.floating-actions')
    if (!shell) return
    var targets = $all('[data-hero-cta]')
    if (!targets.length || !('IntersectionObserver' in window)) { shell.setAttribute('data-show', 'true'); return }
    // Held back while a hero's own Call / WhatsApp buttons are on screen
    var inView = []
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = inView.indexOf(e.target)
        if (e.isIntersecting && i < 0) inView.push(e.target)
        if (!e.isIntersecting && i >= 0) inView.splice(i, 1)
      })
      shell.setAttribute('data-show', String(inView.length === 0))
    })
    targets.forEach(function (t) { obs.observe(t) })
  }

  // ---------- legal pages: "On this page" ----------
  function setupLegalToc() {
    var nav = document.querySelector('nav[aria-labelledby="legal-toc"]')
    if (!nav) return
    var links = $all('ol a', nav)
    var bar = nav.querySelector('span[aria-hidden] > span')
    var sections = links.map(function (_, i) { return document.getElementById('section-' + (i + 1)) }).filter(Boolean)
    var ON_LINK = ['lg:bg-surface-sunken', 'lg:text-accent'], ON_NUM = ['lg:border-cta', 'lg:bg-cta', 'lg:text-on-cta']
    function update() {
      var line = window.innerHeight / 3, current = 0
      sections.forEach(function (s, i) { if (s.getBoundingClientRect().top <= line) current = i })
      links.forEach(function (a, i) {
        var on = i === current
        var num = a.querySelector('span')
        ON_LINK.forEach(function (c) { a.classList.toggle(c, on) })
        if (num) ON_NUM.forEach(function (c) { num.classList.toggle(c, on) })
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current')
      })
      var first = sections[0], last = sections[sections.length - 1]
      if (first && last && bar) {
        var start = first.getBoundingClientRect().top + window.scrollY - line
        var end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight
        var ratio = end > start ? (window.scrollY - start) / (end - start) : 1
        bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')'
      }
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
  }

  // ---------- brand loader while moving to another page (as on the Next.js site) ----------
  function setupNavLoader() {
    var tpl = document.getElementById('sv-loader')
    if (!tpl || !tpl.innerHTML.trim()) return
    var timer = null, cover = null
    function hide() {
      clearTimeout(timer); timer = null
      if (cover) { cover.remove(); cover = null }
    }
    function start() {
      hide()
      // Fast page changes finish before this, so the loader never flashes on a good connection
      timer = setTimeout(function () {
        cover = document.createElement('div')
        cover.className = 'theme-dark fixed inset-0 z-[70] grid animate-fade place-items-center bg-surface text-ink'
        cover.innerHTML = tpl.innerHTML
        body.appendChild(cover)
        setTimeout(hide, 15000)
      }, 300)
    }
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      var a = e.target.closest && e.target.closest('a[href]')
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      var u
      try { u = new URL(a.href, location.href) } catch (err) { return }
      if (u.protocol !== location.protocol || u.host !== location.host) return
      if (u.pathname === location.pathname) return
      if (/\/admin(\/|$)/.test(u.pathname)) return
      start()
    })
    // Back/forward cache: the old page comes back with the loader still on it
    window.addEventListener('pageshow', hide)
  }

  // ---------- start ----------
  function run(fn) { try { fn() } catch (e) { if (window.console) console.error(e) } }
  run(renderRates)
  run(renderVideos)
  run(renderProducts)
  run(setupVideos)
  run(setupDropdowns)
  run(setupMobileMenu)
  run(setupSliders)
  run(setupAccordions)
  run(setupReveal)
  run(setupCoins)
  run(setupFloating)
  run(setupLegalToc)
  run(setupNavLoader)
})()
