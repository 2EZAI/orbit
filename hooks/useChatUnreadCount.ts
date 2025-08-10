import { useState, useEffect } from "react";
import { useChat } from "~/src/lib/chat";

export function useChatUnreadCount() {
  const { client, isConnected } = useChat();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (!client || !isConnected) {
      setTotalUnreadCount(0);
      return;
    }

    const updateUnreadCount = async () => {
      try {
        // Query all channels for the current user
        const channels = await client.queryChannels(
          {
            type: "messaging",
            members: { $in: [client.userID!] },
          },
          {},
          {
            state: true,
            watch: false,
            presence: false,
          }
        );

        // Calculate total unread count across all channels
        const total = channels.reduce((sum, channel) => {
          return sum + channel.countUnread();
        }, 0);

        setTotalUnreadCount(total);
      } catch (error) {
        console.error("Error fetching unread count:", error);
        setTotalUnreadCount(0);
      }
    };

    // Initial load
    updateUnreadCount();

    // Listen for new messages to update the count
    const handleNewMessage = () => {
      updateUnreadCount();
    };

    const handleMessageRead = () => {
      updateUnreadCount();
    };

    // Subscribe to events
    client.on("message.new", handleNewMessage);
    client.on("message.read", handleMessageRead);
    client.on("notification.message_new", handleNewMessage);

    return () => {
      client.off("message.new", handleNewMessage);
      client.off("message.read", handleMessageRead);
      client.off("notification.message_new", handleNewMessage);
    };
  }, [client, isConnected]);

  return totalUnreadCount;
}
