
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useParams } from "react-router-dom";
import { useLeadSettings } from "@/hooks/useLeadSettings";

const LeadsSettings: React.FC = () => {
  const { agentId } = useParams();
  const { settings, isLoading, isSaving, saveSettings } = useLeadSettings(agentId || '');

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleSave = () => {
    saveSettings(settings);
  };

  const handleReset = (field: string, defaultValue: any) => {
    saveSettings({ [field]: defaultValue });
  };

  const updateField = (field: string, value: any) => {
    saveSettings({ [field]: value });
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
              checked={settings.enabled}
              onCheckedChange={(checked) => updateField('enabled', checked)}
            />
          </div>

          {settings.enabled && (
            <>
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium">
                  Title
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="title"
                    value={settings.title}
                    onChange={(e) => updateField('title', e.target.value)}
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
                    checked={settings.collect_name}
                    onCheckedChange={(checked) => updateField('collect_name', checked)}
                  />
                </div>
                
                {settings.collect_name && (
                  <div className="pl-6">
                    <Input
                      value={settings.name_placeholder}
                      onChange={(e) => updateField('name_placeholder', e.target.value)}
                      placeholder="Name placeholder"
                      className="max-w-md"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReset('name_placeholder', 'Full name')}
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
                    checked={settings.collect_email}
                    onCheckedChange={(checked) => updateField('collect_email', checked)}
                  />
                </div>
                
                {settings.collect_email && (
                  <div className="pl-6">
                    <Input
                      value={settings.email_placeholder}
                      onChange={(e) => updateField('email_placeholder', e.target.value)}
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
              
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="collectPhone" className="text-sm font-medium">
                    Phone
                  </label>
                </div>
                <Switch
                  id="collectPhone"
                  checked={settings.collect_phone}
                  onCheckedChange={(checked) => updateField('collect_phone', checked)}
                />
              </div>

              {settings.collect_phone && (
                <div className="pl-6">
                  <Input
                    value={settings.phone_placeholder}
                    onChange={(e) => updateField('phone_placeholder', e.target.value)}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsSettings;
