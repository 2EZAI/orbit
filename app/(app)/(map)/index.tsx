import React, { useState, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View } from "react-native";
import { Text } from "~/src/components/ui/text";
import { useUser } from "~/src/lib/UserProvider";
import { useMapCamera } from "~/src/hooks/useMapCamera";

// Import new modular components
import { MapboxContainer } from "~/src/components/map/MapboxContainer";
import { MapboxMarkers } from "~/src/components/map/MapboxMarkers";
import { MapStateManager } from "~/src/components/map/MapStateManager";
import { MapEventHandlers } from "~/src/components/map/MapEventHandlers";
import { MapPerformanceOptimizer } from "~/src/components/map/MapPerformanceOptimizer";

// Import existing components
import { MapControls } from "~/src/components/map/MapControls";
import { ClusterSheet } from "~/src/components/map/ClusterSheet";
import { UnifiedCard } from "~/src/components/map/UnifiedCard";
import {
  UnifiedData,
  UnifiedDetailsSheet,
} from "~/src/components/map/UnifiedDetailsSheet";
import { MapLoadingScreen } from "~/src/components/map/MapLoadingScreen";
import { SearchSheet } from "~/src/components/search/SearchSheet";

// Import types
import {
  MapEvent,
  MapLocation,
  UnifiedCluster,
} from "~/hooks/useUnifiedMapData";
import UnifiedShareSheet from "~/src/components/map/UnifiedShareSheet";
import { IProposal } from "~/hooks/useProposals";
import type { Channel } from "stream-chat";
import { ChatSelectionModal } from "~/src/components/social/ChatSelectionModal";
type TimeFrame = "Today" | "Week" | "Weekend";

export default function Map() {
  const isFocused = useIsFocused();
  const { user, userlocation } = useUser();
  const { cameraRef, isFollowingUser, handleZoomIn, handleZoomOut } =
    useMapCamera();

  // Viewport state for performance optimization
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [shareData, setShareData] = useState<{
    data: UnifiedData;
    isEventType: boolean;
  } | null>(null);
  const [chatShareSelection, setChatShareSelection] = useState<{
    proposal: IProposal | null;
    show: boolean;
    event: UnifiedData | null;
    isEventType: boolean;
  }>({
    proposal: null,
    show: false,
    event: null,
    isEventType: false,
  });
  // Get loading text based on the current loading reason
  const getLoadingText = useCallback(
    (loadingReason: "initial" | "timeframe" | "filters" | "data") => {
      switch (loadingReason) {
        case "initial":
          return {
            title: "Welcome to Orbit",
            subtitle: "Setting up your personalized map experience...",
          };
        case "data":
          return {
            title: "Discovering Events",
            subtitle: "Finding amazing events and locations near you...",
          };
        case "timeframe":
          return {
            title: "Updating Timeline",
            subtitle: "Loading events for selected timeframe...",
          };
        case "filters":
          return {
            title: "Applying Filters",
            subtitle: "Updating map with your preferences...",
          };
        default:
          return {
            title: "Loading Map",
            subtitle: "Please wait while we prepare everything...",
          };
      }
    },
    []
  );
  const handleChatSelect = async (channel: Channel) => {
    if (!channel) return;
    try {
      // Ensure channel is watched before sending
      await channel.watch();
      if (chatShareSelection.proposal) {
        const message = await channel.sendMessage({
          text: "Check out this proposal!",
          type: "regular",
          data: {
            proposal: chatShareSelection.proposal,
            type: "proposal/share",
          },
        });
        // router.push(`/(app)/(chat)/channel/${channel.id}`);
      }
      if (chatShareSelection.event) {
        const attachmentType =
          chatShareSelection.event?.source === "ticketmaster"
            ? "ticketmaster"
            : chatShareSelection.isEventType
            ? "event"
            : "location";
        const createPostShareAttachment = (
          type: "event" | "location" | "ticketmaster"
        ) => {
          switch (type) {
            case "event":
              const eventData = chatShareSelection.event;
              return {
                type: "event_share",
                event_id: eventData?.id || "",
                event_data: eventData,
              };
            case "location":
              const locationData = chatShareSelection.event;
              return {
                type: "location_share",
                location_id: locationData?.id || "",
                location_data: locationData,
              };
            case "ticketmaster":
              const ticketmasterData = chatShareSelection.event;
              return {
                type: "ticketmaster_share",
                event_id: ticketmasterData?.id || "",
                event_data: {
                  id: ticketmasterData?.id,
                  name: ticketmasterData?.name,
                  description: ticketmasterData?.description,
                  image_urls: ticketmasterData?.image_urls,
                  start_datetime: ticketmasterData?.start_datetime,
                  venue_name: ticketmasterData?.venue_name,
                  address: ticketmasterData?.address,
                  city: ticketmasterData?.city,
                  state: ticketmasterData?.state,
                  source: "ticketmaster",
                },
              };
            default:
              return null;
          }
        };
        const attachment = createPostShareAttachment(attachmentType);
        await channel.sendMessage({
          text: `Check out ${chatShareSelection.event?.name} on Orbit!`,
          type: "regular",
          // Send attachment (like web app) for cross-platform compatibility
          attachments: attachment ? [attachment] : [],
        });
      }
      // Send the post as a custom message with attachment

      // Navigate to the chat
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    }
  };
  // Mount heavy map tree only when this screen is focused.
  if (!isFocused) {
    return <View className="flex-1" />;
  }

  return (
    <MapStateManager cameraRef={cameraRef}>
      {(state) => (
        <MapEventHandlers cameraRef={cameraRef}>
          {(eventHandlers) => (
            <>
              {/* Event/Location Card - Show only when details sheet is not open */}
              {state.selectedEvent && !state.showDetails && (
                <>
                  {/* REMOVED: Debug logging for performance */}
                  <UnifiedCard
                    key={`${(state as any).isEvent ? "event" : "location"}-${
                      (state.selectedEvent as any)?.id || "unknown"
                    }`}
                    data={state.selectedEvent as any}
                    nearbyData={
                      (state.isEvent ? state.events : state.locations) as any
                    }
                    onClose={state.handleCloseModal}
                    onDataSelect={(data: any) => {
                      if (state.isEvent) {
                        eventHandlers.handleEventSelect(data);
                        state.handleEventClick(data);
                      } else {
                        eventHandlers.handleLocationSelect(data);
                        state.handleLocationClick(data);
                      }
                    }}
                    treatAsEvent={state.isEvent}
                    onShowDetails={() => {
                      state.setShowControler(false);
                      state.setShowDetails(true);
                    }}
                  />
                </>
              )}

              <MapPerformanceOptimizer
                events={state.events || []}
                locations={state.locations || []}
                clusters={state.clusters || []}
                clustersLocations={state.clustersLocations || []}
                clustersNow={state.clustersNow || []}
                clustersToday={state.clustersToday || []}
                clustersTomorrow={state.clustersTomorrow || []}
                filters={state.filters}
                mapBounds={mapBounds}
              >
                {(optimizedData) => {
                  // Calculate center for map container
                  const center: [number, number] = state.mapCenter || [0, 0];

                  // Enhanced region change handler
                  const handleRegionChange = useCallback(
                    (region: any) => {
                      try {
                        // Update map bounds for viewport-based rendering
                        if (
                          region?.properties?.bounds &&
                          Array.isArray(region.properties.bounds)
                        ) {
                          const bounds = region.properties.bounds;

                          // CRITICAL FIX: Check if bounds has the expected structure
                          if (
                            bounds.length >= 2 &&
                            Array.isArray(bounds[0]) &&
                            bounds[0].length >= 2 &&
                            Array.isArray(bounds[1]) &&
                            bounds[1].length >= 2
                          ) {
                            setMapBounds({
                              north: bounds[1][0], // northeast[0] = lat
                              south: bounds[0][0], // southwest[0] = lat
                              east: bounds[1][1], // northeast[1] = lng
                              west: bounds[0][1], // southwest[1] = lng
                            });
                          }
                        }

                        // OPTIMIZATION: Handle zoom level updates with debouncing to prevent excessive updates
                        const zoomLevel =
                          region?.properties?.zoomLevel ||
                          region?.properties?.zoom ||
                          region?.zoomLevel ||
                          region?.zoom;

                        // Only update if zoom level actually changed (prevent continuous updates)
                        if (
                          zoomLevel &&
                          typeof zoomLevel === "number" &&
                          state.setHideCount &&
                          zoomLevel !== state.currentZoomLevel
                        ) {
                          state.setHideCount(zoomLevel <= 12);
                          // Don't update zoom level state to prevent rerenders
                        }

                        // Call the event handler
                        eventHandlers.handleRegionChange(region);
                      } catch (error) {
                        console.error(
                          "[Map] Error in handleRegionChange:",
                          error
                        );
                        // Continue without crashing
                      }
                    },
                    [state.setHideCount, eventHandlers]
                  );

                  // REMOVED: Timing logs to reduce noise

                  // Enhanced map tap handler
                  const handleMapTap = useCallback(() => {
                    if (state.selectedEvent) {
                      state.handleCloseModal();
                    }
                  }, [state.selectedEvent, state.handleCloseModal]);

                  // Enhanced cluster press handler
                  const handleClusterPress = useCallback(
                    (cluster: UnifiedCluster) => {
                      eventHandlers.handleClusterPress(cluster);
                      state.handleClusterPress(cluster);
                    },
                    [eventHandlers, state]
                  );

                  // Enhanced recenter handler - FIXED COORDINATE ORDER
                  const handleRecenterClick = useCallback(() => {
                    console.log("🗺️ [Map] Recenter button clicked");
                    console.log(
                      "🗺️ [Map] User preference:",
                      user?.event_location_preference
                    );
                    console.log("🗺️ [Map] User location:", userlocation);
                    console.log("🗺️ [Map] State location:", state.location);
                    console.log("🗺️ [Map] Camera ref:", !!cameraRef.current);

                    if (
                      user?.event_location_preference === 1 &&
                      userlocation?.latitude &&
                      userlocation?.longitude
                    ) {
                      // User is in orbit mode - recenter to orbit location
                      console.log("🗺️ [Map] Recentering to orbit location");
                      eventHandlers.handleRecenter({
                        latitude: parseFloat(userlocation.latitude),
                        longitude: parseFloat(userlocation.longitude),
                      });
                      // Don't refresh data - just center the map
                    } else if (
                      state.location?.latitude &&
                      state.location?.longitude
                    ) {
                      // User is in current mode - recenter to GPS location
                      console.log("🗺️ [Map] Recentering to GPS location");
                      eventHandlers.handleRecenter(state.location);
                      // Don't refresh data - just center the map
                    } else {
                      // Fallback: get current location if no location available
                      console.log(
                        "🗺️ [Map] No location available, getting current location"
                      );
                      state.getCurrentLocation();
                    }
                  }, [
                    user?.event_location_preference,
                    userlocation,
                    state.location,
                    eventHandlers,
                    state.getCurrentLocation,
                    state.forceRefresh,
                    cameraRef,
                  ]);

                  return (
                    <View className="flex-1">
                      {/* Main Map Container */}
                      <MapboxContainer
                        center={center}
                        onRegionChange={handleRegionChange}
                        onMapTap={handleMapTap}
                        onMapLoadingError={() =>
                          console.log("Mapbox Map loading error")
                        }
                        onDidFinishLoadingMap={() =>
                          console.log("Mapbox Map loaded successfully")
                        }
                        isFollowingUser={isFollowingUser}
                        cameraRef={cameraRef}
                      >
                        {/* Mapbox Markers */}
                        <MapboxMarkers
                          clustersToday={optimizedData.visibleClustersToday}
                          clustersNow={optimizedData.visibleClustersNow}
                          clustersTomorrow={
                            optimizedData.visibleClustersTomorrow
                          }
                          clusters={optimizedData.visibleClusters}
                          clustersLocations={
                            optimizedData.visibleClustersLocations
                          }
                          location={state.location}
                          user={user}
                          userlocation={userlocation}
                          followerList={state.followerList}
                          // REMOVED: hideCount prop (not needed)
                          selectedEvent={state.selectedEvent}
                          selectedTimeFrame={state.selectedTimeFrame}
                          onClusterPress={handleClusterPress}
                          setIsEvent={state.setIsEvent}
                        />
                      </MapboxContainer>

                      {/* Map Controls */}
                      {state.showControler && (
                        <MapControls
                          onSearch={() => state.setIsSearchOpen(true)}
                          filters={state.filters}
                          onFilterChange={state.setFilters}
                          onZoomIn={handleZoomIn}
                          onZoomOut={handleZoomOut}
                          onRecenter={handleRecenterClick}
                          isFollowingUser={isFollowingUser}
                          timeFrame={state.selectedTimeFrame}
                          onSelectedTimeFrame={(txt) =>
                            state.setSelectedTimeFrame(txt as TimeFrame)
                          }
                          eventsList={state.events || []}
                          locationsList={state.locations || []}
                          onShowControler={(value: boolean) =>
                            state.setShowControler(value)
                          }
                        />
                      )}

                      {/* Cluster Sheet */}
                      {state.selectedCluster && (
                        <ClusterSheet
                          events={state.selectedCluster}
                          onEventSelect={
                            state.handleEventClick as (
                              event: MapEvent | MapLocation
                            ) => void
                          }
                          onClose={state.handleClusterClose}
                        />
                      )}

                      {/* Search Sheet */}
                      <SearchSheet
                        isOpen={state.isSearchOpen}
                        onClose={() => state.setIsSearchOpen(false)}
                        eventsList={state.events as any}
                        locationsList={state.locations as any}
                        onShowControler={() => state.setShowControler(true)}
                      />

                      {/* Details Sheet */}
                      {state.showDetails && state.selectedEvent && (
                        <UnifiedDetailsSheet
                          data={state.selectedEvent as any}
                          isOpen={state.showDetails}
                          onClose={() => state.setShowDetails(false)}
                          nearbyData={
                            (state.isEvent
                              ? state.events
                              : state.locations) as any
                          }
                          onDataSelect={(data) =>
                            state.handleEventClick(data as any)
                          }
                          onShare={(data, isEvent) => {
                            state.setShowDetails(false);
                            setShareData({ data, isEventType: isEvent });
                          }}
                          onShowControler={() => state.setShowControler(true)}
                          isEvent={state.isEvent}
                        />
                      )}
                      {shareData && (
                        <UnifiedShareSheet
                          isOpen={!!shareData}
                          onClose={() => {
                            state.setShowDetails(true);
                            setShareData(null);
                          }}
                          data={shareData?.data}
                          isEventType={shareData?.isEventType}
                          onProposalShare={(proposal: IProposal) => {
                            setShareData(null);
                            setChatShareSelection({
                              show: true,
                              proposal: proposal || null,
                              event: null,
                              isEventType: false,
                            });
                          }}
                          onEventShare={(event) => {
                            setShareData(null);
                            setChatShareSelection({
                              show: true,
                              proposal: null,
                              event: event || null,
                              isEventType: shareData?.isEventType,
                            });
                          }}
                        />
                      )}
                      <ChatSelectionModal
                        isOpen={chatShareSelection.show}
                        onClose={() => {
                          setChatShareSelection({
                            show: false,
                            proposal: null,
                            event: null,
                            isEventType: false,
                          });
                        }}
                        onSelectChat={handleChatSelect}
                      />
                      {/* Loading Screen */}
                      <MapLoadingScreen
                        isVisible={!state.isMapFullyLoaded}
                        loadingText={getLoadingText(state.loadingReason).title}
                        subtitle={
                          state.isLoading
                            ? `Rendering ${optimizedData.visibleMarkers} of ${optimizedData.totalMarkers} markers (${optimizedData.renderEfficiency}% efficiency)`
                            : getLoadingText(state.loadingReason).subtitle
                        }
                        onForceRefresh={() => {
                          console.log(
                            "[Map] 🔄 FORCE REFRESH FROM LOADING SCREEN"
                          );
                          // Force hide loading screen
                          state.setIsMapFullyLoaded(true);
                        }}
                      />

                      {/* Error Display */}
                      {state.errorMsg && (
                        <View className="absolute right-4 left-4 top-20 p-4 bg-red-500 rounded-lg">
                          <Text className="text-center text-white">
                            {state.errorMsg}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                }}
              </MapPerformanceOptimizer>
            </>
          )}
        </MapEventHandlers>
      )}
    </MapStateManager>
  );
}
