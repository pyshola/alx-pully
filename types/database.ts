export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      polls: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          creator_id: string;
          is_public: boolean;
          allow_multiple_votes: boolean;
          allow_anonymous_votes: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          creator_id: string;
          is_public?: boolean;
          allow_multiple_votes?: boolean;
          allow_anonymous_votes?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          creator_id?: string;
          is_public?: boolean;
          allow_multiple_votes?: boolean;
          allow_anonymous_votes?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          text: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          text: string;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          text?: string;
          order_index?: number;
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          poll_id: string;
          option_id: string;
          user_id: string | null;
          voter_fingerprint: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          option_id: string;
          user_id?: string | null;
          voter_fingerprint?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          option_id?: string;
          user_id?: string | null;
          voter_fingerprint?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      poll_views: {
        Row: {
          id: string;
          poll_id: string;
          viewer_id: string | null;
          viewer_fingerprint: string | null;
          ip_address: string | null;
          user_agent: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          viewer_id?: string | null;
          viewer_fingerprint?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          viewer_id?: string | null;
          viewer_fingerprint?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          viewed_at?: string;
        };
      };
      poll_shares: {
        Row: {
          id: string;
          poll_id: string;
          sharer_id: string;
          share_method: string;
          recipient_info: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          sharer_id: string;
          share_method: string;
          recipient_info?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          sharer_id?: string;
          share_method?: string;
          recipient_info?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      popular_polls: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          creator_id: string;
          created_at: string;
          expires_at: string | null;
          vote_count: number;
          view_count: number;
          popularity_score: number;
        };
      };
    };
    Functions: {
      get_poll_results: {
        Args: {
          poll_uuid: string;
        };
        Returns: {
          option_id: string;
          option_text: string;
          order_index: number;
          vote_count: number;
          percentage: number;
        }[];
      };
      get_user_poll_stats: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          total_polls: number;
          total_votes_received: number;
          total_views: number;
          active_polls: number;
          expired_polls: number;
        }[];
      };
      refresh_popular_polls: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Type helpers for easier usage
export type Poll = Database["public"]["Tables"]["polls"]["Row"];
export type PollInsert = Database["public"]["Tables"]["polls"]["Insert"];
export type PollUpdate = Database["public"]["Tables"]["polls"]["Update"];

export type PollOption = Database["public"]["Tables"]["poll_options"]["Row"];
export type PollOptionInsert =
  Database["public"]["Tables"]["poll_options"]["Insert"];
export type PollOptionUpdate =
  Database["public"]["Tables"]["poll_options"]["Update"];

export type Vote = Database["public"]["Tables"]["votes"]["Row"];
export type VoteInsert = Database["public"]["Tables"]["votes"]["Insert"];
export type VoteUpdate = Database["public"]["Tables"]["votes"]["Update"];

export type PollView = Database["public"]["Tables"]["poll_views"]["Row"];
export type PollViewInsert =
  Database["public"]["Tables"]["poll_views"]["Insert"];

export type PollShare = Database["public"]["Tables"]["poll_shares"]["Row"];
export type PollShareInsert =
  Database["public"]["Tables"]["poll_shares"]["Insert"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type PopularPoll = Database["public"]["Views"]["popular_polls"]["Row"];

export type PollResult =
  Database["public"]["Functions"]["get_poll_results"]["Returns"][0];
export type UserPollStats =
  Database["public"]["Functions"]["get_user_poll_stats"]["Returns"][0];

// Extended types for application use
export interface PollWithDetails extends Poll {
  creator?: Profile;
  options?: PollOptionWithVotes[];
  vote_count?: number;
  view_count?: number;
  user_vote?: Vote | null;
}

export interface PollOptionWithVotes extends PollOption {
  votes?: Vote[];
  vote_count?: number;
  percentage?: number;
}

export interface PollWithResults extends Poll {
  creator?: Profile;
  results?: PollResult[];
  total_votes?: number;
  total_views?: number;
  user_has_voted?: boolean;
}

// Form types
export interface CreatePollForm {
  title: string;
  description?: string;
  options: string[];
  is_public: boolean;
  allow_multiple_votes: boolean;
  allow_anonymous_votes: boolean;
  expires_at?: Date | null;
}

export interface VoteForm {
  poll_id: string;
  option_ids: string[];
  voter_fingerprint?: string;
}

// Analytics types
export interface PollAnalytics {
  poll: Poll;
  results: PollResult[];
  total_votes: number;
  total_views: number;
  votes_over_time: Array<{
    date: string;
    count: number;
  }>;
  views_over_time: Array<{
    date: string;
    count: number;
  }>;
  top_referrers: Array<{
    source: string;
    count: number;
  }>;
}
