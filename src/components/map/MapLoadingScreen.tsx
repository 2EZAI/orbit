import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import { Text } from "../ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { MapPin, Loader2 } from "lucide-react-native";
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

interface MapLoadingScreenProps {
  isVisible: boolean;
  loadingText?: string;
  subtitle?: string;
}

export function MapLoadingScreen({
  isVisible,
  loadingText = "Discovering Events",
  subtitle = "Finding amazing events and locations near you...",
}: MapLoadingScreenProps) {
  const { theme, isDarkMode } = useTheme();

  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const mapPinScale = useSharedValue(0);
  const mapPinY = useSharedValue(20);

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
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );

      // Animated map pin drop effect
      mapPinScale.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
      });

      mapPinY.value = withSequence(
        withTiming(-10, { duration: 300 }),
        withTiming(0, { duration: 300, easing: Easing.bounce })
      );
    } else {
      // Properly cancel all animations when hiding
      cancelAnimation(rotation);
      cancelAnimation(pulseScale);

      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      pulseScale.value = withTiming(1, { duration: 200 });
      mapPinScale.value = withTiming(0.8, { duration: 200 });
      mapPinY.value = withTiming(20, { duration: 200 });
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
    transform: [{ scale: scale.value }, { scale: pulseScale.value }],
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const mapPinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mapPinScale.value }, { translateY: mapPinY.value }],
  }));

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
          zIndex: 1000,
          backgroundColor: isDarkMode
            ? "rgba(0, 0, 0, 0.85)"
            : "rgba(255, 255, 255, 0.9)",
          justifyContent: "center",
          alignItems: "center",
        },
        overlayStyle,
      ]}
      pointerEvents="auto" // Block all touch events
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
            minWidth: 200,
          },
          contentStyle,
        ]}
      >
        {/* Animated map pin */}
        <Animated.View style={[{ marginBottom: 16 }, mapPinStyle]}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#8B5CF6",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <MapPin size={28} color="white" />
          </View>
        </Animated.View>

        {/* Rotating loader */}
        <Animated.View style={[{ marginBottom: 20 }, loaderStyle]}>
          <Loader2 size={24} color="#8B5CF6" strokeWidth={2.5} />
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
            <AnimatedDot
              key={index}
              index={index}
              theme={theme}
              isVisible={isVisible}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// Simplified animated dot component with proper cleanup
function AnimatedDot({
  index,
  theme,
  isVisible,
}: {
  index: number;
  theme: any;
  isVisible: boolean;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isVisible) {
      const animateDot = () => {
        scale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 400 }),
            withTiming(0.8, { duration: 400 })
          ),
          -1,
          true
        );

        opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.5, { duration: 400 })
          ),
          -1,
          true
        );
      };

      // Stagger the animation start for each dot
      timeout = setTimeout(animateDot, index * 200);
    } else {
      // Stop animations when not visible
      scale.value = withTiming(0.8, { duration: 100 });
      opacity.value = withTiming(0.5, { duration: 100 });
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      // Immediately stop all animations
      scale.value = withTiming(scale.value, { duration: 0 });
      opacity.value = withTiming(opacity.value, { duration: 0 });
    };
  }, [index, isVisible]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#8B5CF6",
        },
        dotStyle,
      ]}
    />
  );
}
