import { Metadata } from 'next'
import Link from 'next/link'
import { Search, Plus, Filter, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PollCard } from '@/components/polls/poll-card'

export const metadata: Metadata = {
  title: 'Polls | Alx Pully',
  description: 'Browse and participate in polls on Alx Pully.',
}

// Mock data - replace with actual data fetching
const mockPolls = [
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
    creatorId: 'user2',
    creator: { id: 'user2', email: 'jane@example.com', username: 'janedoe', createdAt: new Date(), updatedAt: new Date() },
    isPublic: false,
    allowMultipleVotes: false,
    expiresAt: new Date('2024-02-01'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    _count: { votes: 80 }
  },
  {
    id: '3',
    title: 'Which framework should we use for our next project?',
    description: 'Evaluating different frontend frameworks for our upcoming web application.',
    options: [
      { id: '9', pollId: '3', text: 'React', order: 1, votes: [], _count: { votes: 67 } },
      { id: '10', pollId: '3', text: 'Vue.js', order: 2, votes: [], _count: { votes: 34 } },
      { id: '11', pollId: '3', text: 'Angular', order: 3, votes: [], _count: { votes: 23 } },
      { id: '12', pollId: '3', text: 'Svelte', order: 4, votes: [], _count: { votes: 18 } }
    ],
    creatorId: 'user3',
    creator: { id: 'user3', email: 'mike@example.com', username: 'mikebrown', createdAt: new Date(), updatedAt: new Date() },
    isPublic: true,
    allowMultipleVotes: true,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
    _count: { votes: 142 }
  },
  {
    id: '4',
    title: 'Preferred work schedule?',
    description: 'Help us understand team preferences for flexible working arrangements.',
    options: [
      { id: '13', pollId: '4', text: 'Full Remote', order: 1, votes: [], _count: { votes: 89 } },
      { id: '14', pollId: '4', text: 'Hybrid (3 days office)', order: 2, votes: [], _count: { votes: 56 } },
      { id: '15', pollId: '4', text: 'Full Office', order: 3, votes: [], _count: { votes: 12 } },
      { id: '16', pollId: '4', text: 'Flexible', order: 4, votes: [], _count: { votes: 43 } }
    ],
    creatorId: 'user1',
    creator: { id: 'user1', email: 'user@example.com', username: 'johndoe', createdAt: new Date(), updatedAt: new Date() },
    isPublic: true,
    allowMultipleVotes: false,
    expiresAt: new Date('2024-01-30'),
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08'),
    _count: { votes: 200 }
  }
]

const mockStats = {
  totalPolls: mockPolls.length,
  totalVotes: mockPolls.reduce((sum, poll) => sum + (poll._count?.votes || 0), 0),
  activePolls: mockPolls.filter(poll => !poll.expiresAt || new Date(poll.expiresAt) > new Date()).length
}

export default function PollsPage() {
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
              <Link href="/dashboard">
                My Dashboard
              </Link>
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
              <div className="text-2xl font-bold">{mockStats.totalPolls}</div>
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
              <div className="text-2xl font-bold">{mockStats.totalVotes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Cast by the community
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Polls</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.activePolls}</div>
              <p className="text-xs text-muted-foreground">
                Still accepting votes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search polls..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <select className="px-3 py-2 border border-input rounded-md text-sm bg-background">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most-votes">Most Votes</option>
                <option value="expiring-soon">Expiring Soon</option>
              </select>
            </div>
          </div>
        </div>

        {/* Polls Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              All Polls ({mockPolls.length})
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {mockPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                showResults={false}
              />
            ))}
          </div>

          {mockPolls.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No polls found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Be the first to create a poll for the community
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

          {/* Load More */}
          {mockPolls.length > 0 && (
            <div className="text-center pt-8">
              <Button variant="outline">
                Load More Polls
              </Button>
            </div>
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
  )
}
