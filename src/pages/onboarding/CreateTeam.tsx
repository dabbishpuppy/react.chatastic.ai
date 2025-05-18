
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";

const CreateTeam = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, session } = useAuth(); // Use the auth provider to get current user

  // Check authentication status and email verification
  useEffect(() => {
    const checkAuth = async () => {
      if (!session) {
        // No session, redirect to sign in
        toast.error("Please sign in to continue");
        navigate("/signin");
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
    
    setIsSubmitting(true);
    
    try {
      // 1. Create a new team - WITH user.id as reference to satisfy RLS
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([
          { 
            name: teamName, 
            is_active: true,
            created_by: user.id // Add the user ID to satisfy RLS policy
          }
        ])
        .select();
      
      if (teamError || !teamData || teamData.length === 0) {
        throw teamError || new Error("Failed to create team");
      }

      const newTeam = teamData[0];
      
      // 2. Add user as a team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          { 
            user_id: user.id,
            team_id: newTeam.id,
            role: 'owner'
          }
        ]);
      
      if (memberError) throw memberError;
      
      // 3. Create team metrics
      const { error: metricsError } = await supabase
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
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
        <CardFooter className="text-center text-sm text-gray-600">
          You'll be able to add more teams later from your dashboard
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateTeam;
