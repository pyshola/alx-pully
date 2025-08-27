import { NextRequest, NextResponse } from 'next/server'
import { LoginCredentials, AuthResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json()

    // Validate request body
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // TODO: Implement actual authentication logic
    // This is a placeholder that simulates successful login

    // Mock user data - replace with actual database lookup
    const mockUser = {
      id: '1',
      email: body.email,
      username: 'johndoe',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Mock JWT token - replace with actual token generation
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJqb2huZG9lQGV4YW1wbGUuY29tIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTg4MDB9.placeholder'

    const response: AuthResponse = {
      user: mockUser,
      token: mockToken
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
