
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const GeneralSettings: React.FC = () => {
  const [agentName, setAgentName] = useState("Agora AI");
  const [agentId, setAgentId] = useState("3URIXIQ8P508EDEVLmcd0");
  const [creditLimit, setCreditLimit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings saved",
        description: "Your agent settings have been updated successfully."
      });
    }, 1000);
  };

  const handleDeleteConversations = () => {
    toast({
      variant: "destructive",
      title: "Conversations deleted",
      description: "All conversations for this agent have been deleted."
    });
  };

  const handleDeleteAgent = () => {
    toast({
      variant: "destructive",
      title: "Agent deleted",
      description: "Your agent has been deleted successfully."
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic agent information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="agentId" className="block text-sm font-medium">
              Agent ID
            </label>
            <div className="flex gap-2">
              <Input 
                id="agentId" 
                value={agentId} 
                readOnly 
                className="max-w-md bg-gray-50"
              />
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(agentId);
                toast({
                  title: "Copied",
                  description: "Agent ID copied to clipboard"
                });
              }}>
                Copy
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="size" className="block text-sm font-medium">
              Size
            </label>
            <p className="text-sm text-gray-500">65 KB</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="agentName" className="block text-sm font-medium">
              Name
            </label>
            <Input 
              id="agentName" 
              value={agentName} 
              onChange={(e) => setAgentName(e.target.value)} 
              className="max-w-md"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="creditLimit" className="text-sm font-medium">
                Credit limit
              </label>
              <p className="text-xs text-gray-500">
                Limit the number of messages this agent can process
              </p>
            </div>
            <Switch
              id="creditLimit"
              checked={creditLimit}
              onCheckedChange={setCreditLimit}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-red-500 uppercase font-medium tracking-wider mb-4">
        Danger Zone
      </div>

      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="text-red-500">Delete all conversations</CardTitle>
          <CardDescription>
            Once you delete all conversations, there is no going back. Please be certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            All the conversations on this agent will be deleted.
            <br />
            <span className="font-semibold">This action is not reversible</span>
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="ml-auto">
                Delete all conversations
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all conversations
                  associated with this agent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConversations} className="bg-red-500 hover:bg-red-600">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="text-red-500">Delete agent</CardTitle>
          <CardDescription>
            Once you delete your agent, there is no going back. Please be certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            All your uploaded data and trained agent will be deleted.
            <br />
            <span className="font-semibold">This action is not reversible</span>
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="ml-auto">
                Delete agent
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your agent
                  and all data associated with it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAgent} className="bg-red-500 hover:bg-red-600">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;
