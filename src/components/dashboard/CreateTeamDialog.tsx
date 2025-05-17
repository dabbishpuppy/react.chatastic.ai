
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, { message: "Team name is required" }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated: (team: any) => void;
}

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open,
  onOpenChange,
  onTeamCreated,
}) => {
  const { user } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to create a team",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Insert the team in Supabase
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: values.name,
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
      
      // Format team for UI
      const newTeam = {
        ...data,
        isActive: true,
        agents: [],
        metrics: {
          totalConversations: data.total_conversations || 0,
          avgResponseTime: data.avg_response_time || "0.0s",
          usagePercent: data.usage_percent || 0,
          apiCalls: data.api_calls || 0,
          satisfaction: data.satisfaction || 0,
        }
      };

      // Call the onTeamCreated callback provided by parent component
      onTeamCreated(newTeam);
      
      toast({
        title: "Team created",
        description: `${values.name} team has been created successfully!`,
      });
      
      form.reset();
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        title: "Failed to create team",
        description: error.message || "An error occurred while creating the team",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
