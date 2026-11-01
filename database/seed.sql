-- Suvarnavarsha Gold website - starting content (after schema.sql).
-- Safe to import again: rows use fixed ids / keys with INSERT IGNORE, so nothing is duplicated or overwritten.
--
-- The app runs this file by itself on start (see src/config/migrate.js); importing it by hand is not needed.
-- No admin or password is stored here. The first admin comes from the ADMIN_PASSWORD hosting setting
-- (see src/config/migrate.js) or `npm run create-admin`.
--
-- Content below is the client's real content from the current website. Test-only rows (sample
-- videos) are in sample-data.sql, which must never be imported on the live site.

SET NAMES utf8mb4;


INSERT IGNORE INTO website_settings (skey, svalue) VALUES
  ('business_name_en', 'Suvarnavarsha Gold'),
  ('business_name_mr', 'सुवर्णवर्षा गोल्ड'),
  ('company_name_en', 'Suvarnavarsha Gold Ventures Pvt. Ltd.'),
  ('company_name_mr', 'सुवर्णवर्षा गोल्ड व्हेंचर्स प्रा. लि.'),
  ('logo_path', '/logo/suvarnavarsha-logo-v2-transparent-384.webp'),
  ('phone_primary', '8805942424'),
  ('phone_secondary', '8805982424'),
  ('whatsapp_number', '918805942424'),
  ('email', ''),
  ('address_en', 'Second Floor – 239, VTP Altitude, Near Shell Petrol Pump, Dange Chowk, Pune – 411033, Maharashtra'),
  ('address_mr', 'दुसरा मजला – 239, व्हीटीपी अल्टिट्यूड, शेल पेट्रोल पंपाजवळ, डांगे चौक, पुणे – 411033, महाराष्ट्र'),
  ('map_link', 'https://www.google.com/maps/search/?api=1&query=VTP+Altitude+Dange+Chowk+Pune+411033'),
  ('map_embed_url', 'https://www.google.com/maps?q=VTP+Altitude,+Dange+Chowk,+Pune+411033&output=embed'),
  ('hours_en', ''),
  ('hours_mr', ''),
  ('facebook_url', ''),
  ('instagram_url', ''),
  ('youtube_url', ''),
  ('show_silver', '1'),
  ('show_18k', '1'),
  ('saturday_offer_active', '1');

-- Sample rate so the rate block is not empty on day one. Enter the real rate in the admin panel before launch.
INSERT IGNORE INTO gold_rates (id, effective_date, gold_24k, gold_22k, gold_18k, silver_kg) VALUES
  (1, '2026-10-15', 12650.00, 11450.00, 9375.00, 155000.00);

-- The client's 10 g coin (from the current website)
INSERT IGNORE INTO products (id, code, category, weight_grams, image, name_en, name_mr, description_en, description_mr, status, sort_order) VALUES
  (1, 'SG-C-010', 'coin', 10.000, '/images/media/lakshmi-ganesha-coins-800x533.webp',
   '24K Gold Coin, 10 g', '24 कॅरेट सोन्याचे नाणे, 10 ग्रॅम',
   'A 10 g 24K (999) Lakshmi and Ganesha coin. BIS Hallmark and HUID certified.',
   'लक्ष्मी आणि गणपतीचे 10 ग्रॅम 24 कॅरेट (999) सोन्याचे नाणे. BIS हॉलमार्क आणि HUID प्रमाणित.',
   'active', 10);

-- FAQs (same questions and answers as the current website)
INSERT IGNORE INTO faqs (id, category, question_en, answer_en, question_mr, answer_mr, status, sort_order) VALUES
  (1, 'selling', 'Which documents do I need to sell gold?',
   'Please carry a valid government photo identity proof such as your Aadhaar card. For higher-value transactions the law may also require your PAN. Our team will confirm the exact documents when you call.',
   'सोने विकण्यासाठी कोणती कागदपत्रे लागतात?',
   'कृपया आधार कार्डसारखा वैध सरकारी फोटो ओळखपत्र सोबत आणा. मोठ्या रकमेच्या व्यवहारासाठी कायद्यानुसार पॅन कार्डही लागू शकते. तुम्ही कॉल केल्यावर आमची टीम नेमकी कागदपत्रे सांगेल.',
   'active', 10),
  (2, 'selling', 'How is the price of my gold calculated?',
   'Price = weight × purity × today’s rate. We weigh your gold and test its purity in front of you, then calculate the value using the day’s rate.',
   'माझ्या सोन्याची किंमत कशी ठरते?',
   'किंमत = वजन × शुद्धता × आजचा दर. आम्ही तुमच्या समोर सोन्याचे वजन करतो आणि शुद्धता तपासतो, त्यानंतर त्या दिवसाच्या दराने किंमत काढतो.',
   'active', 20),
  (3, 'selling', 'How do you test the purity?',
   'We use a German-technology purity testing machine. The test is done in front of you, so you can see the result yourself.',
   'शुद्धता कशी तपासली जाते?',
   'आम्ही जर्मन तंत्रज्ञानाच्या मशीनने शुद्धता तपासतो. तपासणी तुमच्या समोरच होते, त्यामुळे निकाल तुम्ही स्वतः पाहू शकता.',
   'active', 30),
  (4, 'selling', 'Is there any charge for valuation or testing?',
   'No. Valuation and purity testing are free. You are under no obligation to sell after the test.',
   'मूल्यांकन किंवा तपासणीसाठी काही शुल्क आहे का?',
   'नाही. मूल्यांकन आणि शुद्धता तपासणी मोफत आहे. तपासणीनंतर विक्री करणे बंधनकारक नाही.',
   'active', 40),
  (5, 'selling', 'How soon will I get my payment?',
   'Once you accept the price, payment is made in about 5 minutes by bank transfer, or in cash within the limits allowed by law.',
   'पैसे किती वेळात मिळतात?',
   'तुम्ही किंमत मान्य केल्यावर सुमारे 5 मिनिटांत बँक ट्रान्सफरने, किंवा कायद्याने परवानगी असलेल्या मर्यादेत रोख स्वरूपात पैसे दिले जातात.',
   'active', 50),
  (6, 'selling', 'Which karat gold do you buy?',
   'We buy gold of any karat: jewellery, coins and bars, including old or broken items.',
   'तुम्ही कोणत्या कॅरेटचे सोने खरेदी करता?',
   'आम्ही कोणत्याही कॅरेटचे सोने खरेदी करतो: दागिने, नाणी आणि बार, जुने किंवा तुटलेले असले तरी.',
   'active', 60),
  (7, 'selling', 'Can I sell gold without the purchase bill?',
   'Yes. The purchase bill is not mandatory, but a valid identity proof is required.',
   'खरेदीचे बिल नसताना सोने विकता येते का?',
   'होय. खरेदीचे बिल बंधनकारक नाही, परंतु वैध ओळखपत्र आवश्यक आहे.',
   'active', 70),
  (8, 'selling', 'Do you also buy silver?',
   'Yes, we buy old silver as well. The process is the same: testing, weighing and payment as per the day’s rate.',
   'तुम्ही चांदीही खरेदी करता का?',
   'होय, आम्ही जुनी चांदीही खरेदी करतो. प्रक्रिया तीच आहे: तपासणी, वजन आणि त्या दिवसाच्या दराने पेमेंट.',
   'active', 80),
  (9, 'pledged', 'My gold is pledged with a bank. Can you help?',
   'Yes. We pay the outstanding amount to the lender so that your gold is released. The gold is then tested and weighed in front of you, and you receive the balance amount.',
   'माझे सोने बँकेत गहाण आहे. तुम्ही मदत करू शकता का?',
   'होय. आम्ही कर्जाची थकबाकी संबंधित संस्थेला भरतो, त्यामुळे तुमचे सोने सुटते. त्यानंतर सोने तुमच्या समोर तपासले व वजन केले जाते आणि उरलेली रक्कम तुम्हाला मिळते.',
   'active', 90),
  (10, 'buying', 'What gold can I buy from you?',
   'We sell 24K gold coins, bars and Vedhani from 0.5 g to 100 g, certified with BIS Hallmark and HUID. Stock is limited, so please register in advance. Registration is free.',
   'तुमच्याकडून कोणते सोने खरेदी करता येते?',
   'आम्ही 0.5 ग्रॅम ते 100 ग्रॅमपर्यंत 24 कॅरेट सोन्याची नाणी, बार आणि वेढणी विकतो. ती BIS हॉलमार्क आणि HUID प्रमाणित आहेत. साठा मर्यादित असल्याने कृपया आधी नोंदणी करा. नोंदणी मोफत आहे.',
   'active', 100),
  (11, 'general', 'Are the rates shown on the website final?',
   'The rates are indicative and are updated by our team. The final price is decided at the branch after purity testing and weighing.',
   'वेबसाइटवर दाखवलेले दर अंतिम असतात का?',
   'हे दर सूचक आहेत आणि आमची टीम ते अपडेट करते. अंतिम किंमत शाखेत शुद्धता तपासणी आणि वजनानंतर ठरते.',
   'active', 110),
  (12, 'general', 'Is there gold that you do not accept?',
   'We do not accept stolen or fake gold, and such cases are reported to the authorities. Persons below 18 years of age cannot sell gold.',
   'असे कोणते सोने आहे जे तुम्ही स्वीकारत नाही?',
   'आम्ही चोरीचे किंवा बनावट सोने स्वीकारत नाही आणि अशा प्रकरणांची माहिती अधिकाऱ्यांना दिली जाते. 18 वर्षांखालील व्यक्ती सोने विकू शकत नाही.',
   'active', 120);
