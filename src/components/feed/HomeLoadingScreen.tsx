import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import { Text } from "../ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { Sparkles, Loader2 } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

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

  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const sparkleScale = useSharedValue(0);
  const sparkleY = useSharedValue(20);

  // Start animations when visible
  useEffect(() => {
    if (isVisible) {
      // Fade in the overlay
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });

      // Scale in the content
      scale.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
      });

      // Continuous rotation for loader - Fix: Start from 0 and ensure smooth animation
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1500, // Slightly faster for better visual feedback
          easing: Easing.linear,
        }),
        -1,
        false
      );

      // Pulse animation for the container
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        true
      );

      // Animated sparkle icon effect
      sparkleScale.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
      });

      sparkleY.value = withSequence(
        withTiming(-15, { duration: 400 }),
        withTiming(0, { duration: 400, easing: Easing.bounce })
      );
    } else {
      // Properly cancel all animations when hiding
      cancelAnimation(rotation);
      cancelAnimation(pulseScale);

      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      pulseScale.value = withTiming(1, { duration: 200 });
      sparkleScale.value = withTiming(0.8, { duration: 200 });
      sparkleY.value = withTiming(20, { duration: 200 });
      rotation.value = 0;
    }

    // Cleanup function to stop all animations
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulseScale);
    };
  }, [isVisible]);

  // Animated styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { scale: pulseScale.value }],
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }, { translateY: sparkleY.value }],
  }));

  // Loading dots component
  const AnimatedDot = ({ index }: { index: number }) => {
    const dotScale = useSharedValue(1);
    const dotOpacity = useSharedValue(0.4);

    useEffect(() => {
      if (isVisible) {
        const delay = index * 200;
        dotScale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: delay }),
            withTiming(1.4, { duration: 400 }),
            withTiming(1, { duration: 400 })
          ),
          -1,
          true
        );

        dotOpacity.value = withRepeat(
          withSequence(
            withTiming(0.4, { duration: delay }),
            withTiming(1, { duration: 400 }),
            withTiming(0.4, { duration: 400 })
          ),
          -1,
          true
        );
      } else {
        cancelAnimation(dotScale);
        cancelAnimation(dotOpacity);
      }
    }, [isVisible, index]);

    const dotStyle = useAnimatedStyle(() => ({
      transform: [{ scale: dotScale.value }],
      opacity: dotOpacity.value,
    }));

    return (
      <Animated.View
        style={[
          {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.primary,
          },
          dotStyle,
        ]}
      />
    );
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        {
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
        },
        overlayStyle,
      ]}
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
      <Animated.View
        style={[
          {
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
            minWidth: 240,
            maxWidth: SCREEN_WIDTH - 64,
          },
          contentStyle,
        ]}
      >
        {/* Animated sparkle icon */}
        <Animated.View style={[{ marginBottom: 16 }, sparkleStyle]}>
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
        </Animated.View>

        {/* Rotating loader - Fixed animation */}
        <Animated.View style={[{ marginBottom: 20 }, loaderStyle]}>
          <Loader2 size={24} color={theme.colors.primary} strokeWidth={2.5} />
        </Animated.View>

        {/* Loading text */}
        <Text
          style={[
            {
              fontSize: 18,
              fontWeight: "700",
              color: theme.colors.text,
              marginBottom: 8,
              textAlign: "center",
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
            },
          ]}
        >
          {subtitle}
        </Text>

        {/* Loading dots animation */}
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
            <AnimatedDot key={index} index={index} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
