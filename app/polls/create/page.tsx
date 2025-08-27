import { Metadata } from 'next'
import { CreatePollForm } from '@/components/polls/create-poll-form'

export const metadata: Metadata = {
  title: 'Create Poll | Alx Pully',
  description: 'Create a new poll to gather opinions from your audience.',
}

export default function CreatePollPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create a New Poll
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Gather opinions, make decisions, and engage your audience with a custom poll.
            Share it publicly or keep it private for your team.
          </p>
        </div>

        {/* Form */}
        <CreatePollForm />

        {/* Tips Section */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Tips for creating effective polls
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Keep your question clear and specific to avoid confusion
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Provide balanced options that cover all reasonable possibilities
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Consider adding an "Other" option for flexibility
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Set an appropriate expiration date to create urgency
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
