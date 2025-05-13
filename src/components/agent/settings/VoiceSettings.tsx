
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";

const VoiceSettings: React.FC = () => {
  const [voiceProvider, setVoiceProvider] = useState("elevenlabs");
  const [selectedVoice, setSelectedVoice] = useState("Sarah");
  const [isSaving, setIsSaving] = useState(false);
  const [pitch, setPitch] = useState(50);
  const [speed, setSpeed] = useState(50);

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
          <div className="space-y-2">
            <label htmlFor="provider" className="block text-sm font-medium">
              Voice Provider
            </label>
            <RadioGroup 
              value={voiceProvider} 
              onValueChange={setVoiceProvider} 
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="elevenlabs" id="elevenlabs" />
                <label htmlFor="elevenlabs" className="text-sm">ElevenLabs</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="built-in" id="built-in" />
                <label htmlFor="built-in" className="text-sm">Built-in</label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label htmlFor="voice" className="block text-sm font-medium">
              Voice
            </label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sarah">Sarah (Female)</SelectItem>
                <SelectItem value="Roger">Roger (Male)</SelectItem>
                <SelectItem value="Laura">Laura (Female)</SelectItem>
                <SelectItem value="Charlie">Charlie (Male)</SelectItem>
                <SelectItem value="Aria">Aria (Female)</SelectItem>
              </SelectContent>
            </Select>
            
            {voiceProvider === "elevenlabs" && (
              <div className="mt-2 text-sm text-blue-600">
                <a href="#" className="underline">Connect your ElevenLabs API key</a> to access more voices
              </div>
            )}
          </div>

          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Pitch</label>
                <span className="text-sm text-gray-500">{pitch}%</span>
              </div>
              <Slider 
                value={[pitch]} 
                onValueChange={(values) => setPitch(values[0])} 
                min={0} 
                max={100}
                step={1}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Speed</label>
                <span className="text-sm text-gray-500">{speed}%</span>
              </div>
              <Slider 
                value={[speed]} 
                onValueChange={(values) => setSpeed(values[0])} 
                min={0} 
                max={100}
                step={1}
              />
            </div>
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
