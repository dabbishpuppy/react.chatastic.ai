
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SecuritySettings: React.FC = () => {
  const { agentId } = useParams();
  const [visibility, setVisibility] = useState("public");
  const [domainRestriction, setDomainRestriction] = useState(false);
  const [rateLimitMessages, setRateLimitMessages] = useState("20");
  const [rateLimitTime, setRateLimitTime] = useState("240");
  const [rateLimitMessage, setRateLimitMessage] = useState("Too many messages in a row");
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch the current visibility setting when component mounts
  useEffect(() => {
    if (agentId) {
      fetchAgentVisibility();
    }
  }, [agentId]);
  
  const fetchAgentVisibility = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('visibility')
        .eq('id', agentId)
        .single();
        
      if (error) {
        console.error("Error fetching agent visibility:", error);
        return;
      }
      
      if (data) {
        setVisibility(data.visibility);
      }
    } catch (error) {
      console.error("Error in fetchAgentVisibility:", error);
    }
  };

  const handleSave = async () => {
    if (!agentId) return;
    
    setIsSaving(true);
    
    try {
      // Update agent visibility in database
      const { error } = await supabase
        .from('agents')
        .update({ visibility })
        .eq('id', agentId);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Security settings saved",
        description: "Your agent's security settings have been updated successfully."
      });
    } catch (error) {
      console.error("Error saving security settings:", error);
      toast({
        title: "Error saving settings",
        description: "There was an problem updating your security settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

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
            <div>
              <label htmlFor="rateLimit" className="block text-sm font-medium">
                Rate limiting
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="whitespace-nowrap text-sm">Limit to</label>
              <Input
                id="rateLimitMessages"
                value={rateLimitMessages}
                onChange={(e) => setRateLimitMessages(e.target.value)}
                className="w-20"
              />
              <label className="whitespace-nowrap text-sm">messages every</label>
              <Input
                id="rateLimitTime"
                value={rateLimitTime}
                onChange={(e) => setRateLimitTime(e.target.value)}
                className="w-20"
              />
              <label className="whitespace-nowrap text-sm">seconds.</label>
              <Button variant="outline" size="sm">
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
              />
            </div>
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
