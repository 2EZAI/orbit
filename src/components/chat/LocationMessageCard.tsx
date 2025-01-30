import React, { useMemo } from "react";
import { View, Button, useWindowDimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMessageContext } from "stream-chat-expo";
import { useLiveLocationContext } from "~/src/lib/LiveLocationContext";

interface LocationCardProps {
  latitude: number;
  longitude: number;
  ended_at?: string;
}

export const LocationMessageCard = ({
  latitude,
  longitude,
  ended_at,
}: LocationCardProps) => {
  const { width, height } = useWindowDimensions();
  const aspect_ratio = width / height;
  const { stopLiveLocation } = useLiveLocationContext();
  const { isMyMessage, message } = useMessageContext();

  const showStopSharingButton = !ended_at && isMyMessage;
  const endedAtDate = ended_at ? new Date(ended_at) : null;
  const formattedEndedAt = endedAtDate ? endedAtDate.toLocaleString() : "";

  // Compute the zoom level and center for the map view
  const region = useMemo(() => {
    const latitudeDelta = 0.02;
    const longitudeDelta = latitudeDelta * aspect_ratio;
    return {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    };
  }, [aspect_ratio, latitude, longitude]);

  return (
    <View className="rounded-lg overflow-hidden">
      <MapView
        region={region}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        zoomTapEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
        className="h-[250px] w-[250px]"
      >
        <Marker
          coordinate={{
            latitude,
            longitude,
          }}
        />
      </MapView>
      {showStopSharingButton && (
        <View className="mt-2">
          <Button
            title="Stop sharing"
            onPress={() => {
              if (message?.id) {
                stopLiveLocation(message.id);
              }
            }}
          />
        </View>
      )}
      {ended_at && (
        <View className="mt-2">
          <Button title={`Ended at: ${formattedEndedAt}`} disabled={true} />
        </View>
      )}
      {!ended_at && !showStopSharingButton && (
        <View className="mt-2">
          <Button title="Live location" disabled={true} />
        </View>
      )}
    </View>
  );
};
