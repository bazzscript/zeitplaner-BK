"use server";

import { createClient } from "@/lib/supabase/server";
import { refreshGoogleAccessToken } from "@/lib/google/calendar";
import type { Profile } from "@/lib/types";

export async function getValidGoogleTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile?.google_refresh_token) return null;

  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at).getTime()
    : 0;

  if (profile.google_access_token && expiresAt > Date.now() + 60_000) {
    return {
      accessToken: profile.google_access_token,
      refreshToken: profile.google_refresh_token,
    };
  }

  const refreshed = await refreshGoogleAccessToken(profile.google_refresh_token);
  await supabase
    .from("profiles")
    .update({
      google_access_token: refreshed.accessToken,
      google_token_expires_at: refreshed.expiresAt,
    })
    .eq("id", user.id);

  return {
    accessToken: refreshed.accessToken,
    refreshToken: profile.google_refresh_token,
  };
}

export async function saveGoogleTokensFromSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;

  if (!providerRefreshToken) return;

  await supabase
    .from("profiles")
    .update({
      google_access_token: providerToken ?? null,
      google_refresh_token: providerRefreshToken,
      google_token_expires_at: providerToken
        ? new Date(Date.now() + 3600 * 1000).toISOString()
        : null,
    })
    .eq("id", session.user.id);
}
