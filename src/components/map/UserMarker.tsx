import { View, Image } from "react-native";

interface UserMarkerProps {
  avatarUrl?: string | null;
  heading?: number;
}

export const UserMarker = ({ avatarUrl, heading }: UserMarkerProps) => (
  <View
    className="items-center"
    style={{
      position: "absolute",
      zIndex: 1000,
      elevation: 1000,
      backgroundColor: "transparent",
    }}
  >
    <View
      style={{
        padding: 2,
        borderRadius: 9999,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 1000,
        transform:
          heading !== undefined ? [{ rotate: `${heading}deg` }] : undefined,
      }}
    >
      <Image
        source={
          avatarUrl ? { uri: avatarUrl } : require("~/assets/favicon.png")
        }
        style={{
          width: 32,
          height: 32,
          borderRadius: 9999,
        }}
      />
    </View>
    <View
      style={{
        width: 8,
        height: 8,
        marginTop: -4,
        borderRadius: 9999,
        backgroundColor: "black",
        opacity: 0.2,
      }}
    />
  </View>
);
