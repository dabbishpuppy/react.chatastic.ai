
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const VoiceSettings: React.FC = () => {
  const [voiceType, setVoiceType] = useState("eleven-labs");
  const [selectedVoice, setSelectedVoice] = useState("roger");
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  const voices = [
    { id: "roger", name: "Roger", gender: "Male" },
    { id: "aria", name: "Aria", gender: "Female" },
    { id: "sarah", name: "Sarah", gender: "Female" },
    { id: "charlie", name: "Charlie", gender: "Male" },
  ];

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Voice settings saved",
        description: "Your agent's voice settings have been updated successfully."
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voice</CardTitle>
          <CardDescription>Configure your agent's voice settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Voice Provider</label>
                <Popover>
                  <PopoverTrigger>
                    <Info className="h-4 w-4 text-gray-500" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <p className="text-sm text-gray-500">
                      Select the provider for your agent's voice. ElevenLabs provides high-quality, natural-sounding voices.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                Coming soon
              </div>
            </div>
            
            <Select defaultValue={voiceType} onValueChange={setVoiceType} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eleven-labs">ElevenLabs</SelectItem>
                <SelectItem value="aws-polly">Amazon Polly</SelectItem>
                <SelectItem value="google">Google Text-to-Speech</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Voice Selection</label>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`cursor-pointer border rounded-lg overflow-hidden ${
                    selectedVoice === voice.id ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <div className="p-4 flex flex-col items-center">
                    <Avatar className="h-16 w-16 mb-2">
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {voice.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="font-medium">{voice.name}</p>
                      <p className="text-xs text-gray-500">{voice.gender}</p>
                    </div>
                  </div>
                  <button 
                    className="w-full py-1.5 text-xs bg-gray-50 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast({
                        title: "Voice preview",
                        description: "Voice preview functionality coming soon."
                      });
                    }}
                  >
                    Preview
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Speech Rate</label>
                <Popover>
                  <PopoverTrigger>
                    <Info className="h-4 w-4 text-gray-500" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <p className="text-sm text-gray-500">
                      Adjust how fast or slow your agent speaks. 1.0 is the normal speed.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
              <span className="font-medium">{voiceSpeed}x</span>
            </div>
            
            <Slider
              value={[voiceSpeed]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={(value) => setVoiceSpeed(value[0])}
            />
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Slower</span>
              <span>Normal</span>
              <span>Faster</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md mt-6">
            <p className="text-sm text-blue-700">
              <strong>Coming Soon:</strong> Connect your ElevenLabs API key to enable voice capabilities for your agent. 
              This will allow your agent to speak with users using natural-sounding voices.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceSettings;
