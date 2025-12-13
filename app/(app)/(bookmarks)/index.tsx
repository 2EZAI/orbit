import { useRouter } from "expo-router";
import { ArrowLeft, Bookmark, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BookmarkFolder,
  LocationBookmark,
  useBookmark,
} from "~/hooks/useBookmark";
import BookmarkDetailSheet from "~/src/components/modals/BookmarkDetailSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

export default function BookmarksScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { getFolders, getBookmarks, loading } = useBookmark();

  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<BookmarkFolder | null>(
    null
  );
  const [folderEvents, setFolderEvents] = useState<LocationBookmark[]>([]);
  const [loadingFolderEvents, setLoadingFolderEvents] = useState(false);
  const [showEventsSheet, setShowEventsSheet] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getFolders();
      setFolders(data);
    })();
  }, []);

  const loadFolderEvents = async (folder: BookmarkFolder) => {
    setSelectedFolder(folder);
    setLoadingFolderEvents(true);
    try {
      const { bookmarks } = await getBookmarks({
        folder_id: folder.id,
        location_type: "event",
      });
      setFolderEvents(bookmarks);

      setShowEventsSheet(true);
    } finally {
      setLoadingFolderEvents(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, marginRight: 16 }}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 22, fontWeight: "800", color: theme.colors.text }}
        >
          Bookmark Collections
        </Text>
      </View>

      {/* Collections list */}
      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 32 }}
          color={theme.colors.primary}
        />
      ) : (
        <FlatList
          data={folders}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingTop: 4,
          }}
          renderItem={({ item }) => {
            const itemCount = item.bookmark_count ?? 0;
            const memberCount = item.member_count || 1;
            return (
              <TouchableOpacity
                onPress={() => loadFolderEvents(item)}
                activeOpacity={0.9}
                style={{
                  marginBottom: 12,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* Icon bubble */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.colors.primary + "20",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <Bookmark size={20} color={theme.colors.primary} />
                </View>

                {/* Text content */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text
                      style={{
                        color: theme.colors.text + "80",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Meta row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 6,
                    }}
                  >
                    {/* Items */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Bookmark
                        size={12}
                        color={theme.colors.text + "80"}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.colors.text + "80",
                          fontWeight: "500",
                        }}
                      >
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </Text>
                    </View>

                    {/* Members */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Users
                        size={12}
                        color={theme.colors.text + "80"}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.colors.text + "80",
                          fontWeight: "500",
                        }}
                      >
                        {memberCount} member{memberCount === 1 ? "" : "s"}
                      </Text>
                    </View>

                    {/* Visibility pill */}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        backgroundColor: theme.colors.border + "40",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: theme.colors.text + "80",
                        }}
                      >
                        {item.is_public ? "Public" : "Private"}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <BookmarkDetailSheet
        selectedFolder={selectedFolder}
        folderEvents={folderEvents}
        showEventsSheet={showEventsSheet}
        onClose={() => setShowEventsSheet(false)}
      />
    </SafeAreaView>
  );
}
