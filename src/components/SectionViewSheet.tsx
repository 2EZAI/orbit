import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { X, Search, MapPin, Clock, Users } from "lucide-react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface SectionViewSheetProps {
  isOpen: boolean;
  section: any;
  data: any[];
  onClose: () => void;
  onItemSelect: (item: any) => void;
  theme: any;
}

export function SectionViewSheet({
  isOpen,
  section,
  data,
  onClose,
  onItemSelect,
  theme,
}: SectionViewSheetProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter data based on search
  const filteredData = data.filter(
    (item) =>
      (item.title || item.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.location || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: theme.colors.card }]}
      onPress={() => onItemSelect(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{
          uri:
            item.image ||
            item.image_urls?.[0] ||
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
        }}
        style={styles.itemImage}
        resizeMode="cover"
      />

      <View style={styles.itemContent}>
        <Text
          style={[styles.itemTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {item.title || item.name}
        </Text>

        <View style={styles.itemMeta}>
          {item.date && (
            <View style={styles.metaRow}>
              <Clock size={12} color={theme.colors.textSecondary} />
              <Text
                style={[styles.metaText, { color: theme.colors.textSecondary }]}
              >
                {item.date}
              </Text>
            </View>
          )}

          {item.location && (
            <View style={styles.metaRow}>
              <MapPin size={12} color={theme.colors.textSecondary} />
              <Text
                style={[styles.metaText, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.location}
              </Text>
            </View>
          )}

          {item.attendees > 0 && (
            <View style={styles.metaRow}>
              <Users size={12} color={theme.colors.primary} />
              <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                {item.attendees}
              </Text>
            </View>
          )}
        </View>

        {item.isLocation && (
          <View
            style={[
              styles.locationBadge,
              { backgroundColor: theme.colors.primary + "20" },
            ]}
          >
            <Text
              style={[
                styles.locationBadgeText,
                { color: theme.colors.primary },
              ]}
            >
              Location
            </Text>
          </View>
        )}

        {item.is_ticketmaster && (
          <View
            style={[styles.ticketmasterBadge, { backgroundColor: "#ff6b6b20" }]}
          >
            <Text style={[styles.ticketmasterBadgeText, { color: "#ff6b6b" }]}>
              Ticketmaster
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {section?.title || "All Items"}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {filteredData.length} items
            </Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <Search
            size={20}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search events and places..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Items List */}
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  row: {
    justifyContent: "space-between",
  },
  itemCard: {
    width: (screenWidth - 60) / 2,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: 120,
  },
  itemContent: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 20,
  },
  itemMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
    flex: 1,
  },
  locationBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 8,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  ticketmasterBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 8,
  },
  ticketmasterBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
