import { useTheme } from "~/src/components/ThemeProvider";
import {
  StyleSheet,
  StatusBar,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
} from "react-native";
import { ScreenHeader } from "~/src/components/ui/screen-header";
import useContacts from "~/hooks/useContacts";
import { useEffect, useState } from "react";
import { User } from "~/hooks/useUserData";
import { HomeLoadingScreen } from "~/src/components/feed/HomeLoadingScreen";
import { useFollow } from "~/hooks/useFollow";
import { useUser } from "~/src/lib/UserProvider";

export default function ContactScreen() {
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const { fetchAllSuggestions, loading } = useContacts();
  const {
    getFollowing,

    followUser,
    unfollowUser,
  } = useFollow();

  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  useEffect(() => {
    const getSuggestions = async () => {
      if (!user) return;

      const result = await fetchAllSuggestions();
      setSuggestions(result);
      const followingList = await getFollowing(user.id);
      setFollowing(followingList);
    };
    getSuggestions();
  }, []);
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
        />
        <HomeLoadingScreen
          isVisible={loading}
          loadingText="Loading Suggestions..."
          subtitle="Finding the best suggestions for you..."
        />
      </View>
    );
  }

  const toggleFollow = async (target: User, isFollowing: boolean) => {
    // const isFollowing = following.includes(target.id);
    const copy = [...following];

    try {
      if (isFollowing) {
        setFollowing((prev) => prev.filter((id) => id !== target.id));
        await unfollowUser(target.id);
      } else {
        setFollowing((prev) => [...prev, target.id]);
        await followUser(target.id);
      }
    } catch (e) {
      setFollowing(copy);
    }
  };

  const getDisplayName = (profile: User | null) => {
    if (!profile) return "";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.username || "Anonymous";
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.card }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.card}
      />
      <ScreenHeader title="Contacts" />
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        <FlatList
          data={suggestions}
          keyExtractor={(item: User) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isFollowing = following.includes(item.id);

            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  gap: 12,
                }}
              >
                {/* Avatar */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: theme.colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                  }}
                >
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                    />
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 22, color: theme.colors.text }}>
                        {getDisplayName(item).charAt(0)}
                      </Text>
                    </View>
                  )}
                </View>
                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {getDisplayName(item)}
                  </Text>
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
                {/* Follow/Unfollow Button */}
                <TouchableOpacity
                  onPress={() => toggleFollow(item, isFollowing)}
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
                  }}
                >
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
                </TouchableOpacity>
              </View>
            );
          }}
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
                No suggestions found.
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
