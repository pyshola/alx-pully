"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PollCard } from "@/components/polls/poll-card";
import { usePolls, useUserStats } from "@/hooks/use-polls";
import { useAuth } from "@/contexts/auth-context";

export default function PollsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "most-votes" | "expiring-soon"
  >("newest");

  // Get public polls
  const {
    polls: publicPolls,
    loading: pollsLoading,
    error: pollsError,
    totalCount,
    fetchPolls,
    refreshPolls,
  } = usePolls({
    isPublic: true,
    search: searchTerm,
    limit: 12,
  });

  // Calculate stats from polls
  const stats = {
    totalPolls: totalCount,
    totalVotes: publicPolls.reduce(
      (sum, poll) => sum + (poll.vote_count || 0),
      0,
    ),
    activePolls: publicPolls.filter(
      (poll) => !poll.expires_at || new Date(poll.expires_at) > new Date(),
    ).length,
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPolls(1);
  };

  const convertPollFormat = (poll: any) => ({
    ...poll,
    creatorId: poll.creator_id,
    isPublic: poll.is_public,
    allowMultipleVotes: poll.allow_multiple_votes,
    expiresAt: poll.expires_at ? new Date(poll.expires_at) : undefined,
    createdAt: new Date(poll.created_at),
    updatedAt: new Date(poll.updated_at),
    options:
      poll.options?.map((option: any) => ({
        ...option,
        pollId: poll.id,
        order: option.order_index,
        votes: [],
        _count: { votes: option.vote_count || 0 },
      })) || [],
    _count: { votes: poll.vote_count || 0 },
  });
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Public Polls</h1>
            <p className="mt-2 text-gray-600">
              Discover and participate in polls from the community
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard">My Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/polls/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Poll
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pollsLoading ? "..." : stats.totalPolls.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Available to vote on
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pollsLoading ? "..." : stats.totalVotes.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Cast by the community
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Polls
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pollsLoading ? "..." : stats.activePolls.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Still accepting votes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search polls..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <select
                className="px-3 py-2 border border-input rounded-md text-sm bg-background"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most-votes">Most Votes</option>
                <option value="expiring-soon">Expiring Soon</option>
              </select>
            </div>
          </form>
        </div>

        {/* Polls Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              All Polls ({pollsLoading ? "..." : totalCount})
            </h2>
            {pollsError && (
              <Button onClick={refreshPolls} variant="outline" size="sm">
                Retry
              </Button>
            )}
          </div>

          {pollsError && (
            <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              Error loading polls: {pollsError}
            </div>
          )}

          {pollsLoading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {publicPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={convertPollFormat(poll)}
                  showResults={false}
                />
              ))}
            </div>
          )}

          {!pollsLoading && publicPolls.length === 0 && !pollsError && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm ? "No polls found" : "No polls yet"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? `No polls match "${searchTerm}". Try a different search term.`
                      : "Be the first to create a poll for the community"}
                  </p>
                  <Button asChild>
                    <Link href="/polls/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Poll
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-16">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Have a question for the community?
              </h3>
              <p className="text-gray-600 mb-6">
                Create your own poll and gather insights from others
              </p>
              <Button asChild size="lg">
                <Link href="/polls/create">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your Poll
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
