import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewServiceRequestForm } from "./new-service-request-form";

export const metadata: Metadata = { title: "Request a Service" };

export default async function NewServiceRequestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, role, warehouse_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/");

  // Load client's items
  const { data: items } = await supabase
    .from("items")
    .select("id, name, barcode, status, item_photos(storage_path)")
    .eq("client_id", profile.client_id)
    .not("status", "eq", "delivered")
    .order("name");

  // Generate signed URLs for first photo of each item
  const itemsWithPhotos = await Promise.all(
    (items ?? []).map(async (item: any) => {
      const photos: any[] = item.item_photos ?? [];
      const firstPhoto = photos[0];
      let photoUrl: string | null = null;
      if (firstPhoto?.storage_path) {
        const { data } = await supabase.storage
          .from("item-photos")
          .createSignedUrl(firstPhoto.storage_path, 300);
        photoUrl = data?.signedUrl ?? null;
      }
      return { id: item.id, name: item.name, barcode: item.barcode, status: item.status, photoUrl };
    })
  );

  return (
    <NewServiceRequestForm
      clientId={profile.client_id}
      items={itemsWithPhotos}
    />
  );
}
