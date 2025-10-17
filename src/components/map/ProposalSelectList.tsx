import { ArrowLeft, CheckCircle2, PlusCircle } from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IProposal, useProposals } from "~/hooks/useProposals";
import { useTheme } from "../ThemeProvider";
import { UnifiedData } from "./UnifiedDetailsSheet";

import React, { useState } from "react";
interface IProps {
  data?: UnifiedData;
  onBack: () => void;
  proposals: IProposal[];
  onAdd?: () => void;
  onShowEventDetails?: (proposal: IProposal) => void;
}
const ProposalSelectList: React.FC<IProps> = ({
  data,
  onBack,
  proposals,
  onAdd = () => {},
  onShowEventDetails = () => {},
}) => {
  const { theme } = useTheme();
  const [selectedProposals, setSelectedProposals] = useState<string>("");
  const { loading, addEventToProposal } = useProposals();
  const renderItem = (item: IProposal) => {
    const isSelected = selectedProposals === item.id;
    const isEventAlreadyAdded =
      item.events_attached.findIndex((val) => val.id === data?.id) !== -1;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            borderColor: isSelected
              ? theme.colors.primary
              : theme.colors.border,
          },
        ]}
        onPress={() => {
          if (data && !isEventAlreadyAdded) {
            setSelectedProposals(item.id);
          } else {
            onShowEventDetails(item);
          }
        }}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.text, { color: theme.colors.text }]}>
            {item.title}
          </Text>
          <Text
            style={[styles.eventAddedText, { color: theme.colors.text + "80" }]}
          >
            {item.events_attached.length} events added
          </Text>
          {data ? (
            <Text
              style={[
                styles.eventAlreadyAddedText,
                { color: theme.colors.text + "40" },
              ]}
            >
              {isEventAlreadyAdded ? "Event already added" : ""}
            </Text>
          ) : null}
        </View>
        {data ? (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
          >
            {isSelected && <CheckCircle2 size={28} color="white" />}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };
  const handleSubmit = async () => {
    if (!data || !selectedProposals) return;
    const updated = await addEventToProposal(selectedProposals, {
      id: data.id,
      name: data.name,
      type: data.type || "event",
    });
    console.log("Event added to Proposal:", updated);
    if (updated) {
      onBack();
    }
  };
  const validateCheck = () => {
    return !!selectedProposals;
  };
  return (
    <View style={styles.container}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => onBack()} className="mr-3">
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.colors.text,
            }}
          >
            {data ? `Select Proposals` : "Your Proposals"}
          </Text>
        </View>
        {data ? (
          <TouchableOpacity onPress={onAdd}>
            <PlusCircle size={30} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.list}>
        <FlatList
          data={proposals}
          renderItem={({ item }) => renderItem(item)}
          keyExtractor={(item) => item.id}
        />
      </View>
      {data ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !validateCheck()}
            style={[
              styles.button,
              {
                backgroundColor: validateCheck() ? "#8B5CF6" : "transparent",

                borderColor: validateCheck()
                  ? "#8B5CF6"
                  : theme.colors.text + "20",

                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <View className="flex-row items-center">
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: validateCheck() ? "white" : theme.colors.text + "40",

                    marginRight: 8,
                  }}
                >
                  Add Event to Proposal
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};
export default ProposalSelectList;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  list: {
    flex: 1,
    paddingVertical: 20,
  },
  item: {
    paddingVertical: 20,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    marginTop: 10,
    borderRadius: 16,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,

    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
  },
  button: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  itemContent: {
    gap: 5,
  },
  eventAddedText: {
    fontSize: 16,
  },
  eventAlreadyAddedText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
