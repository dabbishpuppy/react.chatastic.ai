
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

const ChatbotDemo: React.FC = () => {
  const { agentId } = useParams();
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [botName, setBotName] = useState("Chatbase AI Agent");
  const [productName, setProductName] = useState("Chatbase");
  const [showPopups, setShowPopups] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [bubblePosition, setBubblePosition] = useState<'left' | 'right'>('right');
  const [showFeedback, setShowFeedback] = useState(true);
  const [allowRegenerate, setAllowRegenerate] = useState(true);
  const [initialMessage, setInitialMessage] = useState("👋 Hi! I am an AI chatbot, ask me anything!");
  const [suggestedMessages, setSuggestedMessages] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messagePlaceholder, setMessagePlaceholder] = useState("Message...");
  const [autoShowDelay, setAutoShowDelay] = useState(1);
  const [footer, setFooter] = useState<string | null>(null);
  const [chatIcon, setChatIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
      }
      
      setIsLoading(false);
    };
    
    loadSettings();
  }, [agentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
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
      />
    </div>
  );
};

export default ChatbotDemo;
