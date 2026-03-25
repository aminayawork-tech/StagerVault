/**
 * Supabase auto-generated types placeholder.
 *
 * Replace this file by running:
 *   npm run db:types
 *
 * Which executes:
 *   supabase gen types typescript --local > src/types/supabase.ts
 *
 * Until then, this stub keeps TypeScript happy for development.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      warehouses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          settings: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["warehouses"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["warehouses"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          warehouse_id: string;
          client_id: string | null;
          role: "admin" | "staff" | "client";
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          warehouse_id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          billing_rate_monthly: number | null;
          billing_cycle: "monthly" | "weekly" | "per_item";
          mydarby_id: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          warehouse_id: string;
          zone: string;
          aisle: string;
          bay: string;
          label: string;
          description: string | null;
          capacity: number | null;
          current_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["locations"]["Row"], "id" | "label" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          warehouse_id: string;
          client_id: string;
          location_id: string | null;
          barcode: string | null;
          name: string;
          description: string | null;
          category: string | null;
          status: "pending_intake" | "received" | "stored" | "assembled" | "staged" | "out_for_delivery" | "delivered" | "returned" | "damaged" | "disposed";
          condition: "excellent" | "good" | "fair" | "damaged" | "unknown";
          quantity: number;
          width_in: number | null;
          height_in: number | null;
          depth_in: number | null;
          weight_lbs: number | null;
          purchase_price: number | null;
          primary_photo_url: string | null;
          received_at: string | null;
          notes: string | null;
          mydarby_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["items"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
        Relationships: [];
      };
      item_photos: {
        Row: {
          id: string;
          item_id: string;
          warehouse_id: string;
          storage_path: string;
          caption: string | null;
          taken_at: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["item_photos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["item_photos"]["Insert"]>;
        Relationships: [];
      };
      item_events: {
        Row: {
          id: string;
          item_id: string;
          warehouse_id: string;
          event_type: string;
          from_location_id: string | null;
          to_location_id: string | null;
          condition_before: string | null;
          condition_after: string | null;
          performed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["item_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["item_events"]["Insert"]>;
        Relationships: [];
      };
      service_requests: {
        Row: {
          id: string;
          warehouse_id: string;
          client_id: string;
          requested_by: string | null;
          assigned_to: string | null;
          service_type: string;
          status: string;
          title: string;
          description: string | null;
          delivery_address: string | null;
          requested_date: string | null;
          scheduled_date: string | null;
          completed_date: string | null;
          price: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["service_requests"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["service_requests"]["Insert"]>;
        Relationships: [];
      };
      service_request_items: {
        Row: { service_request_id: string; item_id: string; notes: string | null };
        Insert: Database["public"]["Tables"]["service_request_items"]["Row"];
        Update: Partial<Database["public"]["Tables"]["service_request_items"]["Row"]>;
        Relationships: [];
      };
      storage_logs: {
        Row: {
          id: string;
          item_id: string;
          warehouse_id: string;
          client_id: string;
          location_id: string | null;
          check_in_at: string;
          check_out_at: string | null;
          rate_monthly: number;
          billed_days: number | null;
          billed_amount: number | null;
          invoice_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["storage_logs"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["storage_logs"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          warehouse_id: string;
          client_id: string;
          invoice_number: string;
          status: "draft" | "sent" | "paid" | "overdue" | "void";
          period_start: string | null;
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
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          warehouse_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          item_id: string | null;
          storage_log_id: string | null;
          service_request_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoice_line_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["invoice_line_items"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          warehouse_id: string;
          profile_id: string;
          title: string;
          body: string | null;
          type: string;
          reference_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      get_my_warehouse_id: { Args: Record<string, never>; Returns: string };
      get_my_role: { Args: Record<string, never>; Returns: "admin" | "staff" | "client" };
      get_my_client_id: { Args: Record<string, never>; Returns: string | null };
      is_warehouse_admin: { Args: Record<string, never>; Returns: boolean };
      is_warehouse_staff: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: "admin" | "staff" | "client";
      item_status: "pending_intake" | "received" | "stored" | "assembled" | "staged" | "out_for_delivery" | "delivered" | "returned" | "damaged" | "disposed";
      item_condition: "excellent" | "good" | "fair" | "damaged" | "unknown";
      service_type: "receiving" | "storage" | "assembly" | "delivery" | "pickup" | "white_glove_delivery" | "inspection" | "disposal";
      service_request_status: "draft" | "submitted" | "accepted" | "scheduled" | "in_progress" | "completed" | "cancelled";
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void";
      billing_cycle: "monthly" | "weekly" | "per_item";
    };
  };
}
