import { useUserData } from "~/hooks/useUserData";
import { IProposal } from "../../../hooks/useProposals";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../ThemeProvider";
import React from "react";
import { Calendar, Users } from "lucide-react-native";
interface IProps {
  proposal: IProposal;
  message: any;
  handleProposalPress: (proposal: IProposal) => void;
}
const ChatProposalComponent = ({
  proposal,
  handleProposalPress,
  message,
}: IProps) => {
  const { user } = useUserData();
  const { theme, isDarkMode } = useTheme();
  return (
    <View
      style={[
        styles.container,
        user?.id === message?.user?.id ? { alignSelf: "flex-end" } : {},
      ]}
    >
      <Text style={[styles.premiumTitle, { color: theme.colors.text }]}>
        {proposal.title}
      </Text>
      <View style={styles.metaContainer}>
        <View style={styles.metaItem}>
          <Calendar size={12} color={theme.colors.text + "60"} />
          <Text style={[styles.metaText, { color: theme.colors.text + "60" }]}>
            {new Date(proposal.start_datetime).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={12} color={theme.colors.text + "60"} />
          <Text style={[styles.metaText, { color: theme.colors.text + "60" }]}>
            {proposal.events_attached.length} events
          </Text>
        </View>
      </View>
      <TouchableOpacity
        className="py-2 mt-5 rounded-full"
        style={{ backgroundColor: theme.colors.primary }}
        onPress={() => handleProposalPress(proposal)}
      >
        <Text className="text-sm font-semibold text-center text-white">
          View Proposal
        </Text>
      </TouchableOpacity>
    </View>
  );
};
export default ChatProposalComponent;
const styles = StyleSheet.create({
  container: {
    width: "70%",
    backgroundColor: "#8B5CF6" + "40",
    paddingHorizontal: 10,
    paddingVertical: 20,

    borderRadius: 12,
    marginBottom: 5,
    marginHorizontal: 2,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaContainer: {
    flexDirection: "row",
    gap: 16,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
