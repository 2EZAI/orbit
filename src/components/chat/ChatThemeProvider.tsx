import { PropsWithChildren } from "react";
import { OverlayProvider, DeepPartial, Theme } from "stream-chat-expo";
import { useTheme } from "~/src/components/ThemeProvider";
import { createStreamChatTheme } from "~/src/lib/streamChatTheme";

export function ChatThemeProvider({ children }: PropsWithChildren) {
  const { theme, isDarkMode } = useTheme();
  const streamChatTheme = createStreamChatTheme(theme.colors);

  return (
    <OverlayProvider value={{ style: streamChatTheme }}>
      {children}
    </OverlayProvider>
  );
}
