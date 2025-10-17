import React, { useState , useEffect } from "react";
import { View, ScrollView, Switch } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { useTheme } from "~/src/components/ThemeProvider";

interface CreateTicketSectionProps {
  isTicketEnabledProp: boolean;
  setIsTicketEnabledProp: (check: boolean) => void;
  isTotalTicketQuantity: boolean;
  setIsTotalTicketQuantity: (check: boolean) => void;
  totalTicketQuantity: string;
  setTotalTicketQuantity: (total: string) => void;
  perPerson: string;
  setPerPerson: (total: string) => void;
}

export default function CreateTicketSection({
  isTicketEnabledProp,
  setIsTicketEnabledProp,
  isTotalTicketQuantity,
  setIsTotalTicketQuantity,
  totalTicketQuantity,
  setTotalTicketQuantity,
  perPerson,
  setPerPerson,
}: CreateTicketSectionProps) {
  const { theme } = useTheme();
  const [isTicketEnabled, setIsTicketEnabled] = useState(isTicketEnabledProp || false);
  // const [isTotalTicketQuantity, setIsTotalTicketQuantity] = useState(false);
  // const [totalTicketQuantity, setTotalTicketQuantity] = useState(null);

useEffect(()=>{
  console.log("sdsdsd",totalTicketQuantity);
setIsTicketEnabled(isTicketEnabledProp)
},[isTicketEnabledProp]);

  const handleToggleMute = async () => {
    try {
      if (isTicketEnabled) {
        setIsTicketEnabled(false);
        setIsTicketEnabledProp(false);
      } else {
        setIsTicketEnabled(true);
        setIsTicketEnabledProp(true);
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      Alert.alert("Error", "Failed to update notification settings");
    }
  };

  const handleToggleTicketQuentity = async () => {
    try {
      if (isTotalTicketQuantity) {
        setIsTotalTicketQuantity(false);
      } else {
        setIsTotalTicketQuantity(true);
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      Alert.alert("Error", "Failed to update notification settings");
    }
  };

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
          Create Tickets
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Optional details about your event
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          Enable Tickets
        </Text>
        <Switch
          value={isTicketEnabled}
          onValueChange={handleToggleMute}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={"white"}
        />
      </View>

   { isTicketEnabled && <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
         Total Ticket Quantity
        </Text>

        <Switch
          value={isTotalTicketQuantity}
          onValueChange={handleToggleTicketQuentity}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={"white"}
        />
        {isTotalTicketQuantity && (
          <View
            style={{
              height: 56,
              backgroundColor: theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.7)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.15)",
              paddingHorizontal: 16,
               marginTop: 12,
            }}
          >
            <Input
              value={totalTicketQuantity}
              onChangeText={setTotalTicketQuantity}
              placeholder="Enter Quantity"
              placeholderTextColor={theme.colors.text + "66"}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                borderWidth: 0,
                height: 56,
                fontSize: 16,
                color: theme.colors.text,
              }}
            />
          </View>
        )}
      </View>
   }
    {isTicketEnabled &&  <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
         Limit per person
        </Text>

        
          <View
            style={{
              height: 56,
              backgroundColor: theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.7)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.15)",
              paddingHorizontal: 16,
            }}
          >
            <Input
              value={perPerson}
              onChangeText={setPerPerson}
              placeholder="Enter limit"
              placeholderTextColor={theme.colors.text + "66"}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                borderWidth: 0,
                height: 56,
                fontSize: 16,
                color: theme.colors.text,
              }}
            />
          </View>
        
      </View>
}
    </View>
  );
}
