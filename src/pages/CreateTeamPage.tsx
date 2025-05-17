
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CreateTeamDialog from "@/components/dashboard/CreateTeamDialog";
import { toast } from "@/hooks/use-toast";
import Logo from "@/components/layout/Logo";

const CreateTeamPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user already has teams, if yes redirect to dashboard
  useEffect(() => {
    const checkForTeams = async () => {
      if (!user) return;

      try {
        const { data: teams } = await supabase
          .from('teams')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (teams && teams.length > 0) {
          // User already has teams, redirect to dashboard
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error checking for existing teams:", error);
      }
    };

    checkForTeams();
  }, [user, navigate]);

  const handleTeamCreated = async (team: any) => {
    if (!user) return;

    try {
      // Insert the team in Supabase
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: team.name,
          user_id: user.id,
          total_conversations: 0,
          avg_response_time: "0.0s",
          usage_percent: 0,
          api_calls: 0,
          satisfaction: 0
        }])
        .select('*')
        .single();

      if (error) throw error;

      toast({
        title: "Team created successfully",
        description: `${team.name} team has been created!`
      });

      // Redirect to dashboard after team creation
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Failed to create team",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCloseDialog = () => {
    // If user closes dialog without creating a team, redirect to dashboard
    setIsDialogOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center mb-8">
        <Logo size="lg" />
        <h1 className="mt-6 text-3xl font-bold">Welcome to Wonderwave!</h1>
        <p className="mt-2 text-gray-600">Let's get started by creating your first team.</p>
      </div>

      <CreateTeamDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        onTeamCreated={handleTeamCreated}
      />
    </div>
  );
};

export default CreateTeamPage;
