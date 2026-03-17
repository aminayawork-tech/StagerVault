-- ============================================================================
-- StagerVault – Supabase Storage Bucket & Policies
-- Migration: 003_storage_policies.sql
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'item-photos',
    'item-photos',
    false,                -- Private; served via signed URLs
    10485760,             -- 10MB per file
    ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
  ),
  (
    'documents',
    'documents',
    false,
    20971520,             -- 20MB
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- ─── item-photos bucket policies ─────────────────────────────────────────────
-- File path convention: {warehouse_id}/{item_id}/{filename}

-- Staff and clients (for their own items) can read photos
CREATE POLICY "item_photos_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'item-photos'
    AND (
      -- warehouse_id segment must match the user's warehouse
      (storage.foldername(name))[1] = get_my_warehouse_id()::TEXT
      AND (
        is_warehouse_staff()
        OR EXISTS (
          -- item_id segment must belong to the client
          SELECT 1 FROM items
          WHERE id::TEXT = (storage.foldername(name))[2]
            AND client_id = get_my_client_id()
        )
      )
    )
  );

-- Only staff can upload photos
CREATE POLICY "item_photos_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-photos'
    AND is_warehouse_staff()
    AND (storage.foldername(name))[1] = get_my_warehouse_id()::TEXT
  );

-- Only staff can delete photos
CREATE POLICY "item_photos_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'item-photos'
    AND is_warehouse_staff()
    AND (storage.foldername(name))[1] = get_my_warehouse_id()::TEXT
  );

-- ─── documents bucket policies ────────────────────────────────────────────────
-- File path: {warehouse_id}/invoices/{invoice_id}.pdf  etc.

CREATE POLICY "documents_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = get_my_warehouse_id()::TEXT
    AND (
      is_warehouse_staff()
      OR (
        -- Clients can only access their own invoice PDFs
        (storage.foldername(name))[2] = 'invoices'
        AND EXISTS (
          SELECT 1 FROM invoices
          WHERE pdf_url LIKE '%' || (storage.filename(name)) || '%'
            AND client_id = get_my_client_id()
        )
      )
    )
  );

CREATE POLICY "documents_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND is_warehouse_admin()
    AND (storage.foldername(name))[1] = get_my_warehouse_id()::TEXT
  );
