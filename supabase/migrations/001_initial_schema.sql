-- ============================================================================
-- StagerVault – Initial Database Schema
-- Migration: 001_initial_schema.sql
--
-- Multi-tenant warehouse SaaS. Each "warehouse" is an isolated tenant.
-- Row-Level Security (RLS) enforces data isolation at the DB layer.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fast fuzzy search on text fields

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'staff', 'client');

CREATE TYPE item_status AS ENUM (
  'pending_intake',
  'received',
  'stored',
  'assembled',
  'staged',
  'out_for_delivery',
  'delivered',
  'returned',
  'damaged',
  'disposed'
);

CREATE TYPE item_condition AS ENUM (
  'excellent',
  'good',
  'fair',
  'damaged',
  'unknown'
);

CREATE TYPE service_type AS ENUM (
  'receiving',
  'storage',
  'assembly',
  'delivery',
  'pickup',
  'white_glove_delivery',
  'inspection',
  'disposal'
);

CREATE TYPE service_request_status AS ENUM (
  'draft',
  'submitted',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'overdue',
  'void'
);

CREATE TYPE billing_cycle AS ENUM (
  'monthly',
  'weekly',
  'per_item'
);

-- ─── WAREHOUSES (tenants) ─────────────────────────────────────────────────────
-- Each row = one warehouse company (e.g. Empyrean Services).
-- First customer: slug='empyrean'

CREATE TABLE warehouses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,            -- URL-safe identifier
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  phone         TEXT,
  email         TEXT,
  logo_url      TEXT,
  settings      JSONB NOT NULL DEFAULT '{
    "default_storage_rate_monthly": 25.00,
    "currency": "USD",
    "invoice_due_days": 30,
    "invoice_prefix": "INV-",
    "timezone": "America/New_York",
    "notifications_email": true,
    "notifications_sms": false
  }'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROFILES (extends auth.users) ───────────────────────────────────────────
-- One profile per Supabase auth user.
-- role='admin'|'staff'  → warehouse employees
-- role='client'         → stager/designer, linked to a client record

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  client_id     UUID,                -- FK added after clients table; non-null when role='client'
  role          user_role NOT NULL DEFAULT 'client',
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
-- Each client = one stager/designer company that stores items.

CREATE TABLE clients (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id          UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,              -- "Jane's Interiors LLC"
  contact_name          TEXT,
  email                 TEXT,
  phone                 TEXT,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT,
  billing_rate_monthly  NUMERIC(10,2),              -- $/item/month; NULL = use warehouse default
  billing_cycle         billing_cycle NOT NULL DEFAULT 'monthly',
  mydarby_id            TEXT,                       -- future CSV sync
  notes                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Back-reference from profiles to clients (circular – add after both tables exist)
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- ─── LOCATIONS ────────────────────────────────────────────────────────────────
-- Physical warehouse locations: Zone → Aisle → Bay
-- Label is derived: zone || '-' || aisle || '-' || bay  e.g. 'A-03-12'

CREATE TABLE locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  zone          TEXT NOT NULL,          -- "A", "B", "CLIMATE"
  aisle         TEXT NOT NULL,          -- "01" .. "99"
  bay           TEXT NOT NULL,          -- "01" .. "99"
  label         TEXT GENERATED ALWAYS AS (zone || '-' || aisle || '-' || bay) STORED,
  description   TEXT,
  capacity      INTEGER,                -- max items (NULL = unlimited)
  current_count INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, zone, aisle, bay)
);

-- ─── ITEMS ────────────────────────────────────────────────────────────────────
-- Core entity: one row per physical item in the warehouse.

CREATE TABLE items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id      UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id),
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  barcode           TEXT,              -- unique per warehouse; auto-generated if null
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT,              -- "sofa", "chair", "lamp", "art", etc.
  status            item_status NOT NULL DEFAULT 'pending_intake',
  condition         item_condition NOT NULL DEFAULT 'unknown',
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  -- Dimensions
  width_in          NUMERIC(8,2),
  height_in         NUMERIC(8,2),
  depth_in          NUMERIC(8,2),
  weight_lbs        NUMERIC(8,2),
  -- Financials (from client / MyDarby)
  purchase_price    NUMERIC(10,2),
  -- Photos
  primary_photo_url TEXT,
  -- Meta
  received_at       TIMESTAMPTZ,
  notes             TEXT,
  mydarby_id        TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate barcode if not provided (warehouse prefix + random)
CREATE OR REPLACE FUNCTION generate_item_barcode()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  warehouse_slug TEXT;
BEGIN
  IF NEW.barcode IS NULL THEN
    SELECT slug INTO warehouse_slug FROM warehouses WHERE id = NEW.warehouse_id;
    NEW.barcode := UPPER(LEFT(warehouse_slug, 3))
                   || '-'
                   || TO_CHAR(NOW(), 'YYMM')
                   || '-'
                   || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_items_barcode
  BEFORE INSERT ON items
  FOR EACH ROW EXECUTE FUNCTION generate_item_barcode();

-- ─── ITEM PHOTOS ──────────────────────────────────────────────────────────────

CREATE TABLE item_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,        -- Supabase Storage path
  caption       TEXT,
  taken_at      TIMESTAMPTZ,
  uploaded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ITEM EVENTS (history / audit) ───────────────────────────────────────────
-- Immutable log of every status change, location move, condition update.

CREATE TABLE item_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id             UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  event_type          item_status NOT NULL,
  from_location_id    UUID REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id      UUID REFERENCES locations(id) ON DELETE SET NULL,
  condition_before    item_condition,
  condition_after     item_condition,
  performed_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-insert event when item status or location changes
CREATE OR REPLACE FUNCTION log_item_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status)
     OR (OLD.location_id IS DISTINCT FROM NEW.location_id)
     OR (OLD.condition IS DISTINCT FROM NEW.condition) THEN
    INSERT INTO item_events (
      item_id, warehouse_id, event_type,
      from_location_id, to_location_id,
      condition_before, condition_after,
      performed_by
    ) VALUES (
      NEW.id, NEW.warehouse_id, NEW.status,
      OLD.location_id, NEW.location_id,
      OLD.condition, NEW.condition,
      NEW.created_by  -- best effort; actions should set this
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_item_events
  AFTER UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION log_item_event();

-- Keep location.current_count accurate
CREATE OR REPLACE FUNCTION update_location_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Decrement old location
  IF OLD.location_id IS NOT NULL AND OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    UPDATE locations SET current_count = GREATEST(0, current_count - 1)
    WHERE id = OLD.location_id;
  END IF;
  -- Increment new location
  IF NEW.location_id IS NOT NULL AND NEW.location_id IS DISTINCT FROM OLD.location_id THEN
    UPDATE locations SET current_count = current_count + 1
    WHERE id = NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_location_count_update
  AFTER UPDATE OF location_id ON items
  FOR EACH ROW EXECUTE FUNCTION update_location_count();

CREATE OR REPLACE FUNCTION update_location_count_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN
    UPDATE locations SET current_count = current_count + 1
    WHERE id = NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_location_count_insert
  AFTER INSERT ON items
  FOR EACH ROW EXECUTE FUNCTION update_location_count_insert();

-- ─── SERVICE REQUESTS ─────────────────────────────────────────────────────────

CREATE TABLE service_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id      UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id),
  requested_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_type      service_type NOT NULL,
  status            service_request_status NOT NULL DEFAULT 'submitted',
  title             TEXT NOT NULL,
  description       TEXT,
  delivery_address  TEXT,
  requested_date    DATE,
  scheduled_date    TIMESTAMPTZ,
  completed_date    TIMESTAMPTZ,
  price             NUMERIC(10,2),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Many-to-many: which items are part of a service request
CREATE TABLE service_request_items (
  service_request_id  UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  item_id             UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  notes               TEXT,
  PRIMARY KEY (service_request_id, item_id)
);

-- ─── STORAGE LOGS (for billing) ───────────────────────────────────────────────
-- Track how long each item is in the warehouse for monthly billing.
-- One open row per item in storage (check_out_at IS NULL = currently stored).

CREATE TABLE storage_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  check_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_at    TIMESTAMPTZ,
  rate_monthly    NUMERIC(10,2) NOT NULL,   -- snapshot; protects against rate changes
  billed_days     INTEGER,                  -- filled when generating invoice
  billed_amount   NUMERIC(10,2),
  invoice_id      UUID,                     -- FK added after invoices table
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-open a storage log when item is received; close when delivered/returned
CREATE OR REPLACE FUNCTION manage_storage_log()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_rate NUMERIC(10,2);
BEGIN
  -- Item arrived in warehouse → open a storage log
  IF NEW.status IN ('received', 'stored') AND OLD.status = 'pending_intake' THEN
    SELECT COALESCE(c.billing_rate_monthly, (w.settings->>'default_storage_rate_monthly')::NUMERIC)
    INTO v_rate
    FROM clients c
    JOIN warehouses w ON w.id = c.warehouse_id
    WHERE c.id = NEW.client_id;

    INSERT INTO storage_logs (item_id, warehouse_id, client_id, location_id, check_in_at, rate_monthly)
    VALUES (NEW.id, NEW.warehouse_id, NEW.client_id, NEW.location_id, NOW(), v_rate);
  END IF;

  -- Item left warehouse → close the open storage log
  IF NEW.status IN ('delivered', 'returned', 'disposed') AND OLD.status NOT IN ('delivered', 'returned', 'disposed') THEN
    UPDATE storage_logs
    SET check_out_at = NOW(), updated_at = NOW()
    WHERE item_id = NEW.id AND check_out_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_storage_log
  AFTER UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION manage_storage_log();

-- ─── INVOICES ─────────────────────────────────────────────────────────────────

CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id),
  invoice_number      TEXT NOT NULL,
  status              invoice_status NOT NULL DEFAULT 'draft',
  period_start        DATE,
  period_end          DATE,
  subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date            DATE,
  paid_at             TIMESTAMPTZ,
  stripe_invoice_id   TEXT,
  pdf_url             TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, invoice_number)
);

-- Back-reference from storage_logs
ALTER TABLE storage_logs
  ADD CONSTRAINT fk_storage_logs_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

CREATE TABLE invoice_line_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id            UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  warehouse_id          UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  description           TEXT NOT NULL,
  quantity              NUMERIC(10,4) NOT NULL DEFAULT 1,
  unit_price            NUMERIC(10,2) NOT NULL,
  total                 NUMERIC(10,2) NOT NULL,
  item_id               UUID REFERENCES items(id) ON DELETE SET NULL,
  storage_log_id        UUID REFERENCES storage_logs(id) ON DELETE SET NULL,
  service_request_id    UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-compute invoice total when line items change
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal   NUMERIC(10,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(total), 0) INTO v_subtotal
  FROM invoice_line_items WHERE invoice_id = v_invoice_id;
  UPDATE invoices
  SET subtotal = v_subtotal,
      total    = v_subtotal + tax,
      updated_at = NOW()
  WHERE id = v_invoice_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_total
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION update_invoice_total();

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT,
  type          TEXT NOT NULL,    -- "item_received", "invoice_sent", "service_update", etc.
  reference_id  UUID,             -- item_id, invoice_id, service_request_id, etc.
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── updated_at TRIGGERS ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'warehouses','profiles','clients','locations','items',
    'service_requests','storage_logs','invoices'
  ] LOOP
    EXECUTE FORMAT(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

-- Items: most common query patterns
CREATE INDEX idx_items_warehouse        ON items(warehouse_id);
CREATE INDEX idx_items_client           ON items(client_id);
CREATE INDEX idx_items_location         ON items(location_id);
CREATE INDEX idx_items_status           ON items(status);
CREATE INDEX idx_items_barcode          ON items(warehouse_id, barcode);
CREATE INDEX idx_items_name_trgm        ON items USING gin(name gin_trgm_ops);
CREATE INDEX idx_items_created_at       ON items(created_at DESC);

-- Photos
CREATE INDEX idx_item_photos_item       ON item_photos(item_id);

-- Events
CREATE INDEX idx_item_events_item       ON item_events(item_id, created_at DESC);

-- Service requests
CREATE INDEX idx_sr_warehouse           ON service_requests(warehouse_id);
CREATE INDEX idx_sr_client              ON service_requests(client_id);
CREATE INDEX idx_sr_status              ON service_requests(status);
CREATE INDEX idx_sr_scheduled           ON service_requests(scheduled_date);

-- Storage logs
CREATE INDEX idx_sl_item                ON storage_logs(item_id);
CREATE INDEX idx_sl_client              ON storage_logs(client_id);
CREATE INDEX idx_sl_open                ON storage_logs(warehouse_id) WHERE check_out_at IS NULL;

-- Invoices
CREATE INDEX idx_invoices_client        ON invoices(client_id);
CREATE INDEX idx_invoices_status        ON invoices(status);
CREATE INDEX idx_invoices_due_date      ON invoices(due_date);

-- Profiles
CREATE INDEX idx_profiles_warehouse     ON profiles(warehouse_id);
CREATE INDEX idx_profiles_client        ON profiles(client_id);

-- Notifications
CREATE INDEX idx_notifications_profile  ON notifications(profile_id, is_read, created_at DESC);

-- Locations
CREATE INDEX idx_locations_warehouse    ON locations(warehouse_id);
CREATE INDEX idx_locations_label_trgm   ON locations USING gin(label gin_trgm_ops);
