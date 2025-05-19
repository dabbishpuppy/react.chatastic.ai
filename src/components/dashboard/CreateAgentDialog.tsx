
import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { supabase, getAuthenticatedClient } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

// Define the form schema - removed teamId requirement
const formSchema = z.object({
  name: z.string().min(1, { message: "Agent name is required" }),
});

type FormValues = z.infer<typeof formSchema>;

// Color palette for automatic assignment
const agentColorPalette = [
  "bg-violet-600",
  "bg-amber-100",
  "bg-rose-400",
  "bg-black",
  "bg-white",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-400",
  "bg-indigo-600",
  "bg-purple-500",
];

interface Team {
  id: string;
  name: string;
  isActive?: boolean;
  agents: any[];
}

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  onAgentCreated: (agent: {
    id: number;
    name: string;
    image: string;
    color: string;
    status: "active";
    metrics: {
      conversations: number;
      responseTime: string;
      satisfaction: number;
    };
    teamId: string;
  }) => void;
}

const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({
  open,
  onOpenChange,
  teams,
  onAgentCreated,
}) => {
  const navigate = useNavigate();
  const { user, session } = useAuth(); // Get authentication info
  const selectedTeam = teams.find(team => team.isActive) || teams[0];
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user || !session?.access_token) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to create an agent.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get authenticated client using the session token
      const authClient = getAuthenticatedClient(session.access_token);
      
      // Auto-assign a color from the palette (round robin based on team's existing agents)
      const teamAgentsCount = selectedTeam ? selectedTeam.agents.length : 0;
      const colorIndex = teamAgentsCount % agentColorPalette.length;
      const autoAssignedColor = agentColorPalette[colorIndex];
      
      // Create a new agent in Supabase
      const { data: agentData, error: agentError } = await authClient
        .from('agents')
        .insert([
          { 
            name: values.name,
            team_id: selectedTeam.id,
            color: autoAssignedColor,
            status: 'active',
            image: '/placeholder.svg'
          }
        ])
        .select();
        
      if (agentError || !agentData || agentData.length === 0) {
        throw agentError || new Error("Failed to create agent");
      }
      
      const newAgent = agentData[0];
      
      // Create agent metrics
      const { error: metricsError } = await authClient
        .from('agent_metrics')
        .insert([{ 
          agent_id: newAgent.id,
          conversations: 0,
          response_time: '0.0s',
          satisfaction: 0
        }]);
        
      if (metricsError) {
        throw metricsError;
      }
      
      // Format the agent object to match expected interface
      const formattedAgent = {
        id: newAgent.id,
        name: newAgent.name,
        image: newAgent.image || "/placeholder.svg",
        color: newAgent.color,
        status: "active" as const,
        metrics: {
          conversations: 0,
          responseTime: "0.0s",
          satisfaction: 0,
        },
        teamId: selectedTeam.id,
      };

      onAgentCreated(formattedAgent);
      toast({
        title: "Agent created",
        description: `${values.name} has been created successfully!`,
      });
      form.reset();
      onOpenChange(false);
      
      // Redirect to the sources page for the new agent
      navigate(`/agent/${newAgent.id}/sources?tab=text`, { replace: true });
    } catch (error: any) {
      console.error("Error creating agent:", error);
      toast({
        title: "Error creating agent",
        description: error.message || "Failed to create agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new AI agent for your team. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter agent name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentDialog;
