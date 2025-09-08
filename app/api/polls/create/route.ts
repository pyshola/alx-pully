
import { createServerSupabase } from "@/lib/supabase-server";
import { CreatePollForm, Poll } from "@/types/database";
import { DatabaseError, createPoll } from "@/lib/database";
import { validateCreatePollForm } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
  }

  const formData: CreatePollForm = await req.json();
  const validation = validateCreatePollForm(formData);

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const validatedData = validation.cleanedData!;

  try {
    const newPoll = await createPoll(validatedData, user.id);
    return NextResponse.json({ success: true, poll: newPoll }, { status: 201 });
  } catch (error) {
    console.error("Error in createPollAction:", error);
    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "An unexpected error occurred while creating the poll." }, { status: 500 });
  }
}
