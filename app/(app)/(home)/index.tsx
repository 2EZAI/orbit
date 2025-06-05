import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Pressable,Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { Search, Filter } from "lucide-react-native";
import { Icon } from 'react-native-elements';
import { useUser } from "~/hooks/useUserData";

import { useMapEvents } from "~/hooks/useMapEvents";
import { FeedEventCard } from "~/src/components/feed/FeedEventCard";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { SearchSheet } from "~/src/components/search/SearchSheet";
import * as Location from "expo-location";
import AllPostsTab from "~/src/components/profile/AllPostsTab";

export default function Home() {
    const { user ,userlocation, updateUserLocations } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("Events");
  const [location, setLocation] = useState<{
    latitude: numbrer;
    longitude: number;
    heading?: number | null;
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterShow, setIsFilterShow] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [filteredEvents, setFilteredEvents] = useState<any>([]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { events, categories, eventsHome, isLoading, error } = useMapEvents({
    // center: [37.7749, -122.4194],
    // center: location ? [location.latitude, location.longitude] : [0, 0],
center:
  user?.event_location_preference == 1
    ? [userlocation?.latitude, userlocation?.longitude]
    : location
      ? [location.latitude, location.longitude]
      : [0, 0],
    radius: 10000,
    timeRange: "now",
  });
  useEffect(()=>{
    if(selectedCategory ==null){
    FilterList(null);
    }
    else{
      FilterList(selectedCategory);
    }
  },[events])
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
        // if (cameraRef.current) {
        //   cameraRef.current.setCamera({
        //     centerCoordinate: [
        //       initialLocation.coords.longitude,
        //       initialLocation.coords.latitude,
        //     ],
        //     zoomLevel: 11,
        //     animationDuration: 1000,
        //     animationMode: "flyTo",
        //   });
        // }

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

  const SearchBar = ({ onPress }: { onPress: () => void }) => (
    <View className="flex-row items-center p-4 space-x-2">
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center flex-1 px-4 py-2 border rounded-full bg-muted/50 border-border"
      >
      {Platform.OS == 'ios' ?
        <Search size={20} className="mr-2 text-muted-foreground" />
        :  <Icon 
              name="magnify"
               type="material-community" 
              size={20}
              color="#239ED0"
              />
      }
        <Text className="text-muted-foreground">
          Search events and people...
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="p-2 border rounded-full bg-background border-border"
        onPress={() => {
          setIsFilterShow(!isFilterShow);
        }}
      >
      {Platform.OS == 'ios' ?
        <Filter size={20} />
        :  <Icon 
              name="filter"
               type="material-community" 
              size={20}
              color="#239ED0"
              />
      }
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "Events":
        return <EventView />;
      case "Posts":
        return <AllPostsTab />;
    }
  };
  const FilterListView = () => {
    return (
      <View className="flex-1 bg-background">
        <ScrollView className="flex-1">
          {categories.map((category) => (
            <TouchableOpacity
              onPress={() => {
                if (selectedCategory?.id === category.id) {
                  setSelectedCategory(null);
                  FilterList(null);
                } else {
                  setSelectedCategory(category);
                  FilterList(category);
                }
                setIsFilterShow(false);
              }}
              className={` rounded ${
                selectedCategory?.id === category.id
                  ? "bg-primary"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-muted-foreground m-4 ${
                  selectedCategory?.id === category.id
                    ? "text-white"
                    : "text-muted-foreground"
                }`}
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const FilterList = (category) => {
  setFilteredEvents([]);

  if (category == null || category.id === "all") {
    setFilteredEvents(events);
  } else {
     const filteredEventsList = events.filter((event) => {
    const hasCategory = event.categories.some((eventCategory) => {
      console.log('Checking:', eventCategory.id, 'vs', category.id);
      return eventCategory.name.toLowerCase() === category.name.toLowerCase();
    });
    return hasCategory;
  });
    console.log("filteredEventsList>>",filteredEventsList);

    setFilteredEvents(filteredEventsList);
  }
};

  const EventView = () => {
    return (
      <View className="flex-1 bg-background">
        <SearchBar onPress={() => setIsSearchOpen(true)} />
        {isFilterShow && (
          <View className="absolute top-[60px]  right-0 mr-4 z-10 bg-white h-[40%] w-[40%] mx-4 mb-4 overflow-hidden border rounded-2xl  border-gray-300">
            <FilterListView />
          </View>
        )}
        <ScrollView className="flex-1">
          {filteredEvents.map((event) => (
            <FeedEventCard
              key={event.id}
              event={event}
              onEventSelect={setSelectedEvent}
              nearbyEvents={events}
              // nearbyEvents={eventsHome}
            />
          ))}
          {filteredEvents.length <=0 &&
          <View className="mt-[50%] items-center justify-center"> 
          <Text className="text-primary" >No events found</Text>  
          </View> }
          
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="items-center justify-center flex-1">
        <Text>Loading events...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="items-center justify-center flex-1">
        <Text className="text-red-500">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Tabs */}
      <View className="flex-row mt-6 border-b border-border">
        {(["Events", "Posts"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 ${
              activeTab === tab ? "border-b-2 border-primary" : ""
            }`}
          >
            <Text
              className={`text-center ${
                activeTab === tab
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      <View className="flex-1 mt-4">{renderTabContent()}</View>
      <SearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        eventsList={events}
        onShowControler={(value) => {}}
      />

      {selectedEvent && (
        <EventDetailsSheet
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          nearbyEvents={events}
          // nearbyEvents={eventsHome}
          onEventSelect={setSelectedEvent}
          onShowControler={() => {}}
        />
      )}
    </SafeAreaView>
  );
}
