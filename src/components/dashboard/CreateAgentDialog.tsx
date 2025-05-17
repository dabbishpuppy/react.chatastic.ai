
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Team } from "@/hooks/useTeamsAndAgents";

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

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  onAgentCreated: (agent: {
    id: string;
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
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Make sure we always have a valid team selected
  const selectedTeam = teams.find(team => team.isActive) || teams[0];
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!selectedTeam || !selectedTeam.id) {
      toast({
        title: "Error",
        description: "No team selected. Please create or select a team first.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create an agent.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Auto-assign a color from the palette (round robin based on team's existing agents)
    const teamAgentsCount = selectedTeam ? selectedTeam.agents.length : 0;
    const colorIndex = teamAgentsCount % agentColorPalette.length;
    const autoAssignedColor = agentColorPalette[colorIndex];
    
    try {
      console.log("Creating agent with team_id:", selectedTeam.id);
      
      // Insert the new agent - The RLS policies will handle permission checking
      const { data, error } = await supabase
        .from('agents')
        .insert([
          {
            name: values.name,
            team_id: selectedTeam.id,
            color: autoAssignedColor,
            image: "/placeholder.svg",
            status: "active",
            conversations: 0,
            response_time: "0.0s",
            satisfaction: 0
          }
        ])
        .select('*')
        .single();
      
      if (error) {
        console.error("Error creating agent:", error);
        toast({
          title: "Error creating agent",
          description: error.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      if (!data) {
        console.error("No data returned from agent creation");
        toast({
          title: "Error creating agent",
          description: "Failed to create agent. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Create a new agent with the form values and returned data
      const newAgent = {
        id: data.id,
        name: data.name,
        image: data.image || "/placeholder.svg",
        color: data.color,
        status: "active" as const,
        metrics: {
          conversations: 0,
          responseTime: "0.0s",
          satisfaction: 0,
        },
        teamId: selectedTeam.id,
      };

      // Close dialog first
      onOpenChange(false);
      
      // Show processing toast
      setIsProcessing(true);
      
      // Call onAgentCreated callback
      onAgentCreated(newAgent);
      
      toast({
        title: "Agent created",
        description: `${values.name} has been created successfully!`,
      });
      
      form.reset();
      
      // Redirect to the agent page with a short delay
      setTimeout(() => {
        navigate(`/agent/${newAgent.id}`, { replace: true });
        setIsProcessing(false);
        setIsSubmitting(false);
      }, 500);
      
    } catch (error: any) {
      console.error("Exception creating agent:", error);
      toast({
        title: "Error creating agent",
        description: error.message || "Failed to create agent. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Loader className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Creating your agent...</p>
          </div>
        </div>
      )}
      
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

              {selectedTeam ? (
                <div className="text-sm text-muted-foreground">
                  Creating in team: <span className="font-medium">{selectedTeam.name}</span>
                </div>
              ) : (
                <div className="text-sm text-red-500">
                  No team selected. Please create a team first.
                </div>
              )}

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={!selectedTeam || isSubmitting}
                  className="relative"
                >
                  {isSubmitting && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Creating..." : "Create Agent"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateAgentDialog;
