import type { DeepPartial, Theme } from "stream-chat-expo";

// SIMPLE WORKING Stream Chat theme based on our theme colors
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
      // Core colors that actually work with Stream Chat
      accent_blue: themeColors.primary,
      accent_green: themeColors.primary,
      accent_red: themeColors.notification,
      black: themeColors.text,
      blue_alice: themeColors.background,
      border: themeColors.border,
      grey: themeColors.text + "80",
      grey_gainsboro: themeColors.border,
      grey_whisper: themeColors.border + "40",
      overlay: themeColors.text + "20",
      shadow_icon: themeColors.text + "40",
      targetedMessageBackground: themeColors.primary + "20",
      transparent: "transparent",
      white: themeColors.card,
      white_smoke: themeColors.background,
      white_snow: themeColors.background,
    },
    messageList: {
      container: {
        backgroundColor: themeColors.card,
      },
    },
    messageSimple: {
      content: {
        container: {
          backgroundColor: themeColors.card,
          minHeight: 0, // Remove default min height that causes blank space
        },
        textContainer: {
          borderRadius: 16,
          backgroundColor: themeColors.card,
        },
        wrapper: {
          minHeight: 0, // Remove default min height
        },
      },
    },
    messageInput: {
      container: {
        backgroundColor: themeColors.card,
        borderTopColor: themeColors.border,
      },
    },
    reply: {
      container: {
        backgroundColor: themeColors.card,
      },
      messageContainer: {
        backgroundColor: themeColors.card,
      },
    },
    poll: {
      createContent: {
        addComment: {
          title: {
            color: themeColors.text,
          },
          wrapper: {
            backgroundColor: themeColors.background,
            paddingHorizontal: 16,
          },
        },
        anonymousPoll: {
          title: {
            color: themeColors.text,
          },
          wrapper: {
            backgroundColor: themeColors.background,
            paddingHorizontal: 16,
          },
        },
        multipleAnswers: {
          wrapper: {
            backgroundColor: themeColors.background,
          },
          title: {
            color: themeColors.text,
          },
        },
        pollOptions: {
          addOption: {
            text: {
              marginTop: 16,
              color: themeColors.primary,
            },
          },
          container: {
            backgroundColor: themeColors.card,
          },
          optionStyle: {
            wrapper: {
              backgroundColor: themeColors.background,
            },
            input: {
              color: themeColors.background,
            },
          },
        },
        suggestOption: {
          wrapper: {
            backgroundColor: themeColors.background,
          },
          title: {
            color: themeColors.text,
          },
        },
        headerContainer: {
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
        },

        maxVotes: {
          input: {
            color: themeColors.text,
          },
          wrapper: {
            backgroundColor: themeColors.background,
            paddingHorizontal: 16,
          },
        },
        name: {
          input: {
            color: themeColors.text,
            backgroundColor: themeColors.background,
          },
          title: {
            color: themeColors.text,
          },
        },
      },
    },
  };
};
