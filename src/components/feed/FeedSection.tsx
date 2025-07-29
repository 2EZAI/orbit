import React from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

interface SectionProps {
  title: string;
  data: any[];
  layout: "horizontal" | "grid";
  onSeeAll: () => void;
  renderItem: ({ item }: { item: any }) => React.ReactElement;
  loading: boolean;
}

export function FeedSection({
  title,
  data,
  layout,
  onSeeAll,
  renderItem,
  loading,
}: SectionProps) {
  const { theme } = useTheme();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.airbnbSection}>
      <View style={styles.airbnbSectionHeader}>
        <Text style={[styles.airbnbSectionTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
          <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
            See all
          </Text>
          <ChevronRight size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.sectionLoading}
          color={theme.colors.primary}
        />
      ) : layout === "grid" ? (
        <FlatList
          data={data}
          numColumns={2}
          key={"grid"}
          showsVerticalScrollIndicator={false}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.airbnbGridContainer}
        />
      ) : (
        <FlatList
          data={data}
          horizontal
          key={"horizontal"}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.airbnbHorizontalContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  airbnbSection: {
    marginBottom: 32,
  },
  airbnbSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  airbnbSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionLoading: {
    marginTop: 20,
  },
  airbnbGridContainer: {
    paddingHorizontal: 20,
  },
  airbnbHorizontalContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },
});
