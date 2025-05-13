
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Key, Plus } from "lucide-react";
import { toast } from "sonner";

const ApiKeys = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; prefix: string; createdAt: Date }[]>([]);
  
  const createApiKey = () => {
    if (!keyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    
    // In a real app, this would call an API endpoint to create the key
    const newKey = {
      id: Math.random().toString(36).substring(2, 9),
      name: keyName,
      prefix: `ww_${Math.random().toString(36).substring(2, 10)}`,
      createdAt: new Date()
    };
    
    setApiKeys([...apiKeys, newKey]);
    setKeyName("");
    setIsDialogOpen(false);
    toast.success("API key created successfully");
  };

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg">
      <div>
        <h2 className="text-2xl font-semibold mb-2">API keys</h2>
        <p className="text-muted-foreground">
          Manage your API keys here. <a href="#docs" className="text-primary hover:underline">Learn more about using our API in our documentation</a>.
        </p>
      </div>

      <div className="flex justify-start">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="bg-muted/50 rounded-lg p-4 flex items-start space-x-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">No API keys found</h3>
            <p className="text-muted-foreground">You don't have any API keys associated with your account.</p>
          </div>
        </div>
      ) : (
        <div className="border rounded-md">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Key</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Created</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} className="border-b last:border-b-0">
                  <td className="p-3">{key.name}</td>
                  <td className="p-3">{key.prefix}•••••••••••••••</td>
                  <td className="p-3">{key.createdAt.toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">API Key Name</Label>
              <Input 
                id="key-name" 
                placeholder="Enter a name for your API key" 
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={createApiKey}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeys;
