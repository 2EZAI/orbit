import React, { useState } from "react";
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

const MOCK_BOOKMARK_COLLECTIONS = [
  { id: "test", name: "Test", subtitle: "Private" },
  { id: "useful", name: "Useful", subtitle: "with WarriorEx" },
  { id: "test", name: "Test", subtitle: "Private" },
  { id: "useful", name: "Useful", subtitle: "with WarriorEx" },
  { id: "test", name: "Test", subtitle: "Private" },
  { id: "useful", name: "Useful", subtitle: "with WarriorEx" },
  { id: "test", name: "Test", subtitle: "Private" },
  { id: "useful", name: "Useful", subtitle: "with WarriorEx" },
];

interface BookmarkCollectionsSheetProps {
  visible: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  primaryImage?: string | null;
  eventData: UnifiedData;
}

export const BookmarkCollectionsSheet: React.FC<
  BookmarkCollectionsSheetProps
> = ({ visible, onClose, isBookmarked, primaryImage, eventData }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [collections, setCollections] = useState(MOCK_BOOKMARK_COLLECTIONS);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const handleOpenCreate = () => {
    setNewCollectionName("");
    setIsCreating(true);
  };

  const handleCloseCreate = () => {
    setIsCreating(false);
    setNewCollectionName("");
  };

  const handleSaveCreate = () => {
    const name = newCollectionName.trim();
    if (!name) return;

    const newCollection = {
      id: `${Date.now()}`,
      name,
      subtitle: "Private",
    };

    setCollections((prev) => [...prev, newCollection]);
    Toast.show({
      type: "success",
      text1: "Collection created",
      text2: `Added to ${name}.`,
    });
    handleCloseCreate();
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
                onPress={() => {
                  onClose();
                  Toast.show({
                    type: "success",
                    text1: "Saved",
                    text2: `Added to ${collection.name}.`,
                  });
                }}
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
                  {collection.subtitle && (
                    <Text className="mt-0.5 text-xs text-neutral-500">
                      {collection.subtitle}
                    </Text>
                  )}
                </View>

                <View className="items-center justify-center w-7 h-7 rounded-full bg-neutral-500/10">
                  <Plus size={16} color={theme.colors.text} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      {/* New collection sheet */}
      <Modal
        visible={isCreating}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCreate}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
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

            {/* Add people row (UI only) */}
            {/* <TouchableOpacity className="flex-row items-center py-3">
              <View className="items-center justify-center w-9 h-9 mr-3 rounded-full bg-neutral-500/20">
                <Users size={18} color={theme.colors.text} />
              </View>
              <View>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  Add people to collection
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-500">
                  Save to a collection together
                </Text>
              </View>
            </TouchableOpacity> */}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
};
