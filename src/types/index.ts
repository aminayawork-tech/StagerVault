// ─── Core domain types (mirrors DB schema) ────────────────────────────────────

export type UserRole = "admin" | "staff" | "client";
export type ItemStatus =
  | "pending_intake"
  | "received"
  | "stored"
  | "assembled"
  | "staged"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "damaged"
  | "disposed";

export type ItemCondition = "excellent" | "good" | "fair" | "damaged" | "unknown";
export type ServiceType =
  | "receiving"
  | "storage"
  | "assembly"
  | "delivery"
  | "pickup"
  | "white_glove_delivery"
  | "inspection"
  | "disposal";
export type ServiceRequestStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";
export type BillingCycle = "monthly" | "weekly" | "per_item";

// ─── Tenant / Warehouse ───────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  name: string;
  slug: string; // subdomain-safe unique key e.g. "empyrean"
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: WarehouseSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseSettings {
  default_storage_rate_monthly: number; // $ per item per month
  currency: string; // "USD"
  invoice_due_days: number; // e.g. 30
  invoice_prefix: string; // e.g. "EMP-"
  timezone: string; // "America/New_York"
  notifications_email: boolean;
  notifications_sms: boolean;
}

// ─── User / Profile ───────────────────────────────────────────────────────────

export interface Profile {
  id: string; // matches auth.users.id
  warehouse_id: string;
  client_id: string | null; // non-null for role=client
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Client Company ───────────────────────────────────────────────────────────

export interface Client {
  id: string;
  warehouse_id: string;
  name: string; // e.g. "Jane's Interiors LLC"
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  billing_rate_monthly: number | null; // override warehouse default
  billing_cycle: BillingCycle;
  mydarby_id: string | null; // future CSV sync
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface Location {
  id: string;
  warehouse_id: string;
  zone: string; // e.g. "A"
  aisle: string; // e.g. "03"
  bay: string; // e.g. "12"
  label: string; // computed: "A-03-12"
  description: string | null;
  capacity: number | null; // max items
  current_count: number; // maintained by trigger
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Item ─────────────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  warehouse_id: string;
  client_id: string;
  location_id: string | null;
  barcode: string | null; // auto-generated or scanned
  name: string;
  description: string | null;
  category: string | null; // "sofa", "chair", "lamp", etc.
  status: ItemStatus;
  condition: ItemCondition;
  quantity: number;
  // Dimensions (optional)
  width_in: number | null;
  height_in: number | null;
  depth_in: number | null;
  weight_lbs: number | null;
  // Financials (optional – syncs from MyDarby)
  purchase_price: number | null;
  // Photos
  primary_photo_url: string | null;
  // Metadata
  received_at: string | null;
  notes: string | null;
  mydarby_id: string | null;
  created_by: string | null; // profile id
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
  location?: Location;
  photos?: ItemPhoto[];
  latest_event?: ItemEvent;
}

export interface ItemPhoto {
  id: string;
  item_id: string;
  warehouse_id: string;
  storage_path: string; // Supabase Storage path
  url: string; // signed URL (resolved at query time)
  caption: string | null;
  taken_at: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ItemEvent {
  id: string;
  item_id: string;
  warehouse_id: string;
  event_type: ItemStatus;
  from_location_id: string | null;
  to_location_id: string | null;
  condition_before: ItemCondition | null;
  condition_after: ItemCondition | null;
  performed_by: string | null; // profile id
  notes: string | null;
  created_at: string;
  // Joined
  performed_by_profile?: Profile;
  from_location?: Location;
  to_location?: Location;
}

// ─── Service Request ──────────────────────────────────────────────────────────

export interface ServiceRequest {
  id: string;
  warehouse_id: string;
  client_id: string;
  requested_by: string | null; // profile id
  assigned_to: string | null; // staff profile id
  service_type: ServiceType;
  status: ServiceRequestStatus;
  title: string;
  description: string | null;
  delivery_address: string | null;
  requested_date: string | null; // date only
  scheduled_date: string | null; // datetime
  completed_date: string | null;
  price: number | null; // quoted price
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
  items?: Item[];
  assigned_staff?: Profile;
}

export interface ServiceRequestItem {
  service_request_id: string;
  item_id: string;
  notes: string | null;
}

// ─── Storage Log (for billing) ────────────────────────────────────────────────

export interface StorageLog {
  id: string;
  item_id: string;
  warehouse_id: string;
  client_id: string;
  location_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  rate_monthly: number; // snapshot of rate at time of billing
  billed_days: number | null; // computed on invoice generation
  billed_amount: number | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  warehouse_id: string;
  client_id: string;
  invoice_number: string; // e.g. "EMP-0042"
  status: InvoiceStatus;
  period_start: string | null; // for storage billing
  period_end: string | null;
  subtotal: number;
  tax: number;
  total: number;
  due_date: string | null;
  paid_at: string | null;
  stripe_invoice_id: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
  line_items?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  warehouse_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_id: string | null; // link to item if applicable
  storage_log_id: string | null;
  service_request_id: string | null;
  created_at: string;
}

// ─── API response helpers ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
