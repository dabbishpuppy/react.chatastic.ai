import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, getAuthenticatedClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";

const CreateTeam = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, session } = useAuth(); // Use the auth provider to get current user
  
  // State for test user creation
  const [showTestUserForm, setShowTestUserForm] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Check authentication status and email verification
  useEffect(() => {
    const checkAuth = async () => {
      if (!session) {
        // No session, but don't redirect - allow user to create test user
        return;
      }
      
      // If email is not confirmed, redirect to sign in
      if (user && !user.email_confirmed_at) {
        toast.error("Please verify your email before continuing");
        await supabase.auth.signOut();
        navigate("/signin");
        return;
      }
      
      // Check if user already has a team
      if (user) {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);
        
        if (teamMembers && teamMembers.length > 0) {
          // User already has a team, check if they have agents
          const teamId = teamMembers[0].team_id;
          const { data: agents } = await supabase
            .from('agents')
            .select('id')
            .eq('team_id', teamId)
            .limit(1);
          
          if (agents && agents.length > 0) {
            // User has completed onboarding, redirect to dashboard
            navigate('/dashboard');
          } else {
            // User has a team but no agents, redirect to create agent
            navigate('/onboarding/create-agent');
          }
        }
      }
    };
    
    checkAuth();
  }, [navigate, user, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }
    
    if (!user) {
      toast.error("User is not authenticated");
      navigate("/signin");
      return;
    }
    
    if (!session || !session.access_token) {
      toast.error("Session is not valid. Please sign in again.");
      await supabase.auth.signOut();
      navigate("/signin");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Creating team with user ID:", user.id);
      
      // Get authenticated client using the session token
      const authClient = getAuthenticatedClient(session.access_token);
      
      // Create a new team - EXPLICITLY set created_by to the current user ID
      const { data: teamData, error: teamError } = await authClient
        .from('teams')
        .insert([
          { 
            name: teamName, 
            is_active: true,
            created_by: user.id  // Explicitly set created_by to user.id
          }
        ])
        .select();
      
      if (teamError || !teamData || teamData.length === 0) {
        throw teamError || new Error("Failed to create team");
      }

      const newTeam = teamData[0];
      
      // Add user as a team member
      const { error: memberError } = await authClient
        .from('team_members')
        .insert([
          { 
            user_id: user.id,
            team_id: newTeam.id,
            role: 'owner'
          }
        ]);
      
      if (memberError) throw memberError;
      
      // Create team metrics
      const { error: metricsError } = await authClient
        .from('team_metrics')
        .insert([{ team_id: newTeam.id }]);
      
      if (metricsError) throw metricsError;
      
      toast.success("Team created successfully!");
      
      // Move to the next step in onboarding
      navigate("/onboarding/create-agent");
      
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to create a test user
  const createTestUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testEmail || !testPassword) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setIsCreatingUser(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      if (error) throw error;
      
      if (data.user) {
        toast.success("Test user created successfully! Please sign in.");
        
        // Sign in automatically with the created user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });
        
        if (signInError) throw signInError;
        
        toast.success("Signed in successfully!");
        // The auth state change will trigger the useEffect to run
      }
      
    } catch (error: any) {
      console.error("Error creating test user:", error);
      toast.error(error.message || "Failed to create test user");
    } finally {
      setIsCreatingUser(false);
      setShowTestUserForm(false);
    }
  };

  // Handle sign out 
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Successfully signed out");
      navigate("/signin");
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      {!user ? (
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Create Test User</CardTitle>
            <CardDescription>
              Create a test user to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTestUser} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Email</Label>
                <Input 
                  id="testEmail" 
                  type="email"
                  placeholder="Enter test email..." 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required 
                  disabled={isCreatingUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testPassword">Password</Label>
                <Input 
                  id="testPassword" 
                  type="password"
                  placeholder="Enter test password..." 
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  required 
                  disabled={isCreatingUser}
                />
                <p className="text-sm text-gray-500">
                  Password must be at least 6 characters
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={isCreatingUser}>
                {isCreatingUser ? "Creating User..." : "Create & Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal" 
              onClick={() => navigate("/signin")}
            >
              Sign in
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Create Your Team</CardTitle>
            <CardDescription>
              Set up your first team to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input 
                  id="teamName" 
                  placeholder="Enter team name..." 
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required 
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500">
                  This is the name of your team or organization
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating Team..." : "Create Team"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <p className="text-sm text-gray-600">
              You'll be able to add more teams later from your dashboard
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default CreateTeam;
