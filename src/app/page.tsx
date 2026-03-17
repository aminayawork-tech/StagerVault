import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root page: redirect based on auth state and role.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch role to redirect to correct dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Profile not set up yet → logout and try again
    redirect("/auth/login");
  }

  switch (profile.role) {
    case "admin":
      redirect("/dashboard/admin");
    case "staff":
      redirect("/dashboard/staff");
    case "client":
      redirect("/dashboard/client");
    default:
      redirect("/auth/login");
  }
}
