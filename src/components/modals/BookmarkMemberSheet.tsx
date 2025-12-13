import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Users, UserPlus } from "lucide-react-native";
import { Sheet } from "../ui/sheet";
import { useTheme } from "../ThemeProvider";
import { Text } from "../ui/text";
import {
  BookmarkFolder,
  BookmarkFolderMember,
  useBookmark,
} from "~/hooks/useBookmark";
import { UserAvatar } from "../ui/user-avatar";
import BookmarkAddMemberSheet from "./BookmarkAddMemberSheet";

interface BookmarkMemberSheetProps {
  folder: BookmarkFolder | null;
  isOpen: boolean;
  onClose: () => void;
}

const BookmarkMemberSheet: React.FC<BookmarkMemberSheetProps> = ({
  folder,
  isOpen,
  onClose,
}) => {
  const { theme } = useTheme();
  const { getFolderMembers, addFolderMember } = useBookmark();
  const [members, setMembers] = useState<BookmarkFolderMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddMemberSheet, setShowAddMemberSheet] = useState(false);

  useEffect(() => {
    if (!isOpen || !folder?.id) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await getFolderMembers(folder.id);
        if (!cancelled) {
          setMembers(data);
        }
      } catch (error) {
        console.error("Error loading bookmark members:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, folder?.id]);

  const renderRoleLabel = (member: BookmarkFolderMember) => {
    if (member.role === "owner") return "Owner";
    return "Editor";
  };

  const renderMemberCount = () => {
    const count = folder?.member_count ?? (members.length || 1);
    return `${count} member${count === 1 ? "" : "s"}`;
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} expanded>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: 4,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={styles.headerContent}>
          <View style={styles.rowSpaceBetween}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.colors.text,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {folder?.name || ""} members
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: theme.colors.border + "40",
              }}
            >
              <Users
                size={14}
                color={theme.colors.text + "80"}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.text + "90",
                  fontWeight: "500",
                }}
              >
                {renderMemberCount()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* List */}
      <View style={styles.content}>
        {loading ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 32,
            }}
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={{
                marginTop: 8,
                color: theme.colors.text + "80",
                fontSize: 13,
              }}
            >
              Loading members...
            </Text>
          </View>
        ) : members.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 40,
              paddingHorizontal: 32,
            }}
          >
            <Users
              size={32}
              color={theme.colors.text + "40"}
              style={{ marginBottom: 8 }}
            />
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 15,
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              No members yet
            </Text>
            <Text
              style={{
                color: theme.colors.text + "80",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Only you can see this collection until you invite others to
              collaborate.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {members.map((member) => {
              const displayName =
                member.user?.first_name || member.user?.last_name
                  ? `${member.user?.first_name || ""} ${
                      member.user?.last_name || ""
                    }`.trim()
                  : member.user?.username || "Orbit user";

              return (
                <View
                  key={member.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    gap: 12,
                  }}
                >
                  <UserAvatar
                    size={40}
                    user={{
                      id: member.user?.id || member.user_id,
                      name: displayName,
                      image: member.user?.avatar_url || null,
                    }}
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.text + "80",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      @{member.user?.username || "anonymous"}
                    </Text>
                  </View>

                  <View
                    style={{
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
                      {renderRoleLabel(member)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setShowAddMemberSheet(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: theme.colors.primary + "30",
        }}
      >
        <UserPlus
          size={14}
          color={theme.colors.primary}
          style={{ marginRight: 4 }}
        />
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: theme.colors.primary,
          }}
        >
          Add member
        </Text>
      </TouchableOpacity>
      <BookmarkAddMemberSheet
        isOpen={showAddMemberSheet}
        onClose={() => setShowAddMemberSheet(false)}
        confirmLabel="Add member"
        onConfirm={async (user) => {
          if (!folder?.id) return;
          try {
            await addFolderMember(folder.id, {
              user_id: user.id,
              role: "editor",
            });
            // Refresh members list so it reflects the new member
            const updated = await getFolderMembers(folder.id);
            setMembers(updated);
          } catch (error) {
            console.error("Error adding member from member sheet:", error);
          }
        }}
      />
    </Sheet>
  );
};

export default BookmarkMemberSheet;
const styles = StyleSheet.create({
  rowSpaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  content: {
    flex: 1,
  },
});
