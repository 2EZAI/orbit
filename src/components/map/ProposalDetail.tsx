import { ArrowLeft, Calendar, Share2 } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { IProposal } from "~/hooks/useProposals";
import { useTheme } from "../ThemeProvider";
import { useEffect, useState } from "react";
import { UnifiedData } from "./UnifiedDetailsSheet";
import { useEventDetails } from "~/hooks/useEventDetails";
import { SocialEventCard } from "../social/SocialEventCard";

interface IProps {
  proposal: IProposal;
  onClose: () => void;
  onProposalShare: (proposal: IProposal) => void;
}
const ProposalDetail: React.FC<IProps> = ({
  proposal,
  onClose,
  onProposalShare,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { getMultipleEventDetails } = useEventDetails();
  const [events, setEvents] = useState<{ data: UnifiedData }[]>([]);
  const getProposalTime = () => {
    const startDate = new Date(proposal.start_datetime);
    const endDate = proposal.end_datetime
      ? new Date(proposal.end_datetime)
      : null;
    const isSameDay =
      endDate && startDate.toDateString() === endDate.toDateString();
    const startDateStr = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const startTimeStr = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (!endDate) {
      return `${startDateStr} at ${startTimeStr}`;
    }
    if (isSameDay) {
      const endTimeStr = endDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${startDateStr} from ${startTimeStr} to ${endTimeStr}`;
    } else {
      const endDateStr = endDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const endTimeStr = endDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${startDateStr} at ${startTimeStr} to ${endDateStr} at ${endTimeStr}`;
    }
  };
  const getEvents = async () => {
    if (proposal && proposal.events_attached.length > 0) {
      const items = proposal.events_attached.map((event) => ({
        id: event.id,
        source: event.type === "event" ? "database" : event.type,
      }));
      console.log("Fetching proposal event details for items:", items);
      const result = await getMultipleEventDetails(items);
      console.log("Fetched proposal event details:", result);
      if (result) {
        console.log(JSON.stringify(result.items, null, 2));
        setEvents(result.items);
      }
    }
  };
  useEffect(() => {
    getEvents();
  }, [proposal]);

  return (
    <View style={styles.container}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => onClose()} className="mr-3">
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.colors.text,
            }}
          >
            Details
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.icon, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            onProposalShare(proposal);
          }}
        >
          <Share2 size={20} color={theme.colors.background} />
        </TouchableOpacity>
      </View>
      <View className="pt-6">
        <Text
          className="mb-6 text-3xl font-bold"
          style={{ color: theme.colors.text }}
        >
          {proposal.title}
        </Text>
        <View
          className="flex-row items-center p-3 mb-3 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(139, 92, 246, 0.1)"
              : "rgb(245, 243, 255)",
          }}
        >
          <View className="justify-center items-center mr-3 w-10 h-10 bg-purple-500 rounded-full">
            <Calendar size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-medium tracking-wide text-purple-600 uppercase">
              When
            </Text>
            <Text
              className="text-base font-bold leading-tight"
              style={{ color: theme.colors.text }}
            >
              {getProposalTime()}
            </Text>
          </View>
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          Events Added
        </Text>
        <View className="flex-1">
          {events.map((event, index) =>
            event?.data ? <SocialEventCard data={event.data} /> : null
          )}
        </View>
      </View>
    </View>
  );
};

export default ProposalDetail;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  item: {
    marginTop: 12,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    width: "80%",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
