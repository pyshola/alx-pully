import { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Create Account | Alx Pully',
  description: 'Create your Alx Pully account to start creating and participating in polls.',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join Alx Pully
          </h1>
          <p className="text-gray-600">
            Create your account to get started with polls
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
