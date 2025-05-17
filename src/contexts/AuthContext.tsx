
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  loading: boolean;
  networkAvailable: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkAvailable, setNetworkAvailable] = useState(navigator.onLine);
  const navigate = useNavigate();

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkAvailable(true);
      toast({
        title: "Connection restored",
        description: "You are now online.",
      });
    };
    
    const handleOffline = () => {
      setNetworkAvailable(false);
      toast({
        title: "No internet connection",
        description: "You are offline. Please check your connection.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setNetworkAvailable(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST to prevent missing auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Only synchronous state updates here
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Use setTimeout to avoid auth deadlocks
        setTimeout(() => {
          if (event === 'SIGNED_IN') {
            // Check if the user already has a team
            const checkForTeams = async () => {
              try {
                const { data: teams } = await supabase
                  .from('teams')
                  .select('id')
                  .eq('user_id', newSession?.user.id)
                  .limit(1);
                
                if (teams && teams.length > 0) {
                  navigate('/dashboard');
                } else {
                  navigate('/create-team');
                }
              } catch (error) {
                console.error('Error checking for teams:', error);
                navigate('/dashboard');
              }
            };
            
            checkForTeams();
          } else if (event === 'SIGNED_OUT') {
            navigate('/signin');
          } else if (event === 'USER_UPDATED') {
            setUser(newSession?.user ?? null);
          }
        }, 0);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // User is already logged in
          const { data: teams } = await supabase
            .from('teams')
            .select('id')
            .eq('user_id', currentSession.user.id)
            .limit(1);
          
          if (teams && teams.length > 0) {
            navigate('/dashboard');
          } else if (window.location.pathname !== '/create-team') {
            navigate('/create-team');
          }
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

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
    networkAvailable,
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
