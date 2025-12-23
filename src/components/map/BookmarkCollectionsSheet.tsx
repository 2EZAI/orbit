import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bookmark, Plus, Users } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { UnifiedData } from "./UnifiedDetailsSheet";
import {
  BookmarkFolder,
  CreateBookmarkPayload,
  useBookmark,
} from "~/hooks/useBookmark";

interface BookmarkCollectionsSheetProps {
  visible: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  primaryImage?: string | null;
  eventData: UnifiedData;
  onBookmarkAdded?: () => void;
}

export const BookmarkCollectionsSheet: React.FC<
  BookmarkCollectionsSheetProps
> = ({ visible, onClose, isBookmarked, primaryImage, eventData, onBookmarkAdded }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { createFolder, getFolders, createBookmark } = useBookmark();
  const [collections, setCollections] = useState<BookmarkFolder[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  // Determine bookmark payload based on content type (event vs location)
  const buildBookmarkPayload = (
    folderId: string
  ): CreateBookmarkPayload | null => {
    if (!eventData?.id) return null;

    // Reuse the same event detection logic as UnifiedDetailsSheet
    const source = (eventData as any).source;
    const type = (eventData as any).type;

    let isEvent = false;

    if (source === "location") {
      isEvent = false;
    } else if (type === "user_created" || type === "event") {
      isEvent = true;
    } else if (type === "googleApi") {
      isEvent = false;
    } else if (
      "start_datetime" in (eventData as any) ||
      "venue_name" in (eventData as any) ||
      "attendees" in (eventData as any)
    ) {
      isEvent = true;
    }

    if (isEvent) {
      return {
        folder_id: folderId,
        location_type: "event",
        event_id: String(eventData.id),
      };
    }

    // Fallback to static location
    return {
      folder_id: folderId,
      location_type: "static_location",
      static_location_id: String(eventData.id),
    };
  };

  const handleSelectFolder = async (folder: BookmarkFolder) => {
    const payload = buildBookmarkPayload(folder.id);
    if (!payload) {
      Toast.show({
        type: "error",
        text1: "Unable to save",
        text2: "Missing bookmark data for this item.",
      });
      return;
    }

    try {
      await createBookmark(payload);
      // Notify parent that bookmark was added
      if (onBookmarkAdded) {
        onBookmarkAdded();
      }
      // Close sheet after successful bookmark creation
      onClose();
    } catch (error: any) {
      // Error toasts are handled inside useBookmark
      console.error("Error creating bookmark:", error);
      
      // If bookmark already exists, still notify parent and close sheet
      // This handles the case where bookmark was added but icon didn't update
      if (error?.message?.includes("already exists") || error?.message?.includes("Bookmark already")) {
        if (onBookmarkAdded) {
          onBookmarkAdded();
        }
        onClose();
      }
      // For other errors, don't close sheet so user can try again
    }
  };

  // Load folders whenever the sheet becomes visible
  useEffect(() => {
    if (!visible) return;

    let isActive = true;

    (async () => {
      try {
        const folders = await getFolders();
        if (!isActive) return;
        setCollections(folders);
      } catch (error) {
        console.error("Error loading bookmark folders:", error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [visible]);

  const handleOpenCreate = () => {
    setNewCollectionName("");
    setIsCreating(true);
  };

  const handleCloseCreate = () => {
    setIsCreating(false);
    setNewCollectionName("");
  };

  const handleSaveCreate = async () => {
    const name = newCollectionName.trim();
    if (!name) return;

    try {
      const folder = await createFolder({
        name,
        is_public: false,
      });
      if (!folder) return;

      // Automatically add current item to the new folder
      await handleSelectFolder(folder);

      // Refresh from server to ensure we have latest folder list without duplicates
      const folders = await getFolders();
      setCollections(folders);
    } catch (error) {
      console.error("Error creating bookmark folder:", error);
    } finally {
      handleCloseCreate();
    }
  };

  const isSaveDisabled = !newCollectionName.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {isCreating ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={handleCloseCreate}
          />

          <View
            className="px-5 pt-3 rounded-t-3xl"
            style={{
              backgroundColor: theme.colors.card,
              paddingBottom: insets.bottom + 16,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={handleCloseCreate}>
                <Text className="text-sm font-semibold text-[#E5E7EB]">
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.text }}
              >
                New collection
              </Text>
              <TouchableOpacity
                disabled={isSaveDisabled}
                onPress={handleSaveCreate}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: isSaveDisabled ? "#6B7280" : "#3B82F6",
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            {/* Handle */}
            <View className="items-center mb-4">
              <View className="w-10 h-1.5 rounded-full bg-neutral-500/40" />
            </View>

            {/* Preview image */}
            <View className="items-center mb-5">
              {primaryImage ? (
                <Image
                  source={{ uri: primaryImage }}
                  className="w-40 h-40 rounded-2xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-40 h-40 rounded-2xl bg-neutral-500/15 items-center justify-center">
                  <Text className="text-xs text-neutral-500">No image</Text>
                </View>
              )}
            </View>

            {/* Collection name input */}
            <View className="mb-3">
              <TextInput
                placeholder="Collection name"
                placeholderTextColor="#6B7280"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                className="px-4 py-3 rounded-xl text-base"
                style={{
                  backgroundColor: "#111827",
                  color: theme.colors.text,
                }}
              />
            </View>

         
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={onClose}
          />

          <View
            className="px-5 pt-3 rounded-t-3xl"
            style={{
              backgroundColor: theme.colors.card,
              paddingBottom: insets.bottom + 16,
            }}
          >
            {/* Handle */}
            <View className="items-center mb-4">
              <View className="w-10 h-1.5 rounded-full bg-neutral-500/40" />
            </View>

            {/* Saved row */}
            <View className="flex-row items-center mb-5">
              {primaryImage ? (
                <Image
                  source={{ uri: primaryImage }}
                  className="w-14 h-14 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-14 h-14 rounded-xl bg-neutral-500/15 items-center justify-center">
                  <Text className="text-xs text-neutral-500">No image</Text>
                </View>
              )}

              <View className="flex-1 ml-3">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Saved
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-500">Private</Text>
              </View>

              <View className="items-center justify-center">
                <Bookmark
                  size={20}
                  color={isBookmarked ? "#8B5CF6" : theme.colors.text}
                  fill={isBookmarked ? "#8B5CF6" : "transparent"}
                />
              </View>
            </View>

            {/* Collections header */}
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.text }}
              >
                Collections
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={handleOpenCreate}>
                <Text className="text-sm font-semibold text-[#3B82F6]">
                  New collection
                </Text>
              </TouchableOpacity>
            </View>

            {/* Collections list */}
            <ScrollView
              className="mt-1"
              style={{ minHeight: 250, maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {collections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  activeOpacity={0.8}
                  className="flex-row items-center py-3"
                  onPress={() => handleSelectFolder(collection)}
                >
                  <View className="items-center justify-center w-12 h-12 mr-3 rounded-xl bg-neutral-500/15">
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      {collection.name[0]?.toUpperCase()}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.colors.text }}
                    >
                      {collection.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-neutral-500">
                      {collection.is_public ? "Public" : "Private"}
                    </Text>
                  </View>

                  <View className="items-center justify-center w-7 h-7 rounded-full bg-neutral-500/10">
                    <Plus size={16} color={theme.colors.text} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
      {/* New collection sheet */}
    </Modal>
  );
};
