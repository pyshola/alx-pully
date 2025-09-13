"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { isValidEmail } from "@/lib/utils";
import { supabase } from "@/lib/supabase-client";

interface LoginFormProps {
  redirectTo?: string;
}

/**
 * LoginForm renders a login form and handles user authentication.
 *
 * Assumptions:
 * - The Supabase client is configured and available.
 * - The parent is wrapped in AuthProvider.
 * - Optionally receives a redirectTo prop or uses search params.
 *
 * Edge Cases:
 * - Displays error messages for invalid credentials, unconfirmed email, or unexpected errors.
 * - Handles disabled state while loading.
 *
 * Connections:
 * - Uses useAuth() for loading state.
 * - Uses Supabase for authentication.
 * - Navigates with Next.js router after successful login.
 */
export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const finalRedirectTo =
    redirectTo || searchParams.get("redirectTo") || "/dashboard";

  /**
   * handleInputChange updates form state on input change and clears errors.
   *
   * Assumptions:
   * - Input fields have name attributes matching formData keys.
   *
   * Edge Cases:
   * - Resets error state on any input change.
   *
   * Connections:
   * - Used as onChange handler for email and password fields.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  /**
   * validateForm checks if the form fields are valid.
   *
   * Assumptions:
   * - Email and password fields are required.
   * - Uses isValidEmail utility for email validation.
   *
   * Edge Cases:
   * - Sets error messages for missing or invalid input.
   *
   * Connections:
   * - Called before attempting authentication.
   */
  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!formData.password) {
      setError("Password is required");
      return false;
    }

    return true;
  };

  /**
   * handleSubmit processes the login form submission.
   *
   * Assumptions:
   * - Form is valid before attempting authentication.
   * - Supabase signInWithPassword returns an error object on failure.
   *
   * Edge Cases:
   * - Handles specific Supabase error messages for invalid credentials and unconfirmed email.
   * - Handles unexpected errors with a generic message.
   *
   * Connections:
   * - Called on form submit.
   * - Redirects user on successful login.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword(formData);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password");
        } else if (error.message.includes("Email not confirmed")) {
          setError(
            "Please check your email and click the confirmation link before signing in",
          );
        } else {
          setError(error.message || "An error occurred during sign in");
        }
        return;
      }

      router.push(finalRedirectTo);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Sign In
        </CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center text-sm">
            <Link href="/register" className="text-primary hover:underline">
              Don't have an account? Sign up
            </Link>
          </div>

          <div className="text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
