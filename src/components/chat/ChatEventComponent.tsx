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
}
const ChatEventComponent = ({
  eventId,
  source,
  handleEventPress,
  message,
}: ChatEventComponentProps) => {
  const { theme } = useTheme();
  const { user } = useUserData();
  console.log(user?.id, message);
  const { getEventDetails } = useEventDetails();
  const [data, setData] = useState<UnifiedData>();

  useEffect(() => {
    const fetchData = async () => {
      const result = await getEventDetails(eventId, source);
      setData(result);
    };
    fetchData();
  }, [eventId, source]);
  return data ? (
    <View style={[styles.container,user?.id===message?.user?.id?{alignSelf:'flex-end'}:{}]}>
      <SocialEventCard
        data={data as any}
        onDataSelect={handleEventPress}
        onShowDetails={() => handleEventPress(data)}
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
