
import React from 'react';
import { Input } from '@/components/ui/input';
import ImageUpload from '../ImageUpload';
import { ChatInterfaceSettings } from '@/types/chatInterface';

interface ProfileSettingsProps {
  draftSettings: ChatInterfaceSettings;
  updateSetting: <K extends keyof ChatInterfaceSettings>(key: K, value: ChatInterfaceSettings[K]) => void;
  onFileSelect: (file: File, type: 'profile' | 'icon') => Promise<string>;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  draftSettings,
  updateSetting,
  onFileSelect
}) => {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="displayName" className="block text-sm font-medium">
          Display name
        </label>
        <Input
          id="displayName"
          value={draftSettings.display_name}
          onChange={(e) => updateSetting("display_name", e.target.value)}
          className="max-w-md"
          preventFocusScroll={true}
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Profile picture
        </label>
        <ImageUpload
          currentImage={draftSettings.profile_picture || undefined}
          onUpload={(file) => onFileSelect(file, "profile")}
          onRemove={() => updateSetting("profile_picture", null)}
          shape="circle"
          size="md"
        />
        <p className="text-xs text-gray-500">Supports JPG, PNG, and SVG files up to 1MB. Background will be automatically removed.</p>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Chat icon
        </label>
        <ImageUpload
          currentImage={draftSettings.chat_icon || undefined}
          onUpload={(file) => onFileSelect(file, "icon")}
          onRemove={() => updateSetting("chat_icon", null)}
          shape="circle"
          size="md"
        />
        <p className="text-xs text-gray-500">Supports JPG, PNG, and SVG files up to 1MB. Background will be automatically removed.</p>
      </div>
    </>
  );
};

export default ProfileSettings;
