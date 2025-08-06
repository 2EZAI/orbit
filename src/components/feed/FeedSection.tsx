import React from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

interface SectionProps {
  title: string;
  data: any[];
  layout: "horizontal" | "grid";
  onSeeAll: () => void;
  renderItem: ({ item }: { item: any }) => React.ReactElement;
  loading: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function FeedSection({
  title,
  data,
  layout,
  onSeeAll,
  renderItem,
  loading,
  subtitle,
  icon,
}: SectionProps) {
  const { theme } = useTheme();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.modernSection}>
      {/* Enhanced Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            {icon && (
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.primary + "15" },
                ]}
              >
                {icon}
              </View>
            )}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
          </View>

          {subtitle && (
            <Text
              style={[
                styles.sectionSubtitle,
                { color: theme.colors.text + "80" },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onSeeAll}
          style={[
            styles.seeAllButton,
            { backgroundColor: theme.colors.primary + "10" },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
            See all
          </Text>
          <ChevronRight
            size={16}
            color={theme.colors.primary}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.text + "60" }]}
          >
            Loading amazing content...
          </Text>
        </View>
      ) : layout === "grid" ? (
        <FlatList
          data={data}
          numColumns={2}
          key={"grid"}
          showsVerticalScrollIndicator={false}
          keyExtractor={(_, idx) => `grid-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
        />
      ) : (
        <FlatList
          data={data}
          horizontal
          key={"horizontal"}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, idx) => `horizontal-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.horizontalContainer}
          snapToInterval={280} // Assuming card width + margin
          decelerationRate="fast"
        />
      )}

      {/* Data Count Indicator */}
      <View style={styles.dataIndicator}>
        <Text
          style={[
            styles.dataIndicatorText,
            { color: theme.colors.text + "60" },
          ]}
        >
          {data.length} {data.length === 1 ? "item" : "items"} available
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modernSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
  },
  gridContainer: {
    paddingHorizontal: 20,
  },
  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  horizontalContainer: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  dataIndicator: {
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  dataIndicatorText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
