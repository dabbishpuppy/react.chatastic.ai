
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const ShareTab: React.FC = () => {
  const { agentId } = useParams();
  const { settings } = useChatSettings();
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
            All your color settings and appearance customizations will be automatically applied.
          </p>
          
          <div className="flex items-center space-x-4 mb-4">
            {settings.profile_picture ? (
              <Avatar>
                <AvatarImage src={settings.profile_picture} alt="Agent" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: settings.user_message_color || "#3B82F6" }}
              >
                <span className="text-white text-sm font-medium">
                  {settings.display_name?.substring(0, 2).toUpperCase() || "AI"}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">{settings.display_name}</p>
              <p className="text-sm text-gray-500">
                {settings.sync_colors ? "Colors synced with user messages" : "Default header styling"}
              </p>
            </div>
          </div>
          
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
          
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
            <p><strong>Automatic updates:</strong> When you modify your chat interface settings, all shared links and embeds will automatically update without requiring any changes to the embed code.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareTab;
