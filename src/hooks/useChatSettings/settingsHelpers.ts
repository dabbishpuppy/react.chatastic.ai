
import { ChatInterfaceSettings, defaultChatSettings } from '@/types/chatInterface';
import { createTypedSettings } from './types';

export const createSettingsFromEdgeData = (edgeData: any, agentId: string): ChatInterfaceSettings => {
  return createTypedSettings({
    display_name: edgeData.display_name || defaultChatSettings.display_name,
    initial_message: edgeData.initial_message || defaultChatSettings.initial_message,
    message_placeholder: edgeData.message_placeholder || defaultChatSettings.message_placeholder,
    theme: edgeData.theme,
    profile_picture: edgeData.profile_picture || null,
    chat_icon: edgeData.chat_icon || null,
    bubble_position: edgeData.bubble_position,
    footer: edgeData.footer || null,
    user_message_color: edgeData.user_message_color || null,
    bubble_color: edgeData.bubble_color || null,
    sync_colors: edgeData.sync_colors || false,
    primary_color: edgeData.primary_color || null,
    show_feedback: edgeData.show_feedback !== undefined ? edgeData.show_feedback : defaultChatSettings.show_feedback,
    allow_regenerate: edgeData.allow_regenerate !== undefined ? edgeData.allow_regenerate : defaultChatSettings.allow_regenerate,
    suggested_messages: edgeData.suggested_messages,
    show_suggestions_after_chat: edgeData.show_suggestions_after_chat !== undefined ? edgeData.show_suggestions_after_chat : defaultChatSettings.show_suggestions_after_chat,
    auto_show_delay: edgeData.auto_show_delay !== undefined ? edgeData.auto_show_delay : defaultChatSettings.auto_show_delay
  }, agentId);
};
