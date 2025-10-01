import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  Share,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/src/components/ThemeProvider";
import { Users } from "lucide-react-native";
interface IProps {
  isOpen: boolean;
  onClose: () => void;
  interests: {
    id: string;
    name: string;
    icon?: string | undefined;
  }[];
}
const InterestsSheet: React.FC<IProps> = ({ isOpen, onClose, interests }) => {
  const { theme, isDarkMode } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
    Dimensions.get("window");
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View style={{ flex: 1 }}>
        <View
          className="absolute top-0 right-0 bottom-0 left-0"
          style={{
            backgroundColor: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
            zIndex: 99998,
            elevation: 99998, // For Android
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
        />
        <BottomSheet
          snapPoints={["75%", "95%"]}
          handleIndicatorStyle={{
            backgroundColor: theme.colors.border,
            width: 40,
          }}
          backgroundStyle={{
            backgroundColor: theme.colors.card,
            borderRadius: 20,
          }}
          enablePanDownToClose
          onClose={onClose}
          style={{ zIndex: 99999, elevation: 99999 }}
          containerStyle={{ zIndex: 99999, elevation: 99999 }}
        >
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingBottom: 120 + insets.bottom,
              paddingHorizontal: 20,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Users size={24} color={theme.colors.primary} />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.colors.text,
                  marginLeft: 8,
                }}
              >
                Interests
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 20,
              }}
            >
              {interests.map((topic, index) => (
                <View
                  key={topic.id || `topic-${index}`}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: theme.colors.primary + "20",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.primary + "40",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: theme.colors.primary,
                    }}
                  >
                    {topic.name}
                  </Text>
                </View>
              ))}
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </Modal>
  );
};
export default InterestsSheet;
