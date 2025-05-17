
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
import { CirclePicker } from 'react-color';

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, { message: "Agent name is required" }),
  color: z.string().default("bg-violet-600"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  }) => void;
}

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

const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({
  open,
  onOpenChange,
  onAgentCreated,
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "bg-violet-600",
    },
  });

  const onSubmit = (values: FormValues) => {
    // Create a new agent with the form values
    const newAgent = {
      id: Date.now(), // Use timestamp as a simple ID for now
      name: values.name,
      image: "/placeholder.svg",
      color: values.color,
      status: "active" as const,
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choose Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {bgColorOptions.map((color) => (
                        <div
                          key={color}
                          className={`w-8 h-8 rounded-md cursor-pointer ${color} ${
                            field.value === color 
                              ? "ring-2 ring-offset-2 ring-primary" 
                              : "ring-1 ring-offset-1 ring-gray-200"
                          } border border-gray-200`}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
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
