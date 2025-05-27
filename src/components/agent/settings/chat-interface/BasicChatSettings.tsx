
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import EditableSuggestedMessage from '../EditableSuggestedMessage';
import { ChatInterfaceSettings, SuggestedMessage } from '@/types/chatInterface';

interface BasicChatSettingsProps {
  draftSettings: ChatInterfaceSettings;
  updateSetting: <K extends keyof ChatInterfaceSettings>(key: K, value: ChatInterfaceSettings[K]) => void;
  addSuggestedMessage: (text: string) => void;
  updateSuggestedMessage: (id: string, text: string) => void;
  deleteSuggestedMessage: (id: string) => void;
}

const BasicChatSettings: React.FC<BasicChatSettingsProps> = ({
  draftSettings,
  updateSetting,
  addSuggestedMessage,
  updateSuggestedMessage,
  deleteSuggestedMessage
}) => {
  const [newSuggestedMessage, setNewSuggestedMessage] = React.useState("");

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="initialMessage" className="block text-sm font-medium">
          Initial messages
        </label>
        <Textarea
          id="initialMessage"
          value={draftSettings.initial_message}
          onChange={(e) => updateSetting("initial_message", e.target.value)}
          className="h-24"
          preventFocusScroll={true}
        />
        <p className="text-xs text-gray-500">Enter each message in a new line.</p>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Suggested messages
        </label>
        
        <div className="space-y-2 border rounded-md p-4 bg-gray-50">
          {draftSettings.suggested_messages.map((msg) => (
            <EditableSuggestedMessage
              key={msg.id}
              id={msg.id}
              text={msg.text}
              onUpdate={updateSuggestedMessage}
              onDelete={deleteSuggestedMessage}
              maxLength={40}
              preventFocusScroll={true}
            />
          ))}
          
          <div className="flex gap-2 mt-2">
            <Input
              value={newSuggestedMessage}
              onChange={(e) => setNewSuggestedMessage(e.target.value)}
              maxLength={40}
              placeholder="Add a suggested message"
              className="flex-1"
              preventFocusScroll={true}
            />
            <Button 
              variant="outline" 
              onClick={() => {
                if (newSuggestedMessage.trim()) {
                  addSuggestedMessage(newSuggestedMessage.trim());
                  setNewSuggestedMessage("");
                }
              }}
              disabled={!newSuggestedMessage.trim()}
            >
              Add
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div>
            <label htmlFor="showSuggestions" className="text-sm font-medium">
              Keep showing the suggested messages after the user's first message
            </label>
          </div>
          <Switch
            id="showSuggestions"
            checked={draftSettings.show_suggestions_after_chat}
            onCheckedChange={(value) => updateSetting("show_suggestions_after_chat", value)}
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
          value={draftSettings.message_placeholder}
          onChange={(e) => updateSetting("message_placeholder", e.target.value)}
          className="max-w-md"
          preventFocusScroll={true}
        />
      </div>
    </>
  );
};

export default BasicChatSettings;
