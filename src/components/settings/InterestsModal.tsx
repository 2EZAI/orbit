import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Sheet } from "~/src/components/ui/sheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/hooks/useUserData";
import { supabase } from "~/src/lib/supabase";
import Toast from "react-native-toast-message";
import { Heart, X, Search, Check } from "lucide-react-native";
import { debounce } from "lodash";

interface Topic {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  is_event_category?: boolean;
  parent_category_id?: string;
}

interface InterestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterestsModal({ isOpen, onClose }: InterestsModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, userTopicsList } = useUser();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset expansion when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  // Load user data
  useEffect(() => {
    if (isOpen) {
      loadTopics();
      if (userTopicsList) {
        setSelectedTopics(Array.isArray(userTopicsList) ? userTopicsList : []);
      }
    }
  }, [isOpen, userTopicsList]);

  useEffect(() => {
    filterTopics();
  }, [topics, searchText]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .order("name");

      if (error) throw error;

      setTopics(data || []);
    } catch (error) {
      console.error("Error loading topics:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load topics",
        text2: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTopics = () => {
    if (!searchText.trim()) {
      setFilteredTopics(topics);
    } else {
      const filtered = topics.filter(
        (topic) =>
          topic.name.toLowerCase().includes(searchText.toLowerCase()) ||
          topic.description?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredTopics(filtered);
    }
  };

  const debouncedFilter = debounce(filterTopics, 300);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    debouncedFilter();
  };

  const toggleTopic = (topicName: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(topicName)) {
        return prev.filter((name) => name !== topicName);
      } else {
        return [...prev, topicName];
      }
    });
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      // First, delete existing user topics
      const { error: deleteError } = await supabase
        .from("user_topics")
        .delete()
        .eq("user_id", session.user.id);

      if (deleteError) throw deleteError;

      // Then insert new selected topics
      if (selectedTopics.length > 0) {
        const { error: insertError } = await supabase
          .from("user_topics")
          .insert(
            selectedTopics.map((topic) => ({
              user_id: session.user.id,
              topic: topic,
            }))
          );

        if (insertError) throw insertError;
      }

      Toast.show({
        type: "success",
        text1: "Interests updated successfully!",
        text2: `${selectedTopics.length} topics selected`,
      });

      onClose();
    } catch (error) {
      console.error("Error updating interests:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update interests",
        text2: "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderTopic = ({ item }: { item: Topic }) => {
    const isSelected = selectedTopics.includes(item.name);

    return (
      <TouchableOpacity
        onPress={() => toggleTopic(item.name)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          borderRadius: 12,
          backgroundColor: isSelected
            ? theme.colors.primary + "20"
            : theme.colors.card,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isSelected
              ? theme.colors.primary
              : theme.colors.primary + "40",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          {item.icon ? (
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
          ) : (
            <Heart
              size={20}
              color={isSelected ? "white" : theme.colors.primary}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.colors.text,
              marginBottom: item.description ? 4 : 0,
            }}
          >
            {item.name}
          </Text>
          {item.description && (
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.text + "80",
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
        </View>

        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: isSelected
              ? theme.colors.primary
              : theme.colors.border,
            backgroundColor: isSelected ? theme.colors.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSelected && <Check size={14} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} expanded={isExpanded}>
      <View style={{ flex: 1, maxHeight: "85%" }}>
        {/* Fixed Header Section */}
        <View
          style={{
            padding: 20,
            paddingBottom: 16,
            backgroundColor: theme.colors.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.primary + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Heart size={20} color={theme.colors.primary} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: theme.colors.text,
                }}
              >
                Update Interests
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.card,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Selected Count */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.text + "80",
              }}
            >
              {selectedTopics.length} topics selected
            </Text>
          </View>

          {/* Sticky Actions */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme.colors.primary,
                alignItems: "center",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  Save Interests
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content Section */}
        <View style={{ flex: 1, padding: 20, paddingTop: 20 }}>
          {/* Search */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ marginLeft: 16 }}>
                <Search size={20} color={theme.colors.text + "60"} />
              </View>
              <Input
                value={searchText}
                onChangeText={handleSearchChange}
                onFocus={() => setIsExpanded(true)}
                onBlur={() => setIsExpanded(false)}
                placeholder="Search interests..."
                style={{
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: theme.colors.text,
                  backgroundColor: "transparent",
                  borderWidth: 0,
                }}
                placeholderTextColor={theme.colors.text + "60"}
              />
            </View>
          </View>

          {/* Topics List */}
          <View style={{ flex: 1 }}>
            {loading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 16, color: theme.colors.text }}>
                  Loading topics...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredTopics}
                renderItem={renderTopic}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <View style={{ padding: 40, alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.colors.text + "80",
                        textAlign: "center",
                      }}
                    >
                      {searchText
                        ? "No topics found matching your search"
                        : "No topics available"}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </View>
    </Sheet>
  );
}
