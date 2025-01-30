import React, { createContext, useContext, useCallback, useRef } from "react";
import { useChatContext } from "stream-chat-expo";
import * as Location from "expo-location";

interface LiveLocationContextValue {
  startLiveLocation: (messageId: string) => void;
  stopLiveLocation: (messageId: string) => void;
  isWatching: (messageId: string) => boolean;
}

const LiveLocationContext = createContext<LiveLocationContextValue>({
  startLiveLocation: () => {},
  stopLiveLocation: () => {},
  isWatching: () => false,
});

export const useLiveLocationContext = () => {
  return useContext(LiveLocationContext);
};

// a map of message IDs to live location subscriptions
const messageIdToLiveWatchMap = new Map<
  string,
  Location.LocationSubscription
>();

const isWatching = (id: string) => {
  return messageIdToLiveWatchMap.has(id);
};

export const LiveLocationContextProvider = (
  props: React.PropsWithChildren<{}>
) => {
  const { client } = useChatContext();
  const lastLocationRef = useRef<Location.LocationObject>();

  // watch live location and update message
  const startLiveLocation = useCallback(
    async (id: string) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Permission to access location was denied");
          return;
        }

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (location) => {
            client.updateMessage({
              id,
              attachments: [
                {
                  type: "location",
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                },
              ],
            });
            lastLocationRef.current = location;
          }
        );

        messageIdToLiveWatchMap.set(id, subscription);
      } catch (error) {
        console.error("Error starting location watch:", error);
      }
    },
    [client]
  );

  // stop watching live location and send message with ended time
  const stopLiveLocation = useCallback(
    async (id: string) => {
      const subscription = messageIdToLiveWatchMap.get(id);
      if (subscription) {
        messageIdToLiveWatchMap.delete(id);
        subscription.remove();

        if (lastLocationRef.current) {
          await client.updateMessage({
            id,
            attachments: [
              {
                type: "location",
                latitude: lastLocationRef.current.coords.latitude,
                longitude: lastLocationRef.current.coords.longitude,
                ended_at: new Date().toISOString(),
              },
            ],
          });
        }
      }
    },
    [client]
  );

  const contextValue: LiveLocationContextValue = {
    startLiveLocation,
    stopLiveLocation,
    isWatching,
  };

  return (
    <LiveLocationContext.Provider value={contextValue}>
      {props.children}
    </LiveLocationContext.Provider>
  );
};
