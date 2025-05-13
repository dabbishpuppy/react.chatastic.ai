
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

const LeadsSettings: React.FC = () => {
  const [title, setTitle] = useState("Fikk du ikke svar på det du lurer på? Ta kontakt med oss her.");
  const [collectName, setCollectName] = useState(true);
  const [namePlaceholder, setNamePlaceholder] = useState("Fullt navn");
  const [collectEmail, setCollectEmail] = useState(true);
  const [emailPlaceholder, setEmailPlaceholder] = useState("E-post");
  const [collectPhone, setCollectPhone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Leads settings saved",
        description: "Your agent's leads collection settings have been updated successfully."
      });
    }, 1000);
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

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              Title
            </label>
            <div className="flex items-center space-x-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="max-w-md flex-1"
              />
              <Button variant="outline">
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
                checked={collectName}
                onCheckedChange={setCollectName}
              />
            </div>
            
            {collectName && (
              <div className="pl-6">
                <Input
                  value={namePlaceholder}
                  onChange={(e) => setNamePlaceholder(e.target.value)}
                  placeholder="Name placeholder"
                  className="max-w-md"
                />
                <div className="mt-2 flex justify-end">
                  <Button variant="outline" size="sm">
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
                checked={collectEmail}
                onCheckedChange={setCollectEmail}
              />
            </div>
            
            {collectEmail && (
              <div className="pl-6">
                <Input
                  value={emailPlaceholder}
                  onChange={(e) => setEmailPlaceholder(e.target.value)}
                  placeholder="Email placeholder"
                  className="max-w-md"
                />
                <div className="mt-2 flex justify-end">
                  <Button variant="outline" size="sm">
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
              checked={collectPhone}
              onCheckedChange={setCollectPhone}
            />
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

export default LeadsSettings;
