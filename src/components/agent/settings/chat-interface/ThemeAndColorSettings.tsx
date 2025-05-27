
import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ColorPicker from '../ColorPicker';
import { ChatInterfaceSettings } from '@/types/chatInterface';

interface ThemeAndColorSettingsProps {
  draftSettings: ChatInterfaceSettings;
  updateSetting: <K extends keyof ChatInterfaceSettings>(key: K, value: ChatInterfaceSettings[K]) => void;
}

const ThemeAndColorSettings: React.FC<ThemeAndColorSettingsProps> = ({
  draftSettings,
  updateSetting
}) => {
  const [syncColorWithHeader, setSyncColorWithHeader] = useState(draftSettings.sync_colors || false);

  // Update sync state when draft settings change
  useEffect(() => {
    if (draftSettings.sync_colors !== undefined) {
      setSyncColorWithHeader(draftSettings.sync_colors);
    }
  }, [draftSettings.sync_colors]);

  // Handle color sync with header only when explicitly requested
  useEffect(() => {
    if (syncColorWithHeader && draftSettings.bubble_color) {
      updateSetting("user_message_color", draftSettings.bubble_color);
    }
  }, [syncColorWithHeader, draftSettings.bubble_color]);

  // Handle bubble color change
  const handleBubbleColorChange = (color: string) => {
    updateSetting("bubble_color", color);
    
    if (syncColorWithHeader) {
      updateSetting("user_message_color", color);
    }
  };
  
  // Handle syncing user message color with header
  const handleSyncChange = (checked: boolean) => {
    setSyncColorWithHeader(checked);
    updateSetting("sync_colors", checked);
    
    if (checked && draftSettings.bubble_color) {
      updateSetting("user_message_color", draftSettings.bubble_color);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="theme" className="block text-sm font-medium">
          Theme
        </label>
        <Select 
          value={draftSettings.theme} 
          onValueChange={(value) => updateSetting("theme", value as 'light' | 'dark' | 'system')}
        >
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
        <label className="block text-sm font-medium">
          User message color
        </label>
        <ColorPicker
          color={draftSettings.user_message_color || "#000000"}
          onChange={(color) => updateSetting("user_message_color", color)}
          onReset={() => updateSetting("user_message_color", "#000000")}
        />
        
        <div className="flex items-center mt-2">
          <Switch
            id="syncColors"
            checked={syncColorWithHeader}
            onCheckedChange={handleSyncChange}
            className="mr-2"
          />
          <label htmlFor="syncColors" className="text-sm font-medium">
            Sync user message color with agent header
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Chat bubble button color
        </label>
        <ColorPicker
          color={draftSettings.bubble_color || "#000000"}
          onChange={handleBubbleColorChange}
          onReset={() => updateSetting("bubble_color", "#000000")}
        />
      </div>
    </>
  );
};

export default ThemeAndColorSettings;
