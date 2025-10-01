import React, { useEffect, useState } from "react";
import { View, Dimensions } from "react-native";
import { Text } from "../ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { Sparkles, Loader2 } from "lucide-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface HomeLoadingScreenProps {
  isVisible: boolean;
  loadingText?: string;
  subtitle?: string;
}

export function HomeLoadingScreen({
  isVisible,
  loadingText = "Discovering Amazing Events And Activities",
  subtitle = "Finding the best events, activities and experiences near you...",
}: HomeLoadingScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const [rotation, setRotation] = useState(0);

  // Simple rotation animation without Reanimated
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setRotation((prev) => (prev + 10) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Simple static dot component (no animation to avoid complexity)
  const StaticDot = () => (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
      }}
    />
  );

  if (!isVisible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: isDarkMode
          ? "rgba(0, 0, 0, 0.8)"
          : "rgba(255, 255, 255, 0.9)",
        zIndex: 1000,
      }}
      pointerEvents="auto"
    >
      {/* Subtle background pattern */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDarkMode
            ? "rgba(139, 92, 246, 0.03)"
            : "rgba(139, 92, 246, 0.02)",
        }}
      />

      {/* Main loading content */}
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          borderRadius: 24,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: isDarkMode
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.05)",
          shadowColor: "#8B5CF6",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDarkMode ? 0.3 : 0.15,
          shadowRadius: 24,
          elevation: 12,
          width: SCREEN_WIDTH - 64,
          minHeight: 280,
        }}
      >
        {/* Static sparkle icon */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: theme.colors.primary,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Sparkles size={28} color="white" />
          </View>
        </View>

        {/* Rotating loader */}
        <View
          style={{
            marginBottom: 20,
            transform: [{ rotate: `${rotation}deg` }],
          }}
        >
          <Loader2 size={24} color={theme.colors.primary} strokeWidth={2.5} />
        </View>

        {/* Loading text */}
        <Text
          style={[
            {
              fontSize: 18,
              fontWeight: "700",
              color: theme.colors.text,
              marginBottom: 8,
              textAlign: "center",
              width: "100%",
            },
          ]}
        >
          {loadingText}
        </Text>

        <Text
          style={[
            {
              fontSize: 14,
              color: theme.colors.text + "CC",
              textAlign: "center",
              lineHeight: 20,
              paddingHorizontal: 16,
              width: "100%",
            },
          ]}
        >
          {subtitle}
        </Text>

        {/* Loading dots */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 16,
            gap: 6,
          }}
        >
          {[0, 1, 2].map((index) => (
            <StaticDot key={index} />
          ))}
        </View>
      </View>
    </View>
  );
}
