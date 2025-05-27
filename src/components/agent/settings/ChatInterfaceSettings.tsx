
import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useChatSettings } from "@/hooks/useChatSettings";
import ImageCropper from "./ImageCropper";

// Import the new focused components
import UnsavedChangesIndicator from "./chat-interface/UnsavedChangesIndicator";
import BasicChatSettings from "./chat-interface/BasicChatSettings";
import ChatBehaviorSettings from "./chat-interface/ChatBehaviorSettings";
import ThemeAndColorSettings from "./chat-interface/ThemeAndColorSettings";
import ProfileSettings from "./chat-interface/ProfileSettings";
import BubbleSettings from "./chat-interface/BubbleSettings";
import ChatPreview from "./chat-interface/ChatPreview";
import ScrollPrevention from "./chat-interface/ScrollPrevention";

const ChatInterfaceSettings: React.FC = () => {
  const {
    settings,
    draftSettings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    updateSetting,
    handleSave,
    discardChanges,
    addSuggestedMessage,
    updateSuggestedMessage,
    deleteSuggestedMessage,
    uploadImage
  } = useChatSettings();
  
  const [showCropDialog, setShowCropDialog] = React.useState<{
    visible: boolean;
    type: 'profile' | 'icon';
    imageUrl: string;
  }>({ visible: false, type: 'profile', imageUrl: '' });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial preview messages based on draft settings
  const [previewMessages, setPreviewMessages] = React.useState([
    {
      isAgent: true,
      content: draftSettings.initial_message,
      timestamp: new Date().toISOString()
    },
    {
      isAgent: false,
      content: "Hello, World!",
      timestamp: new Date(Date.now() + 1000).toISOString()
    }
  ]);

  // Update preview when draft settings change
  useEffect(() => {
    setPreviewMessages([
      {
        isAgent: true,
        content: draftSettings.initial_message,
        timestamp: new Date().toISOString()
      },
      {
        isAgent: false,
        content: "Hello, World!",
        timestamp: new Date(Date.now() + 1000).toISOString()
      }
    ]);
  }, [draftSettings.initial_message]);

  // Handle file selection for image upload with cropping
  const handleFileSelect = (file: File, type: 'profile' | 'icon') => {
    const url = URL.createObjectURL(file);
    setShowCropDialog({
      visible: true,
      type,
      imageUrl: url
    });
    
    return Promise.resolve(url);
  };

  // Handle crop completion and upload
  const handleCropComplete = async (croppedImage: File) => {
    try {
      let url: string | null = null;
      
      if (showCropDialog.type === 'profile') {
        url = await uploadImage(croppedImage, 'profile');
      } else {
        url = await uploadImage(croppedImage, 'icon');
      }
      
      setShowCropDialog({ visible: false, type: 'profile', imageUrl: '' });
      return url || '';
    } catch (error) {
      console.error("Error uploading cropped image:", error);
      setShowCropDialog({ visible: false, type: 'profile', imageUrl: '' });
      return '';
    }
  };

  // Close crop dialog without saving
  const handleCropCancel = () => {
    setShowCropDialog({ visible: false, type: 'profile', imageUrl: '' });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row border-t no-scroll-page" ref={containerRef}>
      {/* Scroll Prevention Component */}
      <ScrollPrevention />
      
      {/* Left panel - Settings */}
      <div className="w-full md:w-3/5 overflow-y-auto pr-0 md:pr-0">
        <div className="space-y-6 p-6">
          {/* Unsaved changes indicator */}
          <UnsavedChangesIndicator 
            hasUnsavedChanges={hasUnsavedChanges}
            onDiscard={discardChanges}
          />

          <Card>
            <CardHeader>
              <CardTitle>Chat Interface</CardTitle>
              <CardDescription>Configure how your chat interface looks and behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BasicChatSettings
                draftSettings={draftSettings}
                updateSetting={updateSetting}
                addSuggestedMessage={addSuggestedMessage}
                updateSuggestedMessage={updateSuggestedMessage}
                deleteSuggestedMessage={deleteSuggestedMessage}
              />
              
              <ChatBehaviorSettings
                draftSettings={draftSettings}
                updateSetting={updateSetting}
              />
              
              <ThemeAndColorSettings
                draftSettings={draftSettings}
                updateSetting={updateSetting}
              />
              
              <ProfileSettings
                draftSettings={draftSettings}
                updateSetting={updateSetting}
                onFileSelect={handleFileSelect}
              />
              
              <BubbleSettings
                draftSettings={draftSettings}
                updateSetting={updateSetting}
              />
              
              <div className="flex justify-end space-x-2">
                {hasUnsavedChanges && (
                  <Button 
                    variant="outline" 
                    onClick={discardChanges}
                    disabled={isSaving}
                  >
                    Discard Changes
                  </Button>
                )}
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Right panel - Chat Preview */}
      <ChatPreview
        draftSettings={draftSettings}
        hasUnsavedChanges={hasUnsavedChanges}
        previewMessages={previewMessages}
      />

      {/* Image Crop Dialog */}
      <ImageCropper
        imageUrl={showCropDialog.imageUrl}
        title={`Add a ${showCropDialog.type === 'profile' ? 'Profile picture' : 'Chat icon'}`}
        onCrop={handleCropComplete}
        onCancel={handleCropCancel}
        isOpen={showCropDialog.visible}
      />
    </div>
  );
};

export default ChatInterfaceSettings;
