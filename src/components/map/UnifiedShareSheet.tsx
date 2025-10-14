import { Modal, View, Text, Share, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTheme } from "../ThemeProvider";
import { UnifiedData } from "./UnifiedDetailsSheet";
import { haptics } from "~/src/lib/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet } from "../ui/sheet";
interface IProps {
  onClose: () => void;
  isOpen: boolean;
  data: UnifiedData | undefined;
  isEventType?: boolean;
}
const UnifiedShareSheet: React.FC<IProps> = ({
  onClose,
  isOpen,
  data,
  isEventType,
}) => {
  const { theme } = useTheme();
  const onShare = async () => {
    const currentData = data;

    try {
      haptics.selection(); // Light haptic on share action
      await Share.share({
        message: `Check out ${currentData?.name} on Orbit!
            ${currentData?.description}
  
            https://orbit-redirects.vercel.app/?action=share&eventId=${currentData.id}
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
    <Sheet isOpen={isOpen} onClose={onClose}>
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
            onPress={() => null}
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
    </Sheet>
  );
};
export default UnifiedShareSheet;
