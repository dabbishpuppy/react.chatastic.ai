
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { getAgentSecuritySettings, updateAgentSecuritySettings } from "@/services/agentSecurityService";

const SecuritySettings: React.FC = () => {
  const { agentId } = useParams();
  const [visibility, setVisibility] = useState("public");
  const [domainRestriction, setDomainRestriction] = useState(false);
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false);
  const [rateLimitMessages, setRateLimitMessages] = useState("20");
  const [rateLimitTime, setRateLimitTime] = useState("240");
  const [rateLimitMessage, setRateLimitMessage] = useState("Too many messages in a row");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  
  // Fetch the current security settings when component mounts
  useEffect(() => {
    if (agentId) {
      fetchAgentSecuritySettings();
    }
  }, [agentId]);
  
  const fetchAgentSecuritySettings = async () => {
    setIsLoading(true);
    try {
      const data = await getAgentSecuritySettings(agentId!);
      
      if (data) {
        setVisibility(data.visibility);
        setRateLimitEnabled(data.rate_limit_enabled);
        setRateLimitMessages(data.rate_limit_messages.toString());
        setRateLimitTime(data.rate_limit_time_window.toString());
        setRateLimitMessage(data.rate_limit_message);
        setHasAccess(true);
      } else if (data === null) {
        // Agent not found
        console.log("No agent found with ID:", agentId);
        setHasAccess(false);
      } else if (data.visibility === 'private') {
        // Agent exists but is private, could be access issue
        setVisibility('private');
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error in fetchAgentSecuritySettings:", error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!agentId || !hasAccess) return;
    
    // Validate rate limit inputs
    const messagesNum = parseInt(rateLimitMessages);
    const timeNum = parseInt(rateLimitTime);
    
    if (rateLimitEnabled && (isNaN(messagesNum) || messagesNum < 1 || messagesNum > 1000)) {
      toast({
        title: "Invalid input",
        description: "Messages limit must be between 1 and 1000",
        variant: "destructive"
      });
      return;
    }
    
    if (rateLimitEnabled && (isNaN(timeNum) || timeNum < 10 || timeNum > 3600)) {
      toast({
        title: "Invalid input", 
        description: "Time window must be between 10 and 3600 seconds",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Update agent security settings in database
      await updateAgentSecuritySettings(agentId, {
        visibility,
        rate_limit_enabled: rateLimitEnabled,
        rate_limit_messages: messagesNum,
        rate_limit_time_window: timeNum,
        rate_limit_message: rateLimitMessage
      });
      
      // Force existing widgets to refresh immediately
      try {
        // Attempt to broadcast to any iframe parent that might be embedding this
        window.parent.postMessage({
          type: 'wonderwave-refresh-settings',
          agentId: agentId
        }, '*');
      } catch (e) {
        console.log("Could not send message to parent window:", e);
      }
      
      // Make direct requests to force cache invalidation with unique timestamps
      try {
        const timestamp = new Date().getTime();
        // Make multiple requests with different cache-busting params to ensure all CDN caches are invalidated
        await Promise.all([
          fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings?agentId=${agentId}&_t=${timestamp}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }),
          fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings?agentId=${agentId}&_nocache=${timestamp}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        ]);
      } catch (fetchError) {
        console.log("Cache invalidation request failed:", fetchError);
      }
      
      toast({
        title: "Security settings saved",
        description: `Your agent's security settings have been updated. Changes will take effect immediately on newly loaded pages. It may take a few minutes to propagate to all currently open pages.`
      });
    } catch (error) {
      console.error("Error saving security settings:", error);
      toast({
        title: "Error saving settings",
        description: "There was a problem updating your security settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setRateLimitMessages("20");
    setRateLimitTime("240");
    setRateLimitMessage("Too many messages in a row");
    setRateLimitEnabled(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Loading security settings...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>You don't have access to modify this agent's security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              This agent either doesn't exist or you don't have the necessary permissions to modify its settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Configure your agent's security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="visibility" className="block text-sm font-medium">
              Visibility
            </label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-500 mt-2">
              <p><strong>'private'</strong>: No one can access your agent except you (your account)</p>
              <p><strong>'public'</strong>: Other people can chat with your agent if you send them the link. You can also embed it on your website so your website visitors are able to use it.</p>
            </div>
          </div>
          
          {/* Additional security features - domain restrictions, rate limiting, etc. */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="domainRestriction" className="text-sm font-medium">
                Only allow the iframe and widget on specific domains
              </label>
            </div>
            <Switch
              id="domainRestriction"
              checked={domainRestriction}
              onCheckedChange={setDomainRestriction}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="rateLimit" className="text-sm font-medium">
                Rate limiting
              </label>
              <Switch
                id="rateLimit"
                checked={rateLimitEnabled}
                onCheckedChange={setRateLimitEnabled}
              />
            </div>
            
            {rateLimitEnabled && (
              <>
                <div className="flex items-center space-x-2">
                  <label className="whitespace-nowrap text-sm">Limit to</label>
                  <Input
                    id="rateLimitMessages"
                    value={rateLimitMessages}
                    onChange={(e) => setRateLimitMessages(e.target.value)}
                    className="w-20"
                    type="number"
                    min="1"
                    max="1000"
                  />
                  <label className="whitespace-nowrap text-sm">messages every</label>
                  <Input
                    id="rateLimitTime"
                    value={rateLimitTime}
                    onChange={(e) => setRateLimitTime(e.target.value)}
                    className="w-20"
                    type="number"
                    min="10"
                    max="3600"
                  />
                  <label className="whitespace-nowrap text-sm">seconds.</label>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
                
                <p className="text-sm text-gray-500">
                  Limit the number of messages sent from one device on the iframe and chat bubble (this limit will not be applied to you on chatbase.co, only on your website for your users to prevent abuse).
                </p>
                
                <div className="space-y-2">
                  <label htmlFor="rateLimitMessage" className="block text-sm font-medium">
                    Message to show when limit is hit
                  </label>
                  <Input
                    id="rateLimitMessage"
                    value={rateLimitMessage}
                    onChange={(e) => setRateLimitMessage(e.target.value)}
                    className="max-w-md"
                    placeholder="Too many messages in a row"
                  />
                </div>
              </>
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

export default SecuritySettings;
