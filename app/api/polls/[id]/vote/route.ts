import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  castVote,
  getUserVote,
  DatabaseError,
  generateFingerprint,
} from "@/lib/database";
import { VoteForm } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabase();

  try {
    const pollId = params.id;

    // Get the authenticated user (optional for anonymous voting)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { option_ids, voter_fingerprint } = body;

    // Validate request body
    if (!option_ids || !Array.isArray(option_ids) || option_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one option must be selected" },
        { status: 400 },
      );
    }

    // Verify poll exists and get its settings
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Check if poll is public or user has access
    if (!poll.is_public && (!user || poll.creator_id !== user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return NextResponse.json({ error: "Poll has expired" }, { status: 400 });
    }

    // Check if anonymous voting is allowed
    if (!user && !poll.allow_anonymous_votes) {
      return NextResponse.json(
        { error: "Authentication required to vote on this poll" },
        { status: 401 },
      );
    }

    // Verify all option IDs belong to this poll
    const { data: pollOptions, error: optionsError } = await supabase
      .from("poll_options")
      .select("id")
      .eq("poll_id", pollId)
      .in("id", option_ids);

    if (optionsError || !pollOptions) {
      return NextResponse.json(
        { error: "Failed to verify poll options" },
        { status: 500 },
      );
    }

    if (pollOptions.length !== option_ids.length) {
      return NextResponse.json(
        { error: "Invalid option IDs provided" },
        { status: 400 },
      );
    }

    // Check if multiple votes are allowed
    if (!poll.allow_multiple_votes && option_ids.length > 1) {
      return NextResponse.json(
        { error: "Multiple votes are not allowed for this poll" },
        { status: 400 },
      );
    }

    // Check if user has already voted (if multiple votes not allowed)
    if (!poll.allow_multiple_votes) {
      const existingVotes = await getUserVote(
        pollId,
        user?.id,
        voter_fingerprint,
      );

      if (existingVotes.length > 0) {
        return NextResponse.json(
          { error: "You have already voted on this poll" },
          { status: 400 },
        );
      }
    }

    // Prepare vote data
    const voteData: VoteForm = {
      poll_id: pollId,
      option_ids,
      voter_fingerprint: user ? undefined : voter_fingerprint,
    };

    // Cast the vote
    const votes = await castVote(voteData, user?.id);

    // Get updated poll results
    const { data: results, error: resultsError } = await supabase.rpc(
      "get_poll_results",
      { poll_uuid: pollId },
    );

    if (resultsError) {
      console.error("Error fetching updated results:", resultsError);
    }

    return NextResponse.json({
      success: true,
      votes,
      results: results || [],
      message: "Vote cast successfully",
    });
  } catch (error) {
    console.error("Vote error:", error);

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabase();

  try {
    const pollId = params.id;
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get("fingerprint");

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get user's existing votes
    const votes = await getUserVote(pollId, user?.id, fingerprint || undefined);

    return NextResponse.json({
      votes,
      hasVoted: votes.length > 0,
    });
  } catch (error) {
    console.error("Get votes error:", error);

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabase();

  try {
    const pollId = params.id;

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

    // Verify poll exists and user has permission to delete votes
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("creator_id, allow_multiple_votes")
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Check if user is the poll creator or deleting their own votes
    const { searchParams } = new URL(request.url);
    const deleteAll = searchParams.get("deleteAll") === "true";

    if (deleteAll && poll.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Only poll creators can delete all votes" },
        { status: 403 },
      );
    }

    // Delete votes
    let query = supabase.from("votes").delete().eq("poll_id", pollId);

    if (!deleteAll) {
      query = query.eq("user_id", user.id);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      throw new DatabaseError(
        `Failed to delete votes: ${deleteError.message}`,
        deleteError.code,
      );
    }

    // Get updated poll results
    const { data: results, error: resultsError } = await supabase.rpc(
      "get_poll_results",
      { poll_uuid: pollId },
    );

    if (resultsError) {
      console.error("Error fetching updated results:", resultsError);
    }

    return NextResponse.json({
      success: true,
      results: results || [],
      message: deleteAll ? "All votes deleted" : "Your votes have been removed",
    });
  } catch (error) {
    console.error("Delete votes error:", error);

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
