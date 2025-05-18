
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Color palette for automatic assignment
const agentColorPalette = [
  { name: "Purple", value: "bg-violet-600" },
  { name: "Amber", value: "bg-amber-100" },
  { name: "Rose", value: "bg-rose-400" },
  { name: "Black", value: "bg-black" },
  { name: "White", value: "bg-white" },
  { name: "Blue", value: "bg-blue-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Yellow", value: "bg-yellow-400" },
];

const CreateAgent = () => {
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-violet-600");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Check authentication status and fetch teams
  useEffect(() => {
    const checkAuthAndFetchTeams = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to continue");
        navigate("/signin");
        return;
      }

      // Get user data
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData?.user);
      
      if (userData?.user && !userData.user.email_confirmed_at) {
        toast.error("Please verify your email before continuing");
        await supabase.auth.signOut();
        navigate("/signin");
        return;
      }
      
      // Fetch user's teams
      if (userData?.user) {
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userData.user.id);
        
        if (teamMembersError) {
          console.error("Error fetching team members:", teamMembersError);
          toast.error("Failed to load your teams");
          return;
        }
        
        if (!teamMembers || teamMembers.length === 0) {
          // User doesn't have any teams, redirect to create team
          navigate('/onboarding/create-team');
          return;
        }
        
        // Fetch team details
        const teamIds = teamMembers.map(member => member.team_id);
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);
        
        if (teamsError) {
          console.error("Error fetching teams:", teamsError);
          toast.error("Failed to load your teams");
          return;
        }
        
        if (teamsData) {
          setTeams(teamsData);
          // Select the first team by default
          if (teamsData.length > 0) {
            setSelectedTeamId(teamsData[0].id);
          }
        }
        
        // Check if user already has agents in any team
        if (teamIds.length > 0) {
          const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('id, team_id')
            .in('team_id', teamIds);
          
          if (agentsError) {
            console.error("Error checking agents:", agentsError);
          } else if (agents && agents.length > 0) {
            // User already has completed onboarding, redirect to dashboard
            navigate('/dashboard');
          }
        }
      }
    };
    
    checkAuthAndFetchTeams();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }
    
    if (!selectedTeamId) {
      toast.error("Please select a team");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Create a new agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .insert([
          { 
            name: agentName,
            team_id: selectedTeamId,
            color: selectedColor,
            status: 'active',
            image: '/placeholder.svg'
          }
        ])
        .select();
      
      if (agentError || !agentData || agentData.length === 0) {
        throw agentError || new Error("Failed to create agent");
      }

      const newAgent = agentData[0];
      
      // 2. Create agent metrics
      const { error: metricsError } = await supabase
        .from('agent_metrics')
        .insert([{ 
          agent_id: newAgent.id,
          conversations: 0,
          response_time: '0.0s',
          satisfaction: 0
        }]);
      
      if (metricsError) throw metricsError;
      
      toast.success("Agent created successfully!");
      
      // Onboarding complete - redirect to dashboard
      navigate("/dashboard");
      
    } catch (error: any) {
      console.error("Error creating agent:", error);
      toast.error(error.message || "Failed to create agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Create Your Agent</CardTitle>
          <CardDescription>
            Set up your first AI agent to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input 
                id="agentName" 
                placeholder="Enter agent name..." 
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required 
                disabled={isSubmitting}
              />
              <p className="text-sm text-gray-500">
                Choose a name for your AI assistant
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="teamSelect">Select Team</Label>
              <Select 
                value={selectedTeamId || ''} 
                onValueChange={setSelectedTeamId}
                disabled={isSubmitting || teams.length === 0}
              >
                <SelectTrigger id="teamSelect">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Agent Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {agentColorPalette.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-full h-10 rounded border-2 ${
                      selectedColor === color.value ? 'border-blue-500' : 'border-transparent'
                    } ${color.value}`}
                    title={color.name}
                    aria-label={`Select ${color.name} color`}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Agent..." : "Create Agent"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-600">
          You'll be able to add more agents later from your dashboard
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateAgent;
