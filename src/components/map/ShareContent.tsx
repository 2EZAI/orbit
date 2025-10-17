import { haptics } from "~/src/lib/haptics";
import { UnifiedData } from "./UnifiedDetailsSheet";
import { Share, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { useTheme } from "../ThemeProvider";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { 
  MessageCircle, 
  Plus, 
  Share2, 
  Sparkles,
  Users,
  Calendar,
  Zap
} from "lucide-react-native";
import React, { useState } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
interface IProps {
  onClose: () => void;
  data: UnifiedData | undefined;
  isEventType?: boolean;
  onChangeType: (type: "share" | "add-proposal") => void;
}
const ShareContent: React.FC<IProps> = ({
  onClose,
  data,
  isEventType,
  onChangeType,
}) => {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSharing, setIsSharing] = useState(false);

  const handleShareInChat = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement chat sharing
  };

  const handleCreateProposal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeType("add-proposal");
  };

  const onShare = async () => {
    const currentData = data;
    setIsSharing(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Check out ${currentData?.name} on Orbit!
                ${currentData?.description}
      
                https://orbit-redirects.vercel.app/?action=share&eventId=${
                  currentData?.id || ""
                }
                `,
        title: isEventType ? "Activity on Orbit" : "Location on Orbit",
      }).then((result) => {
        if (result.action === "sharedAction") {
          onClose();
        }
      });
    } catch (error) {
      // Silent error handling for better UX
    } finally {
      setIsSharing(false);
    }
  };

  const actionButtons = [
    {
      id: "chat",
      title: "Share in Chat",
      subtitle: "Send to friends",
      icon: MessageCircle,
      onPress: handleShareInChat,
      gradient: ["#3B82F6", "#1D4ED8"],
      delay: 100,
    },
    {
      id: "proposal",
      title: "Create Proposal",
      subtitle: "Plan together",
      icon: Plus,
      onPress: handleCreateProposal,
      gradient: ["#8B5CF6", "#A855F7"],
      delay: 200,
    },
    {
      id: "share",
      title: "Share",
      subtitle: "External apps",
      icon: Share2,
      onPress: onShare,
      gradient: ["#10B981", "#059669"],
      delay: 300,
      isLoading: isSharing,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Premium Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        style={styles.headerContainer}
      >
        <LinearGradient
          colors={isDarkMode ? ["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <MotiView
                from={{ scale: 0, rotate: "-180deg" }}
                animate={{ scale: 1, rotate: "0deg" }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
              >
                <LinearGradient
                  colors={["#8B5CF6", "#A855F7"]}
                  style={styles.headerIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Sparkles size={24} color="white" />
                </LinearGradient>
              </MotiView>
              
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Share {isEventType ? "Activity" : "Location"}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.text + "70" }]}>
                  Choose how to share
                </Text>
              </View>
            </View>
          </BlurView>
        </LinearGradient>
      </MotiView>

      {/* Action Buttons */}
      <View style={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}>
        {actionButtons.map((button, index) => (
          <MotiView
            key={button.id}
            from={{ 
              opacity: 0, 
              translateY: 50, 
              scale: 0.9 
            }}
            animate={{ 
              opacity: 1, 
              translateY: 0, 
              scale: 1 
            }}
            transition={{ 
              type: "timing", 
              duration: 400, 
              delay: button.delay 
            }}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              onPress={button.onPress}
              activeOpacity={0.8}
              style={styles.premiumButton}
              disabled={button.isLoading}
            >
              <MotiView
                animate={{
                  scale: button.isLoading ? 0.98 : 1,
                }}
                transition={{ type: "timing", duration: 150 }}
              >
                <LinearGradient
                  colors={button.gradient}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconContainer}>
                      <button.icon size={24} color="white" />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.buttonTitle}>{button.title}</Text>
                      <Text style={styles.buttonSubtitle}>{button.subtitle}</Text>
                    </View>
                    {button.isLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>...</Text>
                      </View>
                    ) : (
                      <Zap size={20} color="rgba(255,255,255,0.6)" />
                    )}
                  </View>
                </LinearGradient>
              </MotiView>
            </TouchableOpacity>
          </MotiView>
        ))}
      </View>
    </View>
  );
};
const styles = {
  headerContainer: {
    position: "relative" as const,
    zIndex: 1000,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerBlur: {
    borderRadius: 0,
  },
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  buttonContainer: {
    marginBottom: 8,
  },
  premiumButton: {
    borderRadius: 20,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  buttonContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  textContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "white",
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.8)",
  },
  loadingContainer: {
    width: 24,
    height: 24,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.8)",
  },
};

export default ShareContent;
