import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";

interface ActionButton {
  icon: React.ReactNode;
  onPress: () => void;
  backgroundColor?: string;
  badge?: React.ReactNode;
}

interface ScreenHeaderProps {
  title: string;
  actions?: ActionButton[];
}

export function ScreenHeader({ title, actions = [] }: ScreenHeaderProps) {
  const { theme, isDarkMode } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 10,
        backgroundColor: theme.colors.card,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Large Title - Left aligned like iOS Messages */}
        <Text
          style={{
            fontSize: 34,
            fontWeight: "bold",
            color: theme.colors.text,
            letterSpacing: -0.5,
            lineHeight: 40,
          }}
        >
          {title}
        </Text>

        {/* Action Buttons - Right side */}
        {actions.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    action.backgroundColor ||
                    (isDarkMode ? theme.colors.card : "#F2F2F7"),
                  position: "relative",
                }}
              >
                {action.icon}
                {action.badge}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
