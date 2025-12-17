import React, { PropsWithChildren } from "react";
import { Platform, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useTheme } from "~/src/components/ThemeProvider";

type Props = {
  onPress?: () => void;
  style?: ViewStyle;
  borderRadius?: number;
  disabled?: boolean;
  /** iOS baseline blur intensity (when not pressed). Defaults to 26 */
  baselineIntensity?: number;
  /** iOS press-state blur intensity. Defaults to 40 */
  pressIntensity?: number;
  /** Optional override for baseline translucent fill (Android + fallback layering) */
  backgroundColorOverride?: string;
};

export default function GlassPressable({
  onPress,
  style,
  borderRadius = 16,
  disabled,
  baselineIntensity = 26,
  pressIntensity = 40,
  backgroundColorOverride,
  children,
}: PropsWithChildren<Props>) {
  const { theme, isDarkMode } = useTheme();

  return (
    <Pressable disabled={disabled} onPress={onPress}>
      {({ pressed }) => (
        <MotiView
          animate={{
            scale: pressed ? 0.98 : 1,
            shadowOpacity: pressed ? 0.18 : 0.12,
          }}
          transition={{ type: "timing", duration: 120 }}
          style={[
            {
              borderRadius,
              overflow: "hidden",
              shadowColor: theme.colors.border,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 6,
              elevation: 2,
            },
            style,
          ]}
        >
          {/* Baseline glass layer always visible */}
          <View style={[StyleSheet.absoluteFillObject, { borderRadius }]}>
            {Platform.OS === "ios" ? (
              <BlurView
                style={StyleSheet.absoluteFillObject}
                intensity={baselineIntensity}
                tint={isDarkMode ? "dark" : "light"}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor:
                      backgroundColorOverride ||
                      (isDarkMode
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.28)"),
                  },
                ]}
              />
            )}
            {/* Soft static gradient for depth */}
            <LinearGradient
              colors={
                isDarkMode
                  ? ["rgba(255,255,255,0.04)", "transparent"]
                  : ["rgba(255,255,255,0.12)", "transparent"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Subtle border outline */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius,
                  borderWidth: 1,
                  borderColor: isDarkMode
                    ? theme.colors.border + "50"
                    : theme.colors.border + "70",
                },
              ]}
            />
          </View>

          {/* Content above baseline glass */}
          <View style={{ borderRadius, overflow: "hidden" }}>{children}</View>

          {/* Press enhancement overlay (adds pop & highlight) */}
          <MotiView
            pointerEvents="none"
            style={StyleSheet.absoluteFillObject}
            animate={{
              opacity: pressed ? 1 : 0,
            }}
            transition={{ type: "timing", duration: 110 }}
          >
            {/* Elevated blur & brighter highlight when pressed */}
            {Platform.OS === "ios" ? (
              <BlurView
                style={StyleSheet.absoluteFillObject}
                intensity={pressed ? pressIntensity : 0}
                tint={isDarkMode ? "dark" : "light"}
              />
            ) : null}
            <LinearGradient
              colors={
                pressed
                  ? ["rgba(255,255,255,0.28)", "rgba(255,255,255,0.05)"]
                  : ["transparent", "transparent"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius,
                  borderWidth: pressed ? 1 : 0,
                  borderColor: isDarkMode
                    ? theme.colors.border + "90"
                    : theme.colors.border + "A0",
                },
              ]}
            />
          </MotiView>
        </MotiView>
      )}
    </Pressable>
  );
}
