import { Metadata } from 'next'
import Link from 'next/link'
import { Plus, TrendingUp, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PollCard } from '@/components/polls/poll-card'

export const metadata: Metadata = {
  title: 'Dashboard | Alx Pully',
  description: 'Manage your polls and view analytics on your Alx Pully dashboard.',
}

// Mock data - replace with actual data fetching
const mockStats = {
  totalPolls: 12,
  totalVotes: 1486,
  activePolls: 8,
  avgVotesPerPoll: 124
}

const mockRecentPolls = [
  {
    id: '1',
    title: 'What\'s your favorite programming language?',
    description: 'Help us understand the preferences of our developer community.',
    options: [
      { id: '1', pollId: '1', text: 'JavaScript', order: 1, votes: [], _count: { votes: 45 } },
      { id: '2', pollId: '1', text: 'Python', order: 2, votes: [], _count: { votes: 38 } },
      { id: '3', pollId: '1', text: 'TypeScript', order: 3, votes: [], _count: { votes: 32 } },
      { id: '4', pollId: '1', text: 'Go', order: 4, votes: [], _count: { votes: 15 } }
    ],
    creatorId: 'user1',
    creator: { id: 'user1', email: 'user@example.com', username: 'johndoe', createdAt: new Date(), updatedAt: new Date() },
    isPublic: true,
    allowMultipleVotes: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    _count: { votes: 130 }
  },
  {
    id: '2',
    title: 'Best time for team meetings?',
    description: 'Let\'s find a time that works for everyone on the team.',
    options: [
      { id: '5', pollId: '2', text: '9:00 AM', order: 1, votes: [], _count: { votes: 22 } },
      { id: '6', pollId: '2', text: '10:00 AM', order: 2, votes: [], _count: { votes: 28 } },
      { id: '7', pollId: '2', text: '2:00 PM', order: 3, votes: [], _count: { votes: 18 } },
      { id: '8', pollId: '2', text: '3:00 PM', order: 4, votes: [], _count: { votes: 12 } }
    ],
    creatorId: 'user1',
    creator: { id: 'user1', email: 'user@example.com', username: 'johndoe', createdAt: new Date(), updatedAt: new Date() },
    isPublic: false,
    allowMultipleVotes: false,
    expiresAt: new Date('2024-02-01'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    _count: { votes: 80 }
  }
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Manage your polls and track their performance
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
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
              <div className="text-2xl font-bold">{mockStats.totalPolls}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.totalVotes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Polls</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.activePolls}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Votes/Poll</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.avgVotesPerPoll}</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
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

          <div className="grid gap-6 md:grid-cols-2">
            {mockRecentPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                showResults={true}
              />
            ))}
          </div>

          {mockRecentPolls.length === 0 && (
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
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
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
                <CardTitle className="text-lg">Analytics</CardTitle>
                <CardDescription>
                  View detailed insights about your polls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/analytics">View Analytics</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
