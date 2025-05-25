
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { useParams } from "react-router-dom";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";

const NotificationsSettings: React.FC = () => {
  const { agentId } = useParams();
  const { settings, isLoading, isSaving, saveSettings } = useNotificationSettings(agentId || '');
  const [newLeadsEmail, setNewLeadsEmail] = useState("");
  const [newConversationEmail, setNewConversationEmail] = useState("");

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleAddLeadEmail = () => {
    if (newLeadsEmail && !settings.leads_emails.includes(newLeadsEmail)) {
      saveSettings({
        leads_emails: [...settings.leads_emails, newLeadsEmail]
      });
      setNewLeadsEmail("");
    }
  };

  const handleRemoveLeadEmail = (email: string) => {
    saveSettings({
      leads_emails: settings.leads_emails.filter(e => e !== email)
    });
  };

  const handleAddConversationEmail = () => {
    if (newConversationEmail && !settings.conversations_emails.includes(newConversationEmail)) {
      saveSettings({
        conversations_emails: [...settings.conversations_emails, newConversationEmail]
      });
      setNewConversationEmail("");
    }
  };

  const handleRemoveConversationEmail = (email: string) => {
    saveSettings({
      conversations_emails: settings.conversations_emails.filter(e => e !== email)
    });
  };

  const updateField = (field: string, value: any) => {
    saveSettings({ [field]: value });
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
                checked={settings.daily_leads_enabled}
                onCheckedChange={(checked) => updateField('daily_leads_enabled', checked)}
              />
            </div>
            
            {settings.daily_leads_enabled && (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newLeadsEmail}
                    onChange={(e) => setNewLeadsEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="max-w-md"
                    type="email"
                  />
                  <Button onClick={handleAddLeadEmail}>
                    Add Email
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {settings.leads_emails.map((email) => (
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
                checked={settings.daily_conversations_enabled}
                onCheckedChange={(checked) => updateField('daily_conversations_enabled', checked)}
              />
            </div>
            
            {settings.daily_conversations_enabled && (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newConversationEmail}
                    onChange={(e) => setNewConversationEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="max-w-md"
                    type="email"
                  />
                  <Button onClick={handleAddConversationEmail}>
                    Add Email
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {settings.conversations_emails.map((email) => (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSettings;
