import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import { supabase } from "~/src/lib/supabase";
import { X, Instagram, Twitter, Facebook, Linkedin, Camera, Link } from "lucide-react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

interface SocialMediaSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SocialPlatform {
  name: string;
  key: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  urlPrefix: string;
  colors: [string, string];
}

const socialPlatforms: SocialPlatform[] = [
  {
    name: "instagram",
    key: "instagram",
    label: "Instagram",
    icon: <Instagram size={20} color="white" />,
    placeholder: "username",
    urlPrefix: "https://instagram.com/",
    colors: ["#9333EA", "#EC4899"],
  },
  {
    name: "twitter",
    key: "twitter",
    label: "Twitter (X)",
    icon: <Twitter size={20} color="white" />,
    placeholder: "username",
    urlPrefix: "https://x.com/",
    colors: ["#1F2937", "#111827"],
  },
  {
    name: "facebook",
    key: "facebook",
    label: "Facebook",
    icon: <Facebook size={20} color="white" />,
    placeholder: "username",
    urlPrefix: "https://facebook.com/",
    colors: ["#2563EB", "#1D4ED8"],
  },
  {
    name: "linkedin",
    key: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin size={20} color="white" />,
    placeholder: "username",
    urlPrefix: "https://linkedin.com/in/",
    colors: ["#1D4ED8", "#1E40AF"],
  },
  {
    name: "tiktok",
    key: "tiktok",
    label: "TikTok",
    icon: <Camera size={20} color="white" />,
    placeholder: "username",
    urlPrefix: "https://tiktok.com/@",
    colors: ["#111827", "#000000"],
  },
];

export function SocialMediaSettings({ isOpen, onClose }: SocialMediaSettingsProps) {
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { user, updateUser } = useUser();
  
  const [socialData, setSocialData] = useState({
    instagram: "",
    twitter: "",
    facebook: "",
    linkedin: "",
    tiktok: "",
    customLink: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load user's current social media data
  useEffect(() => {
    if (user && isOpen) {
      setSocialData({
        instagram: user.instagram || "",
        twitter: user.twitter || "",
        facebook: user.facebook || "",
        linkedin: user.linkedin || "",
        tiktok: user.tiktok || "",
        customLink: user.customLink || "",
      });
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      // Trim values and convert empty strings to null
      const trimValue = (val: string) => {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      const updateData = {
        instagram: trimValue(socialData.instagram),
        twitter: trimValue(socialData.twitter),
        facebook: trimValue(socialData.facebook),
        linkedin: trimValue(socialData.linkedin),
        tiktok: trimValue(socialData.tiktok),
        customLink: trimValue(socialData.customLink),
      };

      // Update user profile
      await updateUser(updateData);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Toast.show({
        type: "success",
        text1: "Social Media Updated",
        text2: "Your social media links have been saved",
      });

      onClose();
    } catch (error) {
      console.error("Error updating social media:", error);
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: "Failed to update social media links",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setSocialData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const openSocialLink = (platform: SocialPlatform, username: string) => {
    if (username.trim()) {
      const url = `${platform.urlPrefix}${username}`;
      // You can use Linking.openURL(url) here if you want to open in browser
      console.log("Opening:", url);
    }
  };

  if (!isOpen) return null;

  return (
    <BlurView
      intensity={20}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 200 }}
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
        >
          <MotiView
            from={{ scale: 0.9, translateY: 20 }}
            animate={{ scale: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 24,
              padding: 24,
              maxHeight: "90%",
              borderWidth: 1,
              borderColor: theme.colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.primary + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Link size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: theme.colors.text,
                  }}
                >
                  Social Media
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.text + "80",
                    marginTop: 2,
                  }}
                >
                  Connect your social accounts
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Social Media Platforms */}
              {socialPlatforms.map((platform, index) => {
                const currentValue = socialData[platform.key as keyof typeof socialData];
                const hasValue = currentValue && currentValue.trim() !== "";

                return (
                  <MotiView
                    key={platform.key}
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ 
                      type: "timing", 
                      duration: 300, 
                      delay: index * 100 
                    }}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      backgroundColor: hasValue 
                        ? theme.colors.primary + "10" 
                        : theme.colors.background,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: hasValue 
                        ? theme.colors.primary + "30" 
                        : theme.colors.border,
                    }}
                  >
                    {/* Platform Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
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
                          marginRight: 12,
                        }}
                      >
                        {platform.icon}
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.text,
                          }}
                        >
                          {platform.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.text + "60",
                          }}
                        >
                          {hasValue ? `@${currentValue}` : "Not connected"}
                        </Text>
                      </View>
                      {hasValue && (
                        <TouchableOpacity
                          onPress={() => openSocialLink(platform, currentValue)}
                          style={{
                            padding: 8,
                            borderRadius: 12,
                            backgroundColor: theme.colors.background,
                          }}
                        >
                          <Link size={16} color={theme.colors.text + "60"} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Input Field */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: theme.colors.background,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingHorizontal: 12,
                        height: 44,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.colors.text + "60",
                          marginRight: 8,
                        }}
                      >
                        @
                      </Text>
                      <TextInput
                        value={currentValue}
                        onChangeText={(value) => handleInputChange(platform.key, value)}
                        placeholder={platform.placeholder}
                        placeholderTextColor={theme.colors.text + "40"}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: theme.colors.text,
                        }}
                      />
                    </View>
                  </MotiView>
                );
              })}

              {/* Custom Link */}
              <MotiView
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ 
                  type: "timing", 
                  duration: 300, 
                  delay: socialPlatforms.length * 100 
                }}
                style={{
                  marginBottom: 24,
                  padding: 16,
                  backgroundColor: theme.colors.primary + "10",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.primary + "30",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Link size={20} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.colors.text,
                      }}
                    >
                      Custom Link
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.colors.text + "60",
                      }}
                    >
                      Website, portfolio, or any link
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.colors.background,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    paddingHorizontal: 12,
                    height: 44,
                  }}
                >
                  <Link size={16} color={theme.colors.text + "60"} style={{ marginRight: 8 }} />
                  <TextInput
                    value={socialData.customLink}
                    onChangeText={(value) => handleInputChange("customLink", value)}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor={theme.colors.text + "40"}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: theme.colors.text,
                    }}
                  />
                </View>
              </MotiView>
            </ScrollView>

            {/* Save Button */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ 
                type: "timing", 
                duration: 300, 
                delay: (socialPlatforms.length + 1) * 100 
              }}
            >
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "white",
                    }}
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </MotiView>
          </MotiView>
        </MotiView>
      </SafeAreaView>
    </BlurView>
  );
}
