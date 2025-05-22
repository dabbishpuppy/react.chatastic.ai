
import React, { useState } from "react";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ChatbotDemo: React.FC = () => {
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [botName, setBotName] = useState("Chatbase AI Agent");
  const [productName, setProductName] = useState("Chatbase");
  const [showPopups, setShowPopups] = useState(true);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Chatbot Demo</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Switch id="feedback" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="regenerate">Allow Regeneration</Label>
                <Switch id="regenerate" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>About the Chatbot Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This is a demonstration of the floating chatbot widget with initial message popups. You can customize
              the following attributes:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Product name</li>
              <li>Bot name</li>
              <li>Avatar images</li>
              <li>Primary color</li>
            </ul>
            <p className="mb-4">
              Features:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Initial message popups</strong> - Engaging speech-bubble style messages that appear when chat is closed</li>
              <li>Full-height chat interface</li>
              <li>Loading animation while waiting for responses</li>
              <li>Like/Dislike buttons for feedback</li>
              <li>Copy message functionality</li>
              <li>Regenerate response option</li>
              <li>Emoji picker</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      {/* The chatbot widget */}
      <ChatbotWidget 
        productName={productName}
        botName={botName}
        primaryColor={primaryColor}
      />
    </div>
  );
};

export default ChatbotDemo;
