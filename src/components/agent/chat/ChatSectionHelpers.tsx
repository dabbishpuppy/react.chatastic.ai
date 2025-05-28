
import { getThemeClasses, getContrastColor } from "./ThemeConfig";

export const getChatSectionHelpers = (
  theme: 'light' | 'dark' | 'system',
  suggestedMessages: string[],
  userHasMessaged: boolean,
  showSuggestions: boolean,
  userMessageColor: string | null,
  isTyping: boolean,
  rateLimitError: string | null,
  isSubmitting: boolean
) => {
  // Apply theme based on settings
  const themeClasses = getThemeClasses(theme);

  // Should we show suggested messages?
  const shouldShowSuggestions = suggestedMessages.length > 0 && (!userHasMessaged || showSuggestions);

  // User message style with custom color
  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Check if input should be disabled - only for rate limit and typing, not conversation ended
  const isInputDisabled = isTyping || !!rateLimitError || isSubmitting;

  // Convert 'system' theme to 'light' or 'dark' for components that don't support 'system'
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? 'light' : theme;

  return {
    themeClasses,
    shouldShowSuggestions,
    userMessageStyle,
    isInputDisabled,
    resolvedTheme
  };
};
