"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Copy, Share2, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Poll } from "@/types/database";

interface PollCreatedSuccessProps {
  poll: Poll;
  onCreateAnother?: () => void;
}

export function PollCreatedSuccess({
  poll,
  onCreateAnother,
}: PollCreatedSuccessProps) {
  const [copied, setCopied] = useState(false);

  const pollUrl = `${window.location.origin}/polls/${poll.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Vote on my poll: ${poll.title}`);
    const body = encodeURIComponent(
      `I'd like your opinion on this poll:\n\n"${poll.title}"\n\nVote here: ${pollUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(
      `Vote on my poll: "${poll.title}" ${pollUrl} #AlxPully #Polling`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareViaLinkedIn = () => {
    const url = encodeURIComponent(pollUrl);
    const title = encodeURIComponent(poll.title);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`,
      "_blank"
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="text-center border-green-200 bg-green-50">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            Poll Created Successfully!
          </CardTitle>
          <CardDescription className="text-green-600">
            Your poll "{poll.title}" is now live and ready to collect votes.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Poll URL Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Poll
          </CardTitle>
          <CardDescription>
            Copy the link below to share your poll with others
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="poll-url" className="sr-only">
                Poll URL
              </Label>
              <Input
                id="poll-url"
                type="text"
                value={pollUrl}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="shrink-0"
            >
              <Copy className="w-4 h-4 mr-1" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* Social Sharing */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Share on social media:</Label>
            <div className="flex gap-2">
              <Button
                onClick={shareViaTwitter}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Twitter
              </Button>
              <Button
                onClick={shareViaLinkedIn}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                LinkedIn
              </Button>
              <Button
                onClick={shareViaEmail}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Poll Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Poll Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Visibility:</span>
              <span className="ml-2 text-gray-600">
                {poll.is_public ? "Public" : "Private"}
              </span>
            </div>
            <div>
              <span className="font-medium">Multiple Votes:</span>
              <span className="ml-2 text-gray-600">
                {poll.allow_multiple_votes ? "Allowed" : "Not allowed"}
              </span>
            </div>
            <div>
              <span className="font-medium">Anonymous Voting:</span>
              <span className="ml-2 text-gray-600">
                {poll.allow_anonymous_votes ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div>
              <span className="font-medium">Expires:</span>
              <span className="ml-2 text-gray-600">
                {poll.expires_at
                  ? new Date(poll.expires_at).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild className="flex-1">
          <Link href={`/polls/${poll.id}`}>
            <Eye className="w-4 h-4 mr-2" />
            View Poll
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/dashboard">
            <ExternalLink className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
        </Button>
        {onCreateAnother && (
          <Button
            onClick={onCreateAnother}
            variant="outline"
            className="flex-1"
          >
            Create Another Poll
          </Button>
        )}
      </div>

      {/* Next Steps */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p>
            • Share your poll using the link above to start collecting votes
          </p>
          <p>
            • Monitor real-time results on your{" "}
            <Link
              href="/dashboard"
              className="underline hover:text-blue-800 font-medium"
            >
              dashboard
            </Link>
          </p>
          <p>
            • View detailed analytics and voter insights as responses come in
          </p>
          {poll.expires_at && (
            <p>
              • Remember: Your poll expires on{" "}
              {new Date(poll.expires_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
