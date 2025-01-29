import { PropsWithChildren } from "react";
import { OverlayProvider, DeepPartial, Theme } from "stream-chat-expo";
import { useTheme } from "~/src/components/ThemeProvider";
import { darkTheme, lightTheme } from "~/src/lib/streamChatTheme";

export function ChatThemeProvider({ children }: PropsWithChildren) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return <OverlayProvider value={{ style: theme }}>{children}</OverlayProvider>;
}
