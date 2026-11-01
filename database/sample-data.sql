-- TEST DATA ONLY - for a local development database. Never import this on the live website.
-- Placeholder videos so the admin tables, filters and pagination can be tested.
-- The video ids below are YouTube's own public test/demo videos, not client content.

SET NAMES utf8mb4;

INSERT IGNORE INTO advertisements (id, youtube_id, is_short, title_en, title_mr, description_en, description_mr, status, sort_order) VALUES
  (9001, 'aqz-KE-bpKQ', 0, '[TEST] Sample advert', '[TEST] नमुना जाहिरात', 'Placeholder video for testing.', 'चाचणीसाठी नमुना व्हिडिओ.', 'active', 10),
  (9002, 'M7lc1UVf-VE', 0, '[TEST] Inactive advert', '[TEST] बंद जाहिरात', '', '', 'inactive', 20);

INSERT IGNORE INTO customer_feedback (id, customer_name, youtube_id, is_short, title_en, title_mr, consent, status, sort_order) VALUES
  (9001, '[TEST] Customer A', 'aqz-KE-bpKQ', 0, '[TEST] Approved video', '[TEST] मंजूर व्हिडिओ', 1, 'approved', 10),
  (9002, '[TEST] Customer B', 'M7lc1UVf-VE', 0, '[TEST] Pending video', '[TEST] प्रलंबित व्हिडिओ', 1, 'pending', 20);

