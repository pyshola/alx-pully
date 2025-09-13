import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

/**
 * createServerSupabase creates a Supabase client for server-side components with cookie-based auth.
 *
 * Assumptions:
 * - Should be called in server components or API routes.
 * - The Database type matches your Supabase schema.
 * - next/headers cookies() returns the correct cookies for the request context.
 *
 * Edge Cases:
 * - Returns a new client instance on each call.
 * - Relies on cookies for session management.
 *
 * Connections:
 * - Used in server components and API routes that require authenticated Supabase access.
 */
export const createServerSupabase = () => {
  return createServerComponentClient<Database>({
    cookies: () => cookies(),
  });
};

/**
 * createAdminSupabase creates a Supabase client with service role key for admin/server-side operations.
 *
 * Assumptions:
 * - Should only be called on the server (never in client-side code).
 * - Environment variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
 * - The Database type matches your Supabase schema.
 *
 * Edge Cases:
 * - Throws if environment variables are missing.
 * - Disables token auto-refresh and session persistence for security.
 *
 * Connections:
 * - Used for privileged operations such as admin actions, background jobs, or secure API routes.
 */
export const createAdminSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
