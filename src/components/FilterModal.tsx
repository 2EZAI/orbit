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
import { useTheme } from "~/src/components/ThemeProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Simple filter state to match existing MapControls interface
interface FilterState {
  [key: string]: boolean;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  eventsList?: any[];
  locationsList?: any[];
}

export function FilterModal({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  eventsList = [],
  locationsList = [],
}: FilterModalProps) {
  const { theme } = useTheme();
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Set default filters when modal opens and no filters are set
  React.useEffect(() => {
    if (isOpen && (!filters || Object.keys(filters).length === 0)) {
      const defaultFilters: FilterState = {};

      // Enable all event source types by default
      defaultFilters["community-events"] = true;
      defaultFilters["ticketed-events"] = true;
      defaultFilters["featured-events"] = true;

      // Enable all event categories by default
      eventsList.forEach((event) => {
        if (event.categories && Array.isArray(event.categories)) {
          event.categories.forEach((cat: any) => {
            if (cat && cat.name && typeof cat.name === "string") {
              const catKey = `event-${cat.name
                .toLowerCase()
                .replace(/\s+/g, "-")}`;
              defaultFilters[catKey] = true;
            }
          });
        }
      });

      // Enable all location categories by default
      locationsList.forEach((location) => {
        if (location.category && location.category.name) {
          const catKey = `location-${location.category.name
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          defaultFilters[catKey] = true;
        }
      });

      // Enable all location types by default (for locations without categories)
      locationsList.forEach((location) => {
        if (location.type && !location.category?.name) {
          const typeKey = `type-${location.type
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          defaultFilters[typeKey] = true;
        }
      });

      setLocalFilters(defaultFilters);
    }
  }, [isOpen, filters, eventsList, locationsList]);

  const dateRangeOptions = [
    { key: "all", label: "Any time", icon: "📅" },
    { key: "today", label: "Today", icon: "📅" },
    { key: "week", label: "This week", icon: "🗓️" },
    { key: "month", label: "This month", icon: "📆" },
  ];

  // Dynamic icon mapping for categories
  const getCategoryIcon = (category: string): string => {
    const cat = category.toLowerCase();
    if (cat.includes("music") || cat.includes("concert")) return "🎵";
    if (
      cat.includes("food") ||
      cat.includes("dining") ||
      cat.includes("restaurant")
    )
      return "🍽️";
    if (cat.includes("sport") || cat.includes("fitness") || cat.includes("gym"))
      return "⚽";
    if (
      cat.includes("business") ||
      cat.includes("work") ||
      cat.includes("professional")
    )
      return "💼";
    if (
      cat.includes("art") ||
      cat.includes("culture") ||
      cat.includes("museum")
    )
      return "🎨";
    if (
      cat.includes("tech") ||
      cat.includes("technology") ||
      cat.includes("digital")
    )
      return "💻";
    if (
      cat.includes("health") ||
      cat.includes("fitness") ||
      cat.includes("wellness")
    )
      return "💪";
    if (
      cat.includes("party") ||
      cat.includes("nightlife") ||
      cat.includes("club") ||
      cat.includes("bar")
    )
      return "🌙";
    if (
      cat.includes("entertainment") ||
      cat.includes("theater") ||
      cat.includes("show")
    )
      return "🎭";
    if (cat.includes("beach") || cat.includes("water")) return "🏖️";
    if (
      cat.includes("park") ||
      cat.includes("outdoor") ||
      cat.includes("nature")
    )
      return "🌳";
    if (cat.includes("shopping") || cat.includes("retail")) return "🛍️";
    if (cat.includes("travel") || cat.includes("tourism")) return "✈️";
    if (cat.includes("education") || cat.includes("learning")) return "📚";
    return "🏷️"; // Default icon
  };

  // Extract dynamic categories from location categories
  const locationCategoryOptions = React.useMemo(() => {
    const categorySet = new Set<string>();
    const categoryCounts = new Map<string, number>();

    locationsList.forEach((location: any) => {
      if (location.category?.name) {
        categorySet.add(location.category.name);
        categoryCounts.set(
          location.category.name,
          (categoryCounts.get(location.category.name) || 0) + 1
        );
      }
    });

    return Array.from(categorySet)
      .map((category) => ({
        key: category,
        label: category,
        icon: getCategoryIcon(category),
        type: "location-category" as const,
        count: categoryCounts.get(category) || 0,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [locationsList]);

  // Extract dynamic types from locations (this is where "Places" likely comes from)
  const locationTypeOptions = React.useMemo(() => {
    const typeSet = new Set<string>();
    const typeCounts = new Map<string, number>();
    const categorizedCount = new Map<string, number>();
    const uncategorizedCount = new Map<string, number>();

    locationsList.forEach((location: any) => {
      if (location.type) {
        typeSet.add(location.type);
        typeCounts.set(location.type, (typeCounts.get(location.type) || 0) + 1);

        // Track if this type has proper categories or not
        if (location.category?.name) {
          categorizedCount.set(
            location.type,
            (categorizedCount.get(location.type) || 0) + 1
          );
        } else {
          uncategorizedCount.set(
            location.type,
            (uncategorizedCount.get(location.type) || 0) + 1
          );
        }
      }
    });

    return Array.from(typeSet)
      .map((type) => ({
        key: type,
        label: type,
        icon: getCategoryIcon(type),
        type: "location-type" as const,
        count: typeCounts.get(type) || 0,
        categorized: categorizedCount.get(type) || 0,
        uncategorized: uncategorizedCount.get(type) || 0,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [locationsList]);

  // Extract dynamic topics from events
  const eventTopicOptions = React.useMemo(() => {
    const topicSet = new Set<string>();
    eventsList.forEach((event: any) => {
      if (event.event_topics) {
        event.event_topics.forEach((eventTopic: any) => {
          if (eventTopic.topics?.name) {
            topicSet.add(eventTopic.topics.name);
          }
        });
      }
      // Also include event category if available
      if (event.category?.name) {
        topicSet.add(event.category.name);
      }
    });
    return Array.from(topicSet)
      .map((topic) => ({
        key: topic,
        label: topic,
        icon: getCategoryIcon(topic),
        type: "event-topic" as const,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [eventsList]);

  // Extract uncategorized locations (locations without proper category.name)
  const uncategorizedLocationOptions = React.useMemo(() => {
    const typeSet = new Set<string>();
    const typeCounts = new Map<string, number>();

    locationsList.forEach((location: any) => {
      // Only include locations that don't have a proper category.name
      if (!location.category?.name && location.type) {
        typeSet.add(location.type);
        typeCounts.set(location.type, (typeCounts.get(location.type) || 0) + 1);
      }
    });

    return Array.from(typeSet)
      .map((type) => ({
        key: `uncategorized-${type}`,
        label: `${type} (Uncategorized)`,
        icon: getCategoryIcon(type),
        type: "uncategorized" as const,
        count: typeCounts.get(type) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [locationsList]);

  // Debug: Log the data structure to understand what's happening
  React.useEffect(() => {
    if (locationsList.length > 0) {
      console.log("🔍 DETAILED FILTER DEBUG:");
      console.log("📊 Total locations received:", locationsList.length);

      // Analyze all locations, not just first 5
      const categoryAnalysis = {
        withCategoryName: 0,
        withCategoryId: 0,
        withBoth: 0,
        withNeither: 0,
        categoryNameValues: new Set<string>(),
        typeValues: new Set<string>(),
        sampleLocations: [] as Array<{
          name: any;
          type: any;
          categoryId: any;
          categoryName: any;
          fullCategory: any;
        }>,
      };

      locationsList.forEach((loc, index) => {
        const hasCategoryName = !!loc.category?.name;
        const hasCategoryId = !!loc.category_id;

        if (hasCategoryName) categoryAnalysis.withCategoryName++;
        if (hasCategoryId) categoryAnalysis.withCategoryId++;
        if (hasCategoryName && hasCategoryId) categoryAnalysis.withBoth++;
        if (!hasCategoryName && !hasCategoryId) categoryAnalysis.withNeither++;

        if (loc.category?.name)
          categoryAnalysis.categoryNameValues.add(loc.category.name);
        if (loc.type) categoryAnalysis.typeValues.add(loc.type);

        // Sample first 10 locations for detailed inspection
        if (index < 10) {
          categoryAnalysis.sampleLocations.push({
            name: loc.name,
            type: loc.type,
            categoryId: loc.category_id,
            categoryName: loc.category?.name,
            fullCategory: loc.category,
          });
        }
      });

      console.log("📊 Category Analysis:", {
        ...categoryAnalysis,
        categoryNameValues: Array.from(categoryAnalysis.categoryNameValues),
        typeValues: Array.from(categoryAnalysis.typeValues),
      });

      console.log("📊 Filter Results:");
      console.log(
        "  - Location Categories:",
        locationCategoryOptions.length,
        locationCategoryOptions
      );
      console.log(
        "  - Location Types:",
        locationTypeOptions.length,
        locationTypeOptions.slice(0, 10)
      );
      console.log(
        "  - Uncategorized:",
        uncategorizedLocationOptions.length,
        uncategorizedLocationOptions
      );
    }
  }, [
    locationsList,
    locationCategoryOptions,
    locationTypeOptions,
    uncategorizedLocationOptions,
  ]);

  const attendeeRanges = [
    { key: "any", label: "Any size", min: 0, max: 1000 },
    { key: "small", label: "1-10 people", min: 1, max: 10 },
    { key: "medium", label: "11-50 people", min: 11, max: 50 },
    { key: "large", label: "50+ people", min: 50, max: 1000 },
  ];

  const handleCategoryToggle = (categoryKey: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const handleDateRangeSelect = (dateRange: string) => {
    // For now, just log it since we're using simple boolean filters
    console.log("Date range selected:", dateRange);
  };

  const handleAttendeeRangeSelect = (range: { min: number; max: number }) => {
    // For now, just log it since we're using simple boolean filters
    console.log("Attendee range selected:", range);
  };

  const clearFilters = () => {
    setLocalFilters({});
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const getCurrentAttendeeRange = () => {
    // For now, just return "any" since we're using simple boolean filters
    return "any";
  };

  return (
    <Modal
      visible={isOpen}
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
                      backgroundColor: localFilters[option.key]
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

          {/* Location Categories Section */}
          {locationCategoryOptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tag size={20} color={theme.colors.text} />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Location Categories (
                  {locationCategoryOptions.reduce(
                    (sum, opt) => sum + opt.count,
                    0
                  )}
                  )
                </Text>
              </View>
              <View style={styles.optionsGrid}>
                {locationCategoryOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: localFilters[option.key]
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
                          color: localFilters[option.key]
                            ? "#fff"
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {option.label} ({option.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Location Types Section */}
          {locationTypeOptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tag size={20} color={theme.colors.text} />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Location Types (
                  {locationTypeOptions.reduce((sum, opt) => sum + opt.count, 0)}
                  )
                </Text>
              </View>
              <View style={styles.optionsGrid}>
                {locationTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: localFilters[option.key]
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
                          color: localFilters[option.key]
                            ? "#fff"
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {option.label} ({option.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Uncategorized Places Section */}
          {uncategorizedLocationOptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tag size={20} color={theme.colors.text} />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Uncategorized Places (
                  {uncategorizedLocationOptions.reduce(
                    (sum, opt) => sum + opt.count,
                    0
                  )}
                  )
                </Text>
              </View>
              <View style={styles.optionsGrid}>
                {uncategorizedLocationOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: localFilters[option.key]
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
                          color: localFilters[option.key]
                            ? "#fff"
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {option.label} ({option.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Event Topics Section */}
          {eventTopicOptions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tag size={20} color={theme.colors.text} />
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Event Topics
                </Text>
              </View>
              <View style={styles.optionsGrid}>
                {eventTopicOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: localFilters[option.key]
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
                          color: localFilters[option.key]
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
          )}

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
