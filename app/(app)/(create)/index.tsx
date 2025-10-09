import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  DeviceEventEmitter,
  ActivityIndicator,
  Modal,
  TextInput,
  Button,
} from "react-native";
import { Category, Prompt } from "~/hooks/useMapEvents";
import { Text } from "~/src/components/ui/text";
import { ArrowLeft, ArrowRight, Check } from "lucide-react-native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useUser } from "~/src/lib/UserProvider";
import { supabase } from "~/src/lib/supabase";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { draftService } from "~/src/services/draftService";
import { EventDraft } from "~/src/types/draftTypes";
import { haptics } from "~/src/lib/haptics";

// Import modular components
import BasicInfoSection from "~/src/components/createpost/BasicInfoSection";
import PromptsSection from "~/src/components/createpost/PromptsSection";
import CategorySection from "~/src/components/createpost/CategorySection";
import ImagesSection from "~/src/components/createpost/ImagesSection";
import LocationSection from "~/src/components/createpost/LocationSection";
import DateTimeSection from "~/src/components/createpost/DateTimeSection";
import AdditionalInfoSection from "~/src/components/createpost/AdditionalInfoSection";
import StepIndicator from "~/src/components/createpost/StepIndicator";

interface EventImage {
  uri: string;
  type: string;
  name: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  context: Array<{
    id: string;
    text: string;
  }>;
  properties: {
    address?: string;
  };
  address?: string;
  center: [number, number];
}

interface LocationDetails {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  coordinates: [number, number];
}

// Function to convert base64 to Uint8Array for Supabase storage
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function CreateEvent() {
  const params = useLocalSearchParams();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [isStartDate, setIsStartDate] = useState(true);
  const [showDateModal, setShowDateModal] = useState(false);
  const [eventID, setEventID] = useState<string | undefined>(undefined);

  const [locationId, setlocationId] = useState<string | undefined>(undefined);
  const [locationType, setlocationType] = useState<string | undefined>(
    undefined
  );
  const [latitude, setlatitude] = useState<number | undefined>(undefined);
  const [longitude, setlongitude] = useState<number | undefined>(undefined);
  const [selectedTopics, setSelectedTopics] = useState<string>("");
  const [selectedTopicsName, setSelectedTopicsName] = useState<string>("");

  const [categoryList, setCategoryList] = useState<Partial<Category>>({});
  const [selectedPrompts, setSelectedPrompts] = useState<Partial<Prompt>>({});
  const [showPrompts, setshowPrompts] = useState<boolean>(false);
  const [prompts, setPrompts] = useState<Partial<Prompt>>({});

  const { showActionSheetWithOptions } = useActionSheet();
  const { user } = useUser();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<EventImage[]>([]);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    coordinates: [0, 0],
  });
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [externalUrl, setExternalUrl] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  // Draft-related state
  const [currentDraft, setCurrentDraft] = useState<EventDraft | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Auto-save draft functionality
  const saveDraft = async (isManual = false) => {
    if (isDraftSaving) return;
    
    // Don't save drafts in edit mode
    if (isEditMode) {
      console.log("✏️ [CreateEvent] Edit mode - skipping draft save");
      return;
    }

    try {
      setIsDraftSaving(true);

      // Get the item ID (either event ID or location ID)
      const itemId = params.eventId || params.locationId;
      console.log("💾 [CreateEvent] Saving draft with itemId:", itemId);
      console.log("💾 [CreateEvent] Params received:", {
        eventId: params.eventId,
        locationId: params.locationId,
      });

      const draftData = {
        name,
        description,
        start_datetime: startDate ? startDate.toISOString() : null,
        end_datetime: endDate ? endDate.toISOString() : null,
        venue_name: address1,
        address: address1,
        city: locationDetails?.city,
        state: locationDetails?.state,
        postal_code: locationDetails?.zip,
        location_id: itemId, // This will be either event ID or location ID
        category_id: selectedTopics,
        is_private: isPrivate,
        external_url: externalUrl,
        image_urls: images.map((img) => img.uri),
        type: "user_created",
      };

      const savedDraft = await draftService.saveDraft(draftData);
      setCurrentDraft(savedDraft);
      setHasUnsavedChanges(false);

      if (isManual) {
        haptics.impact(); // Medium haptic feedback for manual save
        Toast.show({
          type: "success",
          text1: "Draft Saved",
          text2: "Your activity draft has been saved successfully",
        });
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      if (isManual) {
        Toast.show({
          type: "error",
          text1: "Save Failed",
          text2: "Failed to save draft. Please try again.",
        });
      }
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Save draft on component unmount (when user navigates away)
  useEffect(() => {
    return () => {
      // Final save on unmount
      if (hasUnsavedChanges && (name.trim() || description.trim())) {
        saveDraft(false);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Load existing draft on component mount
  useEffect(() => {
    setLoading(true);
    loadDraft().finally(() => setLoading(false));
  }, [params.eventId, params.locationId, params.draftId]); // Re-run when params change

  const loadDraft = async () => {
    try {
      setDraftLoaded(true);

      // Debug: Log what parameters we received
      console.log("🔍 [CreateEvent] Received params:", params);

      // Check if we're in EDIT MODE (editing existing event)
      if (params.editMode === "true" && params.eventId) {
        console.log("✏️ [CreateEvent] Edit mode detected, loading event:", params.eventId);
        await loadEventForEdit(params.eventId as string);
        return;
      }

      // Check if we're resuming a specific draft from settings
      if (params.draftId && params.resumeDraft === "true") {
        console.log(
          "🔍 [CreateEvent] Resuming draft from settings:",
          params.draftId
        );
        const specificDraft = await draftService.getDraft(
          params.draftId as string
        );
        if (specificDraft) {
          console.log("✅ [CreateEvent] Draft found, restoring data");
          setCurrentDraft(specificDraft);
          restoreDraftData(specificDraft);
          return;
        } else {
          console.log("❌ [CreateEvent] Draft not found");
        }
      }

      // Only load draft if it matches the current item (event/location) being created for
      const itemId = params.eventId || params.locationId;
      console.log("🔍 [CreateEvent] Looking for draft with itemId:", itemId);

      if (!itemId) {
        console.log("❌ [CreateEvent] No itemId found, clearing form");
        clearForm();
        return;
      }

      const drafts = await draftService.getDrafts();
      console.log(
        "🔍 [CreateEvent] Available drafts:",
        drafts.map((d) => ({ id: d.id, location_id: d.location_id }))
      );

      if (drafts.length > 0) {
        // Find draft that matches current item ID
        const matchingDraft = drafts.find((draft) => {
          const matches = draft.location_id === itemId;
          console.log(
            `🔍 [CreateEvent] Checking draft ${draft.id}: location_id=${draft.location_id}, itemId=${itemId}, matches=${matches}`
          );
          return matches;
        });

        if (matchingDraft) {
          console.log(
            "✅ [CreateEvent] Found matching draft:",
            matchingDraft.id
          );
          setCurrentDraft(matchingDraft);
          restoreDraftData(matchingDraft);
        } else {
          console.log(
            "❌ [CreateEvent] No matching draft found for itemId:",
            itemId
          );
          // Clear form fields when no draft is found
          clearForm();
        }
      } else {
        console.log("❌ [CreateEvent] No drafts available, clearing form");
        clearForm();
      }

      // Clean up old drafts (keep only the latest one)
      if (drafts.length > 1) {
        cleanupOldDrafts();
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    }
  };

  // Helper function to load event data for editing
  const loadEventForEdit = async (eventId: string) => {
    try {
      console.log("✏️ [CreateEvent] Fetching event for edit:", eventId);
      
      const { data: eventData, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      if (!eventData) {
        console.error("❌ [CreateEvent] Event not found");
        return;
      }

      console.log("✅ [CreateEvent] Event loaded for edit:", eventData);

      // Set edit mode state
      setIsEditMode(true);
      setEditingEventId(eventId);

      // Populate form with event data
      setName(eventData.name || "");
      setDescription(eventData.description || "");
      setStartDate(eventData.start_datetime ? new Date(eventData.start_datetime) : new Date());
      setEndDate(eventData.end_datetime ? new Date(eventData.end_datetime) : new Date());
      setAddress1(eventData.address || eventData.venue_name || "");
      setSelectedTopics(eventData.category_id || "");
      setIsPrivate(eventData.is_private || false);
      setExternalUrl(eventData.external_url || "");
      
      // Load images if they exist
      if (eventData.image_urls && eventData.image_urls.length > 0) {
        const loadedImages = eventData.image_urls.map((uri: string, index: number) => ({
          uri,
          type: "image/jpeg",
          name: `image_${index}.jpg`,
        }));
        setImages(loadedImages);
      }

      // Set location details if available
      if (eventData.city || eventData.state || eventData.postal_code) {
        setLocationDetails({
          address1: eventData.address || "",
          city: eventData.city || "",
          state: eventData.state || "",
          zip: eventData.postal_code || "",
        });
      }

      Toast.show({
        type: "info",
        text1: "Edit Mode",
        text2: "You are now editing your event",
      });
    } catch (error) {
      console.error("❌ [CreateEvent] Error loading event for edit:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load event for editing",
      });
    }
  };

  // Helper function to clear form fields
  const clearForm = () => {
    setName("");
    setDescription("");
    setStartDate(new Date()); // instead of null
    setEndDate(new Date());
    setSelectedTopics("");
    setSelectedTopicsName("");
    setIsPrivate(false);
    setExternalUrl("");
    setImages([]);
    setCurrentDraft(null);
    setHasUnsavedChanges(false);
    console.log("🧹 [CreateEvent] Form cleared");
  };

  // Helper function to restore draft data to form
  const restoreDraftData = (draft: EventDraft) => {
    // Restore form data from draft
    setName(draft.name || "");
    setDescription(draft.description || "");
    if (draft.start_datetime) {
      setStartDate(
        draft.start_datetime ? new Date(draft.start_datetime) : new Date()
      );
    }
    if (draft.end_datetime) {
      setEndDate(
        draft.end_datetime ? new Date(draft.end_datetime) : new Date()
      );
    }
    if (draft.address) {
      setAddress1(draft.address);
    }
    if (draft.city) {
      setLocationDetails((prev) => ({ ...prev, city: draft.city! }));
    }
    if (draft.state) {
      setLocationDetails((prev) => ({ ...prev, state: draft.state! }));
    }
    if (draft.postal_code) {
      setLocationDetails((prev) => ({ ...prev, zip: draft.postal_code! }));
    }
    if (draft.category_id) {
      setSelectedTopics(draft.category_id);
      setSelectedTopicsName("");
    }

    setIsPrivate(draft.is_private || false);
    setExternalUrl(draft.external_url || "");

    // Restore images
    if (draft.image_urls && draft.image_urls.length > 0) {
      const restoredImages = draft.image_urls.map((uri, index) => ({
        uri,
        type: "image/jpeg",
        name: `image_${index}.jpg`,
      }));
      setImages(restoredImages);
    }

    Toast.show({
      type: "info",
      text1: "Draft Restored",
      text2: "Your previous draft has been restored",
    });
  };

  // Clear draft after successful event creation
  const clearDraft = async () => {
    if (currentDraft) {
      try {
        await draftService.deleteDraft(currentDraft.id);
        setCurrentDraft(null);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error clearing draft:", error);
      }
    }
  };

  // Clean up old drafts (keep only the latest one)
  const cleanupOldDrafts = async () => {
    try {
      const drafts = await draftService.getDrafts();
      if (drafts.length > 1) {
        // Delete all drafts except the latest one
        const draftsToDelete = drafts.slice(1);
        for (const draft of draftsToDelete) {
          await draftService.deleteDraft(draft.id);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old drafts:", error);
    }
  };

  // Track changes for save draft button state (NO AUTO-SAVE)
  useEffect(() => {
    // Only track if user has made changes (for button state) - NO AUTO-SAVE
    if (
      draftLoaded &&
      (name.trim().length > 0 || description.trim().length > 0)
    ) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [
    name,
    description,
    startDate,
    endDate,
    latitude,
    longitude,
    address1,
    selectedTopics,
    isPrivate,
    externalUrl,
    images,
    draftLoaded,
  ]);

  useEffect(() => {
    console.log("createevent_useEffect");

    // Load existing draft on mount
    loadDraft();

    // Handle router params
    if (params.categoryId && params.categoryName) {
      const simpleCategory = {
        id: params.categoryId as string,
        name: params.categoryName as string,
      };
      console.log("🔍 Router params category:", simpleCategory);
      setCategoryList(simpleCategory as Category);
      setSelectedTopics(params.categoryId);
      setSelectedTopicsName(params.categoryName);
      setshowPrompts(true);
      if (params.prompts) {
        try {
          const raw = params.prompts;
          console.log("params.prompts>", raw);

          const parsedPrompts_: Prompt[] = raw;
          console.log("parsedPrompts_", parsedPrompts_);
          setPrompts(parsedPrompts_);
        } catch (e) {
          console.error("Invalid prompts data", e);
        }
      }
    }
    console.log("params.latitude>", params.latitude);
    if (params.locationId) setlocationId(params.locationId as string);
    if (params.locationType) setlocationType(params.locationType as string);
    if (params.latitude) {
      const parsedLat = parseFloat(params.latitude as string);
      console.log(
        "Setting latitude:",
        parsedLat,
        "from params:",
        params.latitude
      );
      setlatitude(parsedLat);
    }
    if (params.longitude) {
      const parsedLng = parseFloat(params.longitude as string);
      console.log(
        "Setting longitude:",
        parsedLng,
        "from params:",
        params.longitude
      );
      setlongitude(parsedLng);
    }
    if (params.address) setAddress1(params.address as string);

    //removed as this functionality creates all states undefined
    // DeviceEventEmitter.addListener(
    //   "passDataToCreateEvent",
    //   (...args: any[]) => {
    //     const [
    //       locationid,
    //       locationtype,
    //       Latitude,
    //       Longitude,
    //       address,
    //       categoryId,
    //       categoryName,
    //     ] = args;
    //     const callId = Math.random().toString(36).substr(2, 9);
    //     console.log(`🎯 [${callId}] event----passDataToCreateEvent STARTED`);
    //     console.log(`🔍 [${callId}] Raw parameters received:`, {
    //       locationid,
    //       locationtype,
    //       Latitude,
    //       Longitude,
    //       address,
    //       categoryId,
    //       categoryName,
    //     });

    //     setlocationId(locationid ? locationid : undefined);
    //     setlocationType(locationtype ? locationtype : undefined);
    //     setlatitude(Latitude ? Latitude : undefined);
    //     setlongitude(Longitude ? Longitude : undefined);
    //     setAddress1(address ? address : "");

    //     // Create simple category object from id and name
    //     if (categoryId && categoryName) {
    //       const simpleCategory = {
    //         id: categoryId,
    //         name: categoryName,
    //       };
    //       console.log(
    //         `🔍 [${callId}] Created simple category:`,
    //         simpleCategory
    //       );
    //       setCategoryList(simpleCategory as Partial<Category>);
    //       setshowPrompts(true);
    //     } else {
    //       console.log(`🔍 [${callId}] No category data, using empty object`);
    //       setCategoryList({} as Partial<Category>);
    //       setshowPrompts(false);
    //     }

    //     console.log(`🎯 [${callId}] passDataToCreateEvent COMPLETED`);
    //   }
    // );
    DeviceEventEmitter.addListener("editEvent", (...args: any[]) => {
      const [eventId] = args;
      // console.log("eventId>>",eventId);
      setEventID(eventId ? eventId : undefined);
    });
  }, []);

  const validateCheck = () => {
    const validations = [
      () => name.trim() !== "" && description.trim() !== "", // Step 0: Basic Info
      () => selectedTopics !== "", // Step 1: Category
      () => true, // Step 2: Prompts (optional)
      () => images.length > 0, // Step 3: Images
      () => {
        if (locationType === "static" || locationType === "googleApi") {
          return true;
        }
        return locationDetails.city !== "" && locationDetails.state !== "";
      }, // Step 4: Location
      () => {
        const truncateToMinute = (date) =>
          new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes()
          );

        const startTruncated = truncateToMinute(startDate);
        const endTruncated = truncateToMinute(endDate);

        return startTruncated < endTruncated;
      }, // Step 5: Date & Time
      () => true, // Step 6: Additional (optional)
    ];

    return validations.every((validate) => validate());
  };

  const handleEventCreation = () => {
    if (!validateCheck()) {
      if (endDate.getTime() <= startDate.getTime()) {
        console.log("ffff");
        Toast.show({
          type: "error",
          text1: "End Date-Time Start Date-Time error",
          text2:
            "End Date-Time cannot be the same or earlier than Start Date-Time",
        });
        return;
      } else {
        Toast.show({
          type: "error",
          text1: "Please complete all required fields",
          text2: "Fill in the missing information to continue",
        });
        return;
      }
    }

    handleCreateEvent();
  };

  const showDatePicker = (isStart: boolean) => {
    setIsStartDate(isStart);
    const currentDate = isStart ? startDate : endDate;
    const options = [
      "Today",
      "Tomorrow",
      "In 2 days",
      "In 3 days",
      "Pick a specific date",
      "Cancel",
    ];

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 5,
        title: `Select ${isStart ? "Start" : "End"} Date`,
      },
      (selectedIndex) => {
        if (selectedIndex === undefined || selectedIndex === 5) return;

        const newDate = new Date();
        if (selectedIndex === 0) {
          // Today - keep current date
        } else if (selectedIndex === 1) {
          // Tomorrow
          newDate.setDate(newDate.getDate() + 1);
        } else if (selectedIndex === 2) {
          // In 2 days
          newDate.setDate(newDate.getDate() + 2);
          console.log("tomorroew>", newDate);
        } else if (selectedIndex === 3) {
          // In 3 days
          newDate.setDate(newDate.getDate() + 3);
        } else if (selectedIndex === 4) {
          if (Platform.OS === "android") {
            setShowDateModal(true);
          } else {
            // Show date input alert
            Alert.prompt("Enter Date", "Format: MM/DD/YYYY", (text) => {
              console.log("datetext>", text);

              // Validate MM/DD/YYYY format using regex
              const datePattern =
                /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

              if (!datePattern.test(text)) {
                Alert.alert("Invalid Format", "Please use MM/DD/YYYY format");
                return;
              }

              // Parse components
              const [month, day, year] = text.split("/");
              const date = new Date(`${year}-${month}-${day}T00:00:00Z`); // UTC start of day

              if (isNaN(date.getTime())) {
                Alert.alert("Invalid Date", "Please enter a valid date");
                return;
              }

              // Convert to ISO string
              const isoString = date.toISOString(); // e.g., 2025-08-09T00:00:00.000Z
              console.log("ISO date>", isoString);
              const dateObject = new Date(isoString);
              // Set state
              if (isStart) {
                setStartDate(dateObject);
                // Automatically set endDate to 6 hours after startDate
                const newEndDate = new Date(
                  dateObject.getTime() + 6 * 60 * 60 * 1000
                ); // Add 6 hours
                setEndDate(newEndDate);
              } else {
                setEndDate(dateObject);
              }
              // const date = new Date(text);
              // console.log('date>',date);
              // if (isNaN(date.getTime())) {
              //   Alert.alert(
              //     "Invalid Date",
              //     "Please enter a valid date in MM/DD/YYYY format"
              //   );
              //   return;
              // }
              // if (isStart) {
              //   setStartDate(date);
              // } else {
              //   setEndDate(date);
              // }
            });
          }
          return;
        }

        // Keep the current time
        newDate.setHours(currentDate.getHours());
        newDate.setMinutes(currentDate.getMinutes());

        if (isStart) {
          console.log("Ljh?", newDate);
          setStartDate(newDate);
          // Automatically set endDate to 6 hours after startDate
          const newEndDate = new Date(newDate.getTime() + 6 * 60 * 60 * 1000); // Add 6 hours
          setEndDate(newEndDate);
        } else {
          setEndDate(newDate);
        }
      }
    );
  };

  const handleSubmit = () => {
    // Validate MM/DD/YYYY format using regex
    const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

    if (!datePattern.test(input)) {
      Alert.alert("Invalid Format", "Please use MM/DD/YYYY format");
      return;
    }

    // Parse components
    const [month, day, year] = input.split("/");
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`); // UTC start of day

    if (isNaN(date.getTime())) {
      Alert.alert("Invalid Date", "Please enter a valid date");
      return;
    }

    // Convert to ISO string
    const isoString = date.toISOString(); // e.g., 2025-08-09T00:00:00.000Z
    console.log("ISO date>", isoString);
    const dateObject = new Date(isoString);
    setInput("");
    setShowDateModal(false);
    // Set state
    if (isStartDate) {
      setStartDate(dateObject);
    } else {
      setEndDate(dateObject);
    }
  };

  const showTimePicker = (isStart: boolean) => {
    const currentDate = isStart ? startDate : endDate;
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? "AM" : "PM";
      return `${hour}:00 ${ampm}`;
    });

    const options = [...hours, "Cancel"];

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 24,
        title: `Select ${isStart ? "Start" : "End"} Time`,
      },
      (selectedIndex) => {
        if (selectedIndex === undefined || selectedIndex === 24) return;

        const newDate = new Date(currentDate);
        newDate.setHours(selectedIndex);
        newDate.setMinutes(0);

        if (isStart) {
          setStartDate(newDate);
          // Automatically set endDate to 6 hours after startDate
          const newEndDate = new Date(newDate.getTime() + 6 * 60 * 60 * 1000); // Add 6 hours
          setEndDate(newEndDate);
        } else {
          setEndDate(newDate);
        }
      }
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Filter out invalid assets
        const validAssets = result.assets.filter((asset) => {
          const isValidUri = asset.uri && asset.uri.startsWith("file://");
          // For ImagePicker, we just need to check if it's an image type
          const isValidType = asset.type === "image";
          return isValidUri && isValidType;
        });

        if (validAssets.length === 0) {
          throw new Error(
            "No valid images selected. Please select JPEG or PNG images."
          );
        }

        // Map assets to include file extension and proper MIME type
        const processedAssets = validAssets.map((asset) => {
          const extension = asset.uri.split(".").pop()?.toLowerCase();

          // Determine MIME type based on file extension
          let mimeType = "image/jpeg"; // default
          if (extension === "png") {
            mimeType = "image/png";
          } else if (extension === "heic") {
            mimeType = "image/heic";
          }

          return {
            uri: asset.uri,
            type: mimeType,
            name: `image-${Date.now()}.${extension || "jpg"}`,
          };
        });

        setImages((prevImages) => [...prevImages, ...processedAssets]);
      }
    } catch (error: any) {
      console.error("Image picker error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to select images. Please try again."
      );
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const searchAddress = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${
          process.env.MAPBOX_ACCESS_TOKEN
        }&country=US&types=address`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching address:", error);
    }
  };

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const debouncedSearch = (query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      searchAddress(query);
    }, 300);
    setSearchTimeout(timeout);
  };

  const handleAddressSelect = (feature: MapboxFeature) => {
    const contextMap = new Map(
      feature.context?.map((item) => [item.id.split(".")[0], item.text])
    );

    const newLocationDetails = {
      address1: feature.properties.address
        ? `${feature.properties.address} ${feature.text}`
        : feature.text,
      address2: "",
      city: contextMap.get("place") || "",
      state: contextMap.get("region") || "",
      zip: contextMap.get("postcode") || "",
      coordinates: feature.center,
    };

    setLocationDetails(newLocationDetails);
    setAddress1(newLocationDetails.address1);
    setAddress2("");
    setShowResults(false);
  };

  const handleCreateEvent = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create an event");
      return;
    }

    if (locationType === "static" || locationType === "googleApi") {
      if (
        !name ||
        !description ||
        selectedTopics === "" ||
        images.length === 0
      ) {
        Alert.alert(
          "Error",
          "Please fill in all required fields and add at least one image"
        );
        return;
      }
    } else {
      if (
        !name ||
        !description ||
        selectedTopics === "" ||
        images.length === 0 ||
        !locationDetails.address1 ||
        !locationDetails.city ||
        !locationDetails.state ||
        !locationDetails.zip
      ) {
        Alert.alert(
          "Error",
          "Please fill in all required fields and add at least one image"
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      // 1. Upload images to storage
      const imageUrls = await Promise.all(
        images.map(async (image, index) => {
          try {
            if (!image?.uri || !image?.type) {
              throw new Error(`Invalid image data for image ${index + 1}`);
            }

            // Get the file extension
            const fileExt = image.uri.split(".").pop()?.toLowerCase() || "jpg";
            const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`;
            const filePath = `${
              FileSystem.documentDirectory
            }temp_${Date.now()}-${index}.${fileExt}`;

            var base64 = "";
            // Download the image first (needed for expo-file-system)
            if (Platform.OS === "ios") {
              await FileSystem.downloadAsync(image.uri, filePath);
              base64 = await FileSystem.readAsStringAsync(filePath, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } else {
              const uri = image.uri; // Assuming this is a local file URI like 'file:///path/to/file'
              const fileUri = `${
                FileSystem.documentDirectory
              }temp_${Date.now()}-${index}.${fileExt}`;
              await FileSystem.copyAsync({ from: uri, to: fileUri });
              // Read the file as base64
              base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from("event-images")
              .upload(fileName, decode(base64), {
                contentType: image.type || `image/${fileExt}`,
                upsert: true,
              });

            // Clean up the temporary file
            try {
              await FileSystem.deleteAsync(filePath);
            } catch (cleanupError) {
              console.warn("Error cleaning up temp file:", cleanupError);
            }

            if (uploadError) {
              console.error("Upload error:", uploadError);
              throw uploadError;
            }

            // Get the public URL
            const {
              data: { publicUrl },
            } = supabase.storage.from("event-images").getPublicUrl(fileName);

            if (!publicUrl) {
              throw new Error("Failed to get public URL for uploaded image");
            }

            return publicUrl;
          } catch (error: any) {
            console.error("Image processing error:", error);
            throw new Error(
              `Error processing image ${index + 1}: ${
                error?.message || "Unknown error"
              }`
            );
          }
        })
      );

      // Get auth session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }

      // 2. Create event using our API
      let eventData: any = {
        name,
        description,
        type: "Default",
        address: locationDetails.address1,
        address_line2: locationDetails.address2,
        city: locationDetails.city,
        state: locationDetails.state,
        zip: locationDetails.zip,
        start_datetime: startDate ? startDate.toISOString() : "",
        end_datetime: endDate ? endDate.toISOString() : "",
        external_url: externalUrl || null,
        external_title: externalTitle || null,
        image_urls: imageUrls,
        is_private: isPrivate,
        topic_id: selectedTopics,
        ...(eventID?.eventId && { event_id: eventID.eventId }),
      };
      //       if (eventID !== undefined) {
      //   eventData.event_id = eventID;
      // }
      if (locationType === "static" || locationType === "googleApi") {
        let promtIds: string[] = []; // an empty array
        if (selectedPrompts?.id != undefined) {
          promtIds.push(selectedPrompts?.id);
        }
        // Get coordinates from params if state is not set (fallback for timing issues)
        const finalLatitude =
          latitude ||
          (params.latitude ? parseFloat(params.latitude as string) : undefined);
        const finalLongitude =
          longitude ||
          (params.longitude
            ? parseFloat(params.longitude as string)
            : undefined);

        eventData = {
          name,
          description,
          location_id: locationId,
          prompt_ids: promtIds.length > 0 ? promtIds : null,
          category_id: categoryList?.id != undefined ? categoryList?.id : null,
          type: locationType,
          latitude: finalLatitude,
          longitude: finalLongitude,
          start_datetime: startDate ? startDate.toISOString() : "",
          end_datetime: endDate ? endDate.toISOString() : "",
          external_url: externalUrl || null,
          external_title: externalTitle || null,
          image_urls: imageUrls,
          is_private: isPrivate,
          topic_id: selectedTopics,
          ...(eventID?.eventId && { event_id: eventID.eventId }),
        };

        console.log("🔧 [CreateEvent] State values when building eventData:", {
          locationId,
          locationType,
          latitude,
          longitude,
          finalLatitude,
          finalLongitude,
          paramsLatitude: params.latitude,
          paramsLongitude: params.longitude,
          address: address1,
        });
        //         if (eventID !== undefined) {
        //   eventData.event_id = eventID;
        // }
      }
      console.log("eventData>>", eventData);

      // Determine if we're updating or creating
      const isUpdating = isEditMode && editingEventId;
      const apiUrl = isUpdating 
        ? `${process.env.BACKEND_MAP_URL}/api/events/${editingEventId}`
        : `${process.env.BACKEND_MAP_URL}/api/events`;
      const method = isUpdating ? "PUT" : "POST";

      console.log(`${isUpdating ? '✏️ Updating' : '✨ Creating'} event:`, {
        method,
        url: apiUrl,
        eventId: editingEventId,
      });

      const response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || "Failed to create event");
      }

      const event = await response.json();
      // console.log("event>>", event);
      Toast.show({
        type: "success",
        text1: isEditMode ? "Activity Updated!" : "Activity Created!",
        text2: isEditMode ? "Your activity has been updated successfully" : "Your activity has been created successfully",
      });

      // Clear draft after successful creation (but not in edit mode)
      if (!isEditMode) {
        await clearDraft();
      }

      setEventID(undefined);
      // Navigate to summary screen with event data
      router.push({
        pathname: "/(app)/(create)/summary",
        params: {
          name,
          description,
          isPrivate: isPrivate.toString(),
          images: JSON.stringify(images),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          locationDetails: locationDetails.city
            ? JSON.stringify({
                address1: locationDetails.address1,
                city: locationDetails.city,
                state: locationDetails.state,
                zip: locationDetails.zip,
              })
            : undefined,
          externalUrl,
          externalTitle,
          lat: event.location.latitude,
          lng: event.location.longitude,
          eventId: event.id, // Pass the event ID
        },
      });
    } catch (error: any) {
      console.error("Event creation error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create event. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    // Save draft before navigating away
    if (hasUnsavedChanges && (name.trim() || description.trim())) {
      await saveDraft(false);
    }
    router.back();
  };
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
        />
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        />
      </View>
    );
  }
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
          paddingTop: Math.max(insets.top + 10, 20),
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom + 20, 40),
        }}
      >
        {/* Compact Header */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <TouchableOpacity
                onPress={handleBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.dark
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: theme.dark
                    ? "rgba(139, 92, 246, 0.3)"
                    : "rgba(139, 92, 246, 0.2)",
                }}
              >
                <ArrowLeft size={18} color="#8B5CF6" />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.colors.text,
                }}
              >
                {isEditMode ? "Edit Activity" : "Create Activity"}
              </Text>
            </View>

            {!isEditMode && (
              <TouchableOpacity
                onPress={() => saveDraft(true)}
                disabled={isDraftSaving || !hasUnsavedChanges}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: hasUnsavedChanges ? "#8B5CF6" : "#6B7280",
                  opacity: isDraftSaving ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
                  {isDraftSaving ? "Saving..." : "Save Draft"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <BasicInfoSection
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              isPrivate={isPrivate}
              setIsPrivate={setIsPrivate}
              startDateTime={startDate ? startDate.toISOString() : ""}
              endDateTime={endDate ? endDate.toISOString() : ""}
              venueName={locationDetails.address1}
              address={locationDetails.address1}
              city={locationDetails.city}
              state={locationDetails.state}
              locationId={locationId}
            />

            <CategorySection
              selectedTopics={selectedTopics}
              selectedTopicsName={selectedTopicsName}
              onSelectTopic={setSelectedTopics}
            />

            {prompts?.length > 0 ? (
              <PromptsSection
                prompts={prompts}
                selectedPrompts={selectedPrompts}
                setSelectedPrompts={setSelectedPrompts}
              />
            ) : (
              <View style={{ alignItems: "center", padding: 40 }}>
                <Text style={{ fontSize: 16, color: theme.colors.text + "CC" }}>
                  No prompts available for this category
                </Text>
              </View>
            )}

            <ImagesSection
              images={images}
              onPickImage={pickImage}
              onRemoveImage={removeImage}
            />

            <LocationSection
              locationType={locationType}
              address1={address1}
              setAddress1={setAddress1}
              address2={address2}
              setAddress2={setAddress2}
              locationDetails={locationDetails}
              searchResults={searchResults}
              showResults={showResults}
              onSearchAddress={debouncedSearch}
              onAddressSelect={handleAddressSelect}
            />

            <DateTimeSection
              startDate={startDate || ""}
              endDate={endDate || ""}
              onShowDatePicker={showDatePicker}
              onShowTimePicker={showTimePicker}
            />

            <AdditionalInfoSection
              externalUrl={externalUrl}
              setExternalUrl={setExternalUrl}
              externalUrlTitle={externalTitle}
              setExternalUrlTitle={setExternalTitle}
            />
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: 16,
          }}
        >
          <TouchableOpacity
            onPress={handleEventCreation}
            disabled={isLoading}
            style={{
              flex: 1,
              height: 50,
              backgroundColor: validateCheck() ? "#8B5CF6" : "transparent",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: validateCheck()
                ? "#8B5CF6"
                : theme.colors.text + "20",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: validateCheck() ? "white" : theme.colors.text + "40",

                    marginRight: 8,
                  }}
                >
                  {isEditMode ? "Update Activity" : "Create Event"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast Component */}
      <Toast />
      {showDateModal && (
        <Modal visible={showDateModal} transparent animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              padding: 20,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{ backgroundColor: "#fff", padding: 20, borderRadius: 10 }}
            >
              <Text>Enter Date (MM/DD/YYYY):</Text>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="MM/DD/YYYY"
                keyboardType="numbers-and-punctuation"
                style={{ borderBottomWidth: 1, marginVertical: 10 }}
              />
              <Button title="Submit" onPress={handleSubmit} />
              <Button
                title="Cancel"
                onPress={() => {
                  setShowDateModal(false);
                }}
                color="gray"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
