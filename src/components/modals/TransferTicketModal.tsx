import { Search, Ticket as TicketIcon, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTransferTicket } from "~/hooks/useTicketTransfer";
import { useUserSearch } from "~/hooks/useUserList";
import { useTheme } from "../ThemeProvider";
import { Text } from "../ui/text";
import { UserAvatar } from "../ui/user-avatar";

interface TransferTicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticketId: string;
  eventName: string;
}

export const TransferTicketModal: React.FC<TransferTicketModalProps> = ({
  visible,
  onClose,
  ticketId,
  eventName,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(" "); // Start with space to get initial results
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { transferTicket, isLoading } = useTransferTicket();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim() || " ");
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Use the user search hook
  const {
    users,
    loading: isSearching,
    error: searchError,
  } = useUserSearch({
    q: searchQuery,
    limit: 50,
  });

  const getDisplayName = (user: any) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.username || "Anonymous";
  };

  const getSubtitle = (user: any) => {
    return user.username || user.email || "";
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
  };

  const handleTransfer = async () => {
    if (!selectedUser) return;

    const displayName = getDisplayName(selectedUser);
    const subtitle = getSubtitle(selectedUser);

    Alert.alert(
      "Confirm Transfer",
      `Transfer this ticket to ${displayName}${
        subtitle ? ` (@${subtitle})` : ""
      }?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Transfer",
          style: "default",
          onPress: async () => {
            // Use username or email for transfer
            const recipientIdentifier =
              selectedUser.username || selectedUser.id;
            const result = await transferTicket(ticketId, recipientIdentifier);
            if (result) {
              handleClose();
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setSearchInput("");
    setSearchQuery(" ");
    setSelectedUser(null);
    onClose();
  };

  const formatTicketId = (id: string) => {
    return id.slice(0, 12).toUpperCase();
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUser?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleSelectUser(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: theme.colors.background,
          borderRadius: 12,
          marginBottom: 12,
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? theme.colors.primary : "transparent",
        }}
      >
        <UserAvatar
          size={52}
          user={{
            id: item.id,
            name: getDisplayName(item),
            image: item.avatar_url,
          }}
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 4,
            }}
          >
            {getDisplayName(item)}
          </Text>
          {getSubtitle(item) ? (
            <Text
              style={{
                fontSize: 15,
                color: theme.colors.text + "80",
              }}
            >
              {getSubtitle(item)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.card,
        }}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: 60,
            paddingHorizontal: 24,
            paddingBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                lineHeight: 32,
                fontWeight: "700",
                color: theme.colors.text,
              }}
            >
              Transfer Ticket
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#1f2937",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text
            style={{
              fontSize: 16,
              color: "#9ca3af",
              marginBottom: 20,
            }}
          >
            Search for a user to transfer this ticket to
          </Text>

          {/* Ticket Details Card */}
          <View
            style={{
              backgroundColor: "#1e293b",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: "#7c3aed",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <TicketIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Ticket Details
              </Text>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#FFFFFF",
                marginBottom: 6,
              }}
            >
              {eventName}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#94a3b8",
              }}
            >
              Ticket ID: {formatTicketId(ticketId)}
            </Text>
          </View>

          {/* Search Input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1e293b",
              borderRadius: 12,
              paddingHorizontal: 16,
              gap: 10,
            }}
          >
            <Search size={20} color="#64748b" strokeWidth={2} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search by name or username"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                paddingVertical: 14,
                fontSize: 16,
                color: "#FFFFFF",
              }}
            />
          </View>
        </View>

        {/* Users List */}
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Available People
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#9ca3af",
              }}
            >
              {users.length} {users.length === 1 ? "person" : "people"}
            </Text>
          </View>

          {isSearching ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : users.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 40,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: searchError ? "#ef4444" : "#64748b",
                  textAlign: "center",
                }}
              >
                {searchError
                  ? searchError
                  : searchInput.trim()
                  ? "No users found matching your search"
                  : "No users available"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            />
          )}
        </View>

        {/* Bottom Action Buttons */}
        <View
          style={{
            padding: 24,
            paddingBottom: 44,
            backgroundColor: "#000000",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={handleTransfer}
            disabled={!selectedUser || isLoading}
            style={{
              paddingVertical: 18,
              borderRadius: 12,
              backgroundColor: "#7c3aed",
              opacity: !selectedUser || isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                Transfer Ticket
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClose}
            disabled={isLoading}
            style={{
              paddingVertical: 18,
              borderRadius: 12,
              backgroundColor: "#1e293b",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#FFFFFF",
                textAlign: "center",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
