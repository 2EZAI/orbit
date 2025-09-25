import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Sheet } from "~/src/components/ui/sheet";
import { Input } from "~/src/components/ui/input";
import { useTheme } from "~/src/components/ThemeProvider";
import { supabase } from "~/src/lib/supabase";
import { ChevronDown, Check, X, Search } from "lucide-react-native";

interface Topic {
  id: string;
  name: string;
}

interface TopicSingleSelectDropdownProps {
  selectedId: string;
  selectedName?: string;
  onSelect: (id: string) => void; // keep API consistent with existing CategorySection usage
  placeholder?: string;
  label?: string;
}

export function TopicSingleSelectDropdown({
  selectedId,
  selectedName,
  onSelect,
  placeholder = "Choose a category",
  label,
}: TopicSingleSelectDropdownProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchTopics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("topics")
          .select("id, name")
          .order("name");
        if (error) throw error;
        if (mounted) setTopics((data || []) as Topic[]);
      } catch (e) {
        console.error("Error fetching topics:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTopics();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedLabel = useMemo(() => {
    if (selectedName && selectedName.trim() !== "") return selectedName;
    const found = topics.find((t) => t.id === selectedId);
    return found?.name;
  }, [selectedId, selectedName, topics]);

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [topics, search]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <View>
      {label ? (
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      ) : null}

      {/* Field (press to open) */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
        }}
      >
        <Text
          style={{
            color: selectedLabel ? theme.colors.text : theme.colors.text + "80",
            fontSize: 16,
            fontWeight: selectedLabel ? "600" : "500",
          }}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={18} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Dropdown Sheet */}
      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingTop: 8,
              paddingBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.colors.text,
                flex: 1,
              }}
            >
              Select Category
            </Text>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              style={{
                padding: 8,
                borderRadius: 999,
                backgroundColor: theme.colors.card,
              }}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ marginBottom: 12 }}>
            <Input
              placeholder="Search categories..."
              value={search}
              onChangeText={setSearch as any}
              placeholderTextColor={theme.colors.text + "80"}
              style={{
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                paddingLeft: 40,
              }}
            />
            <View style={{ position: "absolute", left: 12, top: 12 }}>
              <Search size={18} color={theme.colors.text} />
            </View>
          </View>

          {/* List */}
          {loading ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 24,
              }}
            >
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredTopics}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 16,
                          fontWeight: isSelected ? "700" : "500",
                        }}
                      >
                        {item.name}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Check
                        size={18}
                        color={theme.colors.primary || "#8B5CF6"}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <Text style={{ color: theme.colors.text + "99" }}>
                    No categories found
                  </Text>
                </View>
              )}
              style={{ maxHeight: 400 }}
            />
          )}
        </View>
      </Sheet>
    </View>
  );
}

export default TopicSingleSelectDropdown;
