"use client";

import { useState, useEffect } from "react";
import { createClientSupabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/auth-context";
import {
  PollWithDetails,
  CreatePollForm,
  VoteForm,
  PollResult,
} from "@/types/database";
import { DatabaseError } from "@/lib/database";

interface UsePollsOptions {
  userId?: string;
  isPublic?: boolean;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

interface UsePollsReturn {
  polls: PollWithDetails[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  fetchPolls: (page?: number) => Promise<void>;
  createPoll: (pollData: CreatePollForm) => Promise<string>;
  refreshPolls: () => Promise<void>;
  clearError: () => void;
}

export function usePolls(options: UsePollsOptions = {}): UsePollsReturn {
  const { user } = useAuth();
  const [polls, setPolls] = useState<PollWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const { userId, isPublic, limit = 10, search, autoFetch = true } = options;

  const supabase = createClientSupabase();

  const fetchPolls = async (page: number = 1, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (userId) params.append("userId", userId);
      if (isPublic !== undefined)
        params.append("isPublic", isPublic.toString());
      if (search) params.append("search", search);

      const response = await fetch(`/api/polls?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch polls");
      }

      const data = await response.json();

      if (append) {
        setPolls((prev) => [...prev, ...data.data]);
      } else {
        setPolls(data.data);
      }

      setTotalCount(data.pagination.total);
      setHasMore(data.pagination.hasMore);
      setCurrentPage(page);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createPoll = async (pollData: CreatePollForm): Promise<string> => {
    if (!user) {
      throw new Error("Authentication required");
    }

    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        throw new Error("Authentication expired");
      }

      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(pollData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create poll");
      }

      const { poll } = await response.json();

      // Refresh polls if we're showing user's polls
      if (!userId || userId === user.id) {
        await refreshPolls();
      }

      return poll.id;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshPolls = async () => {
    await fetchPolls(1, false);
  };

  const clearError = () => {
    setError(null);
  };

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (autoFetch) {
      fetchPolls(1, false);
    }
  }, [userId, isPublic, search, autoFetch]);

  return {
    polls,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage,
    fetchPolls,
    createPoll,
    refreshPolls,
    clearError,
  };
}

interface UsePollOptions {
  pollId: string;
  autoFetch?: boolean;
}

interface UsePollReturn {
  poll: PollWithDetails | null;
  results: PollResult[];
  loading: boolean;
  error: string | null;
  userVotes: string[];
  canVote: boolean;
  fetchPoll: () => Promise<void>;
  vote: (optionIds: string[], fingerprint?: string) => Promise<void>;
  removeVote: () => Promise<void>;
  clearError: () => void;
}

export function usePoll({
  pollId,
  autoFetch = true,
}: UsePollOptions): UsePollReturn {
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollWithDetails | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<string[]>([]);

  const supabase = createClientSupabase();

  const generateFingerprint = (): string => {
    // Simple browser fingerprint
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

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  };

  const fetchPoll = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch poll details
      const { data: pollData, error: pollError } = await supabase
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
        throw new Error(pollError.message);
      }

      // Fetch poll results
      const { data: resultsData, error: resultsError } = await supabase.rpc(
        "get_poll_results",
        { poll_uuid: pollId },
      );

      if (resultsError) {
        console.error("Error fetching results:", resultsError);
      }

      // Fetch user's votes
      let userVotesData = [];
      if (user) {
        const { data: votes } = await supabase
          .from("votes")
          .select("option_id")
          .eq("poll_id", pollId)
          .eq("user_id", user.id);

        userVotesData = votes?.map((v) => v.option_id) || [];
      }

      setPoll(pollData);
      setResults(resultsData || []);
      setUserVotes(userVotesData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch poll";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (optionIds: string[], fingerprint?: string) => {
    setLoading(true);
    setError(null);

    try {
      const voteData: any = {
        option_ids: optionIds,
      };

      if (!user && !fingerprint) {
        voteData.voter_fingerprint = generateFingerprint();
      } else if (!user && fingerprint) {
        voteData.voter_fingerprint = fingerprint;
      }

      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(voteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to vote");
      }

      const { results: updatedResults } = await response.json();

      setResults(updatedResults);
      setUserVotes(optionIds);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to vote";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeVote = async () => {
    if (!user) {
      throw new Error("Authentication required");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove vote");
      }

      const { results: updatedResults } = await response.json();

      setResults(updatedResults);
      setUserVotes([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove vote";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const canVote = poll
    ? (!poll.expires_at || new Date(poll.expires_at) > new Date()) &&
      (poll.allow_multiple_votes || userVotes.length === 0) &&
      (!!user || poll.allow_anonymous_votes)
    : false;

  useEffect(() => {
    if (autoFetch && pollId) {
      fetchPoll();
    }
  }, [pollId, autoFetch]);

  return {
    poll,
    results,
    loading,
    error,
    userVotes,
    canVote,
    fetchPoll,
    vote,
    removeVote,
    clearError,
  };
}

interface UseUserStatsReturn {
  stats: {
    total_polls: number;
    total_votes_received: number;
    total_views: number;
    active_polls: number;
    expired_polls: number;
  } | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  clearError: () => void;
}

export function useUserStats(userId?: string): UseUserStatsReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientSupabase();
  const targetUserId = userId || user?.id;

  const fetchStats = async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: statsError } = await supabase.rpc(
        "get_user_poll_stats",
        {
          user_uuid: targetUserId,
        },
      );

      if (statsError) {
        throw new Error(statsError.message);
      }

      setStats(data?.[0] || null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stats";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    if (targetUserId) {
      fetchStats();
    }
  }, [targetUserId]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    clearError,
  };
}
