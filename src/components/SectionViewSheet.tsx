import { Clock, MapPin, Search, Users, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "~/src/components/ui/text";

const { width: screenWidth } = Dimensions.get("window");

interface SectionViewSheetProps {
  isOpen: boolean;
  section: any;
  data: any[];
  isLoading?: boolean;
  onClose: () => void;
  onItemSelect: (item: any) => void;
  theme: any;
}

export function SectionViewSheet({
  isOpen,
  section,
  data,
  isLoading = false,
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
              <Clock size={12} color={theme.colors.text} />
              <Text style={[styles.metaText, { color: theme.colors.text }]}>
                {item.date}
              </Text>
            </View>
          )}

          {item.location && (
            <View style={styles.metaRow}>
              <MapPin size={12} color={theme.colors.text} />
              <Text
                style={[styles.metaText, { color: theme.colors.text }]}
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
        style={[styles.container, { backgroundColor: theme.colors.card }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {section?.title || "All Items"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text }]}>
              {filteredData.length} items
            </Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search
            size={20}
            color={theme.colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search events and places..."
            placeholderTextColor={theme.colors.text}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Items List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading {section?.title || "items"}...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
          />
        )}
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
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 26,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    backgroundColor: "transparent",
    borderWidth: 0,
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
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
});
