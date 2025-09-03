import {
  createPoll,
  getPoll,
  getPollResults,
  getPolls,
  getPopularPolls,
  updatePoll,
  deletePoll,
  castVote,
  getUserVote,
  recordPollView,
  getUserPollStats,
  refreshPopularPolls,
  DatabaseError,
} from "../database";
import { createClientSupabase, createServerSupabase } from "@/lib/supabase";
import { CreatePollForm, VoteForm } from "@/types/database";
import { faker } from "@faker-js/faker";

// Mock Supabase client
jest.mock("@/lib/supabase", () => ({
  createClientSupabase: jest.fn(),
  createServerSupabase: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  rpc: jest.fn(() => mockSupabase),
};

describe("Database Functions Integration Tests", () => {
  const mockUserId = faker.string.uuid();
  const mockPollId = faker.string.uuid();
  const mockOption1Id = faker.string.uuid();
  const mockOption2Id = faker.string.uuid();
  const mockFingerprint = faker.string.alphanumeric(16);

  beforeEach(() => {
    jest.clearAllMocks();
    (createClientSupabase as jest.Mock).mockReturnValue(mockSupabase);
    (createServerSupabase as jest.Mock).mockReturnValue(mockSupabase);
  });

  // Helper function to mock successful Supabase responses
  const mockSuccess = (data: any) =>
    jest.fn(() => Promise.resolve({ data, error: null }));
  const mockError = (message: string, code?: string) =>
    jest.fn(() => Promise.resolve({ data: null, error: { message, code } }));

  // --- createPoll ---
  describe("createPoll", () => {
    const mockPollForm: CreatePollForm = {
      title: "Test Poll",
      description: "A poll for testing",
      options: ["Option A", "Option B"],
      is_public: true,
      allow_multiple_votes: false,
      allow_anonymous_votes: true,
      expires_at: null,
    };

    it("should successfully create a poll and its options", async () => {
      const mockPoll = {
        id: mockPollId,
        creator_id: mockUserId,
        ...mockPollForm,
      };

      mockSupabase.insert
        .mockImplementationOnce(mockSuccess(mockPoll)) // For polls insert
        .mockImplementationOnce(mockSuccess(null)); // For poll_options insert

      const result = await createPoll(mockPollForm, mockUserId);

      expect(mockSupabase.from).toHaveBeenCalledWith("polls");
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockPollForm.title,
          creator_id: mockUserId,
        }),
      );
      expect(mockSupabase.from).toHaveBeenCalledWith("poll_options");
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({ poll_id: mockPollId, text: "Option A" }),
        expect.objectContaining({ poll_id: mockPollId, text: "Option B" }),
      ]);
      expect(result).toEqual(mockPoll);
    });

    it("should throw a DatabaseError if poll creation fails", async () => {
      mockSupabase.insert.mockImplementationOnce(
        mockError("Failed to insert poll"),
      );

      await expect(createPoll(mockPollForm, mockUserId)).rejects.toThrow(
        DatabaseError,
      );
      await expect(createPoll(mockPollForm, mockUserId)).rejects.toThrow(
        "Failed to create poll: Failed to insert poll",
      );
    });

    it("should throw a DatabaseError if option creation fails", async () => {
      const mockPoll = {
        id: mockPollId,
        creator_id: mockUserId,
        ...mockPollForm,
      };
      mockSupabase.insert
        .mockImplementationOnce(mockSuccess(mockPoll)) // For polls insert
        .mockImplementationOnce(mockError("Failed to insert options")); // For poll_options insert

      await expect(createPoll(mockPollForm, mockUserId)).rejects.toThrow(
        DatabaseError,
      );
      await expect(createPoll(mockPollForm, mockUserId)).rejects.toThrow(
        "Failed to create poll options: Failed to insert options",
      );
    });
  });

  // --- getPoll ---
  describe("getPoll", () => {
    const mockPollData = {
      id: mockPollId,
      title: "Existing Poll",
      description: "Description",
      creator_id: mockUserId,
      is_public: true,
      allow_multiple_votes: false,
      allow_anonymous_votes: true,
      expires_at: null,
      creator: { id: mockUserId, email: "test@example.com" },
      options: [
        { id: mockOption1Id, poll_id: mockPollId, text: "Option 1" },
        { id: mockOption2Id, poll_id: mockPollId, text: "Option 2" },
      ],
    };

    it("should successfully fetch a poll with details and no user vote", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess(mockPollData)); // Poll data
      mockSupabase.select.mockImplementationOnce(
        mockSuccess([
          { poll_id: mockPollId, option_id: mockOption1Id },
          { poll_id: mockPollId, option_id: mockOption1Id },
          { poll_id: mockPollId, option_id: mockOption2Id },
        ]),
      ); // Vote counts
      mockSupabase.select.mockImplementationOnce(mockSuccess(null)); // User vote (no user id)

      const result = await getPoll(mockPollId);

      expect(mockSupabase.eq).toHaveBeenCalledWith("id", mockPollId);
      expect(result).toEqual(
        expect.objectContaining({
          ...mockPollData,
          options: [
            { ...mockPollData.options[0], vote_count: 2 },
            { ...mockPollData.options[1], vote_count: 1 },
          ],
          vote_count: 3,
          user_vote: null,
        }),
      );
    });

    it("should return null if poll is not found (PGRST116)", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockError("Not found", "PGRST116"),
      );

      const result = await getPoll(mockPollId);
      expect(result).toBeNull();
    });

    it("should throw a DatabaseError if fetching poll fails", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockError("Failed to fetch poll", "500"),
      );

      await expect(getPoll(mockPollId)).rejects.toThrow(DatabaseError);
      await expect(getPoll(mockPollId)).rejects.toThrow(
        "Failed to fetch poll: Failed to fetch poll",
      );
    });

    it("should throw a DatabaseError if fetching vote counts fails", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess(mockPollData));
      mockSupabase.select.mockImplementationOnce(
        mockError("Failed to fetch votes", "500"),
      );

      await expect(getPoll(mockPollId)).rejects.toThrow(DatabaseError);
      await expect(getPoll(mockPollId)).rejects.toThrow(
        "Failed to fetch vote counts: Failed to fetch votes",
      );
    });

    it("should include user vote if userId is provided", async () => {
      const mockUserVote = {
        id: faker.string.uuid(),
        poll_id: mockPollId,
        option_id: mockOption1Id,
        user_id: mockUserId,
        created_at: new Date().toISOString(),
      };
      mockSupabase.select.mockImplementationOnce(mockSuccess(mockPollData));
      mockSupabase.select.mockImplementationOnce(mockSuccess([])); // No votes initially
      mockSupabase.select.mockImplementationOnce(mockSuccess(mockUserVote)); // User vote

      const result = await getPoll(mockPollId, mockUserId);

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", mockUserId);
      expect(result?.user_vote).toEqual(mockUserVote);
    });
  });

  // --- getPollResults ---
  describe("getPollResults", () => {
    const mockResults = [
      { option_text: "Option A", vote_count: 5, percentage: 0.5 },
      { option_text: "Option B", vote_count: 5, percentage: 0.5 },
    ];

    it("should successfully fetch poll results", async () => {
      mockSupabase.rpc.mockImplementationOnce(mockSuccess(mockResults));

      const result = await getPollResults(mockPollId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_poll_results", {
        poll_uuid: mockPollId,
      });
      expect(result).toEqual(mockResults);
    });

    it("should return an empty array if no results are found", async () => {
      mockSupabase.rpc.mockImplementationOnce(mockSuccess(null));

      const result = await getPollResults(mockPollId);
      expect(result).toEqual([]);
    });

    it("should throw a DatabaseError if fetching results fails", async () => {
      mockSupabase.rpc.mockImplementationOnce(
        mockError("Failed to get results", "500"),
      );

      await expect(getPollResults(mockPollId)).rejects.toThrow(DatabaseError);
      await expect(getPollResults(mockPollId)).rejects.toThrow(
        "Failed to get poll results: Failed to get results",
      );
    });
  });

  // --- getPolls ---
  describe("getPolls", () => {
    const mockPoll1 = {
      id: faker.string.uuid(),
      title: "Poll One",
      creator_id: mockUserId,
      is_public: true,
      options: [{ id: mockOption1Id, text: "Opt1" }],
    };
    const mockPoll2 = {
      id: faker.string.uuid(),
      title: "Poll Two",
      creator_id: faker.string.uuid(),
      is_public: true,
      options: [{ id: mockOption2Id, text: "Opt2" }],
    };

    it("should fetch all polls with vote counts", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockSuccess([mockPoll1, mockPoll2]),
      ); // Polls data
      mockSupabase.select.mockImplementationOnce(
        mockSuccess([
          { poll_id: mockPoll1.id, option_id: mockOption1Id },
          { poll_id: mockPoll1.id, option_id: mockOption1Id },
        ]),
      ); // Vote counts

      const result = await getPolls();

      expect(mockSupabase.from).toHaveBeenCalledWith("polls");
      expect(result).toEqual([
        expect.objectContaining({
          ...mockPoll1,
          options: [{ ...mockPoll1.options[0], vote_count: 2 }],
          vote_count: 2,
        }),
        expect.objectContaining({
          ...mockPoll2,
          options: [{ ...mockPoll2.options[0], vote_count: 0 }],
          vote_count: 0,
        }),
      ]);
    });

    it("should apply filters and pagination", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess([mockPoll1])); // Polls data
      mockSupabase.select.mockImplementationOnce(mockSuccess([])); // Vote counts

      await getPolls({
        userId: mockUserId,
        isPublic: true,
        limit: 1,
        offset: 0,
        search: "One",
        orderBy: "title",
        orderDirection: "asc",
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("creator_id", mockUserId);
      expect(mockSupabase.eq).toHaveBeenCalledWith("is_public", true);
      expect(mockSupabase.or).toHaveBeenCalledWith(
        "title.ilike.%One%,description.ilike.%One%",
      );
      expect(mockSupabase.order).toHaveBeenCalledWith("title", {
        ascending: true,
      });
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 0);
    });

    it("should return an empty array if no polls are found", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess([]));
      mockSupabase.select.mockImplementationOnce(mockSuccess([]));

      const result = await getPolls();
      expect(result).toEqual([]);
    });

    it("should throw a DatabaseError if fetching polls fails", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockError("Failed to fetch polls", "500"),
      );

      await expect(getPolls()).rejects.toThrow(DatabaseError);
      await expect(getPolls()).rejects.toThrow(
        "Failed to fetch polls: Failed to fetch polls",
      );
    });
  });

  // --- getPopularPolls ---
  describe("getPopularPolls", () => {
    const mockPopularPolls = [
      {
        id: faker.string.uuid(),
        title: "Popular Poll 1",
        popularity_score: 10,
      },
      {
        id: faker.string.uuid(),
        title: "Popular Poll 2",
        popularity_score: 5,
      },
    ];

    it("should fetch popular polls", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockSuccess(mockPopularPolls),
      );

      const result = await getPopularPolls(2);

      expect(mockSupabase.from).toHaveBeenCalledWith("popular_polls");
      expect(mockSupabase.order).toHaveBeenCalledWith("popularity_score", {
        ascending: false,
      });
      expect(mockSupabase.limit).toHaveBeenCalledWith(2);
      expect(result).toEqual(mockPopularPolls);
    });

    it("should return an empty array if no popular polls are found", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess(null));

      const result = await getPopularPolls();
      expect(result).toEqual([]);
    });

    it("should throw a DatabaseError if fetching popular polls fails", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockError("Failed to fetch popular polls", "500"),
      );

      await expect(getPopularPolls()).rejects.toThrow(DatabaseError);
      await expect(getPopularPolls()).rejects.toThrow(
        "Failed to fetch popular polls: Failed to fetch popular polls",
      );
    });
  });

  // --- updatePoll ---
  describe("updatePoll", () => {
    const updates = { title: "Updated Title", description: "New Description" };
    const mockUpdatedPoll = {
      id: mockPollId,
      creator_id: mockUserId,
      ...updates,
    };

    it("should successfully update a poll", async () => {
      mockSupabase.update.mockImplementationOnce(mockSuccess(mockUpdatedPoll));

      const result = await updatePoll(mockPollId, updates, mockUserId);

      expect(mockSupabase.from).toHaveBeenCalledWith("polls");
      expect(mockSupabase.update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", mockPollId);
      expect(mockSupabase.eq).toHaveBeenCalledWith("creator_id", mockUserId);
      expect(result).toEqual(mockUpdatedPoll);
    });

    it("should throw a DatabaseError if poll update fails", async () => {
      mockSupabase.update.mockImplementationOnce(
        mockError("Failed to update poll", "500"),
      );

      await expect(updatePoll(mockPollId, updates, mockUserId)).rejects.toThrow(
        DatabaseError,
      );
      await expect(
        updatePoll(mockPollId, updates, mockUserId),
      ).rejects.toThrow("Failed to update poll: Failed to update poll");
    });
  });

  // --- deletePoll ---
  describe("deletePoll", () => {
    it("should successfully delete a poll", async () => {
      mockSupabase.delete.mockImplementationOnce(mockSuccess(null));

      await expect(deletePoll(mockPollId, mockUserId)).resolves.toBeUndefined();

      expect(mockSupabase.from).toHaveBeenCalledWith("polls");
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", mockPollId);
      expect(mockSupabase.eq).toHaveBeenCalledWith("creator_id", mockUserId);
    });

    it("should throw a DatabaseError if poll deletion fails", async () => {
      mockSupabase.delete.mockImplementationOnce(
        mockError("Failed to delete poll", "500"),
      );

      await expect(deletePoll(mockPollId, mockUserId)).rejects.toThrow(
        DatabaseError,
      );
      await expect(deletePoll(mockPollId, mockUserId)).rejects.toThrow(
        "Failed to delete poll: Failed to delete poll",
      );
    });
  });

  // --- castVote ---
  describe("castVote", () => {
    const voteForm: VoteForm = {
      poll_id: mockPollId,
      option_ids: [mockOption1Id],
      voter_fingerprint: mockFingerprint,
    };
    const mockPoll = {
      allow_multiple_votes: false,
      expires_at: null,
    };
    const mockVote = {
      id: faker.string.uuid(),
      poll_id: mockPollId,
      option_id: mockOption1Id,
    };

    beforeEach(() => {
      // Default successful poll fetch for vote operations
      mockSupabase.select.mockImplementation(mockSuccess(mockPoll));
      mockSupabase.delete.mockImplementation(mockSuccess(null));
      mockSupabase.insert.mockImplementation(mockSuccess([mockVote]));
    });

    it("should successfully cast a new vote for an anonymous user", async () => {
      const result = await castVote(voteForm);

      expect(mockSupabase.select).toHaveBeenCalledWith(
        "allow_multiple_votes, expires_at",
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", mockPollId);
      expect(mockSupabase.delete).toHaveBeenCalledWith(); // Called for single vote
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        "voter_fingerprint",
        mockFingerprint,
      );
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          poll_id: mockPollId,
          option_id: mockOption1Id,
          voter_fingerprint: mockFingerprint,
          user_id: null,
        }),
      ]);
      expect(result).toEqual([mockVote]);
    });

    it("should successfully cast a new vote for an authenticated user", async () => {
      const result = await castVote(voteForm, mockUserId);

      expect(mockSupabase.delete).toHaveBeenCalledWith(); // Called for single vote
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", mockUserId);
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          poll_id: mockPollId,
          option_id: mockOption1Id,
          user_id: mockUserId,
          voter_fingerprint: null,
        }),
      ]);
      expect(result).toEqual([mockVote]);
    });

    it("should throw a DatabaseError if poll fetching fails during vote", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockError("Poll not found", "PGRST116"),
      ); // Initial poll fetch

      await expect(castVote(voteForm)).rejects.toThrow(DatabaseError);
      await expect(castVote(voteForm)).rejects.toThrow(
        "Failed to fetch poll: Poll not found",
      );
    });

    it("should throw a DatabaseError if poll has expired", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockSuccess({
          allow_multiple_votes: false,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        }),
      ); // Expired poll

      await expect(castVote(voteForm)).rejects.toThrow(DatabaseError);
      await expect(castVote(voteForm)).rejects.toThrow("Poll has expired");
    });

    it("should throw a DatabaseError if vote insertion fails", async () => {
      mockSupabase.insert.mockImplementationOnce(
        mockError("Failed to insert vote", "500"),
      );

      await expect(castVote(voteForm)).rejects.toThrow(DatabaseError);
      await expect(castVote(voteForm)).rejects.toThrow(
        "Failed to cast vote: Failed to insert vote",
      );
    });

    it("should allow multiple votes if poll allows it", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockSuccess({ allow_multiple_votes: true, expires_at: null }),
      ); // Poll allows multiple votes

      await castVote(voteForm, mockUserId);

      // Expect delete not to have been called for user_id or fingerprint
      expect(mockSupabase.delete).not.toHaveBeenCalledWith();
    });
  });

  // --- getUserVote ---
  describe("getUserVote", () => {
    const mockUserVotes = [
      {
        id: faker.string.uuid(),
        poll_id: mockPollId,
        option_id: mockOption1Id,
        user_id: mockUserId,
      },
    ];

    it("should fetch user's votes by userId", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess(mockUserVotes));

      const result = await getUserVote(mockPollId, mockUserId, undefined);

      expect(mockSupabase.eq).toHaveBeenCalledWith("poll_id", mockPollId);
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", mockUserId);
      expect(result).toEqual(mockUserVotes);
    });

    it("should fetch user's votes by fingerprint", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess(mockUserVotes));

      const result = await getUserVote(mockPollId, undefined, mockFingerprint);

      expect(mockSupabase.eq).toHaveBeenCalledWith("poll_id", mockPollId);
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        "voter_fingerprint",
        mockFingerprint,
      );
      expect(result).toEqual(mockUserVotes);
    });

    it("should return an empty array if no userId or fingerprint is provided", async () => {
      const result = await getUserVote(mockPollId, undefined, undefined);
      expect(result).toEqual([]);
    });

    it("should return an empty array if no votes are found", async () => {
      mockSupabase.select.mockImplementationOnce(mockSuccess(null));

      const result = await getUserVote(mockPollId, mockUserId);
      expect(result).toEqual([]);
    });

    it("should throw a DatabaseError if fetching user vote fails", async () => {
      mockSupabase.select.mockImplementationOnce(
        mockError("Failed to fetch votes", "500"),
      );

      await expect(getUserVote(mockPollId, mockUserId)).rejects.toThrow(
        DatabaseError,
      );
      await expect(getUserVote(mockPollId, mockUserId)).rejects.toThrow(
        "Failed to fetch user vote: Failed to fetch votes",
      );
    });
  });

  // --- recordPollView ---
  describe("recordPollView", () => {
    it("should successfully record a poll view for an anonymous user", async () => {
      mockSupabase.insert.mockImplementationOnce(mockSuccess(null));

      await expect(
        recordPollView(mockPollId, undefined, mockFingerprint),
      ).resolves.toBeUndefined();

      expect(mockSupabase.from).toHaveBeenCalledWith("poll_views");
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        poll_id: mockPollId,
        viewer_id: null,
        viewer_fingerprint: mockFingerprint,
      });
    });

    it("should successfully record a poll view for an authenticated user", async () => {
      mockSupabase.insert.mockImplementationOnce(mockSuccess(null));

      await expect(
        recordPollView(mockPollId, mockUserId, undefined),
      ).resolves.toBeUndefined();

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        poll_id: mockPollId,
        viewer_id: mockUserId,
        viewer_fingerprint: null,
      });
    });

    it("should not throw an error if a duplicate key error occurs (silent fail)", async () => {
      mockSupabase.insert.mockImplementationOnce(
        mockError("duplicate key value violates unique constraint", "23505"),
      );
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {}); // Mock console.error

      await expect(
        recordPollView(mockPollId, mockUserId),
      ).resolves.toBeUndefined();
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // No error logged for duplicate key
      consoleErrorSpy.mockRestore();
    });

    it("should log an error for other database errors (silent fail)", async () => {
      mockSupabase.insert.mockImplementationOnce(
        mockError("Some other DB error", "500"),
      );
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {}); // Mock console.error

      await expect(
        recordPollView(mockPollId, mockUserId),
      ).resolves.toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error recording poll view:",
        expect.any(DatabaseError),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  // --- getUserPollStats ---
  describe("getUserPollStats", () => {
    const mockStats = {
      total_polls_created: 5,
      total_votes_received: 100,
      total_views: 200,
      most_popular_poll_id: faker.string.uuid(),
    };

    it("should successfully fetch user poll stats", async () => {
      mockSupabase.rpc.mockImplementationOnce(mockSuccess([mockStats]));

      const result = await getUserPollStats(mockUserId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_user_poll_stats", {
        user_uuid: mockUserId,
      });
      expect(result).toEqual(mockStats);
    });

    it("should return null if no stats are found", async () => {
      mockSupabase.rpc.mockImplementationOnce(mockSuccess([]));

      const result = await getUserPollStats(mockUserId);
      expect(result).toBeNull();
    });

    it("should throw a DatabaseError if fetching user stats fails", async () => {
      mockSupabase.rpc.mockImplementationOnce(
        mockError("Failed to get user stats", "500"),
      );

      await expect(getUserPollStats(mockUserId)).rejects.toThrow(DatabaseError);
      await expect(getUserPollStats(mockUserId)).rejects.toThrow(
        "Failed to get user stats: Failed to get user stats",
      );
    });
  });

  // --- refreshPopularPolls ---
  describe("refreshPopularPolls", () => {
    it("should successfully call the refresh function", async () => {
      mockSupabase.rpc.mockImplementationOnce(mockSuccess(null));

      await expect(refreshPopularPolls()).resolves.toBeUndefined();

      expect(mockSupabase.rpc).toHaveBeenCalledWith("refresh_popular_polls");
    });

    it("should throw a DatabaseError if refreshing popular polls fails", async () => {
      mockSupabase.rpc.mockImplementationOnce(
        mockError("Failed to refresh", "500"),
      );

      await expect(refreshPopularPolls()).rejects.toThrow(DatabaseError);
      await expect(refreshPopularPolls()).rejects.toThrow(
        "Failed to refresh popular polls: Failed to refresh",
      );
    });
  });
});
