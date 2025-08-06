import React, { useEffect, useRef, useState } from "react";
import { View, Animated, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import { Text } from "../ui/text";

interface EventMarkerProps {
  imageUrl?: string;
  count?: number;
  isSelected?: boolean;
  markerType?: "user-event" | "ticketmaster" | "static-location" | "api-event";
  categoryName?: string;
  onPress?: () => void;
}

export function EventMarker({
  imageUrl,
  count = 1,
  isSelected = false,
  markerType = "api-event",
  categoryName,
  onPress,
}: EventMarkerProps) {
  const [imageError, setImageError] = useState(false);
  // Prevent memory leaks with mounting state
  const [isMounted, setIsMounted] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Reset image error when imageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  // Simple entrance animation with leak prevention
  useEffect(() => {
    if (!isMounted) return;

    scaleAnim.setValue(0);
    const animation = Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  // Handle selection with leak prevention
  useEffect(() => {
    if (!isMounted) return;

    const animation = Animated.timing(scaleAnim, {
      toValue: isSelected ? 1.15 : 1,
      duration: 200,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isSelected]);

  // Aggressive cleanup
  useEffect(() => {
    return () => {
      setIsMounted(false);
      scaleAnim.stopAnimation();
      scaleAnim.removeAllListeners();
    };
  }, []);

  // Get border color (NO animation)
  const getBorderColor = () => {
    if (isSelected) return "#8B5CF6";

    switch (markerType) {
      case "user-event":
        return "#22C55E";
      case "ticketmaster":
        return "#EF4444";
      case "static-location":
        const type = categoryName?.toLowerCase() || "";
        if (type.includes("beach")) return "#06B6D4";
        if (type.includes("park")) return "#16A34A";
        if (type.includes("club") || type.includes("bar")) return "#A855F7";
        if (type.includes("restaurant") || type.includes("food"))
          return "#F59E0B";
        if (type.includes("museum") || type.includes("art")) return "#3B82F6";
        if (type.includes("gym") || type.includes("fitness")) return "#DC2626";
        return "#6B7280";
      default:
        const category = categoryName?.toLowerCase() || "";
        if (category.includes("music") || category.includes("concert"))
          return "#EC4899";
        if (category.includes("food") || category.includes("dining"))
          return "#F59E0B";
        if (category.includes("sport")) return "#10B981";
        if (category.includes("business")) return "#6366F1";
        if (category.includes("art") || category.includes("culture"))
          return "#3B82F6";
        if (category.includes("party") || category.includes("nightlife"))
          return "#A855F7";
        return "#8B5CF6";
    }
  };

  // Simple pulse with leak prevention
  const handlePress = () => {
    if (!isMounted) return;

    const currentValue = isSelected ? 1.15 : 1;
    const pulseAnimation = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: currentValue * 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: currentValue,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    pulseAnimation.start((finished) => {
      // Ensure animation is properly cleaned up
      if (!finished && isMounted) {
        scaleAnim.stopAnimation();
      }
    });
    onPress?.();
  };

  const optimizedUrl = (() => {
    if (!imageUrl || imageUrl.trim() === "") return null;

    // For Supabase storage images
    if (imageUrl.includes("supabase.co")) {
      return `${imageUrl}?width=40&height=40&quality=60`;
    }

    // For Unsplash images
    if (imageUrl.includes("unsplash.com")) {
      return `${imageUrl}&w=40&h=40&q=60&fit=crop`;
    }

    // For other valid URLs
    return imageUrl;
  })();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <Animated.View
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: "white",
          borderWidth: 2,
          borderColor: getBorderColor(),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {optimizedUrl && !imageError ? (
          <FastImage
            source={{ uri: optimizedUrl }}
            style={{ width: "100%", height: "100%", borderRadius: 6 }}
            resizeMode={FastImage.resizeMode.cover}
            onError={() => setImageError(true)}
            onLoadStart={() => setImageError(false)}
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 6,
              backgroundColor: "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                backgroundColor: getBorderColor(),
              }}
            />
          </View>
        )}

        {count > 1 && (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: getBorderColor(),
              borderWidth: 2,
              borderColor: "white",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: "white",
              }}
            >
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}
