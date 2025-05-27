
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useParams } from "react-router-dom";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { toast } from "@/hooks/use-toast";

const LeadsSettings: React.FC = () => {
  const { agentId } = useParams();
  const { settings, isLoading, isSaving, saveSettings } = useLeadSettings(agentId || '');
  
  // Local state for unsaved changes
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasUnsavedChanges(false);
    }
  }, [settings]);

  if (isLoading || !localSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const updateLocalField = (field: string, value: any) => {
    console.log('📝 Updating local field:', field, 'to:', value);
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    console.log('💾 Saving lead settings:', localSettings);
    const success = await saveSettings(localSettings);
    if (success) {
      setHasUnsavedChanges(false);
      console.log(`✅ Lead settings saved successfully`);
      
      // Enhanced broadcasting - send multiple message types to ensure compatibility
      const messages = [
        { type: 'lead-settings-updated', agentId },
        { type: 'wonderwave-refresh-settings', agentId }
      ];
      
      messages.forEach((message, index) => {
        setTimeout(() => {
          console.log('📢 Broadcasting settings update:', message);
          window.postMessage(message, '*');
          
          // Also broadcast to parent window if in iframe
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*');
          }
        }, index * 100); // Stagger messages slightly
      });
      
      // Additional broadcast after longer delay for external widgets
      setTimeout(() => {
        const finalMessage = { type: 'lead-settings-updated', agentId };
        console.log('📢 Final broadcast for external widgets:', finalMessage);
        window.postMessage(finalMessage, '*');
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(finalMessage, '*');
        }
      }, 2000);
    }
  };

  const handleReset = (field: string, defaultValue: any) => {
    updateLocalField(field, defaultValue);
  };

  const handleDiscard = () => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
    toast({
      title: "Changes discarded",
      description: "All unsaved changes have been discarded."
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>Configure how your agent collects customer information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-500">
            Note: Leads form only appears when chatting through the iframe or the chat bubble.
          </p>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="enabled" className="text-sm font-medium">
                Enable Lead Form
              </label>
              <p className="text-xs text-gray-500">Show lead form after AI's first response</p>
            </div>
            <Switch
              id="enabled"
              checked={localSettings.enabled}
              onCheckedChange={(checked) => updateLocalField('enabled', checked)}
            />
          </div>

          {localSettings.enabled && (
            <>
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium">
                  Title
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="title"
                    value={localSettings.title}
                    onChange={(e) => updateLocalField('title', e.target.value)}
                    className="max-w-md flex-1"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => handleReset('title', 'Get in touch with us')}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="collectName" className="text-sm font-medium">
                      Name
                    </label>
                  </div>
                  <Switch
                    id="collectName"
                    checked={localSettings.collect_name}
                    onCheckedChange={(checked) => updateLocalField('collect_name', checked)}
                  />
                </div>
                
                {localSettings.collect_name && (
                  <div className="pl-6">
                    <Input
                      value={localSettings.name_placeholder}
                      onChange={(e) => updateLocalField('name_placeholder', e.target.value)}
                      placeholder="Name placeholder"
                      className="max-w-md"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReset('name_placeholder', 'Name')}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="collectEmail" className="text-sm font-medium">
                      Email
                    </label>
                  </div>
                  <Switch
                    id="collectEmail"
                    checked={localSettings.collect_email}
                    onCheckedChange={(checked) => updateLocalField('collect_email', checked)}
                  />
                </div>
                
                {localSettings.collect_email && (
                  <div className="pl-6">
                    <Input
                      value={localSettings.email_placeholder}
                      onChange={(e) => updateLocalField('email_placeholder', e.target.value)}
                      placeholder="Email placeholder"
                      className="max-w-md"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReset('email_placeholder', 'Email')}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="collectPhone" className="text-sm font-medium">
                      Phone
                    </label>
                  </div>
                  <Switch
                    id="collectPhone"
                    checked={localSettings.collect_phone}
                    onCheckedChange={(checked) => updateLocalField('collect_phone', checked)}
                  />
                </div>

                {localSettings.collect_phone && (
                  <div className="pl-6">
                    <Input
                      value={localSettings.phone_placeholder}
                      onChange={(e) => updateLocalField('phone_placeholder', e.target.value)}
                      placeholder="Phone placeholder"
                      className="max-w-md"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReset('phone_placeholder', 'Phone')}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Save/Discard Actions */}
          {hasUnsavedChanges && (
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-yellow-800">You have unsaved changes</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={isSaving}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsSettings;
