import React, { useMemo } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "../ui/text";
import { Sheet } from "../ui/sheet";
import { X, Filter } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

export interface FilterState {
  [key: string]: boolean;
}

interface FilterOption {
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  category: "type" | "event-category" | "location-category";
  count: number;
}

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
  if (cat.includes("art") || cat.includes("culture") || cat.includes("museum"))
    return "🎨";
  if (
    cat.includes("party") ||
    cat.includes("nightlife") ||
    cat.includes("club") ||
    cat.includes("bar")
  )
    return "🌙";
  if (cat.includes("beach") || cat.includes("water")) return "🏖️";
  if (cat.includes("park") || cat.includes("outdoor") || cat.includes("nature"))
    return "🌳";
  if (cat.includes("tech") || cat.includes("digital")) return "💻";
  if (cat.includes("health") || cat.includes("medical")) return "🏥";
  if (cat.includes("education") || cat.includes("school")) return "📚";
  if (cat.includes("shopping") || cat.includes("retail")) return "🛍️";
  if (cat.includes("travel") || cat.includes("tourism")) return "✈️";
  if (cat.includes("entertainment") || cat.includes("fun")) return "🎪";
  if (cat.includes("community") || cat.includes("social")) return "👥";
  return "📍"; // Default icon
};

// Dynamic color assignment based on category
const getCategoryColor = (category: string, index: number): string => {
  const colors = [
    "#EC4899", // Pink
    "#F59E0B", // Orange
    "#10B981", // Emerald
    "#6366F1", // Indigo
    "#3B82F6", // Blue
    "#A855F7", // Purple
    "#06B6D4", // Cyan
    "#16A34A", // Green
    "#DC2626", // Red
    "#8B5CF6", // Violet
    "#14B8A6", // Teal
    "#F97316", // Orange-600
  ];
  const cat = category.toLowerCase();

  // Assign specific colors to common categories
  if (cat.includes("music")) return "#EC4899";
  if (cat.includes("food")) return "#F59E0B";
  if (cat.includes("sport")) return "#10B981";
  if (cat.includes("business")) return "#6366F1";
  if (cat.includes("art") || cat.includes("culture")) return "#3B82F6";
  if (cat.includes("nightlife") || cat.includes("party")) return "#A855F7";
  if (cat.includes("beach")) return "#06B6D4";
  if (cat.includes("park")) return "#16A34A";

  // Use index-based color for other categories
  return colors[index % colors.length];
};

interface MarkerFilterProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  eventsList: any[];
  locationsList: any[];
}

export function MarkerFilter({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  eventsList,
  locationsList,
}: MarkerFilterProps) {
  const { theme } = useTheme();

  // Generate dynamic filters based on actual data
  const dynamicFilters = useMemo(() => {
    const categories = new Map<string, { count: number; type: string }>();

    // Analyze event data
    eventsList.forEach((event) => {
      // Event source types - user-friendly, no business names
      const sourceType =
        event.source === "user"
          ? "community-events"
          : (typeof event.source === "string" &&
              event.source.includes("ticket")) ||
            event.source === "ticketmaster"
          ? "ticketed-events"
          : "featured-events"; // Generic term for any external source

      const existing = categories.get(sourceType);
      categories.set(sourceType, {
        count: (existing?.count || 0) + 1,
        type: "source",
      });

      // Event categories
      if (event.categories && Array.isArray(event.categories)) {
        event.categories.forEach((cat: any) => {
          if (cat && cat.name && typeof cat.name === "string") {
            const catKey = `event-${cat.name
              .toLowerCase()
              .replace(/\s+/g, "-")}`;
            const existing = categories.get(catKey);
            categories.set(catKey, {
              count: (existing?.count || 0) + 1,
              type: "event-category",
            });
          }
        });
      }
    });

    // Analyze location data - prioritize categories over types
    console.log(
      "🔍 [MarkerFilter] Processing",
      locationsList.length,
      "locations"
    );
    let locationsWithCategories = 0;
    let locationsWithTypes = 0;

    locationsList.forEach((location) => {
      // PRIORITY 1: Location categories (most meaningful filters)
      if (
        location.category &&
        location.category.name &&
        typeof location.category.name === "string"
      ) {
        locationsWithCategories++;
        const catKey = `location-${location.category.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        const existing = categories.get(catKey);
        categories.set(catKey, {
          count: (existing?.count || 0) + 1,
          type: "location-category",
        });

        if (locationsWithCategories <= 5) {
          console.log(
            "📍 [MarkerFilter] Location category:",
            location.category.name,
            "for",
            location.name
          );
        }
      }

      // PRIORITY 2: Location types (only if no category is available)
      // This prevents showing generic "googleApi" or "static" filters
      if (
        location.type &&
        typeof location.type === "string" &&
        (!location.category || !location.category.name) &&
        // Only include meaningful types, exclude technical ones
        ![
          "googleapi",
          "google",
          "api",
          "static",
          "external",
          "third-party",
          "database",
        ].includes(location.type.toLowerCase())
      ) {
        locationsWithTypes++;
        const typeKey = `type-${location.type
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        const existing = categories.get(typeKey);
        categories.set(typeKey, {
          count: (existing?.count || 0) + 1,
          type: "location-type",
        });

        if (locationsWithTypes <= 5) {
          console.log(
            "🏷️ [MarkerFilter] Location type:",
            location.type,
            "for",
            location.name
          );
        }
      }
    });

    console.log("📊 [MarkerFilter] Summary:", {
      locationsWithCategories,
      locationsWithTypes,
      totalCategories: categories.size,
    });

    // Convert to filter options
    const filterOptions: FilterOption[] = [];
    let colorIndex = 0;

    categories.forEach((value, key) => {
      // Transform technical terms to user-friendly names
      let rawLabel = key.replace(/^(event-|location-|type-)/, "");

      // Replace technical terms with user-friendly ones ONLY for types, not categories
      const technicalToFriendly: { [key: string]: string } = {
        foursquare: "Local Spots",
        yelp: "Popular Spots",
        facebook: "Social Events",
        instagram: "Social Events",
        // Note: We exclude technical terms like googleapi, api, google, external, etc.
        // as they should not appear in filters anymore due to the filtering logic above
      };

      // Only apply technical replacements to types, NOT to location categories
      let friendlyLabel = rawLabel;
      if (value.type === "location-type") {
        // Only replace for location types, not categories
        for (const [tech, friendly] of Object.entries(technicalToFriendly)) {
          if (rawLabel.toLowerCase().includes(tech)) {
            friendlyLabel = friendly;
            break;
          }
        }
      }

      // If no replacement found, format normally
      if (friendlyLabel === rawLabel) {
        friendlyLabel = rawLabel
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      const label = friendlyLabel;

      let category: "type" | "event-category" | "location-category";
      let description: string;

      if (key.startsWith("community-events")) {
        category = "type";
        description = "Events created by community members";
      } else if (key.startsWith("ticketed-events")) {
        category = "type";
        description = "Professional ticketed events";
      } else if (key.startsWith("featured-events")) {
        category = "type";
        description = "Featured events and activities";
      } else if (value.type === "event-category") {
        category = "event-category";
        description = `Events in ${label}`;
      } else {
        category = "location-category";
        // Better descriptions for location categories
        if (label === "Places") {
          description = "Popular places and points of interest";
        } else if (label === "Local Spots") {
          description = "Local businesses and attractions";
        } else if (label === "Popular Spots") {
          description = "Highly rated local venues";
        } else if (label === "Featured Spots") {
          description = "Curated locations and venues";
        } else {
          description = `${label} locations`;
        }
      }

      filterOptions.push({
        key,
        label,
        description,
        color: getCategoryColor(label, colorIndex++),
        icon: getCategoryIcon(label),
        category,
        count: value.count,
      });

      // Debug the first few filter options
      if (filterOptions.length <= 10) {
        console.log("🏷️ [MarkerFilter] Filter created:", {
          key,
          label,
          category: value.type,
          count: value.count,
        });
      }
    });

    console.log("🎯 [MarkerFilter] Final filter summary:", {
      totalFilters: filterOptions.length,
      filterLabels: filterOptions.map((f) => f.label).slice(0, 10),
    });

    // Sort by count (highest first) within each category
    return filterOptions.sort((a, b) => {
      if (a.category !== b.category) {
        const order = ["type", "event-category", "location-category"];
        return order.indexOf(a.category) - order.indexOf(b.category);
      }
      return b.count - a.count;
    });
  }, [eventsList, locationsList]);

  const toggleFilter = (key: string) => {
    onFilterChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  const selectAll = () => {
    const allTrue = dynamicFilters.reduce((acc, option) => {
      acc[option.key] = true;
      return acc;
    }, {} as FilterState);
    onFilterChange(allTrue);
  };

  const selectNone = () => {
    const allFalse = dynamicFilters.reduce((acc, option) => {
      acc[option.key] = false;
      return acc;
    }, {} as FilterState);
    onFilterChange(allFalse);
  };

  const getFiltersByCategory = (category: string) => {
    return dynamicFilters.filter((option) => option.category === category);
  };

  const renderFilterSection = (title: string, category: string) => {
    const options = getFiltersByCategory(category);

    // Don't render section if no options
    if (options.length === 0) return null;

    return (
      <View style={{ marginBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={[
              {
                fontSize: 18,
                fontWeight: "700",
                color: theme.colors.text,
              },
            ]}
          >
            {title}
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.card,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: theme.colors.text + "CC",
              }}
            >
              {options.length} type{options.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {options.map((option) => {
            const isActive = filters[option.key];

            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => toggleFilter(option.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: isActive
                    ? `${option.color}15`
                    : theme.colors.card,
                  borderWidth: 1,
                  borderColor: isActive ? option.color : theme.colors.border,
                }}
              >
                {/* Color indicator and icon */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: option.color,
                    marginRight: 12,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{option.icon}</Text>
                </View>

                {/* Label and description */}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={[
                        {
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.colors.text,
                          flex: 1,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <View
                      style={{
                        backgroundColor: `${option.color}20`,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: `${option.color}40`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: option.color,
                        }}
                      >
                        {option.count}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      {
                        fontSize: 12,
                        color: theme.colors.text + "CC",
                        lineHeight: 16,
                      },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>

                {/* Toggle indicator */}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isActive
                      ? option.color
                      : theme.colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {isActive && (
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      ✓
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <View
        style={[
          { backgroundColor: theme.colors.background },
          { flex: 1, padding: 20 },
        ]}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            paddingBottom: 16,
          }}
        >
          <View>
            <Text
              style={[
                { fontSize: 20, fontWeight: "700", color: theme.colors.text },
              ]}
            >
              Filter Map Markers
            </Text>
            <Text
              style={[
                { fontSize: 14, color: theme.colors.text + "CC", marginTop: 4 },
              ]}
            >
              Show or hide different types of events and locations
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(139, 92, 246, 0.2)",
            }}
          >
            <X size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            onPress={selectAll}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Select All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={selectNone}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Sections */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderFilterSection("Event Types", "type")}
          {renderFilterSection("Event Categories", "event-category")}
          {renderFilterSection("Location Categories", "location-category")}
        </ScrollView>
      </View>
    </Sheet>
  );
}

// Generate default filter state based on data
export const generateDefaultFilters = (
  eventsList: any[],
  locationsList: any[]
): FilterState => {
  const filters: FilterState = {};

  // Add event source types - user-friendly names only
  const sources = new Set<string>();
  eventsList.forEach((event) => {
    if (event.source === "user") sources.add("community-events");
    else if (
      (typeof event.source === "string" && event.source.includes("ticket")) ||
      event.source === "ticketmaster"
    )
      sources.add("ticketed-events");
    else sources.add("featured-events"); // No technical terms
  });

  sources.forEach((source) => {
    filters[source] = true;
  });

  // Add event categories
  eventsList.forEach((event) => {
    if (event.categories && Array.isArray(event.categories)) {
      event.categories.forEach((cat: any) => {
        if (cat && cat.name && typeof cat.name === "string") {
          const key = `event-${cat.name.toLowerCase().replace(/\s+/g, "-")}`;
          filters[key] = true;
        }
      });
    }
  });

  // Add location categories
  locationsList.forEach((location) => {
    if (
      location.category &&
      location.category.name &&
      typeof location.category.name === "string"
    ) {
      const key = `location-${location.category.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
      filters[key] = true;
    }
    if (location.type && typeof location.type === "string") {
      const key = `type-${location.type.toLowerCase().replace(/\s+/g, "-")}`;
      filters[key] = true;
    }
  });

  return filters;
};
