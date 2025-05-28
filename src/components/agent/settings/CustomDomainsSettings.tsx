
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CustomDomainsSettings: React.FC = () => {
  const [domain, setDomain] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const { toast } = useToast();

  const handleAdd = () => {
    if (domain && !domains.includes(domain)) {
      setDomains([...domains, domain]);
      setDomain("");
      toast({
        title: "Domain added",
        description: `${domain} has been added to your custom domains.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom domains</CardTitle>
          <CardDescription>Use your own custom domains for the embed script, iframe, and agent link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-2">
            <Input
              placeholder="chat.mywebsite.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="max-w-md flex-1"
            />
            <Button onClick={handleAdd}>
              Add
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            *Note: If your domain is example.com, we recommend using chat.example.com as your custom subdomain. You can replace chat with anything you like, as long it's a valid subdomain.
          </p>
          
          {domains.length > 0 && (
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-medium">Your domains:</h3>
              {domains.map((d) => (
                <div key={d} className="flex items-center justify-between p-2 border rounded-md">
                  <span>{d}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500"
                    onClick={() => {
                      setDomains(domains.filter(domain => domain !== d));
                      toast({
                        title: "Domain removed",
                        description: `${d} has been removed from your custom domains.`,
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomDomainsSettings;
