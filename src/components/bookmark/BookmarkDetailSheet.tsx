import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Sheet } from "../ui/sheet";
import { Bookmark, Users } from "lucide-react-native";
import { SocialEventCard } from "../social/SocialEventCard";
import { UnifiedData, UnifiedDetailsSheet } from "../map/UnifiedDetailsSheet";
import UnifiedShareSheet from "../map/UnifiedShareSheet";
import { ChatSelectionModal } from "../social/ChatSelectionModal";
import { BookmarkFolder, LocationBookmark } from "~/hooks/useBookmark";
import { useTheme } from "../ThemeProvider";
import type { Channel } from "stream-chat";
import { useState } from "react";
import { IProposal } from "~/hooks/useProposals";
import BookmarkMemberSheet from "./BookmarkMemberSheet";
interface IProps {
  selectedFolder: BookmarkFolder | null;
  folderEvents: LocationBookmark[];
  showEventsSheet: boolean;
  onClose: () => void;
}
const BookmarkDetailSheet: React.FC<IProps> = ({
  selectedFolder,
  folderEvents,
  showEventsSheet,
  onClose,
}) => {
  const { theme } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
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

  const [showMembersSheet, setShowMembersSheet] = useState(false);

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setIsEventSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSelectedEvent(null);
    setIsEventSheetOpen(false);
  };
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
              const ticketmasterData: any = chatShareSelection.event;
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

  return (
    <Sheet isOpen={showEventsSheet} onClose={() => onClose()}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.primary + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Bookmark size={18} color={theme.colors.primary} />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.colors.text,
                }}
                numberOfLines={1}
              >
                {selectedFolder?.name || "Collection"}
              </Text>
            </View>

            {selectedFolder?.description ? (
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.text + "80",
                }}
                numberOfLines={2}
              >
                {selectedFolder.description}
              </Text>
            ) : null}

            {/* Privacy chip */}
            {selectedFolder && (
              <View
                style={{
                  marginTop: 8,
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: theme.colors.border + "40",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: theme.colors.text + "90",
                  }}
                >
                  {selectedFolder.is_public
                    ? "Public collection"
                    : "Private collection"}
                </Text>
              </View>
            )}
          </View>

          {/* Stats card – tap to view members */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowMembersSheet(true)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              minWidth: 96,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Users
                size={14}
                color={theme.colors.text + "80"}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: theme.colors.text + "80",
                }}
              >
                {selectedFolder?.member_count ?? 1} member
                {(selectedFolder?.member_count ?? 1) === 1 ? "" : "s"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section label */}
        <Text
          style={{
            marginTop: 4,
            fontSize: 13,
            fontWeight: "600",
            color: theme.colors.text + "80",
          }}
        >
          Events in this collection
        </Text>
      </View>
      <FlatList
        data={folderEvents}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={{ paddingBottom: 12 }}>
            <SocialEventCard
              data={item.event as any}
              onDataSelect={(data) => {
                handleEventPress(item.event as any);
              }}
              onShowDetails={() => {
                handleEventPress(item.event as any);
              }}
              treatAsEvent={true}
              isCustomEvent={false}
            />
          </View>
        )}
      />
      {selectedEvent && (
        <UnifiedDetailsSheet
          data={selectedEvent as any}
          isOpen={isEventSheetOpen}
          onClose={handleCloseSheet}
          nearbyData={[]} // Empty for now, could add similar events later
          onDataSelect={(data) => {
            // Handle if user selects a different event from within the sheet
            handleCloseSheet();
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
      <BookmarkMemberSheet
        folder={selectedFolder}
        isOpen={showMembersSheet}
        onClose={() => setShowMembersSheet(false)}
      />
    </Sheet>
  );
};
export default BookmarkDetailSheet;
