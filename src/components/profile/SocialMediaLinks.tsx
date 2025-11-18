import { LinearGradient } from "expo-linear-gradient";
import { Camera, Facebook, Instagram, Link, Linkedin, Twitter } from "lucide-react-native";
import React from "react";
import { Linking, TouchableOpacity, View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

interface SocialMediaLinksProps {
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  customLink?: string | null;
}

interface SocialPlatform {
  name: string;
  icon: React.ReactNode;
  urlPrefix: string;
  colors: [string, string];
  username: string | null | undefined;
}

export function SocialMediaLinks({
  instagram,
  twitter,
  facebook,
  linkedin,
  tiktok,
  customLink,
}: SocialMediaLinksProps) {
  const { theme } = useTheme();

  const socialPlatforms: SocialPlatform[] = [
    {
      name: "Instagram",
      icon: <Instagram size={18} color="white" />,
      urlPrefix: "https://instagram.com/",
      colors: ["#9333EA", "#EC4899"],
      username: instagram,
    },
    {
      name: "Twitter",
      icon: <Twitter size={18} color="white" />,
      urlPrefix: "https://x.com/",
      colors: ["#1F2937", "#111827"],
      username: twitter,
    },
    {
      name: "Facebook",
      icon: <Facebook size={18} color="white" />,
      urlPrefix: "https://facebook.com/",
      colors: ["#2563EB", "#1D4ED8"],
      username: facebook,
    },
    {
      name: "LinkedIn",
      icon: <Linkedin size={18} color="white" />,
      urlPrefix: "https://linkedin.com/in/",
      colors: ["#1D4ED8", "#1E40AF"],
      username: linkedin,
    },
    {
      name: "TikTok",
      icon: <Camera size={18} color="white" />,
      urlPrefix: "https://tiktok.com/@",
      colors: ["#111827", "#000000"],
      username: tiktok,
    },
  ];

  // Filter to only show social platforms with usernames
  const activeSocialPlatforms = socialPlatforms.filter(
    (platform) => platform.username && platform.username.trim() !== ""
  );

  // Handle custom link separately
  const hasCustomLink = customLink && customLink.trim() !== "";
  let customLinkUrl = "";
  let customLinkDisplay = "";

  if (hasCustomLink) {
    customLinkUrl = customLink;
    if (
      !customLinkUrl.startsWith("http://") &&
      !customLinkUrl.startsWith("https://")
    ) {
      customLinkUrl = `https://${customLinkUrl}`;
    }
    // Remove protocol for cleaner display
    customLinkDisplay = customLink
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "");
  }

  // Don't render anything if no social media links
  if (activeSocialPlatforms.length === 0 && !hasCustomLink) {
    return null;
  }

  const handleSocialPress = async (platform: SocialPlatform) => {
    if (platform.username?.trim()) {
      const url = `${platform.urlPrefix}${platform.username}`;
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error("Error opening social link:", error);
      }
    }
  };

  const handleCustomLinkPress = async () => {
    if (customLinkUrl) {
      try {
        await Linking.openURL(customLinkUrl);
      } catch (error) {
        console.error("Error opening custom link:", error);
      }
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {/* Social Media Icons */}
      {activeSocialPlatforms.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {activeSocialPlatforms.map((platform) => {
            const title = `${platform.name}: @${platform.username}`;

            return (
              <TouchableOpacity
                key={platform.name}
                onPress={() => handleSocialPress(platform)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <LinearGradient
                  colors={platform.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {platform.icon}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Custom Link as Text Link */}
      {hasCustomLink && (
        <TouchableOpacity
          onPress={handleCustomLinkPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
          }}
        >
          <Link size={14} color={theme.colors.primary} />
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.primary,
              fontWeight: "500",
            }}
            numberOfLines={1}
          >
            {customLinkDisplay}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
