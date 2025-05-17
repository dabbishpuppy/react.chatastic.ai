
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
  teamId: z.string({ required_error: "Please select a team" }),
});

type FormValues = z.infer<typeof formSchema>;

// Predefined list of colors to auto-assign
const bgColorOptions = [
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
}

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: (agent: {
    id: number;
    name: string;
    image: string;
    color: string;
    status: "active";
    teamId: string;
    metrics: {
      conversations: number;
      responseTime: string;
      satisfaction: number;
    };
  }) => void;
  teams: Team[];
}

const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({
  open,
  onOpenChange,
  onAgentCreated,
  teams,
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
    // Automatically assign a color to the agent
    const randomColorIndex = Math.floor(Math.random() * bgColorOptions.length);
    const assignedColor = bgColorOptions[randomColorIndex];
    
    // Create a new agent with the form values
    const newAgent = {
      id: Date.now(), // Use timestamp as a simple ID for now
      name: values.name,
      image: "/placeholder.svg",
      color: assignedColor,
      status: "active" as const,
      teamId: values.teamId,
      metrics: {
        conversations: 0,
        responseTime: "0.0s",
        satisfaction: 0,
      },
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
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
