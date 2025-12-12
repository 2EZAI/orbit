import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Channel } from "stream-chat";
import {
  BookmarkFolder,
  LocationBookmark,
  useBookmark,
} from "~/hooks/useBookmark";
import { IProposal } from "~/hooks/useProposals";
import {
  UnifiedData,
  UnifiedDetailsSheet,
} from "~/src/components/map/UnifiedDetailsSheet";
import UnifiedShareSheet from "~/src/components/map/UnifiedShareSheet";
import { ChatSelectionModal } from "~/src/components/social/ChatSelectionModal";
import { SocialEventCard } from "~/src/components/social/SocialEventCard";
import { useTheme } from "~/src/components/ThemeProvider";
import { Sheet } from "~/src/components/ui/sheet";
import { Text } from "~/src/components/ui/text";

export default function BookmarksScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { getFolders, getBookmarks, loading } = useBookmark();

  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<BookmarkFolder | null>(
    null
  );
  const [folderEvents, setFolderEvents] = useState<LocationBookmark[]>([]);
  const [loadingFolderEvents, setLoadingFolderEvents] = useState(false);
  const [showEventsSheet, setShowEventsSheet] = useState(false);

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
  useEffect(() => {
    (async () => {
      const data = await getFolders();
      setFolders(data);
    })();
  }, []);
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
  const loadFolderEvents = async (folder: BookmarkFolder) => {
    setSelectedFolder(folder);
    setLoadingFolderEvents(true);
    try {
      const { bookmarks } = await getBookmarks({
        folder_id: folder.id,
        location_type: "event",
      });
      setFolderEvents(bookmarks);
      // Default to first event in the folder
      //   const firstEvent = bookmarks.find((b) => b.event)?.event;
      //   if (firstEvent) {
      //     setActiveEvent(firstEvent);
      //   }
      setShowEventsSheet(true);
    } finally {
      setLoadingFolderEvents(false);
    }
  };
  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setIsEventSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSelectedEvent(null);
    setIsEventSheetOpen(false);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, marginRight: 16 }}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 22, fontWeight: "800", color: theme.colors.text }}
        >
          Bookmark Collections
        </Text>
      </View>

      {/* Folders list */}
      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 32 }}
          color={theme.colors.primary}
        />
      ) : (
        <FlatList
          data={folders}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => loadFolderEvents(item)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                {item.name}
              </Text>
              <Text style={{ color: theme.colors.text + "80", fontSize: 12 }}>
                {(item.bookmark_count ?? 0) + " items"} •{" "}
                {item.is_public ? "Public" : "Private"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Sheet isOpen={showEventsSheet} onClose={() => setShowEventsSheet(false)}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text>{selectedFolder?.name}</Text>
            <Text>{selectedFolder?.description}</Text>
          </View>
          <Text>{folderEvents.length} items</Text>
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
      </Sheet>
    </SafeAreaView>
  );
}
