
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, { message: "Agent name is required" }),
  teamId: z.string().min(1, { message: "Team is required" }),
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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      teamId: teams.length > 0 ? teams[0].id : "",
    },
  });

  const onSubmit = (values: FormValues) => {
    // Auto-assign a color from the palette (round robin based on team's existing agents)
    const selectedTeam = teams.find(team => team.id === values.teamId);
    const teamAgentsCount = selectedTeam ? selectedTeam.agents.length : 0;
    const colorIndex = teamAgentsCount % agentColorPalette.length;
    const autoAssignedColor = agentColorPalette[colorIndex];
    
    // Create a new agent with the form values
    const newAgent = {
      id: Date.now(), // Use timestamp as a simple ID for now
      name: values.name,
      image: "/placeholder.svg",
      color: autoAssignedColor,
      status: "active" as const,
      metrics: {
        conversations: 0,
        responseTime: "0.0s",
        satisfaction: 0,
      },
      teamId: values.teamId,
    };

    onAgentCreated(newAgent);
    toast({
      title: "Agent created",
      description: `${values.name} has been created successfully!`,
    });
    form.reset();
    onOpenChange(false);
    
    // Redirect to the sources page for the new agent
    navigate(`/agent/${newAgent.id}/sources?tab=text`, { replace: true });
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

            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Create Agent</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentDialog;
