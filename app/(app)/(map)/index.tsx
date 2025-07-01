import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import * as Location from "expo-location";
import { useTheme } from "~/src/components/ThemeProvider";
import MapboxGL, { UserTrackingMode } from "@rnmapbox/maps";
import { useUser } from "~/hooks/useUserData";
import { useMapEvents, type MapEvent } from "~/hooks/useMapEvents";
import { useMapCamera } from "~/src/hooks/useMapCamera";
import { MapControls } from "~/src/components/map/MapControls";
import { X, MapPin } from "lucide-react-native";

import { Sheet } from "~/src/components/ui/sheet";
import { UserMarker } from "~/src/components/map/UserMarker";
import { UserMarkerWithCount } from "~/src/components/map/UserMarkerWithCount";

import { EventMarker } from "~/src/components/map/EventMarker";
import { ClusterSheet } from "~/src/components/map/ClusterSheet";
import { MapEventCard } from "~/src/components/map/EventCard";
import { MapLocationCard } from "~/src/components/map/LocationCard";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { LocationDetailsSheet } from "~/src/components/map/LocationDetailsSheet";

import { SearchSheet } from "~/src/components/search/SearchSheet";

// Replace with your Mapbox access token
MapboxGL.setAccessToken(
  "pk.eyJ1IjoidGFuZ2VudGRpZ2l0YWxhZ2VuY3kiLCJhIjoiY2xwMHR0bTVmMGJwbTJtbzhxZ2pvZWNoYiJ9.ZGwLHw0gLeEVxPhoYq2WyA"
);

// Custom style URLs - now these will work with Mapbox
const CUSTOM_LIGHT_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv4xtp002y01psdttf9jhr";
const CUSTOM_DARK_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv4xtp002y01psdttf9jhr";

export default function Map() {
    const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('Today');
    const [showDetails, setShowDetails] = useState(false);
     const [isEvent, setIsEvent] = useState(false);
    const [hideCount, setHideCount] = useState(false);
   let isUpdatLiveLocation = true;
     const [showControler, setShowControler] = useState(true);
   const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const { user ,userlocation, updateUserLocations } = useUser();
  const mapRef = useRef<MapboxGL.MapView>(null);
  const { session } = useAuth();
  const [location, setLocation] = useState<{
    latitude: numbrer;
    longitude: number;
    heading?: number | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
   const [followerList, setFollowerList] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState<MapEvent[] | null>(
    null
  );

  const {
    cameraRef,
    isFollowingUser,
    setIsFollowingUser,
    handleZoomIn,
    handleZoomOut,
    handleRecenter,
    fitToEvents,
  } = useMapCamera();

  var {
    events,
    locations,
    eventsNow,
    eventsToday,
    eventsTomorrow,
    clusters,
    clustersLocations,
    clustersNow,
    clustersToday,
    clustersTomorrow,
    selectedEvent,
    isLoading,
    error,
    handleEventClick,
    handleCloseModal,
  } = useMapEvents({
    center:
  user?.event_location_preference == 1
    ? [userlocation?.latitude, userlocation?.longitude]
    : location
      ? [location.latitude, location.longitude]
      : [0, 0],
    // center: location
    //   ? [location.latitude, location.longitude]
    //     : [0, 0],
      // : [37.7749, -122.4194],
    radius: 50000,
    timeRange: "now",
  });

  // Add logging for event selection
  useEffect(() => {
    if (selectedEvent) {
      console.log("Selected event:", {
        id: selectedEvent.id,
        name: selectedEvent.name,
        venue: selectedEvent.venue_name,
      });
    }
  }, [selectedEvent]);

useEffect(() => {
  console.log("followerList updated >>>>", followerList);
 
}, [followerList]);

const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 3956; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
};

// Compute nearby follower count for each user
const getNearbyFollowerCounts = (followerList, radius = 10) => {
  return followerList.map((user, index) => {
    let nearbyCount = 0;
    for (let i = 0; i < followerList.length; i++) {
      if (i !== index) {
        const other = followerList[i];
        const distance = haversine(
          user.live_location_latitude,
          user.live_location_longitude,
          other.live_location_latitude,
          other.live_location_longitude
        );
        if (distance <= radius) {
          nearbyCount++;
        }
      }
    }
    return {
      ...user,
      nearbyCount,
    };
  });
};

  // Add logging for events
  useEffect(() => {
    console.log("[Map] Total events available:", events.length);
    console.log("[Map] First event location:", events[0]?.location);

    // Fit map to events if we have any
    if (events.length > 0 && mapRef.current && cameraRef.current) {
      const bounds = events.reduce(
        (acc, event) => {
          acc.north = Math.max(acc.north, event.location.latitude);
          acc.south = Math.min(acc.south, event.location.latitude);
          acc.east = Math.max(acc.east, event.location.longitude);
          acc.west = Math.min(acc.west, event.location.longitude);
          return acc;
        },
        {
          north: -90,
          south: 90,
          east: -180,
          west: 180,
        }
      );

      console.log("[Map] Calculated bounds:", bounds);

      // Add padding to bounds
      const padding = 0.1; // degrees

      // Only fit to bounds if they're valid (not the initial values)
      if (bounds.north !== -90 && bounds.south !== 90) {
        // Calculate center point of events
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;

        // Calculate appropriate zoom level based on bounds
        const latDiff = Math.abs(bounds.north - bounds.south);
        const lngDiff = Math.abs(bounds.east - bounds.west);
        const maxDiff = Math.max(latDiff, lngDiff);
        const zoomLevel = Math.floor(14 - Math.log2(maxDiff)); // Adjust 14 to change base zoom

        cameraRef.current.setCamera({
          centerCoordinate: [centerLng, centerLat],
          zoomLevel: Math.min(Math.max(zoomLevel, 9), 16), // Clamp between min and max zoom
          animationDuration: 1000,
          animationMode: "flyTo",
        });
      }
    }
  }, [events, mapRef, cameraRef]);

  // Add logging for events
  useEffect(() => {
    console.log("[Map] Total followerList available:", followerList.length);
    console.log("[Map] zoomlevel:", cameraRef.current);

  }, [followerList, mapRef, cameraRef]);

 // Add logging for events
  useEffect(() => {

setTimeout(()=>{
  setIsFollowingUser(false)
},2000);
    if(selectedTimeFrame == 'Today'){
       // Fit map to events if we have any
    if ( eventsNow.length > 0 && mapRef.current && cameraRef.current) {
      const bounds = events.reduce(
        (acc, event) => {
          acc.north = Math.max(acc.north, event.location.latitude);
          acc.south = Math.min(acc.south, event.location.latitude);
          acc.east = Math.max(acc.east, event.location.longitude);
          acc.west = Math.min(acc.west, event.location.longitude);
          return acc;
        },
        {
          north: -90,
          south: 90,
          east: -180,
          west: 180,
        }
      );

      console.log("[Map] Calculated bounds:", bounds);

      // Add padding to bounds
      const padding = 0.1; // degrees

      // Only fit to bounds if they're valid (not the initial values)
      if (bounds.north !== -90 && bounds.south !== 90) {
        // Calculate center point of events
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;

        // Calculate appropriate zoom level based on bounds
        const latDiff = Math.abs(bounds.north - bounds.south);
        const lngDiff = Math.abs(bounds.east - bounds.west);
        const maxDiff = Math.max(latDiff, lngDiff);
        const zoomLevel = Math.floor(14 - Math.log2(maxDiff)); // Adjust 14 to change base zoom

        cameraRef.current.setCamera({
          centerCoordinate: [centerLng, centerLat],
          zoomLevel: Math.min(Math.max(zoomLevel, 9), 16), // Clamp between min and max zoom
          animationDuration: 1000,
          animationMode: "flyTo",
        });
      }
    }
    console.log("[Map] Total eventsNow available:", eventsNow.length);
    console.log("[Map] First event location:", eventsNow[0]?.location);
    }


    if(selectedTimeFrame == 'Week'){
       // Fit map to events if we have any
    if (eventsToday.length > 0 && mapRef.current && cameraRef.current) {
      const bounds = events.reduce(
        (acc, event) => {
          acc.north = Math.max(acc.north, event.location.latitude);
          acc.south = Math.min(acc.south, event.location.latitude);
          acc.east = Math.max(acc.east, event.location.longitude);
          acc.west = Math.min(acc.west, event.location.longitude);
          return acc;
        },
        {
          north: -90,
          south: 90,
          east: -180,
          west: 180,
        }
      );

      console.log("[Map] Calculated bounds:", bounds);

      // Add padding to bounds
      const padding = 0.1; // degrees

      // Only fit to bounds if they're valid (not the initial values)
      if (bounds.north !== -90 && bounds.south !== 90) {
        // Calculate center point of events
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;

        // Calculate appropriate zoom level based on bounds
        const latDiff = Math.abs(bounds.north - bounds.south);
        const lngDiff = Math.abs(bounds.east - bounds.west);
        const maxDiff = Math.max(latDiff, lngDiff);
        const zoomLevel = Math.floor(14 - Math.log2(maxDiff)); // Adjust 14 to change base zoom

        cameraRef.current.setCamera({
          centerCoordinate: [centerLng, centerLat],
          zoomLevel: Math.min(Math.max(zoomLevel, 9), 16), // Clamp between min and max zoom
          animationDuration: 1000,
          animationMode: "flyTo",
        });
      }
    }
    console.log("[Map] Total eventsToday available:", eventsToday.length);
    console.log("[Map] First event location:", eventsToday[0]?.location);
    }
    if(selectedTimeFrame == 'Weekend'){
         // Fit map to events if we have any
    if (eventsTomorrow.length > 0 && mapRef.current && cameraRef.current) {
      const bounds = events.reduce(
        (acc, event) => {
          acc.north = Math.max(acc.north, event.location.latitude);
          acc.south = Math.min(acc.south, event.location.latitude);
          acc.east = Math.max(acc.east, event.location.longitude);
          acc.west = Math.min(acc.west, event.location.longitude);
          return acc;
        },
        {
          north: -90,
          south: 90,
          east: -180,
          west: 180,
        }
      );

      console.log("[Map] Calculated bounds:", bounds);

      // Add padding to bounds
      const padding = 0.1; // degrees

      // Only fit to bounds if they're valid (not the initial values)
      if (bounds.north !== -90 && bounds.south !== 90) {
        // Calculate center point of events
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;

        // Calculate appropriate zoom level based on bounds
        const latDiff = Math.abs(bounds.north - bounds.south);
        const lngDiff = Math.abs(bounds.east - bounds.west);
        const maxDiff = Math.max(latDiff, lngDiff);
        const zoomLevel = Math.floor(14 - Math.log2(maxDiff)); // Adjust 14 to change base zoom

        cameraRef.current.setCamera({
          centerCoordinate: [centerLng, centerLat],
          zoomLevel: Math.min(Math.max(zoomLevel, 9), 16), // Clamp between min and max zoom
          animationDuration: 1000,
          animationMode: "flyTo",
        });
      }
    }
     console.log("[Map] Total eventsTomorrow available:", eventsTomorrow.length);
    console.log("[Map] First event location:", eventsTomorrow[0]?.location);
    }
   

   
  }, [selectedTimeFrame, mapRef, cameraRef]);

  // Add logging for user data
  useEffect(() => {
    if (user) {
      console.log("[Map] User data:", {
        id: user.id,
        avatar_url: user?.avatar_url,
      });
    }
  }, [user]);

    useEffect(() => {
    console.log('useEffect','?');
    // console.log("events>",events.length);
    // console.log("clusters>",clusters);
    // return;
  }, );

const locationUpdateTimeoutRef = useRef(null);

async function scheduleLocationUpdate(location) {
  if (!location) return;

  clearTimeout(locationUpdateTimeoutRef.current);

  locationUpdateTimeoutRef.current = setTimeout(async () => {
    // console.error("Updating user location (debounced)");
    await updateUserLocations({
      live_location_latitude: location.latitude,
      live_location_longitude: location.longitude,
    });
  }, 2000);
}

useEffect(() => {
  console.log("updateUserLocations>updateUserLocations");

  getFollowedUserDetails(); // Assuming this doesn't rely on location

  scheduleLocationUpdate(location);
}, [location]);

const getFollowingsByFollower = async () => {
    console.log("getFollowingsByFollower");
   if (!session?.user.id) {
      Alert.alert("Error", "Please sign in to like posts");
      return;
    }
     console.log("getFollowingsByFollower>>");
  const { data, error } = await supabase
    .from("follows")
    .select("*") // or specify fields like "following_id"
    .eq("follower_id", session?.user.id);

  if (error) throw error;

  console.log("Matched followings:", data);
  return data; // list of all following relationships for the given follower
};

const getFollowedUserDetails = async () => {
  // Step 1: Get list of following_ids
  const { data: follows, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", session?.user.id);

  if (followError) throw followError;
  if (!follows || follows.length === 0) return [];

  const followingIds = follows.map(f => f.following_id);
  console.log("followingIds:", followingIds);

  // Step 2: Check which of them also follow the session user
const { data: mutuals, error: mutualError } = await supabase
  .from("follows")
  .select("follower_id")
  .in("follower_id", followingIds)  // These people must be the follower
  .eq("following_id", session?.user.id); // ...of the session user

if (mutualError) throw mutualError;

const mutualFollowerIds = mutuals.map(m => m.follower_id);

console.log("Mutual followers:", mutualFollowerIds);
  
  // Step 2: Fetch user data in batch
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, avatar_url")
    .in("id", mutualFollowerIds)
    .eq("is_live_location_shared", 1);

  if (usersError) throw usersError;
  console.log("Followed user", users);

  const live_usersIds = users.map(m => m.id);
  // Step 3: Fetch location data in batch
  const { data: locations, error: locationError } = await supabase
    .from("user_locations")
    .select("user_id, live_location_latitude, live_location_longitude")
    .in("user_id", live_usersIds);
  console.log("Followed locations", locations);
  if (locationError) throw locationError;

  // Step 4: Combine all data
  const result = live_usersIds.map((userId,index) => {
    const user = users.find(u => u.id === userId);
    const location = locations.find(l => l.user_id === userId);

// let ll=[{ lat: 41.3688486, lng: -81.6293933 },
//   { lat: 41.3688425, lng: -81.6303213 },
//   { lat: 41.4439525, lng: -81.8009226 },];
// const locationn = ll[index] ; 

return {
      userId,
      avatar_url: user?.avatar_url || null,
      live_location_latitude: parseFloat(location?.live_location_latitude) || 0.0 ,
      live_location_longitude: parseFloat(location?.live_location_longitude) || 0.0,
      // live_location_latitude: locationn.lat ,
      // live_location_longitude: locationn.lng ,
    };
   
  });

  console.log("Followed user details:", result);
  // setFollowerList(result);
 const updatedFollowerList = getNearbyFollowerCounts(result);
console.log("updatedFollowerList:", updatedFollowerList);
setFollowerList([]);
setFollowerList(updatedFollowerList);
  return result;
};


  // Initialize and watch location
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        console.log("[Map] Initial user location:", {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          heading: initialLocation.coords.heading,
        });

        setLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          heading: initialLocation.coords.heading || undefined,
        });

        // Set initial camera position smoothly
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [
              initialLocation.coords.longitude,
              initialLocation.coords.latitude,
            ],
            zoomLevel: 11,
            animationDuration: 1000,
            animationMode: "flyTo",
          });
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 10, // Only update if moved 10 meters
            timeInterval: 5000, // Or every 5 seconds
          },
          (newLocation) => {
            console.log("[Map] User location updated:", {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              heading: newLocation.coords.heading,
            });

            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              heading: newLocation.coords.heading || undefined,
            });
        
          }
        );
      } catch (error) {
        console.error("Location error:", error);
        setErrorMsg(
          "Error getting location. Please check your location settings."
        );
      }
    })();
    

    return () => locationSubscription?.remove();
  }, []);

  const handleMapTap = useCallback(() => {
    if (selectedEvent) {
      handleCloseModal();
    }
  }, [selectedEvent, handleCloseModal]);

  const handleEventSelect = useCallback(
    (event: MapEvent) => {
      // Center map on selected event
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [event.location.longitude, event.location.latitude],
          zoomLevel: 14,
          animationDuration: 500,
          animationMode: "flyTo",
        });
      }
      handleEventClick(event);
    },
    [handleEventClick]
  );

  const handleClusterPress = useCallback(
    (cluster: { events: MapEvent[] }) => {
      // console.log("[Map] Cluster pressed:", {
      //   eventCount: cluster?.events?.length,
      //   firstEventId: cluster?.events[0]?.id,
      // });

      if (cluster.events?.length === 1) {
        // Center map on selected event
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [
              cluster.events[0].location.longitude,
              cluster.events[0].location.latitude,
            ],
            zoomLevel: 14,
            animationDuration: 500,
            animationMode: "flyTo",
          });
        }
        handleEventClick(cluster.events[0]);
      } else {
        setSelectedCluster(cluster.events);
      }
    },
    [handleEventClick, cameraRef]
  );

  const handleClusterClose = useCallback(() => {
    setSelectedCluster(null);
  }, []);

 
 

  if (errorMsg) {
    return (
      <View className="items-center justify-center flex-1">
        <Text className="text-red-500">{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" />
        <Text className="mt-4">Getting your location...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={isDarkMode ? CUSTOM_DARK_STYLE : CUSTOM_LIGHT_STYLE}
        rotateEnabled
        scrollEnabled
        zoomEnabled
        onTouchMove={() => setIsFollowingUser(false)}
        onPress={handleMapTap}
        logoEnabled={false}
        onDidFinishLoadingMap={() => {
          console.log("[Map] Map finished loading");
        }}
        onRegionDidChange={(region) => {
          console.log("[Map] Region changed:", region);
          let zoomLevel=region?.properties?.zoomLevel
          if(zoomLevel <=12)
          {
setHideCount(true);
          }
          else{
setHideCount(false);
          }
          
        }}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [
              location?.longitude || -122.4194,
              location?.latitude || 37.7749,
            ],
            zoomLevel: 11,
          }}
          maxZoomLevel={16}
          minZoomLevel={9}
          animationMode="flyTo"
          animationDuration={1000}
          followUserLocation={isFollowingUser}
          followUserMode={UserTrackingMode.FollowWithCourse}
          followZoomLevel={14}
        />

        
       

        {/* Event markers */}
        
     {selectedTimeFrame == 'Today' && clustersNow.map((cluster,index) => (
     
          <MapboxGL.MarkerView
            // key={`cluster-${cluster.mainEvent.id}`}
            // id={`cluster-${cluster.mainEvent.id}`}
              //  key={`cluster-${cluster.id}`}
              key={cluster.id ? `cluster-${cluster.id}` : `cluster-${index}`}
            id={`cluster-${cluster.id}`}
            coordinate={[cluster.location.longitude, cluster.location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                zIndex: cluster.events.some((e) => e.id === selectedEvent?.id)
                  ? 1000
                  : 100,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setIsEvent(true);
                  handleClusterPress(cluster)}}
                style={{ padding: 5 }}
              >
                <EventMarker
                  imageUrl={cluster.mainEvent.image_urls[0]}
                 
                  count={cluster.events.length}
                  isSelected={cluster.events.some(
                    (e) => e.id === selectedEvent?.id
                  )}
                />
              </TouchableOpacity>
            </View>
          </MapboxGL.MarkerView>
        ))}

          {selectedTimeFrame == 'Week' && clustersToday.map((cluster,index) => (
          <MapboxGL.MarkerView
            // key={`cluster-${cluster.mainEvent.id}`}
            // id={`cluster-${cluster.mainEvent.id}`}
              //  key={`cluster-${cluster.id}`}
              key={cluster.id ? `cluster-${cluster.id}` : `cluster-${index}`}
            id={`cluster-${cluster.id}`}
            coordinate={[cluster.location.longitude, cluster.location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                zIndex: cluster.events.some((e) => e.id === selectedEvent?.id)
                  ? 1000
                  : 100,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setIsEvent(true);
                  handleClusterPress(cluster)
                }
                }
                style={{ padding: 5 }}
              >
                <EventMarker
                  imageUrl={cluster.mainEvent.image_urls[0]}
                 
                  count={cluster.events.length}
                  isSelected={cluster.events.some(
                    (e) => e.id === selectedEvent?.id
                  )}
                />
              </TouchableOpacity>
            </View>
          </MapboxGL.MarkerView>
        ))}

        {selectedTimeFrame == 'Weekend' && clustersTomorrow.map((cluster,index) => (
          <MapboxGL.MarkerView
            // key={`cluster-${cluster.mainEvent.id}`}
            // id={`cluster-${cluster.mainEvent.id}`}
              //  key={`cluster-${cluster.id}`}
              key={cluster.id ? `cluster-${cluster.id}` : `cluster-${index}`}
            id={`cluster-${cluster.id}`}
            coordinate={[cluster.location.longitude, cluster.location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                zIndex: cluster.events.some((e) => e.id === selectedEvent?.id)
                  ? 1000
                  : 100,
              }}
            >
              <TouchableOpacity
                onPress={() =>{ 
                  setIsEvent(true);
                  handleClusterPress(cluster)
                }}
                style={{ padding: 5 }}
              >
                <EventMarker
                  imageUrl={cluster.mainEvent.image_urls[0]}
                 
                  count={cluster.events.length}
                  isSelected={cluster.events.some(
                    (e) => e.id === selectedEvent?.id
                  )}
                />
              </TouchableOpacity>
            </View>
          </MapboxGL.MarkerView>
        ))}

{/* locations fetched from static_location table for (beach, club , park etc) */}
        { clustersLocations.length > 0  && clustersLocations.map((cluster,index) => (

          <MapboxGL.MarkerView
              //  key={`cluster-${cluster.id}`}
              key={cluster.id ? `cluster-${cluster.id}` : `cluster-${index}`}
            id={`cluster-${cluster.id}`}
            coordinate={[cluster.location.longitude, cluster.location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                zIndex: cluster?.events?.some((e) => e.id === selectedEvent?.id)
                  ? 1000
                  : 100,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setIsEvent(false);
                  handleClusterPress(cluster)
                }}
                style={{ padding: 5 }}
              >
                <EventMarker
                  imageUrl={cluster.mainEvent?.image_urls?.[0]}
                 
                  count={cluster?.events?.length}
                  isSelected={cluster?.events?.some(
                    (e) => e.id === selectedEvent?.id
                  )}
                />
              </TouchableOpacity>
            </View>
          </MapboxGL.MarkerView>
        ))}

        {/* User location marker */}
        {location && (
          <MapboxGL.MarkerView
            id="userLocation"
            coordinate={[location.longitude, location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={true}
          >
            <View
              className="items-center justify-center"
              style={{ zIndex: 2000 }}
            >
              <UserMarker
                avatarUrl={user?.avatar_url}
                heading={location.heading || undefined}
              />
            </View>
          </MapboxGL.MarkerView>
        )}

        {followerList.length > 0 &&
  followerList.map((followerUser,index) => (


    <MapboxGL.MarkerView
      // key={`followerUser-${followerUser?.userId}`}
      key={followerUser.userId ? `followerUser-${followerUser?.userId}` : `followerUser-${index}`}
      id={`followerUser-${followerUser?.userId}`}
      coordinate={[
        followerUser?.live_location_longitude,
        followerUser?.live_location_latitude,
      ]}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View className="items-center justify-center">
        <UserMarkerWithCount
          avatarUrl={followerUser?.avatar_url}
          showCount={hideCount}
          count={followerUser.nearbyCount > 0 ? followerUser.nearbyCount + 1 : 0} // +1 to include the user
        />
      </View>
    </MapboxGL.MarkerView>
  ))}
      </MapboxGL.MapView>

     { showControler && <MapControls
        onSearch={() => setIsSearchOpen(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenter={() => handleRecenter(location)}
        isFollowingUser={isFollowingUser}
        timeFrame={selectedTimeFrame}
        onSelectedTimeFrame={(txt)=>{
          console.log("txt>>",txt);
        setSelectedTimeFrame(txt);
        }}
      />
     }
      {selectedEvent && isEvent && (
        <MapEventCard
          event={selectedEvent}
          nearbyEvents={events}
          onClose={handleCloseModal}
          onEventSelect={handleEventSelect}
          onShowDetails={() => {
            setShowControler(false);
            setShowDetails(true);
          }}
        />
      )}

      {selectedEvent && !isEvent && (
        <MapLocationCard
          event={selectedEvent}
          nearbyEvents={locations}
          onClose={handleCloseModal}
          onEventSelect={handleEventSelect}
          onShowDetails={() => {
            setShowControler(false);
            setShowDetails(true);
          }}
        />
      )}
  
      {selectedCluster && (
        <ClusterSheet
          events={selectedCluster}
          onEventSelect={handleEventClick}
          onClose={handleClusterClose}
        />
      )}
       <SearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        eventsList={events}
        onShowControler={(value)  => setShowControler(value)}
      />
      {showDetails && isEvent && (
        <EventDetailsSheet
          event={selectedEvent}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          nearbyEvents={events}
          onShowControler={()  => setShowControler(true)}
        />
      )}
      {showDetails && !isEvent && (
        <LocationDetailsSheet
          event={selectedEvent}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          nearbyEvents={events}
          onShowControler={()  => setShowControler(true)}
        />
      )}
      
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});
