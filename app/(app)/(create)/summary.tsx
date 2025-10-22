import React , {useState, useEffect} from "react";
import { View, StatusBar } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfettiAnimation } from "~/src/components/ui/ConfettiAnimation";
import EventSummaryCard from "~/src/components/createpost/EventSummaryCard";
import { DeviceEventEmitter } from "react-native";
import InviteUsers from "~/src/components/createpost/InviteUsers";
import { haptics } from "~/src/lib/haptics";
import { useAuth } from "~/src/lib/auth";
import { LocationChangeModal } from "~/src/components/map/LocationChangeModal";
import { isLocationOutsideRadius } from "~/src/lib/distance";



interface EventImage {
  uri: string;
  type: string;
  name: string;
}

interface LocationDetails {
  address1: string;
  city: string;
  state: string;
  zip: string;
}

export default function EventSummary() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState<Boolean>(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLocationChangeModal, setShowLocationChangeModal] = useState(false);
  const [eventLocation, setEventLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  } | null>(null);
  const [distance, setDistance] = useState(0);

  // Trigger confetti and celebration haptics when component mounts (event creation success)
  useEffect(() => {
    // Small delay to let the screen render first
    const timer = setTimeout(() => {
      setShowConfetti(true);
      // Strong celebration haptics for event creation
      haptics.celebration();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

console.log("params>>",params);
  // Parse the event data from params
  const eventData = {
    name: params.name as string,
    description: params.description as string,
    isPrivate: params.isPrivate === "true",
    images: JSON.parse(params.images as string) as EventImage[],
    startDate: new Date(params.startDate as string),
    endDate: new Date(params.endDate as string),
    locationDetails: params.locationDetails
      ? (JSON.parse(params.locationDetails as string) as LocationDetails)
      : undefined,
    externalUrl: params.externalUrl as string,
    eventLocation: {
      lat: parseFloat(params.lat as string),
      lng: parseFloat(params.lng as string),
    },
  };

  const handleConfirm = () => {
    // Check if the event is outside the currently loaded data area
    const currentCenter = {
      latitude: parseFloat(params.currentLat as string) || 0,
      longitude: parseFloat(params.currentLng as string) || 0,
    };
    
    const eventLocation = {
      latitude: eventData.eventLocation.lat,
      longitude: eventData.eventLocation.lng,
      name: eventData.name,
      address: eventData.locationDetails?.address1 || "",
    };

    // Check if event is outside the loaded data radius (100km)
    const { isOutside, distance } = isLocationOutsideRadius(
      eventLocation,
      currentCenter,
      100 // 100km radius
    );

    console.log("🔍 [Summary] Location check:", {
      currentCenter,
      eventLocation,
      isOutside,
      distance,
      currentLat: params.currentLat,
      currentLng: params.currentLng
    });

    if (isOutside && currentCenter.latitude !== 0 && currentCenter.longitude !== 0) {
      // Show location change modal
      setEventLocation(eventLocation);
      setDistance(distance);
      setShowLocationChangeModal(true);
    } else {
      // Navigate directly to map
      navigateToMap();
    }
  };

  const navigateToMap = () => {
    // Navigate to the map view centered on the event location
    router.push({
      pathname: "/(app)/(map)",
      params: {
        lat: eventData.eventLocation.lat,
        lng: eventData.eventLocation.lng,
        zoom: 15,
        showEventCard: "true",
        eventId: params.eventId as string,
        // Add a timestamp to force map reload
        reload: Date.now().toString(),
      },
    });

    // Emit event to reload map and show event card
    DeviceEventEmitter.emit("mapReload", true);
    DeviceEventEmitter.emit("showEventCard", {
      eventId: params.eventId as string,
      lat: eventData.eventLocation.lat,
      lng: eventData.eventLocation.lng,
    });
  };

  const handleLocationChangeConfirm = () => {
    // Navigate to map with location change flag
    router.push({
      pathname: "/(app)/(map)",
      params: {
        lat: eventData.eventLocation.lat,
        lng: eventData.eventLocation.lng,
        zoom: 15,
        showEventCard: "true",
        eventId: params.eventId as string,
        // Add a timestamp to force map reload
        reload: Date.now().toString(),
        // Flag to indicate location change
        changeLocation: "true",
      },
    });

    // Emit event to reload map and show event card
    DeviceEventEmitter.emit("mapReload", true);
    DeviceEventEmitter.emit("showEventCard", {
      eventId: params.eventId as string,
      lat: eventData.eventLocation.lat,
      lng: eventData.eventLocation.lng,
    });
  };

  const handleEdit = () => {
    console.log("params.eventId>",params.eventId);
    // console.log("params.eventId as string>",params.eventId as string);
     DeviceEventEmitter.emit("editEvent", {
      eventId: params.eventId,
    });
    // Navigate to create screen with from parameter
    router.push({
      pathname: "/(app)/(create)",
      params: {
        eventId: params.eventId,
        editMode: "true",
        from: "map", // Indicate we're coming from map
      },
    });
  };

const handleInviteUser = () => {
    setIsInviteOpen(true);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.dark ? "#1a1a2e" : "#f8fafc",
      }}
    >
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Confetti Animation */}
      <ConfettiAnimation 
        isActive={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Cosmic Background */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.dark ? "#1a1a2e" : "#f8fafc",
        }}
      />

      {/* Main Content */}
      <View
        style={{
          flex: 1,
          paddingTop: Math.max(insets.top + 20, 40),
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom + 20, 40),
        }}
      >
        <EventSummaryCard
          name={eventData.name}
          description={eventData.description}
          isPrivate={eventData.isPrivate}
          images={eventData.images}
          startDate={eventData.startDate}
          endDate={eventData.endDate}
          locationDetails={eventData.locationDetails}
          externalUrl={eventData.externalUrl}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          onInviteUsers={handleInviteUser}
        />
      </View>
      {isInviteOpen && (
        <InviteUsers
          eventId={params.eventId as string}
          isOpen={!!setIsInviteOpen}
          onClose={() => {
            setIsInviteOpen(false);
          }}
          goToMap={()=>{
            setIsInviteOpen(false);
            handleConfirm()
          }}
         
        />
      )}

      {/* Location Change Modal */}
      {eventLocation && (
        <LocationChangeModal
          isOpen={showLocationChangeModal}
          onClose={() => setShowLocationChangeModal(false)}
          onConfirm={handleLocationChangeConfirm}
          eventLocation={eventLocation}
          currentCenter={{
            latitude: parseFloat(params.currentLat as string) || 0,
            longitude: parseFloat(params.currentLng as string) || 0,
          }}
          distance={distance}
        />
      )}
    </View>
  );
}
