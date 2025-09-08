
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

interface BatchVoteData {
  pollId: string;
  votes: Array<{
    optionId: string;
    userId?: string;
    fingerprint?: string;
  }>;
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const batchData: BatchVoteData = await req.json();
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  try {
    // Process in chunks of 100 to avoid overwhelming the database
    const CHUNK_SIZE = 100;
    const chunks = [];

    for (let i = 0; i < batchData.votes.length; i += CHUNK_SIZE) {
      chunks.push(batchData.votes.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      const votesToInsert = chunk.map((vote) => ({
        poll_id: batchData.pollId,
        option_id: vote.optionId,
        user_id: vote.userId || null,
        voter_fingerprint: vote.fingerprint || null,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("votes")
        .insert(votesToInsert)
        .select();

      if (error) {
        errors.push(`Batch error: ${error.message}`);
        failed += chunk.length;
      } else {
        processed += data?.length || 0;
      }
    }

    return NextResponse.json({ processed, failed, errors });

  } catch (error) {
    return NextResponse.json({ processed: 0, failed: batchData.votes.length, errors: [`Batch processing failed: ${error}`] }, { status: 500 });
  }
}
