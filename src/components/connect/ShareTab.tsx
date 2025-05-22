
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";

export const ShareTab: React.FC = () => {
  const { agentId } = useParams();
  const demoUrl = `https://query-spark-start.lovable.app/embed/${agentId || 'YOURUNIQUEID'}`;
  const [copyText, setCopyText] = useState("Copy");
  
  const handleCopy = () => {
    navigator.clipboard.writeText(demoUrl);
    setCopyText("Copied!");
    toast({
      title: "URL Copied",
      description: "Link copied to clipboard",
    });
    setTimeout(() => setCopyText("Copy"), 2000);
  };
  
  const handleVisit = () => {
    window.open(demoUrl, "_blank");
  };
  
  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Share</CardTitle>
          <CardDescription>Share your agent with others</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <h3 className="text-lg font-medium">Direct Link</h3>
          <p className="text-sm text-gray-500">
            Share this link to let others chat with your agent directly. 
            All your color settings will be automatically applied.
          </p>
          
          <div className="relative border rounded-md bg-gray-50 p-4">
            <Input 
              value={demoUrl}
              readOnly
              className="pr-24"
            />
            <div className="absolute inset-y-0 right-4 flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copyText}
              </Button>
              <Button variant="outline" size="sm" onClick={handleVisit}>
                Visit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareTab;
