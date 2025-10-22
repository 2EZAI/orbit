import React from "react";
import { View } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Check } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface Step {
  id: string;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

export default function StepIndicator({
  steps,
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  const { theme } = useTheme();

  // Calculate progress percentage
  const progress = (currentStep + 1) / steps.length;

  return (
    <View
      style={{
        marginBottom: 12,
        paddingHorizontal: 8,
      }}
    >
      {/* Premium Progress Container */}
      <View
        style={{
          backgroundColor: theme.dark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(255, 255, 255, 0.8)",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.dark
            ? "rgba(139, 92, 246, 0.1)"
            : "rgba(139, 92, 246, 0.1)",
          shadowColor: "#8B5CF6",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.dark ? 0.1 : 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Progress Bar */}
        <View
          style={{
            height: 6,
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(139, 92, 246, 0.1)",
            borderRadius: 3,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <MotiView
            from={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "timing", duration: 400 }}
            style={{
              height: "100%",
              borderRadius: 3,
            }}
          >
            <LinearGradient
              colors={["#8B5CF6", "#A855F7", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </MotiView>
        </View>

        {/* Premium Step Info */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#8B5CF6",
                marginRight: 8,
              }}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: theme.colors.text,
                letterSpacing: -0.2,
              }}
            >
              {steps[currentStep]?.title || "Step"}
            </Text>
          </View>
          
          <View
            style={{
              backgroundColor: theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.1)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.3)"
                : "rgba(139, 92, 246, 0.2)",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#8B5CF6",
              }}
            >
              {currentStep + 1}/{steps.length}
            </Text>
          </View>
        </View>

        {/* Step Description */}
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.text + "80",
            marginTop: 8,
            lineHeight: 16,
          }}
        >
          {steps[currentStep]?.description || "Complete this step to continue"}
        </Text>
      </View>
    </View>
  );
}
