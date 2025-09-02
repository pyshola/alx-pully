"use client";

import Link from "next/link";
import { Clock, Users, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PollWithDetails } from "@/types/database";
import {
  formatDate,
  calculatePercentage,
  getTimeRemaining,
  truncateText,
} from "@/lib/utils";

interface PollCardProps {
  poll: PollWithDetails;
  showResults?: boolean;
  compact?: boolean;
}

export function PollCard({
  poll,
  showResults = false,
  compact = false,
}: PollCardProps) {
  const totalVotes = poll._count?.votes || 0;
  const hasExpired = poll.expiresAt
    ? new Date(poll.expiresAt) < new Date()
    : false;
  const timeRemaining = poll.expiresAt
    ? getTimeRemaining(new Date(poll.expiresAt))
    : null;

  const getTopOption = () => {
    if (!poll.options || poll.options.length === 0) return null;
    return poll.options.reduce((prev, current) =>
      (current._count?.votes || 0) > (prev._count?.votes || 0) ? current : prev,
    );
  };

  const topOption = getTopOption();

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${compact ? "p-3" : ""}`}
    >
      <CardHeader className={compact ? "pb-2" : "pb-4"}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle
              className={`${compact ? "text-lg" : "text-xl"} line-clamp-2`}
            >
              <Link
                href={`/polls/${poll.id}`}
                className="hover:text-primary transition-colors"
              >
                {truncateText(poll.title, compact ? 60 : 80)}
              </Link>
            </CardTitle>

            {poll.description && (
              <CardDescription
                className={`mt-2 ${compact ? "text-xs" : "text-sm"} line-clamp-2`}
              >
                {truncateText(poll.description, compact ? 100 : 150)}
              </CardDescription>
            )}
          </div>

          {hasExpired && (
            <div className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-medium">
              Expired
            </div>
          )}
        </div>

        <div
          className={`flex items-center gap-4 text-sm text-muted-foreground ${compact ? "text-xs" : ""}`}
        >
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{poll.options.length} options</span>
          </div>

          {timeRemaining && !timeRemaining.expired && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {timeRemaining.days > 0
                  ? `${timeRemaining.days}d left`
                  : timeRemaining.hours > 0
                    ? `${timeRemaining.hours}h left`
                    : `${timeRemaining.minutes}m left`}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      {showResults && totalVotes > 0 && !compact && (
        <CardContent className="pb-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Current Results</span>
              <span className="text-muted-foreground">
                {totalVotes} total votes
              </span>
            </div>

            {poll.options
              ?.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
              .slice(0, 3)
              .map((option) => {
                const votes = option.vote_count || 0;
                const percentage = calculatePercentage(votes, totalVotes);

                return (
                  <div key={option.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate pr-2">
                        {truncateText(option.text, 30)}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {votes} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}

            {poll.options && poll.options.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{poll.options.length - 3} more options
              </p>
            )}
          </div>
        </CardContent>
      )}

      {!compact && (
        <CardFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>by {poll.creator?.username || "Anonymous"}</span>
              <span>•</span>
              <span>{formatDate(poll.created_at)}</span>
            </div>

            <div className="flex gap-2">
              {!hasExpired && (
                <Button asChild size="sm">
                  <Link href={`/polls/${poll.id}`}>Vote Now</Link>
                </Button>
              )}

              <Button asChild variant="outline" size="sm">
                <Link href={`/polls/${poll.id}`}>
                  {showResults ? "View Details" : "View Results"}
                </Link>
              </Button>
            </div>
          </div>
        </CardFooter>
      )}

      {compact && (
        <CardFooter className="pt-2">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <span>{formatDate(poll.created_at)}</span>
            {topOption && totalVotes > 0 && (
              <span className="font-medium">
                Leading: {truncateText(topOption.text, 20)}
              </span>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
