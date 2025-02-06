import { View, Image } from "react-native";
import { Text } from "~/src/components/ui/text";

interface EventMarkerProps {
  imageUrl: string;
  count?: number;
  isSelected?: boolean;
}

export const EventMarker = ({
  imageUrl,
  count = 1,
  isSelected = false,
}: EventMarkerProps) => (
  <View style={{ position: "relative", zIndex: isSelected ? 1000 : 100 }}>
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          padding: 2,
          backgroundColor: "white",
          borderRadius: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          width: 50,
          height: 50,
          borderWidth: isSelected ? 2 : 0,
          borderColor: "#0091ff",
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
          }}
        />
        {count > 1 && (
          <View
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              backgroundColor: "#0091ff",
              borderRadius: 12,
              minWidth: 24,
              height: 24,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "white",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 12,
                fontWeight: "bold",
                paddingHorizontal: 4,
              }}
            >
              {count}
            </Text>
          </View>
        )}
      </View>
      <View
        style={{
          width: 8,
          height: 8,
          marginTop: -4,
          borderRadius: 4,
          backgroundColor: "black",
          opacity: 0.2,
        }}
      />
    </View>
  </View>
);
