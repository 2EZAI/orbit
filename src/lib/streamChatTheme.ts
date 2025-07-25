import type { DeepPartial, Theme } from "stream-chat-expo";

// Function to create Stream Chat theme based on our theme colors
export const createStreamChatTheme = (themeColors: {
  background: string;
  card: string;
  text: string;
  border: string;
  primary: string;
  notification: string;
}): DeepPartial<Theme> => {
  return {
    colors: {
      // Message bubble colors - Stream Chat specific
      accent_blue: themeColors.primary, // Other user messages
      blue_alice: "#F2F2F7", // Own messages - soft gray
      white: themeColors.card,
      black: themeColors.text,
      grey: themeColors.text + "80",
      border: themeColors.border,
      // Background
      white_snow: themeColors.card,
      grey_gainsboro: themeColors.border,
    },
    messageList: {
      container: {
        backgroundColor: themeColors.card,
      },
    },
    messageSimple: {
      content: {
        textContainer: {
          backgroundColor: "transparent", // Let Stream Chat handle bubble colors
        },
        wrapper: {
          backgroundColor: themeColors.card,
        },
      },
    },
    messageInput: {
      container: {
        backgroundColor: themeColors.card,
        borderTopColor: themeColors.border,
        borderTopWidth: 1,
      },
      inputBox: {
        backgroundColor: themeColors.border,
        borderColor: themeColors.border,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
      },
    },
    channel: {
      selectChannel: {
        backgroundColor: themeColors.card,
      },
    },
    channelPreview: {
      container: {
        backgroundColor: themeColors.card,
      },
    },
  };
};

// Legacy exports for backward compatibility (deprecated)
// Convert CSS HSL to string format
const hslToString = (hsl: string) => `hsl(${hsl})`;

// Theme colors from our design system
const colors = {
  background: hslToString("253 44% 98%"),
  foreground: hslToString("253 58% 0%"),
  muted: hslToString("253 7% 87%"),
  mutedForeground: hslToString("253 13% 37%"),
  card: hslToString("253 44% 97%"),
  cardForeground: hslToString("0 0% 0%"),
  border: hslToString("220 13% 91%"),
  input: hslToString("220 13% 91%"),
  primary: hslToString("253 91% 58%"),
  primaryForeground: hslToString("253 91% 98%"),
  secondary: hslToString("253 5% 89%"),
  secondaryForeground: hslToString("253 5% 29%"),
  accent: hslToString("253 12% 82%"),
  accentForeground: hslToString("253 12% 22%"),
  destructive: hslToString("339.2 90.36% 51.18%"),
  destructiveForeground: hslToString("0 0% 100%"),
};

// Dark mode colors
const darkColors = {
  background: hslToString("253 43% 3%"),
  foreground: hslToString("253 31% 98%"),
  muted: hslToString("253 7% 13%"),
  mutedForeground: hslToString("253 13% 63%"),
  card: hslToString("253 43% 4%"),
  cardForeground: hslToString("253 31% 99%"),
  border: hslToString("215 27.9% 16.9%"),
  input: hslToString("215 27.9% 16.9%"),
  primary: hslToString("253 91% 58%"),
  primaryForeground: hslToString("253 91% 98%"),
  secondary: hslToString("253 7% 9%"),
  secondaryForeground: hslToString("253 7% 69%"),
  accent: hslToString("253 13% 14%"),
  accentForeground: hslToString("253 13% 74%"),
  destructive: hslToString("339.2 90.36% 51.18%"),
  destructiveForeground: hslToString("0 0% 100%"),
};

export const lightTheme: DeepPartial<Theme> = {
  colors: {
    ...colors,
    accent_blue: colors.primary,
    accent_green: colors.primary,
    accent_red: colors.destructive,
    bg_gradient_end: colors.background,
    bg_gradient_start: colors.background,
    black: colors.foreground,
    blue_alice: colors.secondary,
    border: colors.border,
    grey: colors.mutedForeground,
    grey_gainsboro: colors.muted,
    grey_whisper: colors.secondary,
    white: colors.background,
    white_snow: colors.card,
  },
  messageSimple: {
    content: {
      container: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      textContainer: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
    },
  },
  messageList: {
    container: {
      backgroundColor: colors.background,
    },
  },
  messageInput: {
    container: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    inputBox: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
  },
  channel: {
    selectChannel: {
      backgroundColor: colors.background,
    },
  },
  channelPreview: {
    container: {
      backgroundColor: colors.background,
    },
  },
};

export const darkTheme: DeepPartial<Theme> = {
  colors: {
    ...darkColors,
    accent_blue: darkColors.primary,
    accent_green: darkColors.primary,
    accent_red: darkColors.destructive,
    bg_gradient_end: darkColors.background,
    bg_gradient_start: darkColors.background,
    black: darkColors.foreground,
    blue_alice: darkColors.secondary,
    border: darkColors.border,
    grey: darkColors.mutedForeground,
    grey_gainsboro: darkColors.muted,
    grey_whisper: darkColors.secondary,
    white: darkColors.background,
    white_snow: darkColors.card,
  },
  messageSimple: {
    content: {
      container: {
        backgroundColor: darkColors.card,
        borderColor: darkColors.border,
      },
      textContainer: {
        backgroundColor: darkColors.card,
        borderColor: darkColors.border,
      },
    },
  },
  messageList: {
    container: {
      backgroundColor: darkColors.background,
    },
  },
  messageInput: {
    container: {
      backgroundColor: darkColors.background,
      borderColor: darkColors.border,
    },
    inputBox: {
      backgroundColor: darkColors.card,
      borderColor: darkColors.border,
    },
  },
  channel: {
    selectChannel: {
      backgroundColor: darkColors.background,
    },
  },
  channelPreview: {
    container: {
      backgroundColor: darkColors.background,
    },
  },
};
