import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatSection from "@/components/agent/ChatSection";
import EditableSuggestedMessage from "./EditableSuggestedMessage";
import ImageUpload from "./ImageUpload";
import { useChatSettings } from "@/hooks/useChatSettings";
import ColorPicker from "./ColorPicker";
import ImageCropper from "./ImageCropper";
import { AlertTriangle } from "lucide-react";

const ChatInterfaceSettings: React.FC = () => {
  const {
    settings, // Published settings (for embedded widgets)
    draftSettings, // Draft settings (for form inputs and preview)
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
  
  const [newSuggestedMessage, setNewSuggestedMessage] = React.useState("");
  const [syncColorWithHeader, setSyncColorWithHeader] = React.useState(draftSettings.sync_colors || false);
  const [showCropDialog, setShowCropDialog] = React.useState<{
    visible: boolean;
    type: 'profile' | 'icon';
    imageUrl: string;
  }>({ visible: false, type: 'profile', imageUrl: '' });
  
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

  // Update to handle sync_colors property from draft settings
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

  // Should we show the chat icon in preview?
  const showChatIconInPreview = !draftSettings.chat_icon;

  // Determine the header color based on sync settings (using draft settings)
  const headerColor = syncColorWithHeader ? draftSettings.user_message_color : null;

  // Get the current theme for proper styling (using draft settings)
  const currentTheme = draftSettings.theme || 'light';

  return (
    <div className="flex flex-col md:flex-row border-t">
      {/* Left panel - Settings */}
      <div className="w-full md:w-3/5 overflow-y-auto pr-0 md:pr-0">
        <div className="space-y-6 p-6">
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    You have unsaved changes
                  </p>
                  <p className="text-sm text-yellow-700">
                    Your changes are visible in the preview but haven't been saved yet.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={discardChanges}
                  className="ml-2"
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Chat Interface</CardTitle>
              <CardDescription>Configure how your chat interface looks and behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="initialMessage" className="block text-sm font-medium">
                  Initial messages
                </label>
                <Textarea
                  id="initialMessage"
                  value={draftSettings.initial_message}
                  onChange={(e) => updateSetting("initial_message", e.target.value)}
                  className="h-24"
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
                    />
                  ))}
                  
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newSuggestedMessage}
                      onChange={(e) => setNewSuggestedMessage(e.target.value)}
                      maxLength={40}
                      placeholder="Add a suggested message"
                      className="flex-1"
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
                />
              </div>
              
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
                />
                <p className="text-xs text-gray-500">{(draftSettings.footer || "").length}/200 characters</p>
              </div>
              
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
                  color={draftSettings.user_message_color || "#3B82F6"}
                  onChange={(color) => updateSetting("user_message_color", color)}
                  onReset={() => updateSetting("user_message_color", "#3B82F6")}
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
                  color={draftSettings.bubble_color || "#3B82F6"}
                  onChange={handleBubbleColorChange}
                  onReset={() => updateSetting("bubble_color", "#3B82F6")}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="displayName" className="block text-sm font-medium">
                  Display name
                </label>
                <Input
                  id="displayName"
                  value={draftSettings.display_name}
                  onChange={(e) => updateSetting("display_name", e.target.value)}
                  className="max-w-md"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Profile picture
                </label>
                <ImageUpload
                  currentImage={draftSettings.profile_picture || undefined}
                  onUpload={(file) => handleFileSelect(file, "profile")}
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
                  onUpload={(file) => handleFileSelect(file, "icon")}
                  onRemove={() => updateSetting("chat_icon", null)}
                  shape="circle"
                  size="md"
                />
                <p className="text-xs text-gray-500">Supports JPG, PNG, and SVG files up to 1MB. Background will be automatically removed.</p>
              </div>
              
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
                  />
                  <span className="text-sm text-gray-500">seconds (negative to disable)</span>
                </div>
              </div>
              
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
      <div className="w-full md:w-2/5 border-l">
        <div className="p-6 sticky top-0">
          <div className={`w-full max-w-md mx-auto h-[700px] rounded-lg shadow overflow-hidden flex flex-col ${
            currentTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`text-center py-2 text-sm border-b ${
              currentTheme === 'dark' ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'
            }`}>
              Chat Preview {hasUnsavedChanges && <span className="text-yellow-600">(Draft)</span>}
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatSection 
                initialMessages={previewMessages}
                agentName={draftSettings.display_name}
                placeholder={draftSettings.message_placeholder}
                suggestedMessages={draftSettings.suggested_messages.map(msg => msg.text)}
                showSuggestions={draftSettings.show_suggestions_after_chat}
                showFeedback={draftSettings.show_feedback}
                allowRegenerate={draftSettings.allow_regenerate}
                theme={currentTheme}
                profilePicture={draftSettings.profile_picture || undefined}
                footer={draftSettings.footer || undefined}
                userMessageColor={draftSettings.user_message_color}
                headerColor={headerColor}
                hideUserAvatar={true}
              />
            </div>
          </div>
          
          {/* Only show the chat bubble button color preview when there's no chat icon */}
          {showChatIconInPreview && (
            <div className="mt-4 flex justify-end">
              <div 
                className="h-16 w-16 rounded-full shadow-lg flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: draftSettings.bubble_color || "#3B82F6" }}
              >
                <span className="text-white text-xl">💬</span>
              </div>
            </div>
          )}

          {/* Show the chat icon when available */}
          {draftSettings.chat_icon && (
            <div className="mt-4 flex justify-end">
              <div 
                className="h-20 w-20 rounded-full shadow-lg overflow-hidden"
                style={{ backgroundColor: draftSettings.bubble_color || "#3B82F6" }}
              >
                <img 
                  src={draftSettings.chat_icon} 
                  alt="Chat Icon"
                  className="h-full w-full object-cover" 
                />
              </div>
            </div>
          )}
        </div>
      </div>

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
