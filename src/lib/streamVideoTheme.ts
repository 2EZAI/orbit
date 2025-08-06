// Define our own theme interface based on Stream Video's theming system
interface StreamVideoTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    sheetPrimary: string;
    sheetSecondary: string;
    sheetTertiary: string;
    buttonPrimary: string;
    buttonSecondary: string;
    buttonDisabled: string;
    iconPrimary: string;
    iconSecondary: string;
    iconSuccess: string;
    iconWarning: string;
    iconError: string;
    overlay: string;
    backdrop: string;
    border: string;
    separator: string;
  };
  typefaces: {
    title: any;
    heading: any;
    body: any;
    bodyBold: any;
    caption: any;
    captionBold: any;
    footnote: any;
  };
  variants: {
    buttonSizes: any;
    iconSizes: any;
    avatarSizes: any;
  };
  defaults: {
    callContent: any;
    participantView: any;
    callControls: any;
    floatingParticipantView: any;
    incomingCall: any;
    outgoingCall: any;
    lobby: any;
    callTopView: any;
  };
}

// Function to create Stream Video theme based on our theme colors
export const createStreamVideoTheme = (themeColors: {
  background: string;
  card: string;
  text: string;
  border: string;
  primary: string;
  notification: string;
}): StreamVideoTheme => {
  return {
    colors: {
      // Core colors
      primary: themeColors.primary,
      secondary: themeColors.border,
      success: "#22C55E",
      warning: "#F59E0B",
      error: themeColors.notification,

      // Text colors
      textPrimary: themeColors.text,
      textSecondary: themeColors.text + "80",
      textDisabled: themeColors.text + "40",

      // Background colors
      sheetPrimary: themeColors.card,
      sheetSecondary: themeColors.background,
      sheetTertiary: themeColors.border,

      // Component specific colors
      buttonPrimary: themeColors.primary,
      buttonSecondary: themeColors.border,
      buttonDisabled: themeColors.border + "60",

      // Icon colors
      iconPrimary: themeColors.text,
      iconSecondary: themeColors.text + "60",
      iconSuccess: "#22C55E",
      iconWarning: "#F59E0B",
      iconError: themeColors.notification,

      // Overlay and backdrop
      overlay: "#00000080",
      backdrop: "#00000040",

      // Border and separator colors
      border: themeColors.border,
      separator: themeColors.border,
    },

    // Typography
    typefaces: {
      title: {
        fontFamily: "Inter",
        fontWeight: "700",
        fontSize: 24,
        lineHeight: 32,
        color: themeColors.text,
      },
      heading: {
        fontFamily: "Inter",
        fontWeight: "600",
        fontSize: 18,
        lineHeight: 24,
        color: themeColors.text,
      },
      body: {
        fontFamily: "Inter",
        fontWeight: "400",
        fontSize: 16,
        lineHeight: 24,
        color: themeColors.text,
      },
      bodyBold: {
        fontFamily: "Inter",
        fontWeight: "600",
        fontSize: 16,
        lineHeight: 24,
        color: themeColors.text,
      },
      caption: {
        fontFamily: "Inter",
        fontWeight: "400",
        fontSize: 14,
        lineHeight: 20,
        color: themeColors.text + "80",
      },
      captionBold: {
        fontFamily: "Inter",
        fontWeight: "600",
        fontSize: 14,
        lineHeight: 20,
        color: themeColors.text + "80",
      },
      footnote: {
        fontFamily: "Inter",
        fontWeight: "400",
        fontSize: 12,
        lineHeight: 16,
        color: themeColors.text + "60",
      },
    },

    // Component variants
    variants: {
      // Button variants
      buttonSizes: {
        sm: {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 8,
        },
        md: {
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 10,
        },
        lg: {
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 12,
        },
        xl: {
          paddingVertical: 20,
          paddingHorizontal: 32,
          borderRadius: 16,
        },
      },

      // Icon sizes
      iconSizes: {
        xs: 12,
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
        "2xl": 40,
      },

      // Avatar sizes
      avatarSizes: {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
        "2xl": 80,
      },
    },

    // Component defaults
    defaults: {
      // Call content container
      callContent: {
        backgroundColor: themeColors.background,
      },

      // Participant view
      participantView: {
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
        borderWidth: 1,
        borderRadius: 12,
        overflow: "hidden",
      },

      // Call controls
      callControls: {
        backgroundColor: themeColors.card,
        borderTopColor: themeColors.border,
        borderTopWidth: 1,
        paddingVertical: 16,
        paddingHorizontal: 20,
      },

      // Floating participant view
      floatingParticipantView: {
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
        borderWidth: 2,
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      },

      // Incoming call
      incomingCall: {
        backgroundColor: themeColors.background,
      },

      // Outgoing call
      outgoingCall: {
        backgroundColor: themeColors.background,
      },

      // Lobby
      lobby: {
        backgroundColor: themeColors.background,
      },

      // Call top view
      callTopView: {
        backgroundColor: "transparent",
        paddingHorizontal: 16,
        paddingTop: 12,
      },
    },
  };
};

// Convert CSS HSL to string format for compatibility
const hslToString = (hsl: string) => `hsl(${hsl})`;

// Light theme colors from design system
const lightColors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#000000",
  border: "#E5E5E5",
  primary: "#8B5CF6",
  notification: "#FF3B30",
};

// Dark theme colors from design system
const darkColors = {
  background: "#222831",
  card: "#2A2A2A",
  text: "#FFFFFF",
  border: "#3A3A3A",
  primary: "#8B5CF6",
  notification: "#FF453A",
};

// Pre-built themes for easy usage
export const lightVideoTheme: StreamVideoTheme =
  createStreamVideoTheme(lightColors);
export const darkVideoTheme: StreamVideoTheme =
  createStreamVideoTheme(darkColors);

// Export theme creator function for dynamic theming
export { createStreamVideoTheme as default };
