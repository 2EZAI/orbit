import { haptics } from "~/src/lib/haptics";
import { UnifiedData } from "./UnifiedDetailsSheet";
import { Share, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../ThemeProvider";
import React from "react";
interface IProps {
  onClose: () => void;
  data: UnifiedData | undefined;
  isEventType?: boolean;
  onChangeType: (type: "share" | "add-proposal") => void;
}
const ShareContent: React.FC<IProps> = ({
  onClose,
  data,
  isEventType,
  onChangeType,
}) => {
  const { theme } = useTheme();
  const onShare = async () => {
    const currentData = data;

    try {
      haptics.selection(); // Light haptic on share action
      await Share.share({
        message: `Check out ${currentData?.name} on Orbit!
                ${currentData?.description}
      
                https://orbit-redirects.vercel.app/?action=share&eventId=${
                  currentData?.id || ""
                }
                `,
        title: isEventType ? "Activity on Orbit" : "Location on Orbit",
      }).then((result) => {
        if (result.action === "sharedAction") {
          onClose();
        }
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 10,
      }}
      className="rounded-t-3xl"
    >
      <Text
        className="mb-6 text-2xl font-bold text-center"
        style={{ color: theme.colors.text }}
      >
        Share
      </Text>
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => null}
          className="flex-1 items-center py-4 bg-white rounded-2xl border-2 border-purple-600"
        >
          <Text className="text-lg font-semibold text-purple-600">
            Share in Chat
          </Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => onChangeType("add-proposal")}
          className="flex-1 items-center py-4 bg-white rounded-2xl border-2 border-purple-600"
        >
          <Text className="text-lg font-semibold text-purple-600">
            Add / Create Proposal
          </Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onShare}
          className="flex-1 items-center py-4 bg-white rounded-2xl border-2 border-purple-600"
        >
          <Text className="text-lg font-semibold text-purple-600">Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default ShareContent;
