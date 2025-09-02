import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createPoll, getPolls, DatabaseError } from "@/lib/database";
import { CreatePollForm } from "@/types/database";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();

  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const isPublic = searchParams.get("isPublic")
      ? searchParams.get("isPublic") === "true"
      : undefined;
    const orderBy = (searchParams.get("orderBy") || "created_at") as
      | "created_at"
      | "updated_at"
      | "title";
    const orderDirection = (searchParams.get("orderDirection") || "desc") as
      | "asc"
      | "desc";

    const offset = (page - 1) * limit;

    // Get polls with pagination
    const polls = await getPolls({
      userId,
      isPublic,
      limit,
      offset,
      search,
      orderBy,
      orderDirection,
    });

    // Get total count for pagination
    let countQuery = supabase
      .from("polls")
      .select("*", { count: "exact", head: true });

    if (userId) {
      countQuery = countQuery.eq("creator_id", userId);
    }

    if (isPublic !== undefined) {
      countQuery = countQuery.eq("is_public", isPublic);
    }

    if (search) {
      countQuery = countQuery.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Error getting poll count:", countError);
      return NextResponse.json(
        { error: "Failed to get poll count" },
        { status: 500 },
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: polls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Get polls error:", error);

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();

  try {
    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body: CreatePollForm = await request.json();

    // Validate request body
    if (!body.title || !body.options || body.options.length < 2) {
      return NextResponse.json(
        { error: "Title and at least 2 options are required" },
        { status: 400 },
      );
    }

    if (body.title.length > 500) {
      return NextResponse.json(
        { error: "Title must be 500 characters or less" },
        { status: 400 },
      );
    }

    if (body.description && body.description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less" },
        { status: 400 },
      );
    }

    if (body.options.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 options allowed" },
        { status: 400 },
      );
    }

    // Validate option lengths
    for (const option of body.options) {
      if (!option.trim()) {
        return NextResponse.json(
          { error: "All options must have content" },
          { status: 400 },
        );
      }
      if (option.length > 1000) {
        return NextResponse.json(
          { error: "Option text must be 1000 characters or less" },
          { status: 400 },
        );
      }
    }

    // Check for duplicate options
    const uniqueOptions = [
      ...new Set(body.options.map((opt) => opt.trim().toLowerCase())),
    ];
    if (uniqueOptions.length !== body.options.length) {
      return NextResponse.json(
        { error: "All options must be unique" },
        { status: 400 },
      );
    }

    // Validate expiration date
    if (body.expires_at && new Date(body.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "Expiration date must be in the future" },
        { status: 400 },
      );
    }

    // Create the poll
    const poll = await createPoll(body, user.id);

    return NextResponse.json(
      {
        success: true,
        poll,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create poll error:", error);

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
