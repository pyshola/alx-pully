import { createServerSupabase, createClientSupabase } from "@/lib/supabase";
import {
  Database,
  Poll,
  PollInsert,
  PollUpdate,
  PollWithDetails,
  PollWithResults,
  PollOption,
  PollOptionInsert,
  Vote,
  VoteInsert,
  PollView,
  PollViewInsert,
  CreatePollForm,
  VoteForm,
  PollResult,
  UserPollStats,
  PopularPoll,
} from "@/types/database";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Poll-related functions
export async function createPoll(
  pollData: CreatePollForm,
  userId: string,
): Promise<Poll> {
  const supabase = createServerSupabase();

  try {
    // Start a transaction
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        title: pollData.title,
        description: pollData.description || null,
        creator_id: userId,
        is_public: pollData.is_public,
        allow_multiple_votes: pollData.allow_multiple_votes,
        allow_anonymous_votes: pollData.allow_anonymous_votes,
        expires_at: pollData.expires_at?.toISOString() || null,
      } satisfies PollInsert)
      .select()
      .single();

    if (pollError) {
      throw new DatabaseError(
        `Failed to create poll: ${pollError.message}`,
        pollError.code,
      );
    }

    // Create poll options
    const optionsData: PollOptionInsert[] = pollData.options.map(
      (text, index) => ({
        poll_id: poll.id,
        text,
        order_index: index,
      }),
    );

    const { error: optionsError } = await supabase
      .from("poll_options")
      .insert(optionsData);

    if (optionsError) {
      throw new DatabaseError(
        `Failed to create poll options: ${optionsError.message}`,
        optionsError.code,
      );
    }

    return poll;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error creating poll: ${error}`);
  }
}

export async function getPoll(
  pollId: string,
  userId?: string,
): Promise<PollWithDetails | null> {
  const supabase = createServerSupabase();

  try {
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select(
        `
        *,
        creator:profiles(*),
        options:poll_options(*)
      `,
      )
      .eq("id", pollId)
      .single();

    if (pollError) {
      if (pollError.code === "PGRST116") {
        return null;
      }
      throw new DatabaseError(
        `Failed to fetch poll: ${pollError.message}`,
        pollError.code,
      );
    }

    // Get vote counts for each option
    const { data: voteCounts, error: voteCountError } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", pollId);

    if (voteCountError) {
      throw new DatabaseError(
        `Failed to fetch vote counts: ${voteCountError.message}`,
        voteCountError.code,
      );
    }

    // Calculate vote counts per option
    const voteCountMap = voteCounts.reduce(
      (acc, vote) => {
        acc[vote.option_id] = (acc[vote.option_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get user's vote if authenticated
    let userVote = null;
    if (userId) {
      const { data: vote } = await supabase
        .from("votes")
        .select("*")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .single();

      userVote = vote;
    }

    // Enhance options with vote counts
    const enhancedOptions = poll.options?.map((option: PollOption) => ({
      ...option,
      vote_count: voteCountMap[option.id] || 0,
    }));

    return {
      ...poll,
      options: enhancedOptions,
      vote_count: voteCounts.length,
      user_vote: userVote,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error fetching poll: ${error}`);
  }
}

export async function getPollResults(pollId: string): Promise<PollResult[]> {
  const supabase = createServerSupabase();

  try {
    const { data, error } = await supabase.rpc("get_poll_results", {
      poll_uuid: pollId,
    });

    if (error) {
      throw new DatabaseError(
        `Failed to get poll results: ${error.message}`,
        error.code,
      );
    }

    return data || [];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error fetching poll results: ${error}`);
  }
}

export async function getPolls(options?: {
  userId?: string;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: "created_at" | "updated_at" | "title";
  orderDirection?: "asc" | "desc";
}): Promise<PollWithDetails[]> {
  const supabase = createServerSupabase();

  try {
    let query = supabase.from("polls").select(`
        *,
        creator:profiles(*),
        options:poll_options(*)
      `);

    // Apply filters
    if (options?.userId) {
      query = query.eq("creator_id", options.userId);
    }

    if (options?.isPublic !== undefined) {
      query = query.eq("is_public", options.isPublic);
    }

    if (options?.search) {
      query = query.or(
        `title.ilike.%${options.search}%,description.ilike.%${options.search}%`,
      );
    }

    // Apply ordering
    const orderBy = options?.orderBy || "created_at";
    const orderDirection = options?.orderDirection || "desc";
    query = query.order(orderBy, { ascending: orderDirection === "asc" });

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data: polls, error } = await query;

    if (error) {
      throw new DatabaseError(
        `Failed to fetch polls: ${error.message}`,
        error.code,
      );
    }

    // Get vote counts for all polls
    const pollIds = polls?.map((poll) => poll.id) || [];
    if (pollIds.length === 0) return [];

    const { data: voteCounts, error: voteCountError } = await supabase
      .from("votes")
      .select("poll_id, option_id")
      .in("poll_id", pollIds);

    if (voteCountError) {
      throw new DatabaseError(
        `Failed to fetch vote counts: ${voteCountError.message}`,
        voteCountError.code,
      );
    }

    // Group vote counts by poll
    const voteCountsByPoll = voteCounts.reduce(
      (acc, vote) => {
        if (!acc[vote.poll_id]) {
          acc[vote.poll_id] = {};
        }
        acc[vote.poll_id][vote.option_id] =
          (acc[vote.poll_id][vote.option_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    // Enhance polls with vote counts
    return (
      polls?.map((poll) => {
        const pollVoteCounts = voteCountsByPoll[poll.id] || {};
        const totalVotes = Object.values(pollVoteCounts).reduce(
          (sum, count) => sum + count,
          0,
        );

        const enhancedOptions = poll.options?.map((option: PollOption) => ({
          ...option,
          vote_count: pollVoteCounts[option.id] || 0,
        }));

        return {
          ...poll,
          options: enhancedOptions,
          vote_count: totalVotes,
        };
      }) || []
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error fetching polls: ${error}`);
  }
}

export async function getPopularPolls(
  limit: number = 10,
): Promise<PopularPoll[]> {
  const supabase = createServerSupabase();

  try {
    const { data, error } = await supabase
      .from("popular_polls")
      .select("*")
      .order("popularity_score", { ascending: false })
      .limit(limit);

    if (error) {
      throw new DatabaseError(
        `Failed to fetch popular polls: ${error.message}`,
        error.code,
      );
    }

    return data || [];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Unexpected error fetching popular polls: ${error}`,
    );
  }
}

export async function updatePoll(
  pollId: string,
  updates: PollUpdate,
  userId: string,
): Promise<Poll> {
  const supabase = createServerSupabase();

  try {
    const { data, error } = await supabase
      .from("polls")
      .update(updates)
      .eq("id", pollId)
      .eq("creator_id", userId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to update poll: ${error.message}`,
        error.code,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error updating poll: ${error}`);
  }
}

export async function deletePoll(
  pollId: string,
  userId: string,
): Promise<void> {
  const supabase = createServerSupabase();

  try {
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", pollId)
      .eq("creator_id", userId);

    if (error) {
      throw new DatabaseError(
        `Failed to delete poll: ${error.message}`,
        error.code,
      );
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error deleting poll: ${error}`);
  }
}

// Vote-related functions
export async function castVote(
  voteData: VoteForm,
  userId?: string,
): Promise<Vote[]> {
  const supabase = createClientSupabase();

  try {
    // Check if poll allows multiple votes
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("allow_multiple_votes, expires_at")
      .eq("id", voteData.poll_id)
      .single();

    if (pollError) {
      throw new DatabaseError(
        `Failed to fetch poll: ${pollError.message}`,
        pollError.code,
      );
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      throw new DatabaseError("Poll has expired");
    }

    // If multiple votes are not allowed, delete existing votes
    if (!poll.allow_multiple_votes) {
      if (userId) {
        await supabase
          .from("votes")
          .delete()
          .eq("poll_id", voteData.poll_id)
          .eq("user_id", userId);
      } else if (voteData.voter_fingerprint) {
        await supabase
          .from("votes")
          .delete()
          .eq("poll_id", voteData.poll_id)
          .eq("voter_fingerprint", voteData.voter_fingerprint);
      }
    }

    // Cast new votes
    const votesToInsert: VoteInsert[] = voteData.option_ids.map((optionId) => ({
      poll_id: voteData.poll_id,
      option_id: optionId,
      user_id: userId || null,
      voter_fingerprint: voteData.voter_fingerprint || null,
    }));

    const { data: votes, error: voteError } = await supabase
      .from("votes")
      .insert(votesToInsert)
      .select();

    if (voteError) {
      throw new DatabaseError(
        `Failed to cast vote: ${voteError.message}`,
        voteError.code,
      );
    }

    return votes || [];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error casting vote: ${error}`);
  }
}

export async function getUserVote(
  pollId: string,
  userId?: string,
  fingerprint?: string,
): Promise<Vote[]> {
  const supabase = createClientSupabase();

  try {
    let query = supabase.from("votes").select("*").eq("poll_id", pollId);

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (fingerprint) {
      query = query.eq("voter_fingerprint", fingerprint);
    } else {
      return [];
    }

    const { data, error } = await query;

    if (error) {
      throw new DatabaseError(
        `Failed to fetch user vote: ${error.message}`,
        error.code,
      );
    }

    return data || [];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error fetching user vote: ${error}`);
  }
}

// Analytics functions
export async function recordPollView(
  pollId: string,
  userId?: string,
  fingerprint?: string,
): Promise<void> {
  const supabase = createClientSupabase();

  try {
    const viewData: PollViewInsert = {
      poll_id: pollId,
      viewer_id: userId || null,
      viewer_fingerprint: fingerprint || null,
    };

    // Insert view record (will be ignored if already exists due to unique constraint)
    const { error } = await supabase.from("poll_views").insert(viewData);

    if (error && !error.message.includes("duplicate key")) {
      throw new DatabaseError(
        `Failed to record poll view: ${error.message}`,
        error.code,
      );
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    // Silently fail for view tracking to not disrupt user experience
    console.error("Error recording poll view:", error);
  }
}

export async function getUserPollStats(
  userId: string,
): Promise<UserPollStats | null> {
  const supabase = createServerSupabase();

  try {
    const { data, error } = await supabase.rpc("get_user_poll_stats", {
      user_uuid: userId,
    });

    if (error) {
      throw new DatabaseError(
        `Failed to get user stats: ${error.message}`,
        error.code,
      );
    }

    return data?.[0] || null;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Unexpected error fetching user stats: ${error}`);
  }
}

export async function refreshPopularPolls(): Promise<void> {
  const supabase = createServerSupabase();

  try {
    const { error } = await supabase.rpc("refresh_popular_polls");

    if (error) {
      throw new DatabaseError(
        `Failed to refresh popular polls: ${error.message}`,
        error.code,
      );
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Unexpected error refreshing popular polls: ${error}`,
    );
  }
}

// Utility functions
export function generateFingerprint(): string {
  // Generate a simple fingerprint based on available browser information
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Browser fingerprint", 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    new Date().getTimezoneOffset(),
    screen.width + "x" + screen.height,
    screen.colorDepth,
    canvas.toDataURL(),
  ].join("|");

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

export function canUserVote(poll: Poll, userVote?: Vote[]): boolean {
  // Check if poll has expired
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return false;
  }

  // Check if user has already voted and multiple votes are not allowed
  if (!poll.allow_multiple_votes && userVote && userVote.length > 0) {
    return false;
  }

  return true;
}

export function getPollStatus(poll: Poll): "active" | "expired" | "draft" {
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return "expired";
  }

  if (!poll.is_public) {
    return "draft";
  }

  return "active";
}
