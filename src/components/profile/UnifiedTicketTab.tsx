import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useMyTickets, TicketStatus } from "~/hooks/useMyTickets";
import TicketCard from "./TicketCard";

const STATUS_OPTIONS: { label: string; value?: TicketStatus }[] = [
  { label: "All Tickets", value: undefined },
  { label: "Active", value: "active" },
  { label: "Used", value: "used" },
  { label: "Transferred", value: "transferred" },
  { label: "Refunded", value: "refunded" },
  { label: "Canceled", value: "canceled" },
];

export default function UnifiedTicketTab() {
  const { theme } = useTheme();
  const [selectedStatus, setSelectedStatus] = useState<
    TicketStatus | undefined
  >(undefined);

  const { data, isLoading, isError, error, refetch } = useMyTickets({
    status: selectedStatus,
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;

  const activeFilterLabel = useMemo(
    () =>
      STATUS_OPTIONS.find((opt) => opt.value === selectedStatus)?.label ||
      "All Tickets",
    [selectedStatus]
  );

  const onRefresh = async () => {
    await refetch();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      {/* Header / filter row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.text + "88",
              fontWeight: "600",
            }}
          >
            Filter by status
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.colors.text,
            }}
          >
            {activeFilterLabel}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.text + "88",
            }}
          >
            {total} ticket{total === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      {/* Status chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 }}
        style={{ marginBottom: 8 }}
      >
        {STATUS_OPTIONS.map((option) => {
          const isActive = option.value === selectedStatus;
          return (
            <View
              key={option.label}
              style={{
                marginRight: 8,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.card,
                  borderWidth: isActive ? 0 : 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text
                  onPress={() => setSelectedStatus(option.value)}
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isActive ? "white" : theme.colors.text,
                  }}
                >
                  {option.label}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading && tickets.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: theme.colors.text + "99",
            }}
          >
            Loading your tickets...
          </Text>
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.colors.text,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Unable to load tickets
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text + "99",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {error || "Please try again in a moment."}
          </Text>
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text
              onPress={onRefresh}
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "white",
              }}
            >
              Retry
            </Text>
          </View>
        </View>
      ) : tickets.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.colors.text,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            No tickets yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text + "99",
              textAlign: "center",
            }}
          >
            When you purchase tickets for events on Orbit, they’ll appear here
            for easy access.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TicketCard ticket={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
