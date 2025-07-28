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
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.airbnbSection}>
      <View style={styles.airbnbSectionHeader}>
        <Text style={styles.airbnbSectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See all</Text>
          <ChevronRight size={16} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.sectionLoading} color="#8B5CF6" />
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
    color: "#222",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    color: "#8B5CF6",
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
