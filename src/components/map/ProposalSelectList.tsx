import {
  ArrowLeft,
  CheckCircle2,
  PlusCircle,
  Calendar,
  Clock,
  Users,
  Sparkles,
  ChevronRight,
  Star,
  Zap,
} from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { IProposal, useProposals } from "~/hooks/useProposals";
import { useTheme } from "../ThemeProvider";
import { UnifiedData } from "./UnifiedDetailsSheet";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import React, { useState, useRef, useEffect } from "react";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
interface IProps {
  data?: UnifiedData;
  onBack: () => void;
  proposals: IProposal[];
  onAdd?: () => void;
  onShowEventDetails?: (proposal: IProposal) => void;
  onShowProposalDetail?: (proposal: IProposal) => void;
}
const ProposalSelectList: React.FC<IProps> = ({
  data,
  onBack,
  proposals,
  onAdd = () => {},
  onShowProposalDetail,
  onShowEventDetails = () => {},
}) => {
  const { theme, isDarkMode } = useTheme();
  const [selectedProposals, setSelectedProposals] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { loading, addEventToProposal } = useProposals();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Animate items on mount - optimized for performance
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const renderItem = ({ item, index }: { item: IProposal; index: number }) => {
    const isSelected = selectedProposals === item.id;
    const isEventAlreadyAdded =
      item.events_attached.findIndex((val) => val.id === data?.id) !== -1;
    const isVisible = visibleItems.has(item.id);

    const handlePress = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (data && !isEventAlreadyAdded) {
        // Toggle selection - if already selected, deselect it
        if (selectedProposals === item.id) {
          setSelectedProposals("");
        } else {
          setSelectedProposals(item.id);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        onShowEventDetails(item);
      }
    };

    return (
      <MotiView
        from={{
          opacity: 0,
          translateY: 50,
          scale: 0.9,
        }}
        animate={{
          opacity: isVisible ? 1 : 0,
          translateY: isVisible ? 0 : 50,
          scale: isVisible ? 1 : 0.9,
        }}
        transition={{
          type: "timing",
          duration: 300,
          delay: index * 50,
        }}
        onDidAnimate={(key, finished) => {
          if (key === "opacity" && finished && !isVisible) {
            setVisibleItems((prev) => new Set(prev).add(item.id));
          }
        }}
        style={styles.itemContainer}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          disabled={isEventAlreadyAdded}
        >
          <MotiView
            animate={{
              scale: isSelected ? 1.02 : 1,
              borderWidth: isSelected ? 2 : 1,
            }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 300,
            }}
            style={[
              styles.premiumItem,
              {
                borderColor: isSelected
                  ? "#8B5CF6"
                  : isEventAlreadyAdded
                  ? theme.colors.text + "20"
                  : theme.colors.border,
                backgroundColor: isSelected
                  ? isDarkMode
                    ? "rgba(139, 92, 246, 0.1)"
                    : "rgba(139, 92, 246, 0.05)"
                  : isEventAlreadyAdded
                  ? theme.colors.text + "05"
                  : theme.colors.card,
                // Adjust margin when selected to prevent border cutoff
                marginHorizontal: isSelected ? 2 : 0,
                marginVertical: isSelected ? 4 : 0,
              },
            ]}
          >
            {/* Gradient overlay for selected state */}
            {isSelected && (
              <LinearGradient
                colors={["rgba(139, 92, 246, 0.1)", "rgba(139, 92, 246, 0.05)"]}
                style={styles.gradientOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}

            {/* Main content */}
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <MotiView
                  animate={{
                    scale: isSelected ? 1.1 : 1,
                  }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 300,
                  }}
                >
                  <LinearGradient
                    colors={["#8B5CF6", "#A855F7"]}
                    style={styles.titleIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Sparkles size={16} color="white" />
                  </LinearGradient>
                </MotiView>

                <View style={styles.titleContainer}>
                  <Text
                    style={[styles.premiumTitle, { color: theme.colors.text }]}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.metaContainer}>
                    <View style={styles.metaItem}>
                      <Calendar size={12} color={theme.colors.text + "60"} />
                      <Text
                        style={[
                          styles.metaText,
                          { color: theme.colors.text + "60" },
                        ]}
                      >
                        {new Date(item.start_datetime).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Users size={12} color={theme.colors.text + "60"} />
                      <Text
                        style={[
                          styles.metaText,
                          { color: theme.colors.text + "60" },
                        ]}
                      >
                        {item.events_attached.length} events
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Status indicators */}
              <View style={styles.statusContainer}>
                {isEventAlreadyAdded && (
                  <MotiView
                    from={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      damping: 15,
                      stiffness: 300,
                    }}
                    style={styles.alreadyAddedBadge}
                  >
                    <CheckCircle2 size={14} color="#10B981" />
                    <Text style={styles.alreadyAddedText}>Already Added</Text>
                  </MotiView>
                )}

                {data && !isEventAlreadyAdded && (
                  <ChevronRight
                    size={20}
                    color={isSelected ? "#8B5CF6" : theme.colors.text + "40"}
                  />
                )}
              </View>
            </View>

            {/* Selection indicator */}
            {data && (
              <MotiView
                animate={{
                  scale: isSelected ? 1 : 0,
                  opacity: isSelected ? 1 : 0,
                }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 300,
                }}
                style={styles.selectionIndicator}
              >
                <LinearGradient
                  colors={["#8B5CF6", "#A855F7"]}
                  style={styles.selectionIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <CheckCircle2 size={20} color="white" />
                </LinearGradient>
              </MotiView>
            )}
          </MotiView>
        </TouchableOpacity>
      </MotiView>
    );
  };
  const handleSubmit = async () => {
    if (!data || !selectedProposals) return;

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
console.log("Adding event to proposal:", selectedProposals, {
  id: data.id,
  name: data.name,
  type: data.source || "database",
});
    try {
      const updated = await addEventToProposal(selectedProposals, {
        id: data.id,
        name: data.name,
        type: data.source || "database",
      });

      console.log("Event added to Proposal:", updated);

      if (updated) {
        // Success animation and haptic feedback
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        setShowSuccess(true);

        // Wait for success animation, then navigate to proposal details
        setTimeout(() => {
          // Find the proposal that was just updated
          const updatedProposal = proposals.find(
            (p) => p.id === selectedProposals
          );
          if (updatedProposal && onShowProposalDetail) {
            onShowProposalDetail(updatedProposal);
          } else {
            onBack();
          }
        }, 1500);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Error adding event to proposal:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const validateCheck = () => {
    return !!selectedProposals && selectedProposals.trim() !== "";
  };

  const handleBackPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const handleAddPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Header with Gradient */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 300,
        }}
        style={styles.headerContainer}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)"]
              : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]
          }
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <MotiView
                  from={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 300,
                    delay: 100,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleBackPress}
                    style={styles.backButton}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 300,
                    delay: 200,
                  }}
                >
                  <Text
                    style={[styles.headerTitle, { color: theme.colors.text }]}
                  >
                    {data ? "Select Proposals" : "Your Proposals"}
                  </Text>
                </MotiView>
              </View>

              {data && (
                <MotiView
                  from={{ scale: 0, rotate: "180deg" }}
                  animate={{ scale: 1, rotate: "0deg" }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 300,
                    delay: 300,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleAddPress}
                    style={styles.addButton}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={["#8B5CF6", "#A855F7"]}
                      style={styles.addButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <PlusCircle size={24} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </MotiView>
              )}
            </View>
          </BlurView>
        </LinearGradient>
      </MotiView>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        <FlatList
          ref={flatListRef}
          data={proposals}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

      {/* Premium Action Button */}
      {data && (
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300,
            delay: 400,
          }}
          style={[
            styles.buttonContainer,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || !validateCheck()}
            activeOpacity={0.8}
            style={styles.premiumButton}
          >
            <MotiView
              animate={{
                scale: validateCheck() ? 1 : 0.95,
                opacity: validateCheck() ? 1 : 0.6,
              }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 300,
              }}
            >
              <LinearGradient
                colors={
                  validateCheck()
                    ? ["#8B5CF6", "#A855F7"]
                    : ["#6B7280", "#9CA3AF"]
                }
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Zap size={20} color="white" />
                    <Text style={styles.buttonText}>Add Event to Proposal</Text>
                  </View>
                )}
              </LinearGradient>
            </MotiView>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            damping: 15,
            stiffness: 300,
          }}
          style={styles.successOverlay}
        >
          <LinearGradient
            colors={["rgba(16, 185, 129, 0.9)", "rgba(34, 197, 94, 0.9)"]}
            style={styles.successGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MotiView
              animate={{
                rotate: "360deg",
                scale: [1, 1.2, 1],
              }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 300,
                loop: true,
              }}
            >
              <CheckCircle2 size={48} color="white" />
            </MotiView>
            <Text style={styles.successText}>Event Added Successfully!</Text>
          </LinearGradient>
        </MotiView>
      )}
    </View>
  );
};
export default ProposalSelectList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Header Styles
  headerContainer: {
    position: "relative",
    zIndex: 1000,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBlur: {
    borderRadius: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  addButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  // Content Styles
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingVertical: 20,
  },
  separator: {
    height: 16,
  },

  // Item Styles
  itemContainer: {
    marginBottom: 4,
    paddingHorizontal: 2, // Add padding to container to accommodate selected item margins
  },
  premiumItem: {
    borderRadius: 20,
    padding: 20,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusContainer: {
    alignItems: "flex-end",
    gap: 8,
  },
  alreadyAddedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
  },
  alreadyAddedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  selectionIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  selectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Button Styles
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  premiumButton: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonGradient: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    letterSpacing: -0.2,
  },

  // Success Overlay
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  successGradient: {
    width: 200,
    height: 120,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
});
