
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { X } from "lucide-react";

const NotificationsSettings: React.FC = () => {
  const [receiveDailyLeads, setReceiveDailyLeads] = useState(true);
  const [leadsEmails, setLeadsEmails] = useState(['agora@faros.no']);
  const [newLeadsEmail, setNewLeadsEmail] = useState("");
  const [receiveConversations, setReceiveConversations] = useState(true);
  const [conversationsEmails, setConversationsEmails] = useState(['agora@faros.no']);
  const [newConversationEmail, setNewConversationEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddLeadEmail = () => {
    if (newLeadsEmail && !leadsEmails.includes(newLeadsEmail)) {
      setLeadsEmails([...leadsEmails, newLeadsEmail]);
      setNewLeadsEmail("");
    }
  };

  const handleRemoveLeadEmail = (email: string) => {
    setLeadsEmails(leadsEmails.filter(e => e !== email));
  };

  const handleAddConversationEmail = () => {
    if (newConversationEmail && !conversationsEmails.includes(newConversationEmail)) {
      setConversationsEmails([...conversationsEmails, newConversationEmail]);
      setNewConversationEmail("");
    }
  };

  const handleRemoveConversationEmail = (email: string) => {
    setConversationsEmails(conversationsEmails.filter(e => e !== email));
  };

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Notification settings saved",
        description: "Your agent's notification settings have been updated successfully."
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure email notifications for your agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="receiveDailyLeads" className="text-sm font-medium">
                  Receive email with daily leads
                </label>
              </div>
              <Switch
                id="receiveDailyLeads"
                checked={receiveDailyLeads}
                onCheckedChange={setReceiveDailyLeads}
              />
            </div>
            
            {receiveDailyLeads && (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newLeadsEmail}
                    onChange={(e) => setNewLeadsEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="max-w-md"
                  />
                  <Button onClick={handleAddLeadEmail}>
                    Add Email
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {leadsEmails.map((email) => (
                    <div 
                      key={email}
                      className="flex items-center bg-gray-100 px-3 py-1 rounded-md max-w-md"
                    >
                      <span className="flex-1">{email}</span>
                      <button 
                        onClick={() => handleRemoveLeadEmail(email)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="receiveConversations" className="text-sm font-medium">
                  Receive email with daily conversations
                </label>
              </div>
              <Switch
                id="receiveConversations"
                checked={receiveConversations}
                onCheckedChange={setReceiveConversations}
              />
            </div>
            
            {receiveConversations && (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newConversationEmail}
                    onChange={(e) => setNewConversationEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="max-w-md"
                  />
                  <Button onClick={handleAddConversationEmail}>
                    Add Email
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {conversationsEmails.map((email) => (
                    <div 
                      key={email}
                      className="flex items-center bg-gray-100 px-3 py-1 rounded-md max-w-md"
                    >
                      <span className="flex-1">{email}</span>
                      <button 
                        onClick={() => handleRemoveConversationEmail(email)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSettings;
