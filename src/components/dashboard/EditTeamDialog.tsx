
import React, { useState, useEffect } from "react";
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
  name: z.string().min(1, { message: "Team name is required" }),
});

type FormValues = z.infer<typeof formSchema>;

interface Team {
  id: string;
  name: string;
  isActive: boolean;
  agents: any[];
  metrics?: any;
}

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  onTeamEdited: (team: Team) => void;
}

const EditTeamDialog: React.FC<EditTeamDialogProps> = ({
  open,
  onOpenChange,
  team,
  onTeamEdited,
}) => {
  const [isNameChanged, setIsNameChanged] = useState(false);
  const [originalName, setOriginalName] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team.name,
    },
  });

  const watchedName = form.watch("name");

  useEffect(() => {
    if (open) {
      setOriginalName(team.name);
      form.reset({ name: team.name });
      setIsNameChanged(false);
    }
  }, [open, team.name, form]);

  useEffect(() => {
    // Check if the current name differs from the original name
    setIsNameChanged(watchedName !== originalName);
  }, [watchedName, originalName]);

  const onSubmit = (values: FormValues) => {
    // Update the team with the new values
    const updatedTeam = {
      ...team,
      name: values.name,
    };

    onTeamEdited(updatedTeam);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team name below.
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
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isNameChanged}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeamDialog;
