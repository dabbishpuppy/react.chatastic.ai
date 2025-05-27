
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChatInterfaceSettings } from '@/types/chatInterface';

interface ChatBehaviorSettingsProps {
  draftSettings: ChatInterfaceSettings;
  updateSetting: <K extends keyof ChatInterfaceSettings>(key: K, value: ChatInterfaceSettings[K]) => void;
}

const ChatBehaviorSettings: React.FC<ChatBehaviorSettingsProps> = ({
  draftSettings,
  updateSetting
}) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="collectFeedback" className="text-sm font-medium">
            Collect user feedback
          </label>
        </div>
        <Switch
          id="collectFeedback"
          checked={draftSettings.show_feedback}
          onCheckedChange={(value) => updateSetting("show_feedback", value)}
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
          checked={draftSettings.allow_regenerate}
          onCheckedChange={(value) => updateSetting("allow_regenerate", value)}
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="footer" className="block text-sm font-medium">
          Footer
        </label>
        <Textarea
          id="footer"
          value={draftSettings.footer || ""}
          onChange={(e) => updateSetting("footer", e.target.value)}
          placeholder="You can use this to add a disclaimer or a link to your privacy policy."
          className="h-24"
          preventFocusScroll={true}
        />
        <p className="text-xs text-gray-500">{(draftSettings.footer || "").length}/200 characters</p>
      </div>
    </>
  );
};

export default ChatBehaviorSettings;
