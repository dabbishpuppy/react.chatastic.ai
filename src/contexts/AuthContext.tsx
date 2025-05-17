
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error checking authentication status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          navigate('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          navigate('/signin');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const isNetworkAvailable = () => {
    return navigator.onLine;
  };

  const handleApiError = (error: any) => {
    // Check if it's a network error
    if (!isNetworkAvailable() || 
        error.message === "Failed to fetch" || 
        error.code === "network_error" ||
        error.message?.includes("NetworkError") ||
        error.message?.includes("Network Error")) {
      return new Error("Network error. Please check your internet connection and try again.");
    }
    
    // Return the original error if it's not a network error
    return error;
  };

  const signUp = async (email: string, password: string) => {
    try {
      if (!isNetworkAvailable()) {
        throw new Error("Network connection unavailable. Please check your internet connection.");
      }
      
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Verification email sent",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      console.error("Sign up error:", error);
      
      const processedError = handleApiError(error);
      
      toast({
        title: "Registration failed",
        description: processedError.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw processedError;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!isNetworkAvailable()) {
        throw new Error("Network connection unavailable. Please check your internet connection.");
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      const processedError = handleApiError(error);
      
      toast({
        title: "Login failed",
        description: processedError.message,
        variant: "destructive",
      });
      throw processedError;
    }
  };

  const signOut = async () => {
    try {
      if (!isNetworkAvailable()) {
        throw new Error("Network connection unavailable. Please check your internet connection.");
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      const processedError = handleApiError(error);
      
      toast({
        title: "Sign out failed",
        description: processedError.message,
        variant: "destructive",
      });
      throw processedError;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
