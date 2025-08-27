import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In | Alx Pully',
  description: 'Sign in to your Alx Pully account to create and participate in polls.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Alx Pully
          </h1>
          <p className="text-gray-600">
            The platform for creating and participating in polls
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
