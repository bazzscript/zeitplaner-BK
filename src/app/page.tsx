import { createClient } from "@/lib/supabase/server";
import { saveGoogleTokensFromSession } from "@/lib/google/tokens";
import { AppShell } from "@/components/AppShell";
import { formatDateKey } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await saveGoogleTokensFromSession();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      userName={profile?.full_name ?? user.email ?? "User"}
      userAvatar={profile?.avatar_url}
      initialDate={formatDateKey(new Date())}
    />
  );
}
