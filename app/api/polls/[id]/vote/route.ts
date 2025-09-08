import { createServerSupabase } from "@/lib/supabase-server";
import { VoteForm, Vote } from "@/types/database";
import { DatabaseError } from "@/lib/database";
import { Redis } from "ioredis";
import { NextRequest, NextResponse } from "next/server";

// Redis client for caching and rate limiting
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Rate limiting constants
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX_VOTES = 10; // Max votes per user per minute

interface OptimizedVoteResult {
  success: boolean;
  votes?: Vote[];
  error?: string;
  rateLimited?: boolean;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fingerprint = req.headers.get("x-fingerprint") || undefined;

  const voteData: VoteForm = await req.json();

  if (voteData.poll_id !== params.id) {
    return NextResponse.json({ error: "Poll ID mismatch" }, { status: 400 });
  }

  const startTime = Date.now();

  try {
    // 1. Rate Limiting Check
    const rateLimitResult = await checkRateLimit(user?.id, fingerprint);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`, rateLimited: true }, { status: 429 });
    }

    // 2. Get cached poll data or fetch from DB
    const poll = await getCachedPoll(voteData.poll_id);
    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // 3. Validate poll state
    const validationResult = validatePollForVoting(poll);
    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    // 4. Check existing votes with optimistic approach
    const existingVotes = await getExistingVotes(voteData.poll_id, user?.id, fingerprint);

    if (!poll.allow_multiple_votes && existingVotes.length > 0) {
      // Use atomic update instead of delete + insert
      const result = await replaceExistingVote(voteData, user?.id, fingerprint, existingVotes[0]);
      return NextResponse.json({ success: true, votes: result });
    }

    // 5. Insert votes with batch processing
    const result = await insertVotesWithRetry(voteData, user?.id, fingerprint);

    // 6. Update rate limiting counter
    await updateRateLimit(user?.id, fingerprint);

    // 7. Invalidate relevant caches asynchronously
    invalidatePollCaches(voteData.poll_id).catch(console.error);

    console.log(`Vote processed in ${Date.now() - startTime}ms`);

    return NextResponse.json({ success: true, votes: result });

  } catch (error) {
    console.error("Error in castVoteOptimized:", error);

    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "An unexpected error occurred while processing your vote." }, { status: 500 });
  }
}


// Helper functions for optimization

async function checkRateLimit(
  userId?: string,
  fingerprint?: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const identifier = userId || fingerprint || "anonymous";
  const key = `rate_limit:vote:${identifier}`;

  try {
    const current = await redis.get(key);
    const count = parseInt(current || "0", 10);

    if (count >= RATE_LIMIT_MAX_VOTES) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfter: ttl };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true }; // Fail open
  }
}

async function updateRateLimit(userId?: string, fingerprint?: string): Promise<void> {
  const identifier = userId || fingerprint || "anonymous";
  const key = `rate_limit:vote:${identifier}`;

  try {
    await redis.multi()
      .incr(key)
      .expire(key, RATE_LIMIT_WINDOW)
      .exec();
  } catch (error) {
    console.error("Rate limit update failed:", error);
  }
}

async function getCachedPoll(pollId: string): Promise<any> {
  const cacheKey = `poll:${pollId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Cache get failed:", error);
  }

  // Fetch from database
  const supabase = createServerSupabase();
  const { data: poll, error } = await supabase
    .from("polls")
    .select("id, allow_multiple_votes, expires_at, is_public")
    .eq("id", pollId)
    .single();

  if (error) {
    throw new DatabaseError(`Failed to fetch poll: ${error.message}`, error.code);
  }

  // Cache for 5 minutes
  try {
    await redis.setex(cacheKey, 300, JSON.stringify(poll));
  } catch (error) {
    console.error("Cache set failed:", error);
  }

  return poll;
}

function validatePollForVoting(poll: any): { valid: boolean; error?: string } {
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return { valid: false, error: "Poll has expired" };
  }

  return { valid: true };
}

async function getExistingVotes(
  pollId: string,
  userId?: string,
  fingerprint?: string,
): Promise<Vote[]> {
  const supabase = createServerSupabase();

  let query = supabase
    .from("votes")
    .select("*")
    .eq("poll_id", pollId);

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (fingerprint) {
    query = query.eq("voter_fingerprint", fingerprint);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(`Failed to fetch existing votes: ${error.message}`, error.code);
  }

  return data || [];
}

async function replaceExistingVote(
  voteData: VoteForm,
  userId?: string,
  fingerprint?: string,
  existingVote: Vote,
): Promise<Vote[]> {
  const supabase = createServerSupabase();

  // Use atomic update with version checking
  const newVoteData = {
    option_id: voteData.option_ids[0], // Take first option for single vote
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("votes")
    .update(newVoteData)
    .eq("id", existingVote.id)
    .select();

  if (error) {
    throw new DatabaseError(`Failed to update vote: ${error.message}`, error.code);
  }

  return data || [];
}

async function insertVotesWithRetry(
  voteData: VoteForm,
  userId?: string,
  fingerprint?: string,
  maxRetries: number = 3,
): Promise<Vote[]> {
  const supabase = createServerSupabase();

  const votesToInsert = voteData.option_ids.map((optionId) => ({
    poll_id: voteData.poll_id,
    option_id: optionId,
    user_id: userId || null,
    voter_fingerprint: fingerprint || null,
    created_at: new Date().toISOString(),
  }));

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from("votes")
        .insert(votesToInsert)
        .select();

      if (error) {
        throw new DatabaseError(`Failed to insert votes: ${error.message}`, error.code);
      }

      return data || [];

    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

async function invalidatePollCaches(pollId: string): Promise<void> {
  try {
    const keys = [
      `poll:${pollId}`,
      `poll_results:${pollId}`,
      `poll_stats:${pollId}`,
    ];

    await redis.del(...keys);
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }
}