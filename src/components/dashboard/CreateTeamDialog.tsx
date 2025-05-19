
import React from "react";
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

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, { message: "Team name is required" }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated: (team: {
    id: string;
    name: string;
    isActive: boolean;
    agents: never[]; // Changed from [] to never[] to match the expected type
    metrics: {
      totalConversations: number;
      avgResponseTime: string;
      usagePercent: number;
      apiCalls: number;
      satisfaction: number;
    };
  }) => void;
}

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open,
  onOpenChange,
  onTeamCreated,
}) => {
  const { user, session } = useAuth(); // Get the current authenticated user and session
  
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
        description: "You must be logged in to create a team.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get authenticated client using the session token
      const authClient = getAuthenticatedClient(session.access_token);
      
      // Create the team in Supabase with the user ID as created_by
      const { data: teamData, error: teamError } = await authClient
        .from('teams')
        .insert([
          { 
            name: values.name,
            is_active: true,
            created_by: user.id // Set the authenticated user's ID
          }
        ])
        .select();
      
      if (teamError) {
        throw teamError;
      }

      if (!teamData || teamData.length === 0) {
        throw new Error("Failed to create team");
      }

      const newTeam = teamData[0];
      
      // Create team metrics entry
      await authClient
        .from('team_metrics')
        .insert([{ team_id: newTeam.id }]);
      
      // Add user as team member with owner role
      await authClient
        .from('team_members')
        .insert([
          {
            team_id: newTeam.id,
            user_id: user.id,
            role: 'owner'
          }
        ]);

      // Format the team object to match expected interface
      const formattedTeam = {
        id: newTeam.id,
        name: newTeam.name,
        isActive: newTeam.is_active || false,
        agents: [] as never[],
        metrics: {
          totalConversations: 0,
          avgResponseTime: "0.0s",
          usagePercent: 0,
          apiCalls: 0,
          satisfaction: 0,
        },
      };

      onTeamCreated(formattedTeam);
      toast({
        title: "Team created",
        description: `${values.name} team has been created successfully!`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        title: "Error creating team",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize your agents. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter team name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
