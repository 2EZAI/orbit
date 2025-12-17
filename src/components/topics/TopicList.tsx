import { Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";

interface TopicListProps {
  selectedTopics: string[];
  onSelectTopic: (topics: string[]) => void;
}

export function TopicList({ selectedTopics, onSelectTopic }: TopicListProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme } = useTheme();

  useEffect(() => {
    async function fetchTopics() {
      try {
        const { data, error } = await supabase
          .from("topics")
          .select("name")
          .order("name");

        if (error) throw error;

        const topicNames = data.map((topic) => topic.name);
        setTopics(topicNames);
        setFilteredTopics(topicNames);
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTopics(topics);
    } else {
      const filtered = topics.filter((topic) =>
        topic.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTopics(filtered);
    }
  }, [searchQuery, topics]);

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      onSelectTopic(selectedTopics.filter((t) => t !== topic));
    } else {
      onSelectTopic([...selectedTopics, topic]);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (loading) {
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
        }}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text
          style={{
            marginTop: 16,
            fontSize: 16,
            color: theme.colors.text + "CC",
          }}
        >
          Loading topics...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={{ marginBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 56,
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(255, 255, 255, 0.9)",
            borderRadius: 16,
            borderWidth: 2,
            borderColor: searchQuery
              ? "#8B5CF6"
              : theme.dark
              ? "rgba(139, 92, 246, 0.3)"
              : "rgba(139, 92, 246, 0.2)",
            paddingHorizontal: 16,
            shadowColor: searchQuery ? "#8B5CF6" : "transparent",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: searchQuery ? 6 : 0,
          }}
        >
          <Search size={20} color="#8B5CF6" style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Search topics..."
            placeholderTextColor={theme.colors.text + "66"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.colors.text,
              fontWeight: "500",
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={{ marginLeft: 8 }}>
              <X size={20} color={theme.colors.text + "66"} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search Results Count */}
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: theme.colors.text + "99",
            textAlign: "center",
          }}
        >
          {searchQuery
            ? `${filteredTopics.length} topic${
                filteredTopics.length === 1 ? "" : "s"
              } found`
            : `${topics.length} topics available`}
        </Text>
      </View>

      {/* Selected Topics Summary */}
      {selectedTopics.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 12,
            }}
          >
            Selected ({selectedTopics.length})
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              padding: 16,
              backgroundColor: theme.dark
                ? "rgba(139, 92, 246, 0.1)"
                : "rgba(139, 92, 246, 0.05)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.3)"
                : "rgba(139, 92, 246, 0.2)",
            }}
          >
            {selectedTopics.map((topic) => (
              <TouchableOpacity
                key={`selected-${topic}`}
                onPress={() => toggleTopic(topic)}
                style={{
                  backgroundColor: "#8B5CF6",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "white",
                    marginRight: 8,
                  }}
                >
                  {topic}
                </Text>
                <X size={16} color="white" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Topics Grid */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {filteredTopics.map((topic) => {
          const isSelected = selectedTopics.includes(topic);

          return (
            <TouchableOpacity
              key={topic}
              onPress={() => toggleTopic(topic)}
              style={{
                backgroundColor: isSelected
                  ? "#8B5CF6"
                  : theme.dark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(255, 255, 255, 0.9)",
                borderRadius: 25,
                borderWidth: 2,
                borderColor: isSelected
                  ? "#8B5CF6"
                  : theme.dark
                  ? "rgba(139, 92, 246, 0.3)"
                  : "rgba(139, 92, 246, 0.2)",
                paddingHorizontal: 20,
                paddingVertical: 12,
                shadowColor: isSelected ? "#8B5CF6" : "transparent",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.3 : 0,
                shadowRadius: 8,
                elevation: isSelected ? 4 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: isSelected ? "white" : theme.colors.text,
                }}
              >
                {topic}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* No Results */}
      {filteredTopics.length === 0 && searchQuery && (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 40,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.text + "66",
              textAlign: "center",
            }}
          >
            No topics found for "{searchQuery}"
          </Text>
          <TouchableOpacity
            onPress={clearSearch}
            style={{
              marginTop: 16,
              backgroundColor: "#8B5CF6",
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "white",
              }}
            >
              Clear Search
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
