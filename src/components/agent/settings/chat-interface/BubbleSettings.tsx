
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChatInterfaceSettings } from '@/types/chatInterface';

interface BubbleSettingsProps {
  draftSettings: ChatInterfaceSettings;
  updateSetting: <K extends keyof ChatInterfaceSettings>(key: K, value: ChatInterfaceSettings[K]) => void;
}

const BubbleSettings: React.FC<BubbleSettingsProps> = ({
  draftSettings,
  updateSetting
}) => {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="bubbleAlign" className="block text-sm font-medium">
          Align chat bubble button
        </label>
        <Select 
          value={draftSettings.bubble_position} 
          onValueChange={(value) => updateSetting("bubble_position", value as 'left' | 'right')}
        >
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
            value={draftSettings.auto_show_delay.toString()}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                updateSetting("auto_show_delay", value);
              }
            }}
            preventFocusScroll={true}
          />
          <span className="text-sm text-gray-500">seconds (negative to disable)</span>
        </div>
      </div>
    </>
  );
};

export default BubbleSettings;
