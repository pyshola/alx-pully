"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component wraps its children with authentication context.
 *
 * Assumptions:
 * - The Supabase client is properly configured and available.
 * - Children components will consume authentication state via useAuth().
 *
 * Edge Cases:
 * - If Supabase fails to return a session, user and session will be null.
 * - Handles real-time auth state changes (e.g., sign-in, sign-out, token refresh).
 *
 * Connections:
 * - Provides user, session, loading, and signOut to all descendant components.
 * - Must wrap the component tree where authentication state is needed.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * signOut logs the current user out of Supabase.
   *
   * Assumptions:
   * - User is authenticated; if not, calling signOut is a no-op.
   *
   * Edge Cases:
   * - If signOut fails, the error is not handled here (could be extended).
   *
   * Connections:
   * - Used by components via the context to trigger user sign-out.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth is a custom hook to access authentication context.
 *
 * Assumptions:
 * - Must be called within a component wrapped by AuthProvider.
 *
 * Edge Cases:
 * - Throws an error if used outside AuthProvider.
 *
 * Connections:
 * - Used by any component that needs access to user, session, loading, or signOut.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
