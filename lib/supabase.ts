// This file acts as an index to re-export Supabase client functions.
// This helps ensure that server-side only functions are not inadvertently
// imported into client-side components.

export { createClientSupabase, supabase } from "./supabase-client";
export { createServerSupabase, createAdminSupabase } from "./supabase-server";
