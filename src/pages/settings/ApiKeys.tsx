
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

const ApiKeysSettings = () => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const apiKeys = [
    {
      id: "1",
      name: "Production Key",
      key: "sk_live_abcd1234567890abcd1234567890",
      created: "2024-01-15",
      lastUsed: "2024-03-01",
      status: "Active"
    },
    {
      id: "2",
      name: "Development Key",
      key: "sk_test_efgh1234567890efgh1234567890",
      created: "2024-02-01",
      lastUsed: "2024-02-28",
      status: "Active"
    }
  ];

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "API Key copied",
      description: "The API key has been copied to your clipboard"
    });
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + "••••••••••••••••••" + key.substring(key.length - 4);
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-gray-600 mt-1">Manage your API keys for integrations</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Create New Key
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Use these keys to authenticate your API requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{apiKey.name}</h3>
                    <Badge variant="default">{apiKey.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                      {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKeys[apiKey.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Created: {apiKey.created} • Last used: {apiKey.lastUsed}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
