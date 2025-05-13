
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "@/components/ui/use-toast";

const AvatarSettings: React.FC = () => {
  const [avatarType, setAvatarType] = useState("static");
  const [selectedAvatar, setSelectedAvatar] = useState("avatar1");
  const [isSaving, setIsSaving] = useState(false);

  const staticAvatars = [
    { id: "avatar1", name: "Business Person 1", src: "/placeholder.svg" },
    { id: "avatar2", name: "Business Person 2", src: "/placeholder.svg" },
    { id: "avatar3", name: "Customer Service 1", src: "/placeholder.svg" },
    { id: "avatar4", name: "Customer Service 2", src: "/placeholder.svg" },
  ];

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Avatar settings saved",
        description: "Your agent's avatar settings have been updated successfully."
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>Configure your agent's avatar settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Avatar Type
            </label>
            <RadioGroup 
              value={avatarType} 
              onValueChange={setAvatarType} 
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="static" id="static" />
                <label htmlFor="static" className="text-sm">Static Image</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ai-avatar" id="ai-avatar" disabled />
                <label htmlFor="ai-avatar" className="text-sm text-gray-500">AI Avatar (Coming Soon)</label>
              </div>
            </RadioGroup>
          </div>

          {avatarType === "static" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {staticAvatars.map((avatar) => (
                  <div 
                    key={avatar.id}
                    className={`cursor-pointer rounded-lg overflow-hidden border-2 ${
                      selectedAvatar === avatar.id ? "border-blue-500" : "border-transparent"
                    }`}
                    onClick={() => setSelectedAvatar(avatar.id)}
                  >
                    <div className="w-full">
                      <AspectRatio ratio={1 / 1}>
                        <img
                          src={avatar.src}
                          alt={avatar.name}
                          className="w-full h-full object-cover"
                        />
                      </AspectRatio>
                    </div>
                    <div className="p-2 bg-gray-50 text-xs text-center truncate">
                      {avatar.name}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  Upload Custom Avatar
                </Button>
              </div>
            </div>
          )}

          {avatarType === "ai-avatar" && (
            <div className="bg-gray-50 text-center rounded-lg p-6">
              <p className="text-gray-600">
                AI Avatar support is coming soon through HeyGen integration.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                You'll be able to create realistic AI avatars for your agent.
              </p>
            </div>
          )}

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

export default AvatarSettings;
