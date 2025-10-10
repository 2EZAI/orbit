import React from "react";
import { View, Image, ScrollView } from "react-native";
import { Text } from "~/src/components/ui/text";
import { TouchableOpacity } from "react-native";
import {
  MapPin,
  Calendar,
  Clock,
  Globe,
  Lock,
  CheckCircle,
} from "lucide-react-native";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { useTheme } from "~/src/components/ThemeProvider";
import { User as AuthUser } from "@supabase/supabase-js";

interface EventImage {
  uri: string;
  type: string;
  name: string;
}
interface User extends AuthUser {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface EventSummaryCardProps {
  name: string;
  description: string;
  isPrivate: boolean;
  images: EventImage[];
  startDate: Date;
  endDate: Date;
  locationDetails?: {
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  coCreators?:{
    coCreators:User[];
  }
  ticketEnabled:string;
          ticketLimitPerUser: string;
          ticketTotal: string;
  externalUrl?: string;
  onConfirm: () => void;
  onEdit: () => void;
  onInviteUsers: () => void;
}

export default function EventSummaryCard({
  name,
  description,
  isPrivate,
  images,
  startDate,
  endDate,
  locationDetails,
  coCreators,
   ticketEnabled,
          ticketLimitPerUser,
          ticketTotal,
  externalUrl,
  onConfirm,
  onEdit,
  onInviteUsers,
}: EventSummaryCardProps) {
  const { theme } = useTheme();

const getUserDisplayName = (user: User) => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.username || "Unknown User";
  };

   const getUserInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    if (user.last_name) {
      return user.last_name[0].toUpperCase();
    }
    if (user.username) {
      return user.username[0].toUpperCase();
    }
    return "?";
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.dark ? "#1a1a2e" : "#f8fafc",
        padding: 20,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 40,
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              justifyContent: "center",
              alignItems: "center",
              
            }}
          >
            <CheckCircle size={40} color="#8B5CF6" />
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
               lineHeight: 34,
              color: theme.colors.text,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Event Created! ✨
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.text + "CC",
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            Your event has been successfully created and is now live
          </Text>
        </View>

        {/* Event Card */}
        <View
          style={{
            backgroundColor: theme.dark
              ? "rgba(139, 92, 246, 0.1)"
              : "rgba(255, 255, 255, 0.8)",
            borderRadius: 32,
            padding: 32,
            borderWidth: 1,
            borderColor: theme.dark
              ? "rgba(139, 92, 246, 0.2)"
              : "rgba(139, 92, 246, 0.1)",
            shadowColor: "#8B5CF6",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: theme.dark ? 0.3 : 0.1,
            shadowRadius: 24,
            elevation: 12,
            marginBottom: 24,
          }}
        >
          {/* Event Header */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  lineHeight: 34,
                  fontWeight: "700",
                  color: theme.colors.text,
                  flex: 1,
                }}
              >
                {name}
              </Text>
              {isPrivate ? (
                <Lock size={20} color="#8B5CF6" />
              ) : (
                <Globe size={20} color="#8B5CF6" />
              )}
            </View>
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.text + "CC",
                lineHeight: 22,
              }}
            >
              {description}
            </Text>
          </View>

          {/* Images */}
          {images.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Event Images
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {images.map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: image.uri }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 16,
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Date & Time */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 12,
              }}
            >
              Date & Time
            </Text>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Calendar
                  size={16}
                  color="#8B5CF6"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                  {startDate.toLocaleDateString()}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Clock size={16} color="#8B5CF6" style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                  {startDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {endDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Location */}
          {locationDetails && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Location
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.3)",
                }}
              >
                <MapPin size={16} color="#8B5CF6" style={{ marginRight: 8 }} />
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                  {locationDetails.address1}, {locationDetails.city},{" "}
                  {locationDetails.state} {locationDetails.zip}
                </Text>
              </View>
            </View>
          )}

{/* ticket */}
          {ticketEnabled && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Ticket
              </Text>
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                 Ticket Total: {ticketTotal}
                </Text>
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                 Ticket Limit Per Person: {ticketLimitPerUser}
                </Text>
              </View>
            </View>
          )}
          {/* External URL */}
          {externalUrl && (
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Additional Info
              </Text>
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Text style={{ color: theme.colors.text }}>{externalUrl}</Text>
              </View>
            </View>
          )}

           {/* Selected Users List */}
    {coCreators && coCreators.coCreators &&  <View >
       <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Co Creators
              </Text>
              <View className="flex-row flex-wrap gap-2">
        {coCreators?.coCreators?.map((user) => (
          <TouchableOpacity
            key={user.id}
            onPress={() => toggleUserSelection(user)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: `${theme.colors.primary}`,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: `${theme.colors.primary}30`,
            }}
          >

            <Avatar
                                className="mr-2 w-6 h-6"
                                alt={getUserDisplayName(user?.user)}
                              >
                                {user.avatar_url ? (
                                  <AvatarImage
                                    source={{ uri: user?.user.avatar_url }}
                                  />
                                ) : (
                                  <AvatarFallback>
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: theme.colors.text,
                                      }}
                                    >
                                      {getUserInitials(user?.user)}
                                    </Text>
                                  </AvatarFallback>
                                )}
                              </Avatar>
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "600",
                fontSize: 14,
                marginRight: 8,
              }}
            >
              {getUserDisplayName(user.user)}
            </Text>
        
          </TouchableOpacity>
        ))}
      </View>
      </View>}
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 16 }}>
          <TouchableOpacity
            onPress={onConfirm}
            style={{
              height: 56,
              backgroundColor: "#8B5CF6",
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "white",
              }}
            >
              View on Map ✨
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onEdit}
            style={{
              height: 56,
              backgroundColor: "transparent",
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#8B5CF6",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#8B5CF6",
              }}
            >
              Edit Event
            </Text>
          </TouchableOpacity>

           <TouchableOpacity
            onPress={onInviteUsers}
            style={{
              height: 56,
              backgroundColor: "transparent",
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#8B5CF6",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#8B5CF6",
              }}
            >
              Invite Users
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
