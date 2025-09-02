"use client";

import { useState } from "react";
import { notFound } from "next/navigation";

interface PollPageProps {
  params: {
    id: string;
  };
}

// Mock data for demonstration purposes
const mockPolls = [
  {
    id: "poll-1",
    question: "What is your favorite color?",
    options: ["Red", "Blue", "Green", "Yellow"],
  },
  {
    id: "poll-2",
    question: "Best programming language?",
    options: ["JavaScript", "Python", "TypeScript", "Rust"],
  },
  {
    id: "poll-3",
    question: "Favorite food?",
    options: ["Pizza", "Tacos", "Sushi", "Pasta"],
  },
];

export default function PollPage({ params }: PollPageProps) {
  const { id } = params;

  // Find the poll by id from mock data
  const poll = mockPolls.find((p) => p.id === id);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  if (!poll) {
    notFound(); // Display a 404 page if poll is not found
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedOption) {
      // In a real application, you would send this to the server
      console.log(`User voted for: ${selectedOption} in poll ${id}`);
      setHasVoted(true);
    } else {
      alert("Please select an option before voting.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">{poll.question}</h1>
      {hasVoted ? (
        <div className="bg-green-100 text-green-800 p-4 rounded-md text-center max-w-md mx-auto">
          <p className="font-semibold text-lg">Thank you for voting!</p>
          <p>
            Your vote for &quot;{selectedOption}&quot; has been recorded (mock).
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto"
        >
          <ul className="space-y-4 mb-6">
            {poll.options.map((option, index) => (
              <li
                key={index}
                className="flex items-center p-3 border border-gray-200 rounded-md text-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="pollOption"
                  value={option}
                  checked={selectedOption === option}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label
                  htmlFor={`option-${index}`}
                  className="flex-grow cursor-pointer"
                >
                  {option}
                </label>
              </li>
            ))}
          </ul>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={!selectedOption}
          >
            Submit Vote
          </button>
        </form>
      )}
    </div>
  );
}
