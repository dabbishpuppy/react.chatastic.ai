
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const teamSchema = z.object({
  name: z.string().min(1, { message: "Team name is required" }),
});

type TeamFormValues = z.infer<typeof teamSchema>;

const CreateTeamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
    },
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (values: TeamFormValues) => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "Please sign in to create a team",
        variant: "destructive",
      });
      navigate("/signin");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Insert the new team into the database
      const { data, error } = await supabase
        .from('teams')
        .insert([
          { 
            name: values.name, 
            user_id: user.id 
          }
        ])
        .select('id')
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Team created successfully",
        description: "Now let's create your first AI agent",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        title: "Failed to create team",
        description: error.message,
        variant: "destructive",
      });
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
            Set up your first team to organize your AI agents
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating team..." : "Create Team"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTeamPage;
