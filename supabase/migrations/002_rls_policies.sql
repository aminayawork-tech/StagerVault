-- ============================================================================
-- StagerVault – Row Level Security Policies
-- Migration: 002_rls_policies.sql
--
-- DESIGN PRINCIPLES:
-- 1. Every table that holds tenant data is scoped by warehouse_id.
-- 2. auth.uid() → profiles → warehouse_id + role drives all access decisions.
-- 3. Clients can ONLY see their own data (client_id check).
-- 4. Staff can read/write all data within their warehouse.
-- 5. Admins have full write access within their warehouse.
-- 6. No cross-tenant data leakage is possible via any query.
--
-- HOW IT WORKS:
--   - get_my_warehouse_id()  → the warehouse the logged-in user belongs to
--   - get_my_role()          → 'admin' | 'staff' | 'client'
--   - get_my_client_id()     → non-null only for role='client'
--   - is_warehouse_admin()   → true if admin in that warehouse
--   - is_warehouse_staff()   → true if admin OR staff in that warehouse
-- ============================================================================

-- ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
-- These are SECURITY DEFINER so they bypass RLS when reading profiles.
-- They are cheap lookups called once per policy evaluation.

CREATE OR REPLACE FUNCTION get_my_warehouse_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT warehouse_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_warehouse_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_warehouse_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

-- ─── ENABLE RLS ON ALL TENANT TABLES ─────────────────────────────────────────

ALTER TABLE warehouses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (belt-and-suspenders for Supabase)
ALTER TABLE warehouses           FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles             FORCE ROW LEVEL SECURITY;
ALTER TABLE clients              FORCE ROW LEVEL SECURITY;
ALTER TABLE locations            FORCE ROW LEVEL SECURITY;
ALTER TABLE items                FORCE ROW LEVEL SECURITY;
ALTER TABLE item_photos          FORCE ROW LEVEL SECURITY;
ALTER TABLE item_events          FORCE ROW LEVEL SECURITY;
ALTER TABLE service_requests     FORCE ROW LEVEL SECURITY;
ALTER TABLE service_request_items FORCE ROW LEVEL SECURITY;
ALTER TABLE storage_logs         FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices             FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items   FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications        FORCE ROW LEVEL SECURITY;

-- ─── WAREHOUSES ───────────────────────────────────────────────────────────────
-- Users can only see their own warehouse.
-- Only super-admin (service_role key used in server context) can create warehouses.

CREATE POLICY "warehouses_select_own"
  ON warehouses FOR SELECT
  USING (id = get_my_warehouse_id());

CREATE POLICY "warehouses_update_admin"
  ON warehouses FOR UPDATE
  USING (id = get_my_warehouse_id() AND is_warehouse_admin())
  WITH CHECK (id = get_my_warehouse_id());

-- ─── PROFILES ─────────────────────────────────────────────────────────────────

-- Users can see all profiles in their warehouse (needed for staff lists, etc.)
CREATE POLICY "profiles_select_same_warehouse"
  ON profiles FOR SELECT
  USING (warehouse_id = get_my_warehouse_id());

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND warehouse_id = get_my_warehouse_id());

-- Admins can update any profile in their warehouse
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- Admins can insert new profiles (inviting staff/clients)
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  WITH CHECK (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- Admins can deactivate profiles (soft delete via is_active)
CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- Allow the trigger/function that creates a profile on signup (service role bypasses RLS)

-- ─── CLIENTS ──────────────────────────────────────────────────────────────────

-- Staff/admin see all clients in their warehouse
CREATE POLICY "clients_select_staff"
  ON clients FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR id = get_my_client_id()  -- client users can see their own record
    )
  );

CREATE POLICY "clients_insert_admin"
  ON clients FOR INSERT
  WITH CHECK (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

CREATE POLICY "clients_update_admin"
  ON clients FOR UPDATE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id())
  WITH CHECK (warehouse_id = get_my_warehouse_id());

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- ─── LOCATIONS ────────────────────────────────────────────────────────────────

-- All authenticated users in the warehouse can see locations (clients need this to understand where their items are)
CREATE POLICY "locations_select_warehouse"
  ON locations FOR SELECT
  USING (warehouse_id = get_my_warehouse_id());

CREATE POLICY "locations_insert_admin"
  ON locations FOR INSERT
  WITH CHECK (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

CREATE POLICY "locations_update_staff"
  ON locations FOR UPDATE
  USING (is_warehouse_staff() AND warehouse_id = get_my_warehouse_id())
  WITH CHECK (warehouse_id = get_my_warehouse_id());

CREATE POLICY "locations_delete_admin"
  ON locations FOR DELETE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- ─── ITEMS ────────────────────────────────────────────────────────────────────
-- KEY RULE: clients see ONLY their own items (client_id check).
-- Staff/admin see all items in their warehouse.

CREATE POLICY "items_select"
  ON items FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR client_id = get_my_client_id()
    )
  );

-- Staff can create items (receiving workflow)
CREATE POLICY "items_insert_staff"
  ON items FOR INSERT
  WITH CHECK (
    is_warehouse_staff()
    AND warehouse_id = get_my_warehouse_id()
  );

-- Staff can update items (move, change status, condition)
CREATE POLICY "items_update_staff"
  ON items FOR UPDATE
  USING (
    is_warehouse_staff()
    AND warehouse_id = get_my_warehouse_id()
  )
  WITH CHECK (warehouse_id = get_my_warehouse_id());

-- Only admins can delete items (soft-delete via status='disposed' preferred)
CREATE POLICY "items_delete_admin"
  ON items FOR DELETE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- ─── ITEM PHOTOS ──────────────────────────────────────────────────────────────

CREATE POLICY "item_photos_select"
  ON item_photos FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR EXISTS (
        SELECT 1 FROM items
        WHERE items.id = item_photos.item_id
          AND items.client_id = get_my_client_id()
      )
    )
  );

CREATE POLICY "item_photos_insert_staff"
  ON item_photos FOR INSERT
  WITH CHECK (
    is_warehouse_staff()
    AND warehouse_id = get_my_warehouse_id()
  );

CREATE POLICY "item_photos_delete_staff"
  ON item_photos FOR DELETE
  USING (is_warehouse_staff() AND warehouse_id = get_my_warehouse_id());

-- ─── ITEM EVENTS ──────────────────────────────────────────────────────────────

CREATE POLICY "item_events_select"
  ON item_events FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR EXISTS (
        SELECT 1 FROM items
        WHERE items.id = item_events.item_id
          AND items.client_id = get_my_client_id()
      )
    )
  );

-- Events are created by triggers (SECURITY DEFINER) – no direct insert from client
CREATE POLICY "item_events_insert_staff"
  ON item_events FOR INSERT
  WITH CHECK (is_warehouse_staff() AND warehouse_id = get_my_warehouse_id());

-- ─── SERVICE REQUESTS ─────────────────────────────────────────────────────────

CREATE POLICY "sr_select"
  ON service_requests FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR client_id = get_my_client_id()
    )
  );

-- Clients can submit requests for their own items
CREATE POLICY "sr_insert_client"
  ON service_requests FOR INSERT
  WITH CHECK (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR (get_my_role() = 'client' AND client_id = get_my_client_id())
    )
  );

-- Staff can update (accept, schedule, complete)
CREATE POLICY "sr_update_staff"
  ON service_requests FOR UPDATE
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR (get_my_role() = 'client' AND client_id = get_my_client_id() AND status = 'draft')
    )
  )
  WITH CHECK (warehouse_id = get_my_warehouse_id());

CREATE POLICY "sr_delete_admin"
  ON service_requests FOR DELETE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- ─── SERVICE REQUEST ITEMS ────────────────────────────────────────────────────

CREATE POLICY "sri_select"
  ON service_request_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = service_request_items.service_request_id
        AND sr.warehouse_id = get_my_warehouse_id()
        AND (is_warehouse_staff() OR sr.client_id = get_my_client_id())
    )
  );

CREATE POLICY "sri_insert"
  ON service_request_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = service_request_items.service_request_id
        AND sr.warehouse_id = get_my_warehouse_id()
        AND (is_warehouse_staff() OR sr.client_id = get_my_client_id())
    )
  );

CREATE POLICY "sri_delete_staff"
  ON service_request_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = service_request_items.service_request_id
        AND sr.warehouse_id = get_my_warehouse_id()
        AND is_warehouse_staff()
    )
  );

-- ─── STORAGE LOGS ─────────────────────────────────────────────────────────────

-- Clients can see their own storage logs (for billing transparency)
CREATE POLICY "sl_select"
  ON storage_logs FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR client_id = get_my_client_id()
    )
  );

-- Only staff/admin and triggers (SECURITY DEFINER) can write storage logs
CREATE POLICY "sl_insert_staff"
  ON storage_logs FOR INSERT
  WITH CHECK (is_warehouse_staff() AND warehouse_id = get_my_warehouse_id());

CREATE POLICY "sl_update_staff"
  ON storage_logs FOR UPDATE
  USING (is_warehouse_staff() AND warehouse_id = get_my_warehouse_id())
  WITH CHECK (warehouse_id = get_my_warehouse_id());

-- ─── INVOICES ─────────────────────────────────────────────────────────────────

CREATE POLICY "invoices_select"
  ON invoices FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND (
      is_warehouse_staff()
      OR client_id = get_my_client_id()
    )
  );

CREATE POLICY "invoices_insert_admin"
  ON invoices FOR INSERT
  WITH CHECK (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

CREATE POLICY "invoices_update_admin"
  ON invoices FOR UPDATE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id())
  WITH CHECK (warehouse_id = get_my_warehouse_id());

-- ─── INVOICE LINE ITEMS ───────────────────────────────────────────────────────

CREATE POLICY "ili_select"
  ON invoice_line_items FOR SELECT
  USING (
    warehouse_id = get_my_warehouse_id()
    AND EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (is_warehouse_staff() OR i.client_id = get_my_client_id())
    )
  );

CREATE POLICY "ili_insert_admin"
  ON invoice_line_items FOR INSERT
  WITH CHECK (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

CREATE POLICY "ili_update_admin"
  ON invoice_line_items FOR UPDATE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id())
  WITH CHECK (warehouse_id = get_my_warehouse_id());

CREATE POLICY "ili_delete_admin"
  ON invoice_line_items FOR DELETE
  USING (is_warehouse_admin() AND warehouse_id = get_my_warehouse_id());

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

-- Users only see their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (profile_id = auth.uid() AND warehouse_id = get_my_warehouse_id());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Notifications are inserted by server actions / triggers (service role)
CREATE POLICY "notifications_insert_staff"
  ON notifications FOR INSERT
  WITH CHECK (
    is_warehouse_staff()
    AND warehouse_id = get_my_warehouse_id()
  );

-- ─── STORAGE BUCKET POLICIES ──────────────────────────────────────────────────
-- These are set via Supabase dashboard or supabase CLI:
--
-- Bucket: item-photos
--   - Object path: {warehouse_id}/{item_id}/{filename}
--   - SELECT: authenticated users whose warehouse_id matches path segment
--   - INSERT: staff/admin only
--   - DELETE: staff/admin only
--
-- SQL equivalent (run in Supabase SQL editor after creating buckets):

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES
--   ('item-photos', 'item-photos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
--   ('documents',   'documents',   false, 20971520, ARRAY['application/pdf']);

-- Storage RLS policies use storage.foldername() to extract path segments.
-- See supabase/migrations/003_storage_policies.sql

-- ─── REALTIME PUBLICATION ─────────────────────────────────────────────────────
-- Enable realtime for tables the staff app needs to push updates to.
-- RLS still applies to realtime subscriptions.

ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE item_events;
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
