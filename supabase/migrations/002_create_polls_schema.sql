-- Create polls table
CREATE TABLE public.polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  allow_multiple_votes BOOLEAN DEFAULT false,
  allow_anonymous_votes BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create poll_options table
CREATE TABLE public.poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  text VARCHAR(1000) NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, order_index)
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  voter_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique vote per user per poll (when not allowing multiple votes)
  UNIQUE(poll_id, user_id),
  -- Ensure anonymous voters can't vote multiple times from same fingerprint
  UNIQUE(poll_id, voter_fingerprint)
);

-- Create poll_views table to track poll views
CREATE TABLE public.poll_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Track unique views per poll
  UNIQUE(poll_id, viewer_id),
  UNIQUE(poll_id, viewer_fingerprint)
);

-- Create poll_shares table to track how polls are shared
CREATE TABLE public.poll_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  sharer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_method VARCHAR(50) NOT NULL, -- 'link', 'email', 'social', etc.
  recipient_info JSONB, -- Store recipient details if applicable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_shares ENABLE ROW LEVEL SECURITY;

-- Policies for polls table
CREATE POLICY "Anyone can view public polls"
ON public.polls FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can view their own polls"
ON public.polls FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Authenticated users can create polls"
ON public.polls FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own polls"
ON public.polls FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own polls"
ON public.polls FOR DELETE
USING (auth.uid() = creator_id);

-- Policies for poll_options table
CREATE POLICY "Anyone can view options for public polls"
ON public.poll_options FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_options.poll_id
    AND (polls.is_public = true OR polls.creator_id = auth.uid())
  )
);

CREATE POLICY "Poll creators can manage their poll options"
ON public.poll_options FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_options.poll_id
    AND polls.creator_id = auth.uid()
  )
);

-- Policies for votes table
CREATE POLICY "Anyone can view votes for public polls"
ON public.votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = votes.poll_id
    AND (polls.is_public = true OR polls.creator_id = auth.uid())
  )
);

CREATE POLICY "Users can view their own votes"
ON public.votes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can vote on public polls"
ON public.votes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_id
    AND polls.is_public = true
    AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
  )
);

CREATE POLICY "Poll creators can delete votes on their polls"
ON public.votes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = votes.poll_id
    AND polls.creator_id = auth.uid()
  )
);

-- Policies for poll_views table
CREATE POLICY "Poll creators can view their poll analytics"
ON public.poll_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_views.poll_id
    AND polls.creator_id = auth.uid()
  )
);

CREATE POLICY "Anyone can record views for public polls"
ON public.poll_views FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_id
    AND polls.is_public = true
  )
);

-- Policies for poll_shares table
CREATE POLICY "Users can view their own shares"
ON public.poll_shares FOR SELECT
USING (auth.uid() = sharer_id);

CREATE POLICY "Users can record shares for accessible polls"
ON public.poll_shares FOR INSERT
WITH CHECK (
  auth.uid() = sharer_id AND
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_id
    AND (polls.is_public = true OR polls.creator_id = auth.uid())
  )
);

-- Create indexes for better performance
CREATE INDEX idx_polls_creator_id ON public.polls(creator_id);
CREATE INDEX idx_polls_is_public ON public.polls(is_public);
CREATE INDEX idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX idx_polls_expires_at ON public.polls(expires_at);

CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX idx_poll_options_order ON public.poll_options(poll_id, order_index);

CREATE INDEX idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX idx_votes_option_id ON public.votes(option_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE INDEX idx_votes_created_at ON public.votes(created_at DESC);

CREATE INDEX idx_poll_views_poll_id ON public.poll_views(poll_id);
CREATE INDEX idx_poll_views_viewer_id ON public.poll_views(viewer_id);
CREATE INDEX idx_poll_views_viewed_at ON public.poll_views(viewed_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to validate vote constraints
CREATE OR REPLACE FUNCTION public.validate_vote()
RETURNS TRIGGER AS $$
DECLARE
  poll_record public.polls%ROWTYPE;
  existing_vote_count INTEGER;
BEGIN
  -- Get poll details
  SELECT * INTO poll_record FROM public.polls WHERE id = NEW.poll_id;

  -- Check if poll exists and is still active
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  -- Check if poll has expired
  IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at < NOW() THEN
    RAISE EXCEPTION 'Poll has expired';
  END IF;

  -- Check multiple votes constraint for authenticated users
  IF NEW.user_id IS NOT NULL AND NOT poll_record.allow_multiple_votes THEN
    SELECT COUNT(*) INTO existing_vote_count
    FROM public.votes
    WHERE poll_id = NEW.poll_id AND user_id = NEW.user_id;

    IF existing_vote_count > 0 THEN
      RAISE EXCEPTION 'Multiple votes not allowed for this poll';
    END IF;
  END IF;

  -- Check multiple votes constraint for anonymous users
  IF NEW.user_id IS NULL AND NEW.voter_fingerprint IS NOT NULL AND NOT poll_record.allow_multiple_votes THEN
    SELECT COUNT(*) INTO existing_vote_count
    FROM public.votes
    WHERE poll_id = NEW.poll_id AND voter_fingerprint = NEW.voter_fingerprint;

    IF existing_vote_count > 0 THEN
      RAISE EXCEPTION 'Multiple votes not allowed for this poll';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate votes
CREATE TRIGGER validate_vote_trigger
  BEFORE INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_vote();

-- Create function to get poll results with vote counts
CREATE OR REPLACE FUNCTION public.get_poll_results(poll_uuid UUID)
RETURNS TABLE(
  option_id UUID,
  option_text VARCHAR(1000),
  order_index INTEGER,
  vote_count BIGINT,
  percentage NUMERIC(5,2)
) AS $$
DECLARE
  total_votes BIGINT;
BEGIN
  -- Get total votes for the poll
  SELECT COUNT(*) INTO total_votes
  FROM public.votes v
  WHERE v.poll_id = poll_uuid;

  -- Return results with vote counts and percentages
  RETURN QUERY
  SELECT
    po.id as option_id,
    po.text as option_text,
    po.order_index,
    COALESCE(vote_counts.count, 0) as vote_count,
    CASE
      WHEN total_votes > 0 THEN
        ROUND((COALESCE(vote_counts.count, 0)::NUMERIC / total_votes::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC(5,2)
    END as percentage
  FROM public.poll_options po
  LEFT JOIN (
    SELECT option_id, COUNT(*) as count
    FROM public.votes
    WHERE poll_id = poll_uuid
    GROUP BY option_id
  ) vote_counts ON po.id = vote_counts.option_id
  WHERE po.poll_id = poll_uuid
  ORDER BY po.order_index;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's poll statistics
CREATE OR REPLACE FUNCTION public.get_user_poll_stats(user_uuid UUID)
RETURNS TABLE(
  total_polls BIGINT,
  total_votes_received BIGINT,
  total_views BIGINT,
  active_polls BIGINT,
  expired_polls BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_polls,
    COALESCE(SUM(vote_counts.count), 0) as total_votes_received,
    COALESCE(SUM(view_counts.count), 0) as total_views,
    COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_polls,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired_polls
  FROM public.polls p
  LEFT JOIN (
    SELECT poll_id, COUNT(*) as count
    FROM public.votes
    GROUP BY poll_id
  ) vote_counts ON p.id = vote_counts.poll_id
  LEFT JOIN (
    SELECT poll_id, COUNT(*) as count
    FROM public.poll_views
    GROUP BY poll_id
  ) view_counts ON p.id = view_counts.poll_id
  WHERE p.creator_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for popular polls (refresh periodically)
CREATE MATERIALIZED VIEW public.popular_polls AS
SELECT
  p.id,
  p.title,
  p.description,
  p.creator_id,
  p.created_at,
  p.expires_at,
  COALESCE(v.vote_count, 0) as vote_count,
  COALESCE(pv.view_count, 0) as view_count,
  -- Calculate popularity score based on votes, views, and recency
  (
    COALESCE(v.vote_count, 0) * 2 +
    COALESCE(pv.view_count, 0) * 1 +
    EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 * -0.1
  ) as popularity_score
FROM public.polls p
LEFT JOIN (
  SELECT poll_id, COUNT(*) as vote_count
  FROM public.votes
  GROUP BY poll_id
) v ON p.id = v.poll_id
LEFT JOIN (
  SELECT poll_id, COUNT(*) as view_count
  FROM public.poll_views
  GROUP BY poll_id
) pv ON p.id = pv.poll_id
WHERE p.is_public = true
  AND (p.expires_at IS NULL OR p.expires_at > NOW());

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_popular_polls_id ON public.popular_polls(id);
CREATE INDEX idx_popular_polls_score ON public.popular_polls(popularity_score DESC);

-- Create function to refresh popular polls view
CREATE OR REPLACE FUNCTION public.refresh_popular_polls()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.popular_polls;
END;
$$ LANGUAGE plpgsql;
