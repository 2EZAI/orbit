import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useVideo } from "~/src/lib/video";
import { useTheme } from "~/src/components/ThemeProvider";
import { Button } from "~/src/components/ui/button";
import { Card } from "~/src/components/ui/card";
import { Phone, Video, Users, Clock, PhoneCall } from "lucide-react-native";

interface ActiveCall {
  id: string;
  call_id: string;
  call_type: string;
  call_name?: string;
  status: string;
  started_at: string;
  creator_email: string;
  creator_name: string;
  active_participants_count: number;
}

interface CallHistoryItem {
  id: string;
  call_id: string;
  call_type: string;
  call_name?: string;
  status: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  user_role: string;
  joined_at: string;
  left_at?: string;
  user_duration_seconds?: number;
  creator_email: string;
  creator_name: string;
}

export default function VideoCallManager() {
  const router = useRouter();
  const { isConnected, createCall, getActiveCalls, getCallHistory } =
    useVideo();
  const { theme } = useTheme();

  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadData();
    }
  }, [isConnected]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadActiveCalls(), loadCallHistory()]);
    } catch (error) {
      console.error("Failed to load call data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveCalls = async () => {
    try {
      const { active_calls } = await getActiveCalls();
      setActiveCalls(active_calls || []);
    } catch (error) {
      console.error("Failed to load active calls:", error);
    }
  };

  const loadCallHistory = async () => {
    try {
      const { calls } = await getCallHistory(10, 0);
      setCallHistory(calls || []);
    } catch (error) {
      console.error("Failed to load call history:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const startNewVideoCall = async () => {
    if (!isConnected) {
      Alert.alert("Error", "Video service not connected");
      return;
    }

    try {
      const callId = `call-${Date.now()}`;

      // Navigate to video call screen
      router.push({
        pathname: "/call/[id]",
        params: {
          id: callId,
          type: "video",
          create: "true",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to start video call");
      console.error(error);
    }
  };

  const startNewAudioCall = async () => {
    if (!isConnected) {
      Alert.alert("Error", "Video service not connected");
      return;
    }

    try {
      const callId = `call-${Date.now()}`;

      // Navigate to audio call screen
      router.push({
        pathname: "/call/[id]",
        params: {
          id: callId,
          type: "audio",
          create: "true",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to start audio call");
      console.error(error);
    }
  };

  const joinCall = async (callId: string, callType: string) => {
    if (!isConnected) {
      Alert.alert("Error", "Video service not connected");
      return;
    }

    try {
      router.push({
        pathname: "/call/[id]",
        params: {
          id: callId,
          type: callType === "audio_room" ? "audio" : "video",
          create: "false",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to join call");
      console.error(error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const renderActiveCall = ({ item }: { item: ActiveCall }) => (
    <Card className="p-4 mb-3">
      <View style={styles.callItem}>
        <View style={styles.callInfo}>
          <View style={styles.callHeader}>
            <View style={styles.callTypeIcon}>
              {item.call_type === "audio_room" ? (
                <Phone size={16} color={theme.colors.primary} />
              ) : (
                <Video size={16} color={theme.colors.primary} />
              )}
            </View>
            <Text style={[styles.callName, { color: theme.colors.text }]}>
              {item.call_name || item.call_id}
            </Text>
          </View>

          <View style={styles.callDetails}>
            <View style={styles.detailItem}>
              <Users size={14} color={theme.colors.text + "80"} />
              <Text
                style={[styles.detailText, { color: theme.colors.text + "80" }]}
              >
                {item.active_participants_count} participants
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Clock size={14} color={theme.colors.text + "80"} />
              <Text
                style={[styles.detailText, { color: theme.colors.text + "80" }]}
              >
                Started {formatDate(item.started_at)}
              </Text>
            </View>
          </View>
        </View>

        <Button
          variant="default"
          size="sm"
          onPress={() => joinCall(item.call_id, item.call_type)}
        >
          <Text className="font-medium text-white">Join</Text>
        </Button>
      </View>
    </Card>
  );

  const renderHistoryCall = ({ item }: { item: CallHistoryItem }) => (
    <Card className="p-4 mb-3">
      <View style={styles.historyItem}>
        <View style={styles.callTypeIcon}>
          {item.call_type === "audio_room" ? (
            <Phone size={16} color={theme.colors.text + "60"} />
          ) : (
            <Video size={16} color={theme.colors.text + "60"} />
          )}
        </View>

        <View style={styles.historyInfo}>
          <Text style={[styles.historyCallName, { color: theme.colors.text }]}>
            {item.call_name || item.call_id}
          </Text>

          <View style={styles.historyDetails}>
            <Text
              style={[
                styles.historyDetail,
                { color: theme.colors.text + "80" },
              ]}
            >
              {item.user_duration_seconds
                ? formatDuration(item.user_duration_seconds)
                : "No duration"}
            </Text>
            <Text
              style={[
                styles.historyDetail,
                { color: theme.colors.text + "80" },
              ]}
            >
              •
            </Text>
            <Text
              style={[
                styles.historyDetail,
                { color: theme.colors.text + "80" },
              ]}
            >
              {formatDate(item.joined_at)}
            </Text>
          </View>

          <Text
            style={[styles.historyRole, { color: theme.colors.text + "60" }]}
          >
            Role: {item.user_role}
          </Text>
        </View>
      </View>
    </Card>
  );

  if (loading && activeCalls.length === 0 && callHistory.length === 0) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading video calls...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header with Call Buttons */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Video Calls
        </Text>

        <View style={styles.callButtons}>
          <Button
            variant="outline"
            size="sm"
            onPress={startNewAudioCall}
            disabled={!isConnected}
            style={styles.callButton}
          >
            <Phone size={16} color={theme.colors.text} />
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
              Audio
            </Text>
          </Button>

          <Button
            variant="default"
            size="sm"
            onPress={startNewVideoCall}
            disabled={!isConnected}
            style={styles.callButton}
          >
            <Video size={16} color="white" />
            <Text style={styles.buttonTextWhite}>Video</Text>
          </Button>
        </View>
      </View>

      <FlatList
        data={[...activeCalls, ...callHistory]}
        keyExtractor={(item, index) => item.id + index}
        renderItem={({ item, index }) => {
          if (index < activeCalls.length) {
            return renderActiveCall({ item: item as ActiveCall });
          } else {
            return renderHistoryCall({ item: item as CallHistoryItem });
          }
        }}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={() => (
          <View>
            {activeCalls.length > 0 && (
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Active Calls
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <PhoneCall size={48} color={theme.colors.text + "40"} />
            <Text
              style={[styles.emptyText, { color: theme.colors.text + "60" }]}
            >
              No calls yet
            </Text>
            <Text
              style={[styles.emptySubtext, { color: theme.colors.text + "40" }]}
            >
              Start your first video or audio call
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => {
          if (activeCalls.length > 0 && callHistory.length > 0) {
            return (
              <View style={styles.sectionSeparator}>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Recent Calls
                </Text>
              </View>
            );
          }
          return null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  callButtons: {
    flexDirection: "row",
    gap: 12,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonTextWhite: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  listContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionSeparator: {
    marginVertical: 20,
  },
  callItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  callInfo: {
    flex: 1,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  callTypeIcon: {
    marginRight: 8,
  },
  callName: {
    fontSize: 16,
    fontWeight: "600",
  },
  callDetails: {
    gap: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyCallName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  historyDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  historyDetail: {
    fontSize: 14,
  },
  historyRole: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
