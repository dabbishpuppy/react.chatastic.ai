
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const GeneralSettings = () => {
  const [teamName, setTeamName] = useState("Wonderwave");
  const [teamUrl, setTeamUrl] = useState("wonderwave");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings saved",
        description: "Your team settings have been updated successfully."
      });
    }, 1000);
  };

  const handleDelete = () => {
    // This would handle the actual team deletion
    toast({
      variant: "destructive",
      title: "Team deleted",
      description: "Your team has been deleted successfully."
    });
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-2xl font-bold mb-6">General</h2>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="teamName" className="block text-sm font-medium">
            Team name
          </label>
          <Input 
            id="teamName" 
            value={teamName} 
            onChange={(e) => setTeamName(e.target.value)} 
            className="max-w-md"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="teamUrl" className="block text-sm font-medium">
            Team URL
          </label>
          <Input 
            id="teamUrl" 
            value={teamUrl} 
            onChange={(e) => setTeamUrl(e.target.value)} 
            className="max-w-md"
          />
          <p className="text-sm text-muted-foreground">
            Changing the team URL will redirect you to the new address.
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      
      <div className="mt-12">
        <Separator className="my-6" />
        <div className="text-center text-xs text-red-500 uppercase font-medium tracking-wider mb-6">
          Danger Zone
        </div>
        
        <div className="bg-white border border-red-100 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-red-500 mb-4">Delete team</h3>
          <p className="mb-2">
            Once you delete your team account, there is no going back. Please be certain.
          </p>
          <p className="mb-2">
            All your uploaded data and trained agents will be deleted.
          </p>
          <p className="font-semibold mb-4">
            This action is not reversible
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="ml-auto">
                Delete Wonderwave
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your team
                  and remove all data associated with it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
