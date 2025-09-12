import React from "react";
import { View, TouchableOpacity,ScrollView, Platform } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Calendar, Clock } from "lucide-react-native";
import { Icon } from "react-native-elements";
import { useTheme } from "~/src/components/ThemeProvider";

interface DateTimeSectionProps {
  startDate: Date;
  endDate: Date;
  onShowDatePicker: (isStart: boolean) => void;
  onShowTimePicker: (isStart: boolean) => void;
}

export default function DateTimeSection({
  startDate,
  endDate,
  onShowDatePicker,
  onShowTimePicker,
}: DateTimeSectionProps) {
  const { theme } = useTheme();
console.log("startDate>>",startDate)
  return (
   
    <View
      style={{
        backgroundColor: theme.dark
          ? "rgba(139, 92, 246, 0.1)"
          : "rgba(255, 255, 255, 0.8)",
        borderRadius: 32,
        padding: 42,
        borderWidth: 1,
        borderColor: theme.dark
          ? "rgba(139, 92, 246, 0.2)"
          : "rgba(139, 92, 246, 0.1)",
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: theme.dark ? 0.3 : 0.1,
        shadowRadius: 24,
        elevation: 12,
        marginBottom: 24,
      }}
    >
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 8,
          }}
        >
          Date & Time
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          When will your event happen?
        </Text>
      </View>

      <View style={{ gap: 24 }}>
        {/* Start Time */}
        <View
          style={{
            padding: 16,
            borderRadius: 16,
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 0.3)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                Start Time
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "CC",
                }}
              >
                When does your event begin?
              </Text>
            </View>
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(139, 92, 246, 0.1)",
              }}
            >
              {Platform.OS === "ios" ? (
                <Clock size={18} color="#8B5CF6" />
              ) : (
                <Icon
                  name="clock-outline"
                  type="material-community"
                  size={18}
                  color="#8B5CF6"
                />
              )}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => onShowDatePicker(true)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: theme.dark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.7)",
                borderColor: theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" ? (
                  <Calendar
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                ) : (
                  <Icon
                    name="calendar-outline"
                    type="material-community"
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text style={{ color: theme.colors.text }}>Date</Text>
              </View>
              <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                {startDate?.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onShowTimePicker(true)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: theme.dark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.7)",
                borderColor: theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" ? (
                  <Clock
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                ) : (
                  <Icon
                    name="clock-outline"
                    type="material-community"
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text style={{ color: theme.colors.text }}>Time</Text>
              </View>
              <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                {startDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* End Time */}
        <View
          style={{
            padding: 16,
            borderRadius: 16,
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 0.3)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                End Time
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "CC",
                }}
              >
                When does your event end?
              </Text>
            </View>
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(139, 92, 246, 0.1)",
              }}
            >
              {Platform.OS === "ios" ? (
                <Clock size={18} color="#8B5CF6" />
              ) : (
                <Icon
                  name="clock-outline"
                  type="material-community"
                  size={18}
                  color="#8B5CF6"
                />
              )}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => onShowDatePicker(false)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: theme.dark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.7)",
                borderColor: theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" ? (
                  <Calendar
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                ) : (
                  <Icon
                    name="calendar-outline"
                    type="material-community"
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text style={{ color: theme.colors.text }}>Date</Text>
              </View>
              <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                {endDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onShowTimePicker(false)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: theme.dark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.7)",
                borderColor: theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" ? (
                  <Clock
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                ) : (
                  <Icon
                    name="clock-outline"
                    type="material-community"
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text style={{ color: theme.colors.text }}>Time</Text>
              </View>
              <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                {endDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
    
  );
}
