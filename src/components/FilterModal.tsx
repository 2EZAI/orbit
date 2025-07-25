import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { X, Calendar, Users, Tag } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  filters: {
    categories: string[];
    dateRange: string;
    minAttendees: number;
    maxAttendees: number;
  };
  onApplyFilters: (filters: any) => void;
  theme: any;
}

export function FilterModal({
  isVisible,
  onClose,
  filters,
  onApplyFilters,
  theme,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const dateRangeOptions = [
    { key: "all", label: "Any time", icon: "📅" },
    { key: "today", label: "Today", icon: "📅" },
    { key: "week", label: "This week", icon: "🗓️" },
    { key: "month", label: "This month", icon: "📆" },
  ];

  const categoryOptions = [
    { key: "music", label: "Music", icon: "🎵" },
    { key: "food", label: "Food & Drink", icon: "🍽️" },
    { key: "sports", label: "Sports", icon: "⚽" },
    { key: "art", label: "Art & Culture", icon: "🎨" },
    { key: "business", label: "Business", icon: "💼" },
    { key: "tech", label: "Technology", icon: "💻" },
    { key: "health", label: "Health & Fitness", icon: "💪" },
    { key: "entertainment", label: "Entertainment", icon: "🎭" },
  ];

  const attendeeRanges = [
    { key: "any", label: "Any size", min: 0, max: 1000 },
    { key: "small", label: "1-10 people", min: 1, max: 10 },
    { key: "medium", label: "11-50 people", min: 11, max: 50 },
    { key: "large", label: "50+ people", min: 50, max: 1000 },
  ];

  const handleCategoryToggle = (categoryKey: string) => {
    const newCategories = localFilters.categories.includes(categoryKey)
      ? localFilters.categories.filter((c) => c !== categoryKey)
      : [...localFilters.categories, categoryKey];

    setLocalFilters({
      ...localFilters,
      categories: newCategories,
    });
  };

  const handleDateRangeSelect = (dateRange: string) => {
    setLocalFilters({
      ...localFilters,
      dateRange,
    });
  };

  const handleAttendeeRangeSelect = (range: { min: number; max: number }) => {
    setLocalFilters({
      ...localFilters,
      minAttendees: range.min,
      maxAttendees: range.max,
    });
  };

  const clearFilters = () => {
    setLocalFilters({
      categories: [],
      dateRange: "all",
      minAttendees: 0,
      maxAttendees: 1000,
    });
  };

  const applyFilters = () => {
    onApplyFilters(localFilters);
  };

  const getCurrentAttendeeRange = () => {
    return (
      attendeeRanges.find(
        (range) =>
          range.min === localFilters.minAttendees &&
          range.max === localFilters.maxAttendees
      )?.key || "custom"
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Filters
          </Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
            <Text style={[styles.clearText, { color: theme.colors.primary }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Range Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color={theme.colors.text} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Date Range
              </Text>
            </View>
            <View style={styles.optionsGrid}>
              {dateRangeOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        localFilters.dateRange === option.key
                          ? theme.colors.primary
                          : theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => handleDateRangeSelect(option.key)}
                >
                  <Text style={styles.optionEmoji}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          localFilters.dateRange === option.key
                            ? "#fff"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Tag size={20} color={theme.colors.text} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Categories
              </Text>
            </View>
            <View style={styles.optionsGrid}>
              {categoryOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: localFilters.categories.includes(
                        option.key
                      )
                        ? theme.colors.primary
                        : theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => handleCategoryToggle(option.key)}
                >
                  <Text style={styles.optionEmoji}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: localFilters.categories.includes(option.key)
                          ? "#fff"
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Attendees Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color={theme.colors.text} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Event Size
              </Text>
            </View>
            <View style={styles.optionsGrid}>
              {attendeeRanges.map((range) => (
                <TouchableOpacity
                  key={range.key}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        getCurrentAttendeeRange() === range.key
                          ? theme.colors.primary
                          : theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => handleAttendeeRangeSelect(range)}
                >
                  <Text style={styles.optionEmoji}>👥</Text>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          getCurrentAttendeeRange() === range.key
                            ? "#fff"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.applyButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={applyFilters}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sliderContainer: {
    marginVertical: 16,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
