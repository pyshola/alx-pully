import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/database";

// Client-side Supabase client for use in components
export const createClientSupabase = () => {
  return createClientComponentClient<Database>();
};

// Default client for backward compatibility
export const supabase = createClientComponentClient<Database>();
