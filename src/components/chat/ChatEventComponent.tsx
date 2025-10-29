import { useEffect, useState } from "react";
import { useEventDetails } from "~/hooks/useEventDetails";
import { UnifiedData } from "../map/UnifiedDetailsSheet";
import { SocialEventCard } from "../social/SocialEventCard";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { useUserData } from "~/hooks/useUserData";

interface ChatEventComponentProps {
  eventId: string;
  source: string;
  message: any;
  handleEventPress: (event: UnifiedData) => void;
  // Optional: Pass data directly for locations (from attachment)
  directData?: UnifiedData;
}
const ChatEventComponent = ({
  eventId,
  source,
  handleEventPress,
  message,
  directData,
}: ChatEventComponentProps) => {
  const { theme } = useTheme();
  const { user } = useUserData();

  const { getEventDetails } = useEventDetails();
  const [data, setData] = useState<UnifiedData>();
  console.log(
    "ChatEventComponent message in ChatEventComponent>",
    eventId,
    source,
    "directData:",
    directData
  );

  useEffect(() => {
    // If we have direct data (from attachment), use it instead of fetching

    // Only fetch if we don't have direct data
    console.log("ChatEventComponent: No direct data, fetching from API");
    const fetchData = async () => {
      if (source === "ticketmaster") {
        const result = await getEventDetails(eventId, source);
        setData(result);
      } else {
        setData(directData);
      }
    };
    fetchData();
  }, [eventId, source, user, directData]);
  return data ? (
    <View
      style={[
        styles.container,
        user?.id === message?.user?.id ? { alignSelf: "flex-end" } : {},
      ]}
    >
      <SocialEventCard
        data={data as any}
        onDataSelect={handleEventPress}
        onShowDetails={() => handleEventPress(data)}
        treatAsEvent={source !== "location"}
        isLocation={source === "location"}
      />
    </View>
  ) : (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
};
export default ChatEventComponent;
const styles = StyleSheet.create({
  loading: {
    paddingVertical: 20,
  },
  container: {
    width: "70%",
  },
});
