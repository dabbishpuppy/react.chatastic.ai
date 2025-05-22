
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

// Define the form schema
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
    name: string;
    image?: string;
    color: string;
    status?: string;
  }) => void;
}

const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({
  open,
  onOpenChange,
  teams,
  onAgentCreated,
}) => {
  const selectedTeam = teams.find(team => team.isActive) || teams[0];
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!selectedTeam) {
      return; // Cannot create agent without a team
    }
    
    // Auto-assign a color from the palette (round robin based on team's existing agents)
    const teamAgentsCount = selectedTeam ? selectedTeam.agents.length : 0;
    const colorIndex = teamAgentsCount % agentColorPalette.length;
    const autoAssignedColor = agentColorPalette[colorIndex];
    
    // Create a new agent with the form values
    const newAgent = {
      name: values.name,
      image: "/placeholder.svg",
      color: autoAssignedColor,
      status: "active"
    };

    onAgentCreated(newAgent);
    form.reset();
    onOpenChange(false);
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
              <Button type="submit">Create Agent</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentDialog;
