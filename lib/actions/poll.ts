"use server";

import { createServerSupabase } from "@/lib/supabase";
import { CreatePollForm, Poll } from "@/types/database";
import { DatabaseError, createPoll } from "@/lib/database";
import { validateCreatePollForm, cleanPollOptions } from "@/lib/validation";

export async function createPollAction(
  formData: CreatePollForm,
): Promise<{ success: boolean; poll?: Poll; error?: string }> {
  const supabase = createServerSupabase();

  // 1. Abstract User Authentication Logic
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required. Please log in." };
  }

  // 2. Encapsulate Poll Input Validation
  const validation = validateCreatePollForm(formData);

  if (!validation.isValid) {
    // Standardize Error Response
    const firstError = Object.values(validation.errors)[0];
    return {
      success: false,
      error: firstError,
    };
  }

  const validatedData = validation.cleanedData!;

  try {
    // 3. Modulaize Poll Operations (call the database function)
    const newPoll = await createPoll(validatedData, user.id);
    return { success: true, poll: newPoll };
  } catch (error) {
    console.error("Error in createPollAction:", error);
    // Standardize Error Response
    if (error instanceof DatabaseError) {
      return { success: false, error: `Database Error: ${error.message}` };
    }
    return {
      success: false,
      error: "An unexpected error occurred while creating the poll.",
    };
  }
}
