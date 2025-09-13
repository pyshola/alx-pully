import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/database";

/**
 * createClientSupabase creates a new Supabase client instance for client-side usage.
 *
 * Assumptions:
 * - Should be called in React components or client-side code.
 * - The Database type matches your Supabase schema.
 *
 * Edge Cases:
 * - Returns a new client instance on each call.
 *
 * Connections:
 * - Used in components that require a fresh Supabase client.
 */
export const createClientSupabase = () => {
  return createClientComponentClient<Database>();
};

/**
 * supabase is a default Supabase client instance for backward compatibility.
 *
 * Assumptions:
 * - Used in client-side code where a singleton client is sufficient.
 * - The Database type matches your Supabase schema.
 *
 * Edge Cases:
 * - Shares the same instance across imports.
 *
 * Connections:
 * - Used by legacy code or components expecting a default Supabase client.
 */
export const supabase = createClientComponentClient<Database>();
