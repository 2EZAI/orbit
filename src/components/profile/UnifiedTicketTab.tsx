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
import { useMyTickets, TicketStatus, Ticket } from "~/hooks/useMyTickets";
import TicketCard from "./TicketCard";
import { TicketDetailsSheet } from "./TicketDetailsSheet";
import { UnifiedData, UnifiedDetailsSheet } from "../map/UnifiedDetailsSheet";
import { ChatSelectionModal } from "../social/ChatSelectionModal";
import UnifiedShareSheet from "../map/UnifiedShareSheet";
import { IProposal } from "~/hooks/useProposals";
import type { Channel } from "stream-chat";
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

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    data: UnifiedData;
    isEventType: boolean;
  } | null>(null);
  const [chatShareSelection, setChatShareSelection] = useState<{
    proposal: IProposal | null;
    show: boolean;
    event: UnifiedData | null;
    isEventType: boolean;
  }>({
    proposal: null,
    show: false,
    event: null,
    isEventType: false,
  });
  const handleChatSelect = async (channel: Channel) => {
    if (!channel) return;
    try {
      // Ensure channel is watched before sending
      await channel.watch();
      if (chatShareSelection.proposal) {
        const message = await channel.sendMessage({
          text: "Check out this proposal!",
          type: "regular",
          data: {
            proposal: chatShareSelection.proposal,
            type: "proposal/share",
          },
        });
        // router.push(`/(app)/(chat)/channel/${channel.id}`);
      }
      if (chatShareSelection.event) {
        const attachmentType =
          chatShareSelection.event?.source === "ticketmaster"
            ? "ticketmaster"
            : chatShareSelection.isEventType
            ? "event"
            : "location";
        const createPostShareAttachment = (
          type: "event" | "location" | "ticketmaster"
        ) => {
          switch (type) {
            case "event":
              const eventData = chatShareSelection.event;
              return {
                type: "event_share",
                event_id: eventData?.id || "",
                event_data: eventData,
              };
            case "location":
              const locationData = chatShareSelection.event;
              return {
                type: "location_share",
                location_id: locationData?.id || "",
                location_data: locationData,
              };
            case "ticketmaster":
              const ticketmasterData = chatShareSelection.event;
              return {
                type: "ticketmaster_share",
                event_id: ticketmasterData?.id || "",
                event_data: {
                  id: ticketmasterData?.id,
                  name: ticketmasterData?.name,
                  description: ticketmasterData?.description,
                  image_urls: ticketmasterData?.image_urls,
                  start_datetime: ticketmasterData?.start_datetime,
                  venue_name: ticketmasterData?.venue_name,
                  address: ticketmasterData?.address,
                  city: ticketmasterData?.city,
                  state: ticketmasterData?.state,
                  source: "ticketmaster",
                },
              };
            default:
              return null;
          }
        };
        const attachment = createPostShareAttachment(attachmentType);
        await channel.sendMessage({
          text: `Check out ${chatShareSelection.event?.name} on Orbit!`,
          type: "regular",
          // Send attachment (like web app) for cross-platform compatibility
          attachments: attachment ? [attachment] : [],
        });
      }
      // Send the post as a custom message with attachment

      // Navigate to the chat
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    }
  };
  const { data, isLoading, isError, error, refetch } = useMyTickets({
    status: selectedStatus,
  });

  const tickets = data?.tickets ?? [];

  const handleShowDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailsVisible(true);
  };

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
            paddingBottom: 100,
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
            paddingBottom: 100,
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
          renderItem={({ item }) => (
            <TicketCard
              ticket={item}
              onShowDetails={(event: UnifiedData | null) => {
                handleShowDetails(item);
                setSelectedEvent(event);
              }}
              onViewEvent={(event) => {
                setSelectedEvent(event);
                setIsSheetOpen(true);
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          }
        />
      )}

      <TicketDetailsSheet
        visible={detailsVisible}
        ticket={selectedTicket}
        eventData={selectedEvent}
        onClose={() => setDetailsVisible(false)}
      />
      {/* Event Details Sheet */}
      {selectedEvent && (
        <UnifiedDetailsSheet
          data={selectedEvent as any}
          isOpen={isSheetOpen}
          onClose={() => {
            setSelectedEvent(null);
            setIsSheetOpen(false);
          }}
          nearbyData={[]} // Empty for now, could add similar events later
          onDataSelect={(data) => {
            // Handle if user selects a different event from within the sheet
            setSelectedEvent(null);
            setIsSheetOpen(false);
          }}
          onShare={(data, isEvent) => {
            setSelectedEvent(null);
            setShareData({ data, isEventType: isEvent });
          }}
          onShowControler={() => {
            // Handle controller show
          }}
          isEvent={true}
        />
      )}
      {shareData && (
        <UnifiedShareSheet
          isOpen={!!shareData}
          onClose={() => {
            setSelectedEvent(shareData?.data as any);
            setShareData(null);
          }}
          data={shareData?.data}
          isEventType={shareData?.isEventType}
          onProposalShare={(proposal: IProposal) => {
            setShareData(null);
            setChatShareSelection({
              show: true,
              proposal: proposal || null,
              event: null,
              isEventType: false,
            });
          }}
          onEventShare={(event) => {
            setShareData(null);
            setChatShareSelection({
              show: true,
              proposal: null,
              event: event || null,
              isEventType: shareData?.isEventType,
            });
          }}
        />
      )}
      <ChatSelectionModal
        isOpen={chatShareSelection.show}
        onClose={() => {
          setChatShareSelection({
            show: false,
            proposal: null,
            event: null,
            isEventType: false,
          });
        }}
        onSelectChat={handleChatSelect}
      />
    </View>
  );
}
