/*
 * Suvarnavarsha Gold - website content (rates, videos, products).
 *
 * On the hosting this address is answered by api/data.php with live content from the database
 * (see .htaccess). This file is only used when the site is opened without PHP (local preview)
 * or if the database cannot be reached. The sample products below are always taken from here.
 * Videos are YouTube ids; products have no price (customers ask on WhatsApp).
 */
window.SV_DEFAULT_DATA = {
  "version": 1,
  "whatsapp": "918805942424",
  "showSilver": true,
  "rates": {
    "updatedAt": "2026-10-15T07:32:19Z",
    "gold24k999": 12650,
    "gold22k": 11450,
    "gold18k": 9375,
    "silverKg": 155000
  },
  "adverts": [],
  "feedback": [],
  "products": [
    {
      "id": 1,
      "code": "SG-C-010",
      "category": "coin",
      "weightGrams": 10,
      "image": "images/media/lakshmi-ganesha-coins-800x533.webp",
      "name": { "en": "24K Gold Coin, 10 g", "mr": "24 कॅरेट सोन्याचे नाणे, 10 ग्रॅम" },
      "description": { "en": "A 10 g 24K (999) Lakshmi and Ganesha coin. BIS Hallmark and HUID certified.", "mr": "लक्ष्मी आणि गणपतीचे 10 ग्रॅम 24 कॅरेट (999) सोन्याचे नाणे. BIS हॉलमार्क आणि HUID प्रमाणित." },
      "active": true,
      "createdAt": "2026-10-21T00:00:00Z"
    }
  ]
};

/* Dummy products shown (with a "Sample" badge) while no real product is written in the page's language. */
window.SV_SAMPLE_PRODUCTS = [
  { "code": "SG-C-001", "category": "coin", "weightGrams": 1, "image": "images/stock/product-coin-1g.webp",
    "name": { "en": "24K Gold Coin, 1 g", "mr": "24 कॅरेट सोन्याचे नाणे, 1 ग्रॅम" },
    "description": { "en": "A small 24K (999) coin, suitable for gifting. BIS Hallmark and HUID certified.", "mr": "भेट देण्यासाठी योग्य असे लहान 24 कॅरेट (999) नाणे. BIS हॉलमार्क व HUID प्रमाणित." } },
  { "code": "SG-C-010", "category": "coin", "weightGrams": 10, "image": "images/stock/product-coin-10g.webp",
    "name": { "en": "24K Gold Coin, 10 g", "mr": "24 कॅरेट सोन्याचे नाणे, 10 ग्रॅम" },
    "description": { "en": "A 10 g 24K (999) coin. BIS Hallmark and HUID certified.", "mr": "10 ग्रॅमचे 24 कॅरेट (999) नाणे. BIS हॉलमार्क व HUID प्रमाणित." } },
  { "code": "SG-B-020", "category": "bar", "weightGrams": 20, "image": "images/stock/product-bar-20g.webp",
    "name": { "en": "24K Gold Bar, 20 g", "mr": "24 कॅरेट सोन्याचा बार, 20 ग्रॅम" },
    "description": { "en": "A 20 g 24K (999) bar. BIS Hallmark and HUID certified.", "mr": "20 ग्रॅमचा 24 कॅरेट (999) बार. BIS हॉलमार्क व HUID प्रमाणित." } },
  { "code": "SG-B-050", "category": "bar", "weightGrams": 50, "image": "images/stock/product-bar-50g.webp",
    "name": { "en": "24K Gold Bar, 50 g", "mr": "24 कॅरेट सोन्याचा बार, 50 ग्रॅम" },
    "description": { "en": "A 50 g 24K (999) bar. BIS Hallmark and HUID certified.", "mr": "50 ग्रॅमचा 24 कॅरेट (999) बार. BIS हॉलमार्क व HUID प्रमाणित." } },
  { "code": "SG-K-100", "category": "biscuit", "weightGrams": 100, "image": "images/stock/product-biscuit-100g.webp",
    "name": { "en": "24K Gold Vedhani, 100 g", "mr": "24 कॅरेट सोन्याची वेढणी, 100 ग्रॅम" },
    "description": { "en": "A 100 g 24K (999) Vedhani. BIS Hallmark and HUID certified.", "mr": "100 ग्रॅमची 24 कॅरेट (999) वेढणी. BIS हॉलमार्क व HUID प्रमाणित." } }
];
