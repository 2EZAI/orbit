import React, { useState, useEffect } from "react";
import { View, Image, Text } from "react-native";

interface User {
  id: string;
  name: string;
  image: string | null;
}

interface UserAvatarProps {
  user: User;
  size?: number;
}

export function UserAvatar({ user, size = 40 }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Reset error state when image URL changes
  useEffect(() => {
    setImageError(false);
  }, [user.image]);

  const getFallbackInitial = () => {
    return user.name?.[0]?.toUpperCase() || "?";
  };

  const renderInitials = () => {
    const fontSize = Math.max(size * 0.35, 12); // Slightly smaller and ensure minimum size
    
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Text
          style={{
            fontSize: fontSize,
            fontWeight: "600",
            color: "#6B7280",
            includeFontPadding: false,
            textAlignVertical: "center",
            lineHeight: fontSize * 1.2,
            textAlign: "center",
          }}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.8}
        >
          {getFallbackInitial()}
        </Text>
      </View>
    );
  };

  // If no image or image failed to load, show initials
  if (!user.image || imageError) {
    return renderInitials();
  }

  // Try to show image, fallback to initials on error
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri: user.image }}
        style={{
          width: size,
          height: size,
        }}
        onError={() => {
          setImageError(true);
        }}
        onLoadStart={() => {
          setImageError(false);
        }}
      />
    </View>
  );
}
