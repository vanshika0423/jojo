import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * A cookie-less client for reading published content. Row level security
 * restricts it to what any visitor may see, so it is safe inside `use cache`.
 * Returns null until Supabase is configured.
 */
export function getPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
