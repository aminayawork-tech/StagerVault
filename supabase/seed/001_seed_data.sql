-- ============================================================================
-- StagerVault – Seed Data
-- Simulates Empyrean Services with 3 stager clients and ~60 items.
-- Run AFTER migrations. Uses DO blocks so UUIDs stay consistent.
-- ============================================================================

-- ─── 1. Warehouse: Empyrean Services ─────────────────────────────────────────

INSERT INTO warehouses (id, name, slug, address, city, state, zip, phone, email, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Empyrean Services',
  'empyrean',
  '123 Industrial Blvd, Suite 4',
  'Moonachie',
  'NJ',
  '07074',
  '(201) 555-0100',
  'ops@empyreanservices.com',
  '{
    "default_storage_rate_monthly": 25.00,
    "currency": "USD",
    "invoice_due_days": 30,
    "invoice_prefix": "EMP-",
    "timezone": "America/New_York",
    "notifications_email": true,
    "notifications_sms": false
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ─── 2. Clients ───────────────────────────────────────────────────────────────

INSERT INTO clients (id, warehouse_id, name, contact_name, email, phone, billing_rate_monthly, city, state)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Casa Nova Staging',
    'Sofia Reyes',
    'sofia@casanovastaging.com',
    '(917) 555-0201',
    25.00,
    'New York',
    'NY'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Interiors by Marlowe',
    'James Marlowe',
    'james@interiorsbymarlowe.com',
    '(212) 555-0302',
    30.00,
    'Brooklyn',
    'NY'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'Studio Blanc Design',
    'Claire Fontaine',
    'claire@studioblanc.com',
    '(646) 555-0403',
    22.00,
    'Hoboken',
    'NJ'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Locations (Zones A, B, C + Climate-Controlled zone) ──────────────────

-- Zone A: General storage (large furniture)
INSERT INTO locations (id, warehouse_id, zone, aisle, bay, description, capacity)
SELECT
  ('00000000-0000-0001-0000-' || LPAD(n::TEXT, 12, '0'))::UUID,
  '00000000-0000-0000-0000-000000000001',
  'A',
  LPAD(((n-1)/4 + 1)::TEXT, 2, '0'),
  LPAD(((n-1) % 4 + 1)::TEXT, 2, '0'),
  'General storage - large items',
  8
FROM generate_series(1, 12) n
ON CONFLICT DO NOTHING;

-- Zone B: Medium items
INSERT INTO locations (id, warehouse_id, zone, aisle, bay, description, capacity)
SELECT
  ('00000000-0000-0002-0000-' || LPAD(n::TEXT, 12, '0'))::UUID,
  '00000000-0000-0000-0000-000000000001',
  'B',
  LPAD(((n-1)/4 + 1)::TEXT, 2, '0'),
  LPAD(((n-1) % 4 + 1)::TEXT, 2, '0'),
  'Medium items - chairs, side tables, lamps',
  12
FROM generate_series(1, 12) n
ON CONFLICT DO NOTHING;

-- Zone C: Small items / art / accessories
INSERT INTO locations (id, warehouse_id, zone, aisle, bay, description, capacity)
SELECT
  ('00000000-0000-0003-0000-' || LPAD(n::TEXT, 12, '0'))::UUID,
  '00000000-0000-0000-0000-000000000001',
  'C',
  LPAD(((n-1)/6 + 1)::TEXT, 2, '0'),
  LPAD(((n-1) % 6 + 1)::TEXT, 2, '0'),
  'Small items - accessories, art, mirrors',
  20
FROM generate_series(1, 12) n
ON CONFLICT DO NOTHING;

-- Zone CC: Climate-controlled (art, antiques, sensitive items)
INSERT INTO locations (id, warehouse_id, zone, aisle, bay, description, capacity)
VALUES
  ('00000000-0000-0004-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CC', '01', '01', 'Climate-controlled - art & antiques', 15),
  ('00000000-0000-0004-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CC', '01', '02', 'Climate-controlled - art & antiques', 15)
ON CONFLICT DO NOTHING;

-- ─── 4. Items – Casa Nova Staging (client 010) ───────────────────────────────

INSERT INTO items (id, warehouse_id, client_id, location_id, barcode, name, category, status, condition, quantity, width_in, height_in, depth_in, purchase_price, received_at, notes)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0001-0000-000000000001', 'EMP-2501-000001', 'West Elm Hamilton Sofa - Oatmeal', 'sofa', 'stored', 'excellent', 1, 81, 34, 35, 1299.00, NOW() - INTERVAL '45 days', 'Original packaging removed, in great shape'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0001-0000-000000000001', 'EMP-2501-000002', 'CB2 Rug - Ivory/Natural 8x10', 'rug', 'stored', 'good', 1, 120, NULL, 96, 489.00, NOW() - INTERVAL '45 days', 'Rolled and wrapped'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0002-0000-000000000001', 'EMP-2501-000003', 'Accent Chair - Sage Velvet', 'chair', 'stored', 'excellent', 2, 28, 32, 27, 549.00, NOW() - INTERVAL '40 days', NULL),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0002-0000-000000000002', 'EMP-2501-000004', 'Walnut Coffee Table - Round 36"', 'table', 'stored', 'excellent', 1, 36, 18, 36, 799.00, NOW() - INTERVAL '40 days', NULL),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0003-0000-000000000001', 'EMP-2501-000005', 'Set of 3 Brass Candleholders', 'decor', 'stored', 'excellent', 1, NULL, NULL, NULL, 120.00, NOW() - INTERVAL '35 days', 'Stored together in one box'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0003-0000-000000000002', 'EMP-2501-000006', 'Abstract Canvas Print 24x36', 'art', 'stored', 'good', 1, 24, 36, 2, 250.00, NOW() - INTERVAL '30 days', NULL),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0001-0000-000000000002', 'EMP-2501-000007', 'Pottery Barn Sectional - Gray L-Shape', 'sofa', 'stored', 'good', 1, 110, 35, 85, 2450.00, NOW() - INTERVAL '20 days', 'Minor wear on armrest noted'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0002-0000-000000000003', 'EMP-2501-000008', 'Floor Lamp - Brushed Nickel Arc', 'lamp', 'stored', 'excellent', 1, NULL, 70, NULL, 320.00, NOW() - INTERVAL '20 days', NULL),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', NULL, 'EMP-2501-000009', 'King Platform Bed Frame - White Oak', 'bed', 'pending_intake', 'unknown', 1, 80, 48, 86, 1850.00, NULL, 'Expected arrival next week'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0003-0000-000000000003', 'EMP-2501-000010', 'Throw Pillow Set (6pcs) - Terracotta', 'textiles', 'stored', 'excellent', 1, NULL, NULL, NULL, 180.00, NOW() - INTERVAL '15 days', NULL),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0002-0000-000000000004', 'EMP-2501-000011', 'Dining Table - Farmhouse 72"', 'table', 'stored', 'good', 1, 72, 30, 38, 1100.00, NOW() - INTERVAL '60 days', NULL),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0002-0000-000000000004', 'EMP-2501-000012', 'Dining Chairs - Black Metal (set of 6)', 'chair', 'stored', 'good', 6, 18, 34, 20, 720.00, NOW() - INTERVAL '60 days', NULL),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0001-0000-000000000003', 'EMP-2501-000013', 'Bookshelf - Tall 5-Tier White', 'storage', 'stored', 'good', 1, 30, 72, 12, 280.00, NOW() - INTERVAL '55 days', 'Disassembled - hardware in bag'),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0003-0000-000000000004', 'EMP-2501-000014', 'Set of 4 Framed Botanical Prints', 'art', 'stored', 'excellent', 4, 16, 20, 2, 340.00, NOW() - INTERVAL '10 days', NULL),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0001-0000-000000000004', 'EMP-2501-000015', 'Queen Bed Frame - Upholstered Linen', 'bed', 'staged', 'excellent', 1, 63, 50, 85, 1650.00, NOW() - INTERVAL '50 days', 'Currently staged at 45 Park Ave, Unit 8B'),
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0002-0000-000000000005', 'EMP-2501-000016', 'Dresser - 6 Drawer White Lacquer', 'bedroom', 'stored', 'fair', 1, 58, 54, 18, 895.00, NOW() - INTERVAL '90 days', 'Small scratch on top surface'),
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0003-0000-000000000005', 'EMP-2501-000017', 'Wall Mirror - Arched Gold Frame 24x36', 'mirror', 'stored', 'excellent', 1, 24, 36, 2, 420.00, NOW() - INTERVAL '25 days', NULL),
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0002-0000-000000000006', 'EMP-2501-000018', 'Side Table Set (2pcs) - Marble Top', 'table', 'stored', 'excellent', 2, 22, 24, 22, 560.00, NOW() - INTERVAL '18 days', NULL),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0003-0000-000000000006', 'EMP-2501-000019', 'Faux Plant - Large Fiddle Leaf', 'decor', 'stored', 'excellent', 1, 18, 60, 18, 145.00, NOW() - INTERVAL '12 days', NULL),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0004-0000-000000000001', 'EMP-2501-000020', 'Original Oil Painting - Coastal 30x40', 'art', 'stored', 'excellent', 1, 30, 40, 3, 1800.00, NOW() - INTERVAL '5 days', 'Climate-controlled required');

-- ─── 5. Items – Interiors by Marlowe (client 011) ────────────────────────────

INSERT INTO items (id, warehouse_id, client_id, location_id, barcode, name, category, status, condition, quantity, width_in, height_in, depth_in, purchase_price, received_at, notes)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0001-0000-000000000005', 'EMP-2501-100001', 'Chesterfield Sofa - Cognac Leather', 'sofa', 'stored', 'good', 1, 86, 33, 38, 2200.00, NOW() - INTERVAL '70 days', NULL),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0001-0000-000000000005', 'EMP-2501-100002', 'Persian-Style Rug - Navy 9x12', 'rug', 'stored', 'good', 1, 144, NULL, 108, 1200.00, NOW() - INTERVAL '70 days', NULL),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0002-0000-000000000007', 'EMP-2501-100003', 'Wingback Chair - Charcoal Tweed', 'chair', 'stored', 'excellent', 1, 32, 45, 30, 890.00, NOW() - INTERVAL '65 days', NULL),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0001-0000-000000000006', 'EMP-2501-100004', 'Entertainment Console - Dark Walnut 72"', 'media', 'assembled', 'excellent', 1, 72, 24, 18, 1450.00, NOW() - INTERVAL '30 days', 'Hardware assembly completed'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0003-0000-000000000007', 'EMP-2501-100005', 'Pendant Light - Rattan Boho (3 pack)', 'lighting', 'stored', 'excellent', 3, NULL, NULL, NULL, 390.00, NOW() - INTERVAL '25 days', NULL),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0002-0000-000000000008', 'EMP-2501-100006', 'Dining Bench - Upholstered Cream', 'seating', 'stored', 'good', 1, 60, 18, 16, 475.00, NOW() - INTERVAL '55 days', NULL),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0004-0000-000000000001', 'EMP-2501-100007', 'Antique Gilded Mirror 48x72', 'mirror', 'stored', 'good', 1, 48, 72, 4, 3200.00, NOW() - INTERVAL '80 days', 'Climate-controlled. Minor gilding flakes on left edge.'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', NULL, 'EMP-2501-100008', 'Desk Chair - Mid-Century Modern Teak', 'chair', 'out_for_delivery', 'excellent', 1, 22, 34, 22, 650.00, NOW() - INTERVAL '90 days', 'Out for delivery to 88 Pierrepont St, Brooklyn'),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0003-0000-000000000008', 'EMP-2501-100009', 'Bar Cart - Gold & Glass', 'furniture', 'stored', 'excellent', 1, 28, 38, 16, 580.00, NOW() - INTERVAL '40 days', NULL),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0001-0000-000000000007', 'EMP-2501-100010', 'Sofa Table / Console 54"', 'table', 'stored', 'excellent', 1, 54, 32, 14, 720.00, NOW() - INTERVAL '35 days', NULL),
  ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0002-0000-000000000009', 'EMP-2501-100011', 'Ottoman - Round Camel Leather', 'seating', 'stored', 'good', 1, 36, 18, 36, 520.00, NOW() - INTERVAL '45 days', NULL),
  ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0003-0000-000000000009', 'EMP-2501-100012', 'Woven Wall Art - Macramé 24x36', 'art', 'stored', 'excellent', 1, 24, 36, 2, 195.00, NOW() - INTERVAL '20 days', NULL),
  ('20000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0002-0000-000000000010', 'EMP-2501-100013', 'Bookshelves Built-In Style (pair)', 'storage', 'stored', 'good', 2, 36, 84, 14, 1600.00, NOW() - INTERVAL '75 days', 'Flat-pack; needs assembly'),
  ('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0003-0000-000000000010', 'EMP-2501-100014', 'Sculptural Vase Set (3pcs)', 'decor', 'stored', 'excellent', 3, NULL, NULL, NULL, 285.00, NOW() - INTERVAL '10 days', NULL),
  ('20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0001-0000-000000000008', 'EMP-2501-100015', 'Accent Cabinet - Black Lacquer', 'storage', 'stored', 'fair', 1, 32, 42, 16, 840.00, NOW() - INTERVAL '100 days', 'Lacquer chipping on bottom corners'),
  ('20000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0001-0000-000000000009', 'EMP-2501-100016', 'Upholstered Headboard - King Velvet Navy', 'bed', 'stored', 'excellent', 1, 80, 55, 4, 980.00, NOW() - INTERVAL '15 days', NULL),
  ('20000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0004-0000-000000000002', 'EMP-2501-100017', 'Watercolor Series Prints (set of 4)', 'art', 'stored', 'excellent', 4, 18, 24, 2, 760.00, NOW() - INTERVAL '8 days', 'Climate-controlled per client request'),
  ('20000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0002-0000-000000000011', 'EMP-2501-100018', 'Side Chair - Acrylic Ghost Style (2pcs)', 'chair', 'stored', 'good', 2, 17, 34, 18, 440.00, NOW() - INTERVAL '30 days', NULL),
  ('20000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0003-0000-000000000011', 'EMP-2501-100019', 'Table Lamps w/ Linen Shade (pair)', 'lamp', 'stored', 'excellent', 2, NULL, 28, NULL, 380.00, NOW() - INTERVAL '22 days', NULL),
  ('20000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0002-0000-000000000012', 'EMP-2501-100020', 'Cane-Back Dining Chair (set of 4)', 'chair', 'stored', 'excellent', 4, 18, 36, 19, 860.00, NOW() - INTERVAL '5 days', NULL);

-- ─── 6. Items – Studio Blanc Design (client 012) ─────────────────────────────

INSERT INTO items (id, warehouse_id, client_id, location_id, barcode, name, category, status, condition, quantity, width_in, height_in, depth_in, purchase_price, received_at, notes)
VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0001-0000-000000000010', 'EMP-2501-200001', 'Modular Sofa - Cloud White 3-pc', 'sofa', 'stored', 'excellent', 1, 106, 32, 36, 3200.00, NOW() - INTERVAL '30 days', NULL),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0002-0000-000000000012', 'EMP-2501-200002', 'Marble Coffee Table - Oval', 'table', 'stored', 'excellent', 1, 48, 16, 28, 1600.00, NOW() - INTERVAL '30 days', 'Very heavy - 2 person lift required'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0003-0000-000000000012', 'EMP-2501-200003', 'Sheepskin Throw Blanket (2pcs)', 'textiles', 'stored', 'excellent', 2, NULL, NULL, NULL, 220.00, NOW() - INTERVAL '25 days', NULL),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0001-0000-000000000011', 'EMP-2501-200004', 'Lounge Chair & Ottoman - Cream Boucle', 'chair', 'stored', 'excellent', 1, 32, 34, 34, 2100.00, NOW() - INTERVAL '20 days', NULL),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0003-0000-000000000001', 'EMP-2501-200005', 'Minimalist Clock - White 14"', 'decor', 'stored', 'excellent', 1, 14, 14, 2, 95.00, NOW() - INTERVAL '18 days', NULL),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0004-0000-000000000001', 'EMP-2501-200006', 'Framed Photography - Architecture Series (5pcs)', 'art', 'stored', 'excellent', 5, 20, 24, 2, 1500.00, NOW() - INTERVAL '15 days', 'Climate-controlled; fragile glass'),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0002-0000-000000000001', 'EMP-2501-200007', 'Task Chair - Ergonomic White Mesh', 'chair', 'stored', 'good', 2, 27, 45, 27, 780.00, NOW() - INTERVAL '12 days', NULL),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0001-0000-000000000012', 'EMP-2501-200008', 'Platform Bed Frame - Queen Slat White', 'bed', 'stored', 'excellent', 1, 63, 36, 84, 1200.00, NOW() - INTERVAL '10 days', NULL),
  ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0003-0000-000000000002', 'EMP-2501-200009', 'Geometric Pendant Lamp - Black Iron', 'lamp', 'stored', 'excellent', 1, NULL, 18, NULL, 340.00, NOW() - INTERVAL '8 days', NULL),
  ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', NULL, 'EMP-2501-200010', 'Dining Table - White Marble Top 60"', 'table', 'delivered', 'excellent', 1, 60, 30, 36, 2400.00, NOW() - INTERVAL '35 days', 'Delivered to client 2 weeks ago'),
  ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0002-0000-000000000002', 'EMP-2501-200011', 'Wire Chair - Black Set of 4', 'chair', 'stored', 'good', 4, 17, 33, 17, 560.00, NOW() - INTERVAL '25 days', NULL),
  ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0003-0000-000000000003', 'EMP-2501-200012', 'Linen Curtain Panels - White 108" (4pcs)', 'textiles', 'stored', 'excellent', 4, NULL, 108, NULL, 480.00, NOW() - INTERVAL '5 days', NULL),
  ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0001-0000-000000000011', 'EMP-2501-200013', 'Sideboard - 4 Door White Lacquer 72"', 'storage', 'assembled', 'excellent', 1, 72, 32, 16, 1900.00, NOW() - INTERVAL '20 days', 'Assembly completed 3 days ago'),
  ('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0003-0000-000000000004', 'EMP-2501-200014', 'Tray + Candle Set (desk styling)', 'decor', 'stored', 'excellent', 1, NULL, NULL, NULL, 120.00, NOW() - INTERVAL '3 days', NULL),
  ('30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '00000000-0000-0002-0000-000000000003', 'EMP-2501-200015', 'Nightstand - White Lacquer (pair)', 'bedroom', 'stored', 'excellent', 2, 22, 24, 18, 760.00, NOW() - INTERVAL '10 days', NULL);

-- ─── 7. Sample Service Requests ───────────────────────────────────────────────

INSERT INTO service_requests (id, warehouse_id, client_id, service_type, status, title, description, delivery_address, requested_date, scheduled_date, price)
VALUES
  (
    'SR000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'delivery',
    'scheduled',
    'Delivery - 45 Park Ave Unit 8B Staging',
    'Please deliver the staging package for the Park Ave listing. Items: Hamilton Sofa, Coffee Table, 2x Accent Chairs, Floor Lamp, Rug.',
    '45 Park Avenue, Unit 8B, New York, NY 10016',
    CURRENT_DATE + 3,
    NOW() + INTERVAL '3 days 9 hours',
    450.00
  ),
  (
    'SR000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    'assembly',
    'accepted',
    'Assembly - Built-In Bookshelves (2 units)',
    'Need the pair of built-in style bookshelves assembled and ready for delivery next week.',
    NULL,
    NOW() + INTERVAL '2 days',
    180.00
  ),
  (
    'SR000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000012',
    'pickup',
    'submitted',
    'Pickup - Returned items from Hudson Yards staging',
    'The Hudson Yards listing sold! Please schedule pickup of all Studio Blanc items from the address.',
    '500 W 33rd St, New York, NY 10001',
    CURRENT_DATE + 7,
    NULL,
    300.00
  ),
  (
    'SR000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'receiving',
    'completed',
    'Receiving - King Platform Bed + Nightstands',
    'Expecting vendor delivery from Room & Board. 3 boxes.',
    NULL,
    CURRENT_DATE - 5,
    NOW() - INTERVAL '5 days',
    75.00
  );

-- Link items to service requests
INSERT INTO service_request_items (service_request_id, item_id, notes)
VALUES
  ('SR000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Handle with care – cream fabric'),
  ('SR000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', NULL),
  ('SR000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', NULL),
  ('SR000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', NULL),
  ('SR000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', NULL),
  ('SR000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000013', 'See assembly instructions in bag'),
  ('SR000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', NULL),
  ('SR000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', NULL),
  ('SR000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', NULL);

-- ─── 8. Sample Invoice ────────────────────────────────────────────────────────

INSERT INTO invoices (id, warehouse_id, client_id, invoice_number, status, period_start, period_end, subtotal, tax, total, due_date)
VALUES (
  'INV00000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'EMP-0001',
  'sent',
  '2026-02-01',
  '2026-02-28',
  500.00,
  0.00,
  500.00,
  '2026-03-30'
);

INSERT INTO invoice_line_items (invoice_id, warehouse_id, description, quantity, unit_price, total, item_id)
VALUES
  ('INV00000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Storage - Feb 2026 (20 items × $25/mo)', 20, 25.00, 500.00, NULL);

-- Note: In a real billing run, each line item would reference a storage_log row.
-- The above is a simplified seed for testing the UI.
