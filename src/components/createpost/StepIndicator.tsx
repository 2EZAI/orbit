import React from "react";
import { View } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Check } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

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

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        paddingHorizontal: 8,
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = index === currentStep;

        return (
          <View
            key={step.id}
            style={{
              alignItems: "center",
              flex: 1,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: isCompleted
                  ? "#8B5CF6"
                  : isCurrent
                  ? "rgba(139, 92, 246, 0.2)"
                  : theme.dark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.3)",
                borderWidth: 2,
                borderColor: isCompleted
                  ? "#8B5CF6"
                  : isCurrent
                  ? "#8B5CF6"
                  : theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              {isCompleted ? (
                <Check size={16} color="white" />
              ) : (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isCurrent ? "#8B5CF6" : theme.colors.text + "66",
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
