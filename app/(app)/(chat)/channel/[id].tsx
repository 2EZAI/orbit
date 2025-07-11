import {
  Channel,
  MessageInput,
  MessageList,
  Thread,
  MessageType as StreamMessageType,
  useMessageContext,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageSimple,
  useMessagesContext,
  MessageStatus,
  MessageContextValue,
  MessageActionType,
  MessageActionsParams,
  Message as DefaultMessage,
  useChannelContext,
  AutoCompleteSuggestionHeader,
  AutoCompleteSuggestionItem,
  AutoCompleteSuggestionList,
  Card,
} from "stream-chat-expo";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useChat } from "~/src/lib/chat";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  View,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import {
  Info,
  Users,
  Edit2,
  Trash2,
  MoreHorizontal,
  Image as ImageIcon,
  Calendar,
  Search,
} from "lucide-react-native";
import { Icon } from "react-native-elements";
import type {
  Channel as ChannelType,
  DefaultGenerics,
  Attachment as StreamAttachment,
} from "stream-chat";
import type { MessageType } from "stream-chat-expo";
import { useTheme } from "~/src/components/ThemeProvider";

interface Event {
  id: string;
  name: string;
  startDate: string;
  location?: string;
}

interface EventAttachment extends StreamAttachment<DefaultGenerics> {
  type: string;
  title: string;
  text: string;
  event_data: Event;
}

interface EventMessage {
  text: string;
  attachments: EventAttachment[];
}

// Event search component
const EventSearchHeader = ({ queryText }: { queryText: string }) => (
  <View className="flex-row items-center p-3 space-x-2 border-b border-border">
    <Calendar size={20} className="text-foreground" />
    <Text className="text-foreground">Events matching "{queryText}"</Text>
  </View>
);

// Event search result item
const EventSearchItem = ({
  event,
  onSelect,
}: {
  event: any;
  onSelect: (event: any) => void;
}) => (
  <TouchableOpacity
    onPress={() => onSelect(event)}
    className="flex-row items-center p-3 space-x-3 border-b border-border"
  >
    <Calendar size={20} className="text-foreground" />
    <View className="flex-1">
      <Text className="font-medium text-foreground">{event.name}</Text>
      <Text className="text-sm text-muted-foreground">
        {new Date(event.startDate).toLocaleDateString()}
      </Text>
    </View>
  </TouchableOpacity>
);

// Event message component
const EventMessage = (props: any) => {
  const { message } = useMessageContext();
  const router = useRouter();
  const { channel } = useChannelContext();

  // Type guard for event search results
  const isEventSearchMessage = (
    msg: any
  ): msg is { attachments: EventAttachment[] } => {
    return msg?.attachments?.some((att: any) => att.type === "event_card");
  };

  // Type guard for event messages
  const isEventMessage = (msg: any): msg is EventMessage => {
    const hasEventAttachment = msg?.attachments?.some(
      (att: any) => att.type === "event"
    );
    const hasValidAttachments =
      Array.isArray(msg?.attachments) && msg.attachments.length > 0;
    return hasEventAttachment && hasValidAttachments;
  };

  // Handle event selection
  const handleEventSelect = async (eventData: Event) => {
    try {
      console.log("[EventMessage] Sending event message:", eventData);
      const message = {
        text: `Shared event: ${eventData.name}`,
        attachments: [
          {
            type: "event",
            title: eventData.name,
            text: `${new Date(eventData.startDate).toLocaleString()}${
              eventData.location ? `\nLocation: ${eventData.location}` : ""
            }`,
            event_data: eventData,
          },
        ],
      };
      console.log("[EventMessage] Sending message:", message);
      const response = await channel?.sendMessage(message);
      console.log("[EventMessage] Message sent:", response);
    } catch (error) {
      console.error("[EventMessage] Error sharing event:", error);
      Alert.alert("Error", "Failed to share event");
    }
  };

  // Check if this is an event search result message
  if (isEventSearchMessage(message)) {
    return (
      <MessageSimple
        {...props}
        MessageContent={() => (
          <View>
            {message.attachments.map((attachment, index) => (
              <View key={index} className="p-3 mb-2 rounded-lg bg-muted">
                <View className="flex-row items-center mb-2 space-x-2">
                  <Calendar size={20} className="text-primary" />
                  <Text className="font-medium text-foreground">
                    {attachment.title}
                  </Text>
                </View>
                <Text className="text-muted-foreground">{attachment.text}</Text>
                <TouchableOpacity
                  onPress={() =>
                    handleEventSelect(attachment.event_data as Event)
                  }
                  className="p-2 mt-2 rounded bg-primary"
                >
                  <Text className="text-center text-primary-foreground">
                    Select this event
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />
    );
  }

  // Handle display of shared event message
  if (isEventMessage(message)) {
    const eventAttachment = message.attachments.find(
      (att) => att.type === "event"
    ) as EventAttachment | undefined;

    if (!eventAttachment) {
      return <DefaultMessage {...props} />;
    }

    const eventData = eventAttachment.event_data;
    return (
      <MessageSimple
        {...props}
        MessageContent={() => (
          <TouchableOpacity
            onPress={() => {
              console.log("[EventMessage] Navigating to event:", eventData);
              router.push({
                pathname: "/(app)/(map)",
                params: { eventId: eventData.id },
              });
            }}
            className="p-3 rounded-lg bg-muted"
          >
            <View className="flex-row items-center mb-2 space-x-2">
              <Calendar size={20} className="text-primary" />
              <Text className="font-medium text-foreground">
                {eventData.name}
              </Text>
            </View>
            <Text className="text-muted-foreground">
              {new Date(eventData.startDate).toLocaleString()}
              {eventData.location ? `\nLocation: ${eventData.location}` : ""}
            </Text>
          </TouchableOpacity>
        )}
      />
    );
  }

  return <DefaultMessage {...props} />;
};

// Enhanced message component with proper typing
const EnhancedMessage = (props: any) => {
  const messageContext = useMessageContext();
  console.log("[ChatMessage] Message context:", {
    hasContext: !!messageContext,
    hasMessage: !!messageContext?.message,
    messageId: messageContext?.message?.id,
    text: messageContext?.message?.text,
  });

  // Return null if message context is not available
  if (!messageContext || !messageContext.message) {
    return null;
  }

  const { message } = messageContext;

  return (
    <MessageSimple
      {...props}
      message={message}
      MessageAvatar={MessageAvatar}
      MessageContent={MessageContent}
      MessageFooter={(messageFooterProps) => (
        <MessageFooter
          {...messageFooterProps}
          formattedDate={
            message.created_at
              ? new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""
          }
        />
      )}
      MessageStatus={MessageStatus}
    />
  );
};

export default function ChannelScreen() {
  const { id } = useLocalSearchParams();
  const { client } = useChat();
  const router = useRouter();
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageType | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const channelRef = useRef<ChannelType | null>(null);
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [orbitMsg, setorbitMsg] = useState("yess");

  console.log("chanell???", channel?.data);
  // if (channel?.data?.name === "Orbit App") {
  //   console.log("messages???", channel?.state.messages);
  //   setorbitMsg(channel?.state.messages);
  // }

  const handleInfoPress = useCallback(() => {
    if (!channel) return;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          "Change Chat Name",
          "View Members",
          "Add Members",
          "View Media",
          "Clear Chat History",
          "Delete Chat",
          "Cancel",
        ],
        cancelButtonIndex: 6,
        destructiveButtonIndex: 5,
      },
      async (buttonIndex) => {
        try {
          switch (buttonIndex) {
            case 0: // Change name
              Alert.prompt(
                "Change Chat Name",
                "Enter a new name for this chat",
                async (newName) => {
                  if (newName?.trim()) {
                    await channel.update({
                      name: newName.trim(),
                    });
                  }
                }
              );
              break;

            case 1: // View members
              const members = await channel.queryMembers({});
              Alert.alert(
                "Channel Members",
                members.members
                  .map((member) => member.user?.name || member.user_id)
                  .join("\n")
              );
              break;

            case 2: // Add members
              router.push({
                pathname: "/members/add",
                params: { channelId: id },
              });
              break;

            case 3: // View media
              router.push({
                pathname: `/channel/${id}/media`,
              });
              break;

            case 4: // Clear history
              Alert.alert(
                "Clear Chat History",
                "Are you sure you want to clear all messages? This cannot be undone.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                      await channel.truncate();
                    },
                  },
                ]
              );
              break;

            case 5: // Delete chat
              Alert.alert(
                "Delete Chat",
                "Are you sure you want to delete this chat? This cannot be undone.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        // Call backend to delete channel
                        const response = await fetch(
                          `${process.env.BACKEND_CHAT_URL}/api/channels/${id}`,
                          {
                            method: "DELETE",
                            headers: {
                              Authorization: `Bearer ${client?.tokenManager.token}`,
                            },
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to delete channel");
                        }

                        // Navigate back after successful deletion
                        router.back();
                      } catch (error) {
                        console.error("Error deleting channel:", error);
                        Alert.alert(
                          "Error",
                          "Failed to delete chat. Please try again."
                        );
                      }
                    },
                  },
                ]
              );
              break;
          }
        } catch (error) {
          console.error("Channel action error:", error);
          Alert.alert("Error", "Failed to perform action");
        }
      }
    );
  }, [channel, router, id, client?.tokenManager.token]);

  useEffect(() => {
    if (!client || !id || channelRef.current) {
      if (!client || !id) {
        setError("Unable to load chat");
        setLoading(false);
      }
      return;
    }

    let mounted = true;
    const loadChannel = async () => {
      try {
        console.log("[ChatChannel] Loading channel:", id);
        const newChannel = client.channel("messaging", id as string);
        console.log("[ChatChannel] Created channel instance");

        await newChannel.watch();
        console.log("[ChatChannel] Channel watched");

        const messages = await newChannel.query({
          messages: { limit: 30 },
          watch: true,
        });

        console.log("[ChatChannel] Channel loaded with query:", {
          id: newChannel.id,
          type: newChannel.type,
          memberCount: Object.keys(newChannel.state.members || {}).length,
          messageCount: messages.messages?.length || 0,
          messages: messages.messages?.map((m) => ({
            id: m.id,
            text: m.text,
            user: m.user?.id,
          })),
        });

        if (mounted) {
          channelRef.current = newChannel;
          setChannel(newChannel);
        }
      } catch (err) {
        console.error("[ChatChannel] Error loading channel:", err);
        if (mounted) {
          setError("Failed to load chat");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadChannel();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.stopWatching();
        channelRef.current = null;
      }
    };
  }, [client, id]);

  // Update member count
  useEffect(() => {
    if (channel) {
      const updateMemberCount = async () => {
        try {
          const members = await channel.queryMembers({});
          setMemberCount(members.members.length);
        } catch (error) {
          console.error("Error fetching members:", error);
        }
      };

      updateMemberCount();

      // Listen for member updates
      const events = ["member.added", "member.removed"] as const;
      const unsubscribePromises = events.map((event) =>
        channel.on(event, updateMemberCount)
      );

      if (channel?.data?.name === "Orbit App") {
    console.log("messages???", channel?.state?.messages);
    setorbitMsg(channel?.state?.messages[0]);
  }

      return () => {
        unsubscribePromises.forEach((promise) => {
          if (promise && typeof promise.unsubscribe === "function") {
            promise.unsubscribe();
          }
        });
      };
    }
  }, [channel]);

  // Handle command selection
  const handleCommand = useCallback(
    async (name: string, value?: string) => {
      if (name === "event" && value) {
        setIsSearching(true);
        try {
          console.log("[EventSearch] Searching with query:", value);
          console.log(
            "[EventSearch] Backend URL:",
            process.env.BACKEND_CHAT_URL
          );
          const response = await fetch(
            `${process.env.BACKEND_CHAT_URL}/commands`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${client?.tokenManager.token}`,
              },
              body: JSON.stringify({
                message: {
                  command: "event",
                  args: value,
                  text: `/event ${value}`,
                  cid: channel?.cid,
                },
                user: {
                  id: client?.userID,
                },
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[EventSearch] Error response:", {
              status: response.status,
              text: errorText,
            });
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log("[EventSearch] Response:", data);

          if (data.message?.attachments) {
            const eventMessage = {
              text: data.message.text,
              attachments: data.message.attachments,
            };
            await channel?.sendMessage(eventMessage);
          } else {
            Alert.alert("Error", data.message?.text || "No events found");
          }
        } catch (error) {
          console.error("[EventSearch] Error searching events:", error);
          Alert.alert("Error", "Failed to search events. Please try again.");
        } finally {
          setIsSearching(false);
        }
      }
    },
    [channel, client]
  );

  useEffect(() => {
    if (channel) {
      // Register event command
      channel.on("message.new", (event) => {
        if (event.message?.command === "event") {
          handleCommand("event", event.message.args);
        }
      });
    }
  }, [channel, handleCommand]);

    const hitNoificationApi= async (typee:string,userIDs:any) => {
    if (!session) return;
    try{
      const reuestData= {
  userId: userIDs,  
  senderId: session.user.id,
  type: typee,                   
}
    ///send notification
        const response = await fetch(
          `${process.env.BACKEND_MAP_URL}/api/notifications/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.user.id}`,
            },
            body: JSON.stringify(reuestData),
          }
        );
        console.log("requestData", reuestData);

        if (!response.ok) {
          console.log("error>",response);
          throw new Error(await response.text());
        }

        const data_ = await response.json();
        console.log("response>",data_);
        
    }
    catch(e)
    {
console.log("error_catch>",e);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text
                style={{ fontSize: 17, fontWeight: "600", textAlign: "center" }}
                className="text-foreground"
              >
                {channel?.data?.name || "Chat"}
              </Text>

              {channel?.data?.name !== "Orbit App" ? (
                <Text
                  style={{ fontSize: 13, textAlign: "center" }}
                  className="text-muted-foreground"
                >
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </Text>
              ) : (
                <></>
              )}
            </View>
          ),
          headerRight: () =>
            channel?.data?.name !== "Orbit App" ? (
              <TouchableOpacity
                onPress={handleInfoPress}
                style={{ marginRight: 8 }}
              >
                {Platform.OS == "ios" ? (
                  <Info size={24} className="text-primary" />
                ) : (
                  <Icon
                    name="information-outline"
                    type="material-community"
                    size={24}
                    color="gray"
                  />
                )}
              </TouchableOpacity>
            ) : (
              <></>
            ),
        }}
      />
      {loading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="mt-4 text-foreground">Loading chat...</Text>
        </View>
      ) : error ? (
        <View className="items-center justify-center flex-1 px-4">
          <Text className="mb-4 text-center text-red-500">{error}</Text>
          <Text className="text-primary" onPress={() => router.back()}>
            Go back
          </Text>
        </View>
      ) : channel ? (
        <Channel
          channel={channel}
          keyboardVerticalOffset={90}
          thread={thread}
          threadList={!!thread}
          Message={EventMessage}
          onPressMessage={({
            additionalInfo,
            defaultHandler,
            emitter,
            message,
          }) => {
            const handleEventSelect = async (eventData: Event) => {
              try {
                console.log("[EventMessage] Sending event message:", eventData);
                const message = {
                  text: `Shared event: ${eventData.name}`,
                  attachments: [
                    {
                      type: "event",
                      title: eventData.name,
                      text: `${new Date(eventData.startDate).toLocaleString()}${
                        eventData.location
                          ? `\nLocation: ${eventData.location}`
                          : ""
                      }`,
                      event_data: eventData,
                    },
                  ],
                };
                console.log("[EventMessage] Sending message:", message);
                const response = await channel?.sendMessage(message);
                console.log("[EventMessage] Message sent:", response);
              } catch (error) {
                console.error("[EventMessage] Error sharing event:", error);
                Alert.alert("Error", "Failed to share event");
              }
            };

            console.log("[Channel] Message pressed:", {
              additionalInfo,
              emitter,
              messageType: message?.type,
              attachments: message?.attachments,
            });

            // Check if this is an event message
            const eventAttachment = message?.attachments?.find(
              (att: any) => att.type === "event"
            ) as EventAttachment | undefined;

            if (eventAttachment?.event_data) {
              console.log(
                "[Channel] Found event data:",
                eventAttachment.event_data
              );
              router.push({
                pathname: "/(app)/(map)",
                params: { eventId: eventAttachment.event_data.id },
              });
              return;
            }

            // Handle event card selection
            const attachment = additionalInfo?.attachment as
              | EventAttachment
              | undefined;
            if (attachment?.type === "event_card") {
              handleEventSelect(attachment.event_data as Event);
              return;
            }

            defaultHandler?.();
          }}
          doSendMessageRequest={async (channelId, message) => {
            if (message.text?.startsWith("/event")) {
              const searchTerm = message.text.replace("/event", "").trim();
              if (searchTerm) {
                await handleCommand("event", searchTerm);
                return new Promise(() => {}); // Prevent default message sending
              } else {
                Alert.alert(
                  "Error",
                  "Please provide a search term after /event"
                );
                return new Promise(() => {});
              }
            }
            // hitNoificationApi('ChatMessage',);
            return channel?.sendMessage(message);
          }}
        >
          {thread ? (
            <Thread />
          ) : (
            <>
  {channel?.data?.name === 'Orbit App' ? (
   <View 

   style={{
    flex: 1,
    justifyContent: 'flex-end', // align children to bottom
    alignItems: 'flex-start',   // align to the left
    padding: 16,
   }
   }>
   <View 
  className="w-[80%] p-4 border bg-muted/50 border-border rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-3xl">
 
 <Text  
>  {orbitMsg?.text || 'No orbit message'}
</Text>
</View>
</View>
  ) : (
    <>
      <MessageList
        onThreadSelect={setThread}
        additionalFlatListProps={{
          initialNumToRender: 30,
          maxToRenderPerBatch: 10,
          windowSize: 10,
          removeClippedSubviews: false,
          inverted: Platform.OS === 'ios' ? true : false,
        }}
        loadMore={() => {
          console.log('[ChatChannel] Loading more messages...');
          return Promise.resolve();
        }}
      />
      <MessageInput
        additionalTextInputProps={{
          placeholder: 'Type /event to share an event...',
          placeholderTextColor: theme.colors.text,
        }}
      />
    </>
  )}
</>

          )}
        </Channel>
      ) : null}
    </View>
  );
}
