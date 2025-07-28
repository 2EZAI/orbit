import React from "react";
import { View, Image } from "react-native";
import { Text } from "./text";

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
  const getFallbackInitial = () => {
    return user.name?.[0]?.toUpperCase() || "?";
  };

  if (user.image) {
    return (
      <Image
        source={{ uri: user.image }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.4,
          fontWeight: "600",
          color: "#6B7280",
        }}
      >
        {getFallbackInitial()}
      </Text>
    </View>
  );
}
