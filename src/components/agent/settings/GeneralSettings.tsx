import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DeleteAgentDialog from "@/components/dashboard/DeleteAgentDialog";
import DeleteConversationsDialog from "@/components/activity/DeleteConversationsDialog";

const GeneralSettings: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState("");
  const [creditLimit, setCreditLimit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingConversations, setIsDeletingConversations] = useState(false);
  const [deleteAgentDialogOpen, setDeleteAgentDialogOpen] = useState(false);
  const [deleteConversationsDialogOpen, setDeleteConversationsDialogOpen] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const { toast } = useToast();

  // Fetch agent data on component mount
  useEffect(() => {
    const fetchAgentData = async () => {
      if (!agentId) return;

      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single();

        if (error) throw error;
        
        if (data) {
          setAgentName(data.name);
          setAgent(data);
        }
      } catch (error: any) {
        console.error("Error fetching agent data:", error.message);
        toast({
          title: "Error loading agent data",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    fetchAgentData();
  }, [agentId]);

  const handleSave = async () => {
    if (!agentId) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('agents')
        .update({ name: agentName })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your agent settings have been updated successfully."
      });
    } catch (error: any) {
      console.error("Error saving agent settings:", error.message);
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConversations = async () => {
    if (!agentId) return;
    
    setIsDeletingConversations(true);
    
    try {
      // For demo purposes: In a real app, this would connect to an API to delete conversations
      // Here we'll simulate success and provide a placeholder for real implementation
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Import and call the deleteAllConversations function
      const { deleteAllConversations } = await import("@/components/activity/ConversationData");
      deleteAllConversations();
      
      toast({
        title: "Conversations deleted",
        description: "All conversations for this agent have been deleted."
      });
      
    } catch (error: any) {
      console.error("Error deleting conversations:", error.message);
      toast({
        title: "Error deleting conversations",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeletingConversations(false);
    }
  };

  const handleAgentDeleted = async (deletedAgentId: string) => {
    if (!deletedAgentId) return;
    
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', deletedAgentId);

      if (error) throw error;
      
      toast({
        title: "Agent deleted",
        description: "Your agent has been deleted successfully."
      });
      
      // Redirect to dashboard
      navigate("/dashboard");
      
    } catch (error: any) {
      console.error("Error deleting agent:", error.message);
      toast({
        title: "Error deleting agent",
        description: error.message,
        variant: "destructive"
      });
    }
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
                value={agentId || ''} 
                readOnly 
                className="max-w-md bg-gray-50"
              />
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(agentId || '');
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
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !agentName.trim()}
            >
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
          
          <Button 
            variant="destructive" 
            className="ml-auto"
            onClick={() => setDeleteConversationsDialogOpen(true)}
          >
            Delete all conversations
          </Button>

          <DeleteConversationsDialog
            open={deleteConversationsDialogOpen}
            onOpenChange={setDeleteConversationsDialogOpen}
            agentName={agentName}
            onConversationsDeleted={handleDeleteConversations}
          />
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
          
          <Button 
            variant="destructive" 
            className="ml-auto"
            onClick={() => setDeleteAgentDialogOpen(true)}
          >
            Delete agent
          </Button>

          {agent && (
            <DeleteAgentDialog 
              open={deleteAgentDialogOpen}
              onOpenChange={setDeleteAgentDialogOpen}
              agent={agent}
              onAgentDeleted={handleAgentDeleted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;
