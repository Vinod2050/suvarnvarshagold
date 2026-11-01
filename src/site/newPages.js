// The three pages the original site did not have (Book a visit, Gold rate, Customer videos), built from the
// original page shell (privacy-policy.html: same <head>, top bar, header, hero, footer and animations) with
// sections in the original style. Only classes from the original stylesheet are used, plus assets/css/extra.css.
const { esc, inr, dateText } = require('../views/util');
const { todayIndia } = require('../utils/security');

const ORNAMENT =
  '<svg aria-hidden="true" viewBox="0 0 120 12" class="block h-3 w-[120px] text-accent mt-4 lg:xshort:mt-2 mx-auto" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M0 6h44M76 6h44"></path><path d="M60 1l5 5-5 5-5-5z" fill="currentColor"></path><circle cx="50" cy="6" r="1" fill="currentColor" stroke="none"></circle><circle cx="70" cy="6" r="1" fill="currentColor" stroke="none"></circle></svg>';
const BTN = 't-label inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 text-center btn-motion disabled:pointer-events-none disabled:opacity-60 [&amp;_svg]:size-5 [&amp;_svg]:shrink-0';
const ICON_WA =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.34zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.48-8.4z"></path></svg>';
const ICON_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check size-4 shrink-0 text-accent" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
const ICON_VIDEO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>';

const reveal = (delay = 0) => `data-delay="${delay}" style="opacity:0;transform:translateY(24px)"`;

function sectionHead(id, eyebrow, title, text) {
  return `<div class="mb-8 md:mb-12 md:short:mb-8 lg:short:mb-8 lg:xshort:mb-5 mx-auto max-w-2xl text-center" ${reveal()}><p class="mb-2 t-eyebrow">${esc(eyebrow)}</p><h2 id="${id}" class="t-h2">${esc(title)}</h2>${ORNAMENT}${text ? `<p class="mt-3 t-body-lg text-ink-muted">${esc(text)}</p>` : ''}</div>`;
}

const SERVICES = ['sell_gold', 'sell_silver', 'release_pledged', 'buy_gold', 'other'];

const TEXT = {
  en: {
    booking: {
      title: 'Book a Visit | Suvarnavarsha Gold, Dange Chowk, Pune',
      description: 'Book a visit to Suvarnavarsha Gold, Dange Chowk, Pune to sell old gold, release pledged gold or buy 24K gold. We confirm on WhatsApp.',
      crumb: 'Book a visit',
      eyebrow: 'Book a visit',
      h1: 'Book your visit',
      lead: 'Choose a day and the service you need. WhatsApp opens with your details, so you can send them to our team.',
      formEyebrow: 'Book on WhatsApp',
      formTitle: 'Tell us when you will come',
      required: 'Fields marked * are required.',
      name: 'Your name',
      phone: 'Mobile number',
      phoneHelp: '10-digit mobile number',
      service: 'What do you need?',
      choose: 'Choose a service',
      services: { sell_gold: 'Sell old gold', sell_silver: 'Sell silver', release_pledged: 'Release pledged gold', buy_gold: 'Buy 24K gold', other: 'Other' },
      date: 'Preferred date',
      message: 'Message (optional)',
      messageHelp: 'For example: approximate weight, or a time that suits you.',
      note: 'Your details go straight to our WhatsApp; nothing is stored on this website.',
      submit: 'Continue on WhatsApp',
      okTitle: 'Opening WhatsApp…',
      okText: 'Please press Send in WhatsApp so our team can confirm your visit. If WhatsApp did not open, use the button below.',
      okButton: 'Open WhatsApp',
      wa: { hello: 'Hello, I would like to book a visit.', name: 'Name', phone: 'Mobile', service: 'Service', date: 'Date', message: 'Message' },
      errors: {
        name: 'Please enter your name.',
        phone: 'Please enter a 10-digit mobile number.',
        service: 'Please choose a service.',
        booking_date: 'Please choose a date from today up to 90 days ahead.',
      },
      asideTitle: 'Prefer to talk?',
      asideText: 'Call us and our team will book the visit for you.',
      bring: 'Please bring',
      bringList: ['A valid government photo ID, such as your Aadhaar card', 'Your gold, and the loan papers if your gold is pledged', 'To buy 24K gold, register in advance. Registration is free'],
    },
    rate: {
      title: 'Gold Rate Today in Pune: 24K, 22K & Silver | Suvarnavarsha',
      description: 'Today’s gold rate in Pune per gram for 24K (999), 22K and 18K gold and silver per kg, from Suvarnavarsha Gold, Dange Chowk. Updated daily.',
      crumb: 'Today’s rate',
      eyebrow: 'Today’s rate',
      h1: 'Today’s gold rate in Pune',
      lead: 'Our buying rates for 24K, 22K and 18K gold per gram and silver per kg, updated by our team every day.',
      historyEyebrow: 'Rate history',
      historyTitle: 'Rates for the last 30 days',
      date: 'Date',
      units: 'Gold in ₹ per gram, silver in ₹ per kg. Rates are indicative; the final price is decided after purity testing at the branch.',
      none: 'Earlier rates will appear here once they are saved.',
      howTitle: 'How is the price of my gold calculated?',
      howText: 'Price = weight × purity × today’s rate. We weigh your gold and test its purity in front of you, then calculate the value using the day’s rate.',
      book: 'Book a visit',
    },
    videos: {
      title: 'Customer Videos | Suvarnavarsha Gold, Pune',
      description: 'Watch customers of Suvarnavarsha Gold, Dange Chowk, Pune talk about selling old gold and releasing pledged gold with us.',
      crumb: 'Customer videos',
      eyebrow: 'Customer feedback',
      h1: 'Hear it from our customers',
      lead: 'Real customers talk about their visit. Every video is shared with the customer’s permission.',
      emptyTitle: 'Customer videos are coming soon',
      emptyText: 'We will share videos here once our customers allow us to. Meanwhile, call or WhatsApp us with any question.',
    },
    links: { booking: 'Book a visit', 'gold-rate': 'Today’s rate', feedback: 'Customer videos' },
  },
  mr: {
    booking: {
      title: 'भेटीची वेळ बुक करा | सुवर्णवर्षा गोल्ड, डांगे चौक, पुणे',
      description: 'जुने सोने विकण्यासाठी, गहाण सोने सोडवण्यासाठी किंवा 24 कॅरेट सोने खरेदीसाठी सुवर्णवर्षा गोल्ड, डांगे चौक येथे भेटीची वेळ बुक करा.',
      crumb: 'भेटीची वेळ',
      eyebrow: 'भेटीची वेळ',
      h1: 'भेटीची वेळ बुक करा',
      lead: 'दिवस आणि हवी असलेली सेवा निवडा. तुमच्या माहितीसह व्हॉट्सॲप उघडते, ती आमच्या टीमला पाठवा.',
      formEyebrow: 'व्हॉट्सॲपवर बुकिंग',
      formTitle: 'तुम्ही कधी येणार ते सांगा',
      required: '* असलेली माहिती आवश्यक आहे.',
      name: 'तुमचे नाव',
      phone: 'मोबाईल नंबर',
      phoneHelp: '10 अंकी मोबाईल नंबर',
      service: 'तुम्हाला काय हवे आहे?',
      choose: 'सेवा निवडा',
      services: { sell_gold: 'जुने सोने विक्री', sell_silver: 'चांदी विक्री', release_pledged: 'गहाण सोने सोडवणे', buy_gold: '24 कॅरेट सोने खरेदी', other: 'इतर' },
      date: 'सोयीचा दिनांक',
      message: 'संदेश (ऐच्छिक)',
      messageHelp: 'उदा.: अंदाजे वजन किंवा तुमच्या सोयीची वेळ.',
      note: 'तुमची माहिती थेट आमच्या व्हॉट्सॲपवर जाते; ती या वेबसाइटवर साठवली जात नाही.',
      submit: 'व्हॉट्सॲपवर पुढे जा',
      okTitle: 'व्हॉट्सॲप उघडत आहे…',
      okText: 'आमची टीम भेटीची खात्री करू शकेल यासाठी कृपया व्हॉट्सॲपमध्ये Send दाबा. व्हॉट्सॲप उघडले नाही तर खालील बटण वापरा.',
      okButton: 'व्हॉट्सॲप उघडा',
      wa: { hello: 'नमस्कार, मला भेटीची वेळ हवी आहे.', name: 'नाव', phone: 'मोबाईल', service: 'सेवा', date: 'दिनांक', message: 'संदेश' },
      errors: {
        name: 'कृपया तुमचे नाव लिहा.',
        phone: 'कृपया 10 अंकी मोबाईल नंबर लिहा.',
        service: 'कृपया सेवा निवडा.',
        booking_date: 'कृपया आजपासून 90 दिवसांपर्यंतचा दिनांक निवडा.',
      },
      asideTitle: 'बोलायला आवडेल?',
      asideText: 'आम्हाला कॉल करा, आमची टीम तुमची भेट बुक करेल.',
      bring: 'सोबत आणा',
      bringList: ['वैध सरकारी फोटो ओळखपत्र, उदा. आधार कार्ड', 'तुमचे सोने, आणि सोने गहाण असल्यास कर्जाची कागदपत्रे', '24 कॅरेट सोने खरेदीसाठी आधी नोंदणी करा. नोंदणी मोफत आहे'],
    },
    rate: {
      title: 'आजचा सोन्याचा दर, पुणे: 24K, 22K, चांदी | सुवर्णवर्षा',
      description: 'पुण्यातील आजचा 24K (999), 22K आणि 18K सोन्याचा प्रति ग्रॅम आणि चांदीचा प्रति किलो दर - सुवर्णवर्षा गोल्ड, डांगे चौक. रोज अपडेट.',
      crumb: 'आजचा दर',
      eyebrow: 'आजचा दर',
      h1: 'पुण्यातील आजचा सोन्याचा दर',
      lead: '24K, 22K आणि 18K सोन्याचा प्रति ग्रॅम आणि चांदीचा प्रति किलो खरेदी दर, आमची टीम रोज अपडेट करते.',
      historyEyebrow: 'मागील दर',
      historyTitle: 'मागील 30 दिवसांचे दर',
      date: 'दिनांक',
      units: 'सोने ₹ प्रति ग्रॅम, चांदी ₹ प्रति किलो. दर सूचक आहेत; अंतिम किंमत शाखेत शुद्धता तपासणीनंतर ठरते.',
      none: 'मागील दर जतन झाल्यावर येथे दिसतील.',
      howTitle: 'माझ्या सोन्याची किंमत कशी ठरते?',
      howText: 'किंमत = वजन × शुद्धता × आजचा दर. आम्ही तुमच्या समोर सोन्याचे वजन करतो आणि शुद्धता तपासतो, त्यानंतर त्या दिवसाच्या दराने किंमत काढतो.',
      book: 'भेटीची वेळ बुक करा',
    },
    videos: {
      title: 'ग्राहक व्हिडिओ | सुवर्णवर्षा गोल्ड, पुणे',
      description: 'सुवर्णवर्षा गोल्ड, डांगे चौक, पुणे येथील ग्राहक जुने सोने विक्री आणि गहाण सोने सोडवण्याचा अनुभव सांगतात.',
      crumb: 'ग्राहक व्हिडिओ',
      eyebrow: 'ग्राहकांचा अभिप्राय',
      h1: 'ग्राहकांच्या तोंडून ऐका',
      lead: 'आमचे ग्राहक त्यांचा अनुभव सांगतात. प्रत्येक व्हिडिओ ग्राहकाच्या परवानगीनेच दाखवला जातो.',
      emptyTitle: 'ग्राहक व्हिडिओ लवकरच',
      emptyText: 'ग्राहकांनी परवानगी दिल्यावर आम्ही व्हिडिओ येथे दाखवू. तोपर्यंत काही प्रश्न असल्यास कॉल किंवा व्हॉट्सॲप करा.',
    },
    links: { booking: 'भेटीची वेळ बुक करा', 'gold-rate': 'आजचा दर', feedback: 'ग्राहक व्हिडिओ' },
  },
};

// ---------- page bodies ----------
function bookingBody(lang, ctx) {
  const t = TEXT[lang].booking;
  const today = todayIndia();
  const max = todayIndia(new Date(Date.now() + 90 * 86400000));
  const pre = SERVICES.includes(ctx.query.service) ? ctx.query.service : '';
  const req = ' <span class="svx-req" aria-hidden="true">*</span>';
  const field = (name, label, input, help) =>
    `<div class="svx-field"><label class="t-label text-ink" for="b-${name}">${label}</label>${input}${help ? `<p class="svx-help" id="b-${name}-help">${esc(help)}</p>` : ''}<p class="svx-error" id="b-${name}-err" role="alert"></p></div>`;
  // Nothing is sent to the server: booking.js writes the WhatsApp message from these fields.
  // (wa.me/918805942424 is swapped for the WhatsApp number from Settings like every other link.)
  const waData = { url: 'https://wa.me/918805942424', text: t.wa, services: t.services };
  return `<section aria-labelledby="booking-title" class="bg-surface section-y text-ink"><div class="container-site">
${sectionHead('booking-title', t.formEyebrow, t.formTitle)}
<div class="svx-booking">
  <div class="rounded-lg border border-line bg-surface-raised p-6 shadow-card md:p-8" ${reveal()}>
    <form id="booking-form" class="svx-form" novalidate data-errors="${esc(JSON.stringify(t.errors))}" data-wa="${esc(JSON.stringify(waData))}">
      <p class="text-sm text-ink-muted">${esc(t.required)}</p>
      ${field('name', esc(t.name) + req, '<input class="svx-input" id="b-name" name="name" autocomplete="name" required minlength="2" maxlength="100" aria-describedby="b-name-err">')}
      ${field('phone', esc(t.phone) + req, '<input class="svx-input" id="b-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" required maxlength="14" aria-describedby="b-phone-help b-phone-err">', t.phoneHelp)}
      <div class="svx-two">
        ${field('service', esc(t.service) + req, `<select class="svx-input" id="b-service" name="service" required aria-describedby="b-service-err"><option value="">${esc(t.choose)}</option>${SERVICES.map((k) => `<option value="${k}"${k === pre ? ' selected' : ''}>${esc(t.services[k])}</option>`).join('')}</select>`)}
        ${field('booking_date', esc(t.date) + req, `<input class="svx-input" id="b-booking_date" name="booking_date" type="date" required min="${today}" max="${max}" value="${today}" aria-describedby="b-booking_date-err">`)}
      </div>
      ${field('message', esc(t.message), '<textarea class="svx-input" id="b-message" name="message" rows="3" maxlength="1000" aria-describedby="b-message-help b-message-err"></textarea>', t.messageHelp)}
      <button type="submit" class="${BTN} bg-peacock-green text-white hover:bg-peacock-green/90 w-full">${ICON_WA}<span>${esc(t.submit)}</span></button>
      <p class="text-sm text-ink-muted text-center">${esc(t.note)}</p>
    </form>
    <div id="booking-done" class="svx-done" tabindex="-1" role="status" hidden>
      <span class="svx-done-icon" aria-hidden="true">✓</span>
      <h3 class="mt-4 t-h3">${esc(t.okTitle)}</h3>
      <p class="mt-2 text-ink-muted">${esc(t.okText)}</p>
      <a id="booking-wa" href="#" target="_blank" rel="noopener noreferrer" class="${BTN} bg-peacock-green text-white hover:bg-peacock-green/90 mt-5">${ICON_WA}${esc(t.okButton)}</a>
    </div>
  </div>
  <aside class="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line p-6 shadow-card theme-dark bg-surface text-ink md:p-8" ${reveal(0.08)}>
    <div aria-hidden="true" class="foil-edge foil-shimmer absolute inset-x-0 top-0"></div>
    <h3 class="t-h3 text-accent">${esc(t.asideTitle)}</h3>
    <p class="mt-2 text-ink-muted">${esc(t.asideText)}</p>
    <ul class="mt-3"><li><a href="tel:+918805942424" class="inline-flex min-h-11 items-center text-lg font-bold whitespace-nowrap hover:text-accent">8805-94-2424</a></li><li><a href="tel:+918805982424" class="inline-flex min-h-11 items-center text-lg font-bold whitespace-nowrap hover:text-accent">8805-98-2424</a></li></ul>
    <h4 class="mt-6 t-label text-accent">${esc(t.bring)}</h4>
    <ul class="mt-3 space-y-3">${t.bringList.map((x) => `<li class="flex items-start gap-2 text-ink-muted">${ICON_CHECK.replace('size-4 shrink-0', 'size-4 shrink-0 mt-1')}<span>${esc(x)}</span></li>`).join('')}</ul>
  </aside>
</div>
</div></section>`;
}

function rateBody(lang, ctx, data) {
  const t = TEXT[lang].rate;
  const root = lang === 'mr' ? '../mr/' : '';
  const show18 = data.history.some((r) => r.gold_18k);
  const showAg = data.history.some((r) => r.silver_kg);
  const cell = (v) => (v ? esc(inr(v)) : '–');
  const table = data.history.length
    ? `<div class="overflow-hidden rounded-lg border border-line bg-surface-raised shadow-card" ${reveal()}><div class="svx-table-wrap"><table class="svx-table">
  <caption class="sr-only">${esc(t.historyTitle)}</caption>
  <thead><tr><th scope="col">${esc(t.date)}</th><th scope="col">24K (999)</th><th scope="col">22K</th>${show18 ? '<th scope="col">18K</th>' : ''}${showAg ? `<th scope="col">${lang === 'mr' ? 'चांदी' : 'Silver'}</th>` : ''}</tr></thead>
  <tbody>${data.history.map((r) => `<tr><th scope="row">${esc(dateText(r.effective_date, lang))}</th><td data-label="24K (999)">${cell(r.gold_24k)}</td><td data-label="22K">${cell(r.gold_22k)}</td>${show18 ? `<td data-label="18K">${cell(r.gold_18k)}</td>` : ''}${showAg ? `<td data-label="${lang === 'mr' ? 'चांदी' : 'Silver'}">${cell(r.silver_kg)}</td>` : ''}</tr>`).join('')}</tbody>
</table></div><p class="flex items-start gap-2 border-t border-line bg-surface-sunken px-5 py-3 text-sm text-ink-muted md:px-7">${esc(t.units)}</p></div>`
    : `<p class="text-center text-ink-muted">${esc(t.none)}</p>`;
  return `${ctx.ratesSection}
<section aria-labelledby="history-title" class="bg-surface section-y text-ink"><div class="container-site">
${sectionHead('history-title', t.historyEyebrow, t.historyTitle)}
<div class="mx-auto max-w-3xl">${table}
  <div class="group relative mt-8 flex flex-col overflow-hidden rounded-lg border border-line p-6 shadow-card theme-dark bg-surface text-ink md:p-8" ${reveal()}>
    <div aria-hidden="true" class="foil-edge foil-shimmer absolute inset-x-0 top-0"></div>
    <h3 class="t-h3 text-accent">${esc(t.howTitle)}</h3>
    <p class="mt-2 text-ink-muted">${esc(t.howText)}</p>
    <a href="${root}booking?service=sell_gold" class="group/action mt-4 inline-flex min-h-11 items-center gap-2 t-label text-accent hover:underline">${esc(t.book)} →</a>
  </div>
</div>
</div></section>`;
}

function videosBody(lang, ctx, data) {
  const t = TEXT[lang].videos;
  if (!data.feedback.length) {
    return `<section aria-labelledby="videos-empty" class="bg-surface section-y text-ink"><div class="container-site"><div class="mx-auto max-w-2xl rounded-lg border border-line bg-surface-raised p-8 text-center shadow-card" ${reveal()}>
  <span class="mx-auto grid size-[52px] place-items-center rounded-full border border-accent/60 bg-surface-sunken text-accent [&amp;_svg]:size-7">${ICON_VIDEO}</span>
  <h2 id="videos-empty" class="mt-4 t-h3">${esc(t.emptyTitle)}</h2>
  <p class="mt-2 text-ink-muted">${esc(t.emptyText)}</p>
</div></div></section>${data.advertisements.length ? '<div data-sv-videos="adverts" data-limit="12"></div>' : ''}`;
  }
  return '<div data-sv-videos="feedback" data-limit="60"></div><div data-sv-videos="adverts" data-limit="12"></div>';
}

const PAGES = {
  booking: { key: 'booking', body: bookingBody, needs: [], script: 'booking.js' },
  'gold-rate': { key: 'rate', body: rateBody, needs: ['history'] },
  feedback: { key: 'videos', body: videosBody, needs: ['feedback', 'advertisements'] },
};

// ---------- building a page from the privacy-policy shell ----------
// shell: privacy-policy.html in the same language; index: index.html in the same language (for the rates section).
function build(slug, lang, shell, index, ctx, data) {
  const page = PAGES[slug];
  const t = TEXT[lang][page.key];
  let h = shell;
  const site = 'https://suvarnvarshagold.com';
  // Addresses of this page
  h = h.split(`${site}/mr/privacy-policy`).join(`${site}/mr/${slug}`).split(`${site}/privacy-policy`).join(`${site}/${slug}`);
  h = h.replace(/href="((?:\.\.\/)?(?:mr\/)?)privacy-policy">(English|मराठी)<\/a>/g, `href="$1${slug}">$2</a>`);
  h = h.replace('data-page="privacy-policy"', `data-page="${slug}"`);
  // Title and descriptions
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(t.title)}</title>`);
  h = h.replace(/(<meta name="description" content=")[^"]*/, `$1${esc(t.description)}`);
  h = h.replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(t.title)}`).replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(t.description)}`);
  h = h.replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${esc(t.title)}`).replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${esc(t.description)}`);
  // Page schema inside <main>
  const url = `${site}/${lang === 'mr' ? 'mr/' : ''}${slug}`;
  const home = `${site}${lang === 'mr' ? '/mr' : ''}`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: t.title, description: t.description, inLanguage: lang === 'mr' ? 'mr-IN' : 'en-IN', isPartOf: { '@id': `${site}/#website` }, about: { '@id': `${site}/#store` }, breadcrumb: { '@id': `${url}#breadcrumb` } },
      { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [{ '@type': 'ListItem', position: 1, name: lang === 'mr' ? 'मुख्यपृष्ठ' : 'Home', item: home }, { '@type': 'ListItem', position: 2, name: t.crumb, item: url }] },
    ],
  };
  h = h.replace(/(<main id="main">)<script type="application\/ld\+json">[\s\S]*?<\/script>/, `$1<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  // Hero texts
  h = h.replace(/(<li aria-current="page" class="text-ink">)[^<]*(<\/li>)/, `$1${esc(t.crumb)}$2`);
  h = h.replace(/(<p class="mb-3 animate-rise t-eyebrow[^"]*">)[^<]*(<\/p>)/, `$1${esc(t.eyebrow)}$2`);
  h = h.replace(/(<h1 class="[^"]*">)[^<]*(<\/h1>)/, `$1${esc(t.h1)}$2`);
  h = h.replace(/(<p class="mt-4 measure animate-rise t-body-lg[^"]*">)[^<]*(<\/p>)/, `$1${esc(t.lead)}$2`);
  // Remove the "Last updated" pill of the legal page
  h = h.replace(/<p class="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface-sunken px-4 py-1\.5[\s\S]*?<\/p>/, '');
  // Body: between the hero and the closing call-to-action band
  const heroEnd = h.indexOf('</section>', h.indexOf('<main id="main">')) + '</section>'.length;
  const ctaStart = h.lastIndexOf('<section class="theme-dark relative isolate overflow-hidden bg-surface text-ink">');
  const ratesSection = (/<section id="rates"[\s\S]*?<\/section>/.exec(index) || [''])[0];
  h = h.slice(0, heroEnd) + page.body(lang, { ...ctx, ratesSection }, data) + h.slice(ctaStart);
  // Extra styles / script for these pages
  const root = lang === 'mr' ? '../' : '';
  h = h.replace('</head>', `<link rel="stylesheet" href="${root}assets/css/extra.css?v=3"/></head>`);
  if (page.script) h = h.replace('</body>', `<script src="${root}assets/js/${page.script}?v=3" defer></script></body>`);
  return h;
}

// Adds the new pages to the footer "Quick links" list of every page (header menu stays as in the original).
function addFooterLinks(html, lang) {
  const navStart = html.indexOf(lang === 'mr' ? '<nav aria-label="महत्त्वाचे दुवे">' : '<nav aria-label="Quick links">');
  if (navStart < 0) return html;
  const ulEnd = html.indexOf('</ul>', navStart);
  const sample = /<li><a class="group inline-flex[^"]*" href="([^"]*)">(<svg[\s\S]*?<\/svg>)[^<]*<\/a><\/li>/.exec(html.slice(navStart, ulEnd));
  if (!sample) return html;
  const prefix = lang === 'mr' ? '../mr/' : '';
  const links = TEXT[lang].links;
  const items = Object.keys(links)
    .map((slug) => sample[0].replace(`href="${sample[1]}"`, `href="${prefix}${slug}"`).replace(/(<\/svg>)[^<]*(<\/a>)/, `$1${esc(links[slug])}$2`))
    .join('');
  return html.slice(0, ulEnd) + items + html.slice(ulEnd);
}

module.exports = { PAGES, build, addFooterLinks };
