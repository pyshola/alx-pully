"use client";

import Link from "next/link";
import { Plus, TrendingUp, Users, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PollCard } from "@/components/polls/poll-card";
import { useAuth } from "@/contexts/auth-context";
import { usePolls, useUserStats } from "@/hooks/use-polls";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  // Get user's polls (limit to recent 6 for dashboard)
  const {
    polls: userPolls,
    loading: pollsLoading,
    error: pollsError,
    refreshPolls,
  } = usePolls({
    userId: user?.id,
    limit: 6,
    autoFetch: !!user?.id,
  });

  // Get user statistics
  const {
    stats,
    loading: statsLoading,
    error: statsError,
  } = useUserStats(user?.id);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated after loading
    router.push("/login");
    return null; // or a loading spinner while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.email}!
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your polls and track their performance
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_polls || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Polls you've created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading
                  ? "..."
                  : (stats?.total_votes_received || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Votes on your polls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Polls
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.active_polls || 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading
                  ? "..."
                  : (stats?.total_views || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Views on your polls
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Polls Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Polls</h2>
            <Button variant="outline" asChild>
              <Link href="/polls">View All</Link>
            </Button>
          </div>

          {pollsError && (
            <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              Error loading polls: {pollsError}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshPolls}
                className="ml-4"
              >
                Retry
              </Button>
            </div>
          )}

          {pollsLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
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
            <div className="grid gap-6 md:grid-cols-2">
              {userPolls.map((poll) => {
                // Convert database poll to expected format for PollCard
                const convertedPoll = {
                  ...poll,
                  description: poll.description ?? undefined, // Convert null to undefined
                  creatorId: poll.creator_id,
                  isPublic: poll.is_public,
                  allowMultipleVotes: poll.allow_multiple_votes,
                  expiresAt: poll.expires_at
                    ? new Date(poll.expires_at)
                    : undefined,
                  createdAt: new Date(poll.created_at),
                  updatedAt: new Date(poll.updated_at),
                  options:
                    poll.options?.map((option) => ({
                      ...option,
                      pollId: poll.id,
                      order: option.order_index,
                      votes: [],
                      _count: { votes: option.vote_count || 0 },
                    })) || [],
                  _count: { votes: poll.vote_count || 0 },
                };

                return (
                  <PollCard
                    key={poll.id}
                    poll={convertedPoll}
                    showResults={true}
                  />
                );
              })}
            </div>
          )}

          {!pollsLoading && userPolls.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No polls yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Get started by creating your first poll
                  </p>
                  <Button asChild>
                    <Link href="/polls/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Poll
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show more polls link if user has more than the displayed amount */}
          {!pollsLoading &&
            userPolls.length > 0 &&
            stats &&
            stats.total_polls > userPolls.length && (
              <div className="text-center pt-6">
                <Button variant="outline" asChild>
                  <Link href={`/polls?userId=${user?.id}`}>
                    View All My Polls ({stats?.total_polls || 0})
                  </Link>
                </Button>
              </div>
            )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Create Poll</CardTitle>
                <CardDescription>
                  Start gathering opinions with a new poll
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/polls/create">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Browse Polls</CardTitle>
                <CardDescription>
                  Discover and vote on public polls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/polls">Browse</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">My Profile</CardTitle>
                <CardDescription>
                  Update your profile and account settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/profile">View Profile</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
