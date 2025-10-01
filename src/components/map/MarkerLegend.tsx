import React, { useState } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "../ui/text";
import { Sheet } from "../ui/sheet";
import { Info, X } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

interface LegendItem {
  color: string;
  label: string;
  description: string;
}

const legendData: LegendItem[] = [
  // Event Types
  {
    color: "#22C55E",
    label: "User Events",
    description: "Events created by community members",
  },
  {
    color: "#EF4444",
    label: "Ticketmaster",
    description: "Official events from Ticketmaster",
  },

  // Event Categories
  {
    color: "#EC4899",
    label: "Music & Concerts",
    description: "Live music performances and concerts",
  },
  {
    color: "#F59E0B",
    label: "Food & Dining",
    description: "Restaurants, food events, and dining experiences",
  },
  {
    color: "#10B981",
    label: "Sports & Fitness",
    description: "Athletic events, sports games, and fitness activities",
  },
  {
    color: "#6366F1",
    label: "Business & Networking",
    description: "Professional events and networking opportunities",
  },
  {
    color: "#3B82F6",
    label: "Arts & Culture",
    description: "Museums, galleries, and cultural events",
  },
  {
    color: "#A855F7",
    label: "Nightlife & Parties",
    description: "Clubs, bars, and party events",
  },

  // Location Types
  {
    color: "#06B6D4",
    label: "Beaches",
    description: "Beach locations and waterfront areas",
  },
  {
    color: "#16A34A",
    label: "Parks & Recreation",
    description: "Parks, hiking trails, and outdoor spaces",
  },
  {
    color: "#DC2626",
    label: "Gyms & Fitness",
    description: "Fitness centers and workout facilities",
  },
  {
    color: "#6B7280",
    label: "Other Locations",
    description: "Various other points of interest",
  },
];

interface MarkerLegendProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarkerLegend({ isOpen, onClose }: MarkerLegendProps) {
  const { theme } = useTheme();

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
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text
              style={[
                { fontSize: 20, fontWeight: "700", color: theme.colors.text },
              ]}
            >
              Map Marker Colors
            </Text>
            <Text
              style={[
                { fontSize: 14, color: theme.colors.text + "CC", marginTop: 4 },
              ]}
            >
              Each marker color represents a different type of event or location
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

        {/* Legend Items */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12 }}>
            {legendData.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                {/* Color Circle */}
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: item.color,
                    marginRight: 12,
                    borderWidth: 2,
                    borderColor: "white",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                />

                {/* Label and Description */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      {
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.colors.text,
                        marginBottom: 2,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      {
                        fontSize: 13,
                        color: theme.colors.text + "CC",
                        lineHeight: 18,
                      },
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer Note */}
        <View
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(139, 92, 246, 0.2)",
          }}
        >
          <Text
            style={[
              {
                fontSize: 13,
                color: theme.colors.text + "CC",
                textAlign: "center",
                lineHeight: 18,
              },
            ]}
          >
            💡 Tip: Selected markers will always show in purple regardless of
            their type
          </Text>
        </View>
      </View>
    </Sheet>
  );
}
