export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  creatorId: string;
  creator?: User;
  isPublic: boolean;
  allowMultipleVotes: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    votes: number;
  };
}

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  order: number;
  votes: Vote[];
  _count?: {
    votes: number;
  };
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  userId?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface CreatePollData {
  title: string;
  description?: string;
  options: string[];
  isPublic: boolean;
  allowMultipleVotes: boolean;
  expiresAt?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
