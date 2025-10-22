import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Modal,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFollow, ChatUser } from "~/hooks/useFollow";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { UserAvatar } from "../ui/user-avatar";
import { useUserData } from "~/hooks/useUserData";
interface IProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}
const FollowerSheet: React.FC<IProps> = ({ isOpen, onClose, userId }) => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useUserData();
  const insets = useSafeAreaInsets();
  const { getFollowerUsers, followUser, unfollowUser, getFollowing, loading } =
    useFollow();
  const [followerUsers, setFollowerUsers] = useState<ChatUser[]>([]);

  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followLoadingIds, setFollowLoadingIds] = useState<string[]>([]);
  useEffect(() => {
    if (isOpen && userId) {
      getFollowerUsers(userId).then((followers) => {
        setFollowerUsers(followers);
        console.log("Fetched followers:", followers);
      });
      if (!user) {
        return;
      }
      getFollowing(user?.id).then((following) => {
        setFollowingIds(following);
      });
    }
  }, [isOpen, userId, getFollowerUsers]);

  const toggleFollow = async (target: ChatUser) => {
    setFollowLoadingIds((prev) => [...prev, target.id]);

    try {
      const isFollowing = followingIds.includes(target.id);
      if (isFollowing) {
        await unfollowUser(target.id);
        setFollowingIds((prev) => prev.filter((id) => id !== target.id));
      } else {
        console.log("Following user:", target.id);
        await followUser(target.id);
        setFollowingIds((prev) => [...prev, target.id]);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoadingIds((prev) => prev.filter((id) => id !== target.id));
    }
  };
  const getDisplayName = (profile: ChatUser | null) => {
    if (!profile) return "";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.username || "Anonymous";
  };
  const renderRelationshipBadge = (user: ChatUser) => {
    if (user.relationship_type === "mutual") {
      return (
        <View
          style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.background,
              fontWeight: "500",
            }}
          >
            Mutual
          </Text>
        </View>
      );
    }
    if (user.relationship_type === "follower" && userId === user?.id) {
      return (
        <View
          style={{
            backgroundColor: theme.colors.border,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 11, color: theme.colors.text }}>
            Follows you
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item }: { item: ChatUser }) => {
    const displayName = item.username || item.first_name || "Unknown User";
    const secondary =
      item.first_name && item.last_name
        ? `${item.first_name} ${item.last_name}`
        : item.first_name || "";

    const isFollowing = followingIds.includes(item.id);
    const isLoading = followLoadingIds.includes(item.id);

    return (
      <View
        style={{
          flexDirection: "row",
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            onClose();
            router.push(`/(app)/profile/${item.id}`);
          }}
          style={{
            flexDirection: "row",
            flex: 1,
            alignItems: "center",
            gap: 12,
          }}
        >
          <UserAvatar
            size={48}
            user={{
              id: item.id,
              name: getDisplayName(item),
              image: item.avatar_url || null,
            }}
          />

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {getDisplayName(item)}
              </Text>
              {renderRelationshipBadge(item)}
            </View>

            <Text
              style={{
                color: theme.colors.text + "99",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              @{item.username || "Anonymous"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => !isLoading && toggleFollow(item)}
          disabled={isLoading}
          style={{
            paddingHorizontal: 14,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: isFollowing ? 1 : 0,
            borderColor: theme.colors.primary,
            backgroundColor: isFollowing
              ? theme.colors.primary + "20"
              : theme.colors.primary,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={
                isFollowing ? theme.colors.primary : theme.colors.background
              }
            />
          ) : (
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: isFollowing
                  ? theme.colors.primary
                  : theme.colors.background,
              }}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 10,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.colors.text,
                marginLeft: 8,
              }}
            >
              Your followers
            </Text>
          </View>
          <BottomSheetFlatList
            data={followerUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingBottom: 120 + insets.bottom,
              paddingHorizontal: 20,
              paddingTop: 10,
            }}
            renderItem={renderItem}
            ListEmptyComponent={() => (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 50,
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 16 }}>
                  No followers yet.
                </Text>
              </View>
            )}
          />
        </BottomSheet>
      </View>
    </Modal>
  );
};
export default FollowerSheet;
