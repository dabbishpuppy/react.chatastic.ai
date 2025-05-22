
import React, { useState, useEffect } from "react";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { ChatInterfaceSettings, defaultChatSettings } from "@/types/chatInterface";
import { getChatSettings } from "@/services/chatSettingsService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatSettings } from "@/hooks/useChatSettings";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";

const ChatbotDemo: React.FC = () => {
  const { agentId } = useParams();
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [botName, setBotName] = useState(defaultChatSettings.display_name);
  const [productName, setProductName] = useState("Chatbase");
  const [showPopups, setShowPopups] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(defaultChatSettings.theme);
  const [bubblePosition, setBubblePosition] = useState<'left' | 'right'>(defaultChatSettings.bubble_position);
  const [showFeedback, setShowFeedback] = useState(defaultChatSettings.show_feedback);
  const [allowRegenerate, setAllowRegenerate] = useState(defaultChatSettings.allow_regenerate);
  const [initialMessage, setInitialMessage] = useState(defaultChatSettings.initial_message);
  const [suggestedMessages, setSuggestedMessages] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(defaultChatSettings.show_suggestions_after_chat);
  const [messagePlaceholder, setMessagePlaceholder] = useState(defaultChatSettings.message_placeholder);
  const [autoShowDelay, setAutoShowDelay] = useState(defaultChatSettings.auto_show_delay);
  const [footer, setFooter] = useState<string | null>(null);
  const [chatIcon, setChatIcon] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chatbot-demo");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Use the shared chat settings hook to ensure we have the latest settings
  const { settings: latestSettings } = useChatSettings();
  
  // Load settings from Supabase if agent ID is available
  useEffect(() => {
    const loadSettings = async () => {
      if (!agentId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      const settings = await getChatSettings(agentId);
      
      if (settings) {
        setTheme(settings.theme);
        setBotName(settings.display_name);
        setInitialMessage(settings.initial_message);
        setSuggestedMessages(settings.suggested_messages.map(msg => msg.text));
        setShowSuggestions(settings.show_suggestions_after_chat);
        setMessagePlaceholder(settings.message_placeholder);
        setShowFeedback(settings.show_feedback);
        setAllowRegenerate(settings.allow_regenerate);
        setBubblePosition(settings.bubble_position);
        setAutoShowDelay(settings.auto_show_delay);
        setFooter(settings.footer);
        setChatIcon(settings.chat_icon);
        setProfilePicture(settings.profile_picture);
      }
      
      setIsLoading(false);
    };
    
    loadSettings();
  }, [agentId]);

  // Update settings when latestSettings changes
  useEffect(() => {
    if (latestSettings && !isLoading) {
      setTheme(latestSettings.theme);
      setBotName(latestSettings.display_name);
      setInitialMessage(latestSettings.initial_message);
      setSuggestedMessages(latestSettings.suggested_messages.map(msg => msg.text));
      setShowSuggestions(latestSettings.show_suggestions_after_chat);
      setMessagePlaceholder(latestSettings.message_placeholder);
      setShowFeedback(latestSettings.show_feedback);
      setAllowRegenerate(latestSettings.allow_regenerate);
      setBubblePosition(latestSettings.bubble_position);
      setAutoShowDelay(latestSettings.auto_show_delay);
      setFooter(latestSettings.footer);
      setChatIcon(latestSettings.chat_icon);
      setProfilePicture(latestSettings.profile_picture);
    }
  }, [latestSettings]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // The main content of the page
  const pageContent = (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Chatbot Preview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="initialMessage">Initial Message</Label>
                <Textarea 
                  id="initialMessage" 
                  value={initialMessage} 
                  onChange={(e) => setInitialMessage(e.target.value)} 
                  rows={3}
                />
              </div>
            
              <div className="grid gap-2">
                <Label htmlFor="botName">Bot Name</Label>
                <Input 
                  id="botName" 
                  value={botName} 
                  onChange={(e) => setBotName(e.target.value)} 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input 
                  id="productName" 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)} 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="messagePlaceholder">Message Placeholder</Label>
                <Input 
                  id="messagePlaceholder" 
                  value={messagePlaceholder} 
                  onChange={(e) => setMessagePlaceholder(e.target.value)} 
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input 
                    id="primaryColor" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                  />
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="h-10 w-10 rounded border" 
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={theme} 
                  onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="bubblePosition">Chat Bubble Position</Label>
                <Select 
                  value={bubblePosition} 
                  onValueChange={(value) => setBubblePosition(value as 'left' | 'right')}
                >
                  <SelectTrigger id="bubblePosition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="autoShowDelay">Auto-show Messages Delay (seconds)</Label>
                <Input 
                  id="autoShowDelay" 
                  type="number" 
                  value={autoShowDelay}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setAutoShowDelay(value);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="popups">Initial Message Popups</Label>
                <Switch 
                  id="popups" 
                  checked={showPopups}
                  onCheckedChange={setShowPopups}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="feedback">Collect Feedback</Label>
                <Switch 
                  id="feedback" 
                  checked={showFeedback}
                  onCheckedChange={setShowFeedback}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="regenerate">Allow Regeneration</Label>
                <Switch 
                  id="regenerate" 
                  checked={allowRegenerate}
                  onCheckedChange={setAllowRegenerate}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="suggestions">Show Suggested Messages</Label>
                <Switch 
                  id="suggestions" 
                  checked={showSuggestions}
                  onCheckedChange={setShowSuggestions}
                />
              </div>
              
              <div className="pt-4 space-y-2">
                <Label>Suggested Messages</Label>
                <div className="grid gap-2">
                  {suggestedMessages.map((msg, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        value={msg} 
                        onChange={(e) => {
                          const newMessages = [...suggestedMessages];
                          newMessages[index] = e.target.value;
                          setSuggestedMessages(newMessages);
                        }}
                      />
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSuggestedMessages(suggestedMessages.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => setSuggestedMessages([...suggestedMessages, "New suggestion"])}
                  >
                    Add Suggestion
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="footer">Footer Text</Label>
                <Textarea 
                  id="footer" 
                  value={footer || ""} 
                  onChange={(e) => setFooter(e.target.value)} 
                  placeholder="Footer text (privacy policy, etc.)"
                />
              </div>
              
              {/* Display profile picture and chat icon previews */}
              <div className="grid gap-2 pt-4">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-gray-200">
                    {profilePicture ? (
                      <AvatarImage src={profilePicture} alt={botName} />
                    ) : (
                      <AvatarFallback className="bg-gray-200 text-gray-600">
                        {botName?.charAt(0) || "A"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-sm text-gray-500">
                    {profilePicture ? "Custom profile picture" : "Default avatar"}
                  </span>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Chat Icon</Label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-black shadow-lg flex items-center justify-center overflow-hidden">
                    {chatIcon ? (
                      <img 
                        src={chatIcon} 
                        alt="Chat Icon" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <span className="text-white text-xl">💬</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {chatIcon ? "Custom chat icon" : "Default chat icon"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* The chatbot widget */}
      <ChatbotWidget 
        productName={productName}
        botName={botName}
        primaryColor={primaryColor}
        showPopups={showPopups}
        theme={theme}
        bubblePosition={bubblePosition}
        autoShowDelay={autoShowDelay}
        showFeedback={showFeedback}
        allowRegenerate={allowRegenerate}
        initialMessage={initialMessage}
        suggestedMessages={suggestedMessages}
        showSuggestions={showSuggestions}
        messagePlaceholder={messagePlaceholder}
        footer={footer}
        chatIcon={chatIcon}
        profilePicture={profilePicture}
      />
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Mobile header with menu button */}
      {isMobile && (
        <div className="p-4 border-b border-gray-200 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={24} />
          </Button>
          <span className="font-medium">Chatbot Demo</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar component */}
        <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Main content with scroll */}
        <div className="flex-1 overflow-auto">
          {pageContent}
        </div>
      </div>
    </div>
  );
};

export default ChatbotDemo;
