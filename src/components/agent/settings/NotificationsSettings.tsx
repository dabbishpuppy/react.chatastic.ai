
import React, { useState, useEffect } from "react";
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
  
  // Local state for form changes
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local settings when settings change
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleAddLeadEmail = () => {
    if (newLeadsEmail && localSettings && !localSettings.leads_emails.includes(newLeadsEmail)) {
      const updatedSettings = {
        ...localSettings,
        leads_emails: [...localSettings.leads_emails, newLeadsEmail]
      };
      setLocalSettings(updatedSettings);
      setNewLeadsEmail("");
      setHasChanges(true);
    }
  };

  const handleRemoveLeadEmail = (email: string) => {
    if (localSettings) {
      const updatedSettings = {
        ...localSettings,
        leads_emails: localSettings.leads_emails.filter(e => e !== email)
      };
      setLocalSettings(updatedSettings);
      setHasChanges(true);
    }
  };

  const handleAddConversationEmail = () => {
    if (newConversationEmail && localSettings && !localSettings.conversations_emails.includes(newConversationEmail)) {
      const updatedSettings = {
        ...localSettings,
        conversations_emails: [...localSettings.conversations_emails, newConversationEmail]
      };
      setLocalSettings(updatedSettings);
      setNewConversationEmail("");
      setHasChanges(true);
    }
  };

  const handleRemoveConversationEmail = (email: string) => {
    if (localSettings) {
      const updatedSettings = {
        ...localSettings,
        conversations_emails: localSettings.conversations_emails.filter(e => e !== email)
      };
      setLocalSettings(updatedSettings);
      setHasChanges(true);
    }
  };

  const updateField = (field: string, value: any) => {
    if (localSettings) {
      const updatedSettings = { ...localSettings, [field]: value };
      setLocalSettings(updatedSettings);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (localSettings && hasChanges) {
      const success = await saveSettings(localSettings);
      if (success) {
        setHasChanges(false);
      }
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
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
                checked={localSettings?.daily_leads_enabled || false}
                onCheckedChange={(checked) => updateField('daily_leads_enabled', checked)}
              />
            </div>
            
            {localSettings?.daily_leads_enabled && (
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
                  {localSettings.leads_emails.map((email) => (
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
                checked={localSettings?.daily_conversations_enabled || false}
                onCheckedChange={(checked) => updateField('daily_conversations_enabled', checked)}
              />
            </div>
            
            {localSettings?.daily_conversations_enabled && (
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
                  {localSettings?.conversations_emails.map((email) => (
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

          {/* Save/Reset buttons */}
          <div className="flex items-center gap-4 pt-6 border-t">
            {hasChanges && (
              <div className="text-sm text-orange-600 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                You have unsaved changes
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSettings;
