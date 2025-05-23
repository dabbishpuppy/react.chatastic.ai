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

const ChatInterfaceSettings: React.FC = () => {
  const {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    handleSave,
    addSuggestedMessage,
    updateSuggestedMessage,
    deleteSuggestedMessage,
    uploadImage
  } = useChatSettings();
  
  const [newSuggestedMessage, setNewSuggestedMessage] = React.useState("");
  const [syncColorWithHeader, setSyncColorWithHeader] = React.useState(settings.sync_colors || false);
  const [showCropDialog, setShowCropDialog] = React.useState<{
    visible: boolean;
    type: 'profile' | 'icon';
    imageUrl: string;
  }>({ visible: false, type: 'profile', imageUrl: '' });
  
  // Initial preview messages based on settings
  const [previewMessages, setPreviewMessages] = React.useState([
    {
      isAgent: true,
      content: settings.initial_message,
      timestamp: new Date().toISOString()
    },
    {
      isAgent: false,
      content: "Hello, World!",
      timestamp: new Date(Date.now() + 1000).toISOString()
    }
  ]);

  // Update preview when settings change
  useEffect(() => {
    setPreviewMessages([
      {
        isAgent: true,
        content: settings.initial_message,
        timestamp: new Date().toISOString()
      },
      {
        isAgent: false,
        content: "Hello, World!",
        timestamp: new Date(Date.now() + 1000).toISOString()
      }
    ]);
  }, [settings.initial_message]);

  // Update to handle sync_colors property
  useEffect(() => {
    if (settings.sync_colors !== undefined) {
      setSyncColorWithHeader(settings.sync_colors);
    }
  }, [settings.sync_colors]);

  // Handle color sync with header only when explicitly requested
  useEffect(() => {
    if (syncColorWithHeader && settings.bubble_color) {
      updateSetting("user_message_color", settings.bubble_color);
    }
  }, [syncColorWithHeader, settings.bubble_color]);
  
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
    
    if (checked && settings.bubble_color) {
      updateSetting("user_message_color", settings.bubble_color);
    }
  };

  // Handle file selection for image upload with cropping
  const handleFileSelect = (file: File, type: 'profile' | 'icon') => {
    // Create a URL for the file
    const url = URL.createObjectURL(file);
    // Show crop dialog with the image URL
    setShowCropDialog({
      visible: true,
      type,
      imageUrl: url
    });
    
    // Return a Promise<string> to match the expected function signature
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
      
      // Close the crop dialog regardless of result
      setShowCropDialog({ visible: false, type: 'profile', imageUrl: '' });
      
      // Return the URL for TypeScript compliance
      return url || '';
    } catch (error) {
      console.error("Error uploading cropped image:", error);
      // Close the crop dialog
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
  const showChatIconInPreview = !settings.chat_icon;

  // Determine the header color based on sync settings
  const headerColor = syncColorWithHeader ? settings.user_message_color : null;

  return (
    <div className="flex flex-col md:flex-row border-t">
      {/* Left panel - Settings */}
      <div className="w-full md:w-3/5 overflow-y-auto pr-0 md:pr-0">
        <div className="space-y-6 p-6">
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
                  value={settings.initial_message}
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
                  {settings.suggested_messages.map((msg) => (
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
                    checked={settings.show_suggestions_after_chat}
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
                  value={settings.message_placeholder}
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
                  checked={settings.show_feedback}
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
                  checked={settings.allow_regenerate}
                  onCheckedChange={(value) => updateSetting("allow_regenerate", value)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="footer" className="block text-sm font-medium">
                  Footer
                </label>
                <Textarea
                  id="footer"
                  value={settings.footer || ""}
                  onChange={(e) => updateSetting("footer", e.target.value)}
                  placeholder="You can use this to add a disclaimer or a link to your privacy policy."
                  className="h-24"
                />
                <p className="text-xs text-gray-500">{(settings.footer || "").length}/200 characters</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="theme" className="block text-sm font-medium">
                  Theme
                </label>
                <Select 
                  value={settings.theme} 
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
                  color={settings.user_message_color || "#3B82F6"}
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
                  color={settings.bubble_color || "#3B82F6"}
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
                  value={settings.display_name}
                  onChange={(e) => updateSetting("display_name", e.target.value)}
                  className="max-w-md"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Profile picture
                </label>
                <ImageUpload
                  currentImage={settings.profile_picture || undefined}
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
                  currentImage={settings.chat_icon || undefined}
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
                  value={settings.bubble_position} 
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
                    value={settings.auto_show_delay.toString()}
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
              
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
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
          <div className="w-full max-w-md mx-auto h-[700px] bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="text-center py-2 text-sm text-gray-500 border-b">
              Chat Preview
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatSection 
                initialMessages={previewMessages}
                agentName={settings.display_name}
                placeholder={settings.message_placeholder}
                suggestedMessages={settings.suggested_messages.map(msg => msg.text)}
                showSuggestions={settings.show_suggestions_after_chat}
                showFeedback={settings.show_feedback}
                allowRegenerate={settings.allow_regenerate}
                theme={settings.theme}
                profilePicture={settings.profile_picture || undefined}
                footer={settings.footer || undefined}
                userMessageColor={settings.user_message_color}
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
                style={{ backgroundColor: settings.bubble_color || "#3B82F6" }}
              >
                <span className="text-white text-xl">💬</span>
              </div>
            </div>
          )}

          {/* Show the chat icon when available */}
          {settings.chat_icon && (
            <div className="mt-4 flex justify-end">
              <div className="h-20 w-20 rounded-full shadow-lg overflow-hidden">
                <img 
                  src={settings.chat_icon} 
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
