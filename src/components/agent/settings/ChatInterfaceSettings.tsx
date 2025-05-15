import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import ChatSection from "@/components/agent/ChatSection";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const ChatInterfaceSettings: React.FC = () => {
  const [initialMessage, setInitialMessage] = useState("👋 Hej! Jag är AI assistenten til Agora. Hva kan jeg hjelpe deg med i dag?");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [collectFeedback, setCollectFeedback] = useState(true);
  const [regenerateMessages, setRegenerateMessages] = useState(true);
  const [displayName, setDisplayName] = useState("Agora AI");
  const [theme, setTheme] = useState("light");
  const [userBubbleAlign, setUserBubbleAlign] = useState("right");
  const [autoShowDelay, setAutoShowDelay] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  
  // Initial preview message based on settings
  const [previewMessages, setPreviewMessages] = useState([
    {
      isAgent: true,
      content: initialMessage,
      timestamp: new Date().toISOString()
    }
  ]);

  // Update preview when settings change
  React.useEffect(() => {
    setPreviewMessages([
      {
        isAgent: true,
        content: initialMessage,
        timestamp: new Date().toISOString()
      }
    ]);
  }, [initialMessage]);

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings saved",
        description: "Your chat interface settings have been updated successfully."
      });
    }, 1000);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-12rem)]">
      {/* Left panel - Settings */}
      <ResizablePanel defaultSize={60} minSize={40} className="overflow-y-auto">
        <div className="space-y-6 pr-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat Interface</CardTitle>
              <CardDescription>Configure how your chat interface looks and behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="initialMessage" className="block text-sm font-medium">
                  Initial messages
                </label>
                <Textarea
                  id="initialMessage"
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className="h-24"
                />
                <p className="text-xs text-gray-500">Enter each message in a new line.</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Suggested messages
                </label>
                
                <div className="pl-5 space-y-2">
                  <Button variant="outline" size="sm" className="text-sm h-8 px-3">
                    + Add suggested message
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <label htmlFor="showSuggestions" className="text-sm font-medium">
                      Keep showing the suggested messages after the user's first message
                    </label>
                  </div>
                  <Switch
                    id="showSuggestions"
                    checked={showSuggestions}
                    onCheckedChange={setShowSuggestions}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="placeholder" className="block text-sm font-medium">
                  Message placeholder
                </label>
                <Input
                  id="placeholder"
                  placeholder="Message..."
                  className="max-w-md"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="collectFeedback" className="text-sm font-medium">
                    Collect user feedback
                  </label>
                </div>
                <Switch
                  id="collectFeedback"
                  checked={collectFeedback}
                  onCheckedChange={setCollectFeedback}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="regenerateMessages" className="text-sm font-medium">
                    Regenerate messages
                  </label>
                </div>
                <Switch
                  id="regenerateMessages"
                  checked={regenerateMessages}
                  onCheckedChange={setRegenerateMessages}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="footer" className="block text-sm font-medium">
                  Footer
                </label>
                <Textarea
                  id="footer"
                  placeholder="You can use this to add a disclaimer or a link to your privacy policy."
                  className="h-24"
                />
                <p className="text-xs text-gray-500">0/200 characters</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="theme" className="block text-sm font-medium">
                  Theme
                </label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="displayName" className="block text-sm font-medium">
                  Display name
                </label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="max-w-md"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Profile picture
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 border rounded-full overflow-hidden bg-gray-100">
                    <AspectRatio ratio={1/1}>
                      <div className="flex items-center justify-center h-full">
                        <span className="text-2xl">👋</span>
                      </div>
                    </AspectRatio>
                  </div>
                  <Button variant="outline" size="sm">
                    Upload Image
                  </Button>
                  <Button variant="outline" size="sm" className="text-gray-500">
                    Remove
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Supports JPG, PNG, and SVG files up to 1MB.</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Chat icon
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 border rounded-full overflow-hidden bg-gray-100">
                    <AspectRatio ratio={1/1}></AspectRatio>
                  </div>
                  <Button variant="outline" size="sm">
                    Upload Image
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Supports JPG, PNG, and SVG files up to 1MB.</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="bubbleAlign" className="block text-sm font-medium">
                  Align chat bubble button
                </label>
                <Select value={userBubbleAlign} onValueChange={setUserBubbleAlign}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="autoShowDelay" className="block text-sm font-medium">
                  Auto show initial messages pop-ups after
                </label>
                <div className="flex items-center space-x-2 max-w-md">
                  <Input
                    id="autoShowDelay"
                    type="number"
                    value={autoShowDelay}
                    onChange={(e) => setAutoShowDelay(e.target.value)}
                  />
                  <span>seconds (negative to disable)</span>
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
      </ResizablePanel>
      
      {/* Resizable handle */}
      <ResizableHandle withHandle />
      
      {/* Right panel - Chat Preview */}
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="h-full bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md h-[700px] bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="text-center py-2 text-sm text-gray-500">
              Chat Preview
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatSection 
                initialMessages={previewMessages}
                agentName={displayName}
              />
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ChatInterfaceSettings;
