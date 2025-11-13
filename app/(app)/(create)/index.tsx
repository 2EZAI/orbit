import { useActionSheet } from "@expo/react-native-action-sheet";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MapPin } from "lucide-react-native";
import { MotiView } from "moti";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  DeviceEventEmitter,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useEventDetails } from "~/hooks/useEventDetails";
import { Category, Prompt } from "~/hooks/useMapEvents";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useUser } from "~/src/lib/UserProvider";
import { haptics } from "~/src/lib/haptics";
import { ImagePickerService } from "~/src/lib/imagePicker";
import { getCurrentMapCenter } from "~/src/lib/mapCenter";
import { supabase } from "~/src/lib/supabase";
import { draftService } from "~/src/services/draftService";
import { EventDraft } from "~/src/types/draftTypes";

// Import modular components
import AdditionalInfoSection from "~/src/components/createpost/AdditionalInfoSection";
import BasicInfoSection from "~/src/components/createpost/BasicInfoSection";
import CategorySection from "~/src/components/createpost/CategorySection";
import DateTimeSection from "~/src/components/createpost/DateTimeSection";
import ImagesSection from "~/src/components/createpost/ImagesSection";
import LocationSection from "~/src/components/createpost/LocationSection";
import PromptsSection from "~/src/components/createpost/PromptsSection";
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
  const { getItemDetails } = useEventDetails();
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
  let today = new Date();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [externalUrl, setExternalUrl] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  // Smart validation and focus management
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  // Draft-related state
  const [currentDraft, setCurrentDraft] = useState<EventDraft | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [originalDraftData, setOriginalDraftData] = useState<EventDraft | null>(
    null
  );

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Step tracking for enhanced UI
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Define steps for the enhanced step indicator
  const steps = [
    {
      id: "basic",
      title: "Basic Info",
      description: "Name and description required",
    },
    {
      id: "category",
      title: "Category",
      description: "Select activity category",
    },
    {
      id: "prompts",
      title: "Prompts",
      description: "Add engaging prompts (optional)",
    },
    { id: "images", title: "Images", description: "Add at least one photo" },
    {
      id: "location",
      title: "Location",
      description: "Set your activity location",
    },
    {
      id: "datetime",
      title: "Date & Time",
      description: "Schedule your activity",
    },
    {
      id: "additional",
      title: "Additional",
      description: "Add extra details (optional)",
    },
  ];

  // Function to compare current state with original draft data
  const hasStateChanged = (): boolean => {
    if (!originalDraftData) {
      // If no original data, check if there's any meaningful content
      return (
        name.trim().length > 0 ||
        description.trim().length > 0 ||
        images.length > 0
      );
    }

    // Compare all relevant fields
    const currentState = {
      name: name.trim(),
      description: description.trim(),
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      venue_name: address1.trim(),
      address: address1.trim(),
      city: locationDetails.city.trim(),
      state: locationDetails.state.trim(),
      postal_code: locationDetails.zip.trim(),
      latitude: latitude || 0,
      longitude: longitude || 0,
      category_id: selectedTopics,
      category_name: selectedTopicsName,
      is_private: isPrivate,
      external_url: externalUrl.trim(),
      image_urls: images.map((img) => img.uri),
    };

    const originalState = {
      name: originalDraftData.name?.trim() || "",
      description: originalDraftData.description?.trim() || "",
      start_datetime: originalDraftData.start_datetime || "",
      end_datetime: originalDraftData.end_datetime || "",
      venue_name: originalDraftData.venue_name?.trim() || "",
      address: originalDraftData.address?.trim() || "",
      city: originalDraftData.city?.trim() || "",
      state: originalDraftData.state?.trim() || "",
      postal_code: originalDraftData.postal_code?.trim() || "",
      latitude: 0, // EventDraft doesn't have latitude/longitude
      longitude: 0,
      category_id: originalDraftData.category_id || "",
      category_name: "", // EventDraft doesn't have category_name
      is_private: originalDraftData.is_private || false,
      external_url: originalDraftData.external_url?.trim() || "",
      image_urls: originalDraftData.image_urls || [],
    };

    // Deep comparison
    return JSON.stringify(currentState) !== JSON.stringify(originalState);
  };

  // Auto-save draft functionality
  const saveDraft = async (isManual = false) => {
    if (isDraftSaving) return;

    // Don't save drafts in edit mode
    if (isEditMode) {
      console.log("✏️ [CreateEvent] Edit mode - skipping draft save");
      return;
    }

    // Check if there are actual changes before saving
    if (!hasStateChanged()) {
      console.log("📝 [CreateEvent] No changes detected - skipping draft save");
      if (isManual) {
        Toast.show({
          type: "info",
          text1: "No Changes",
          text2: "No changes to save",
        });
      }
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
        start_datetime: startDate ? startDate.toISOString() : undefined,
        end_datetime: endDate ? endDate.toISOString() : undefined,
        venue_name: address1,
        address: address1,
        city: locationDetails?.city,
        state: locationDetails?.state,
        postal_code: locationDetails?.zip,
        location_id: Array.isArray(itemId) ? itemId[0] : itemId, // This will be either event ID or location ID
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
      console.log("params======>", params);
      // Check if we're in EDIT MODE (editing existing event)
      if (params.editMode === "true" && params.eventId) {
        console.log(
          "✏️ [CreateEvent] Edit mode detected, loading event:",
          params.eventId
        );
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
          setOriginalDraftData(specificDraft); // Store original data for comparison
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
          setOriginalDraftData(matchingDraft); // Store original data for comparison
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

      // Use the generic getItemDetails function from useEventDetails hook
      const eventData = await getItemDetails(eventId, "database");

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
      setStartDate(
        eventData.start_datetime
          ? new Date(eventData.start_datetime)
          : new Date()
      );
      setEndDate(
        eventData.end_datetime ? new Date(eventData.end_datetime) : new Date()
      );
      setAddress1(eventData.address || eventData.venue_name || "");

      // Get category from categories array (API response format)
      const categoryId = eventData.categories?.[0]?.id || eventData.category_id;
      const categoryName = eventData.categories?.[0]?.name;

      console.log("🔍 [CreateEvent] Category ID from event:", categoryId);
      console.log("🔍 [CreateEvent] Category name from event:", categoryName);
      console.log(
        "🔍 [CreateEvent] Full categories array:",
        eventData.categories
      );

      setSelectedTopics(categoryId || "");

      if (categoryName) {
        // We got the category name from the API response
        setSelectedTopicsName(categoryName);
        console.log(
          "✅ [CreateEvent] Set category name from API:",
          categoryName
        );
      } else if (categoryId) {
        // Fallback: fetch manually if not in API response
        console.log(
          "⚠️ [CreateEvent] No category name from API, fetching manually..."
        );
        const { data: categoryData, error: categoryError } = await supabase
          .from("location_categories")
          .select("name")
          .eq("id", categoryId)
          .single();

        console.log(
          "🔍 [CreateEvent] Category fetch result:",
          categoryData,
          "Error:",
          categoryError
        );

        if (categoryData) {
          setSelectedTopicsName(categoryData.name);
          console.log(
            "✅ [CreateEvent] Set category name from manual fetch:",
            categoryData.name
          );
        } else {
          console.log(
            "❌ [CreateEvent] Could not find category name for ID:",
            categoryId
          );
        }
      } else {
        console.log("⚠️ [CreateEvent] No category_id found in event data");
      }
      setIsPrivate(eventData.is_private || false);
      setExternalUrl(eventData.external_url || "");
      setShowAdditionalInfo(!!eventData.external_url);
      // Load images if they exist
      if (eventData.image_urls && eventData.image_urls.length > 0) {
        const loadedImages = eventData.image_urls.map(
          (uri: string, index: number) => ({
            uri,
            type: "image/jpeg",
            name: `image_${index}.jpg`,
          })
        );
        setImages(loadedImages);
      }

      // Set location details if available
      if (eventData.city || eventData.state || eventData.postal_code) {
        setLocationDetails({
          address1: eventData.address || "",
          address2: "",
          city: eventData.city || "",
          state: eventData.state || "",
          zip: eventData.postal_code || "",
          coordinates: [0, 0],
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
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    setName("");
    setDescription("");
    setStartDate(today);
    setEndDate(tomorrow);
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
    console.log("🧹 [CreateEvent] Clearing draft", currentDraft);
    if (currentDraft) {
      try {
        await draftService.deleteDraft(currentDraft.id);
        setCurrentDraft(null);
        setOriginalDraftData(null);
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
    // Use the new comparison function to determine if there are changes
    if (draftLoaded) {
      const hasChanges = hasStateChanged();
      setHasUnsavedChanges(hasChanges);
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
    locationDetails,
    selectedTopicsName,
    draftLoaded,
    originalDraftData, // Add this dependency
  ]);

  // Step completion tracking
  useEffect(() => {
    const newCompletedSteps: number[] = [];

    // Step 0: Basic Info (name and description)
    if (name.trim() !== "" && description.trim() !== "") {
      newCompletedSteps.push(0);
    }

    // Step 1: Category
    if (selectedTopics !== "") {
      newCompletedSteps.push(1);
    }

    // Step 2: Prompts (optional, always complete)
    newCompletedSteps.push(2);

    // Step 3: Images
    if (images.length > 0) {
      newCompletedSteps.push(3);
    }

    // Step 4: Location
    if (locationType === "static" || locationType === "googleApi") {
      if (address1.trim() !== "" && locationDetails.address1.trim() !== "") {
        newCompletedSteps.push(4);
      }
    } else {
      if (locationDetails.city !== "" && locationDetails.state !== "") {
        newCompletedSteps.push(4);
      }
    }

    // Step 5: Date & Time
    if (startDate && endDate && endDate.getTime() > startDate.getTime()) {
      newCompletedSteps.push(5);
    }

    // Step 6: Additional (optional, always complete)
    newCompletedSteps.push(6);

    setCompletedSteps(newCompletedSteps);

    // Determine current step based on what's missing
    let currentStepIndex = 0;

    // Find the first incomplete required field
    if (name.trim() === "" || description.trim() === "") {
      currentStepIndex = 0; // Basic Info
    } else if (selectedTopics === "") {
      currentStepIndex = 1; // Category
    } else if (images.length === 0) {
      currentStepIndex = 3; // Images
    } else if (locationType === "static" || locationType === "googleApi") {
      if (address1.trim() === "" || locationDetails.address1.trim() === "") {
        currentStepIndex = 4; // Location
      } else if (
        startDate &&
        endDate &&
        endDate.getTime() <= startDate.getTime()
      ) {
        currentStepIndex = 5; // Date & Time
      } else {
        currentStepIndex = 6; // All required fields complete
      }
    } else {
      if (locationDetails.city === "" || locationDetails.state === "") {
        currentStepIndex = 4; // Location
      } else if (
        startDate &&
        endDate &&
        endDate.getTime() <= startDate.getTime()
      ) {
        currentStepIndex = 5; // Date & Time
      } else {
        currentStepIndex = 6; // All required fields complete
      }
    }

    setCurrentStep(currentStepIndex);

    // Debug logging
    console.log("Step tracking:", {
      currentStep: currentStepIndex,
      stepTitle: steps[currentStepIndex]?.title,
      completedSteps: newCompletedSteps,
      name: name.trim(),
      description: description.trim(),
      selectedTopics,
      images: images.length,
      locationType,
      address1: address1.trim(),
    });
  }, [
    name,
    description,
    selectedTopics,
    images,
    address1,
    locationDetails,
    startDate,
    endDate,
    locationType,
  ]);

  useEffect(() => {
    console.log("createevent_useEffect");

    // Handle router params
    if (params.categoryId && params.categoryName) {
      const simpleCategory = {
        id: params.categoryId as string,
        name: params.categoryName as string,
      };
      console.log("🔍 Router params category:", simpleCategory);
      setCategoryList(simpleCategory as Category);
      setSelectedTopics(params.categoryId as string);
      setSelectedTopicsName(params.categoryName as string);
      if (params.prompts) {
        try {
          const raw = params.prompts;
          console.log("params.prompts>", raw);

          const parsedPrompts_: Prompt[] = Array.isArray(raw)
            ? raw
            : JSON.parse(raw as string);
          console.log("parsedPrompts_", parsedPrompts_);
          setPrompts(parsedPrompts_ as Partial<Prompt>);
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
    if (params.address) {
      setAddress1(params.address as string);
      // Also set locationDetails.address1 for consistency
      setLocationDetails((prev) => ({
        ...prev,
        address1: params.address as string,
      }));
    }

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
          // For static/googleApi locations, check if address1 is filled
          // If coming from a location (params.address), address1 should be sufficient
          return address1.trim() !== "";
        }
        return locationDetails.city !== "" && locationDetails.state !== "";
      }, // Step 4: Location
      () => {
        const truncateToMinute = (date: Date) =>
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

  // Smart validation that identifies specific missing fields
  const getValidationErrors = () => {
    const errors: string[] = [];

    if (name.trim() === "") {
      errors.push("Event name is required");
    }
    if (description.trim() === "") {
      errors.push("Event description is required");
    }
    if (selectedTopics === "") {
      errors.push("Please select a category");
    }
    if (images.length === 0) {
      errors.push("Please add at least one image");
    }
    if (locationType === "static" || locationType === "googleApi") {
      if (address1.trim() === "" || locationDetails.address1.trim() === "") {
        errors.push("Please select a location");
      }
    } else {
      if (locationDetails.city === "" || locationDetails.state === "") {
        errors.push("Please fill in the city and state");
      }
    }
    if (endDate.getTime() <= startDate.getTime()) {
      errors.push("End date must be after start date");
    }

    return errors;
  };

  // Get the first missing field to focus on
  const getFirstMissingField = () => {
    if (name.trim() === "") return "name";
    if (description.trim() === "") return "description";
    if (selectedTopics === "") return "category";
    if (images.length === 0) return "images";
    if (locationType === "static" || locationType === "googleApi") {
      if (address1.trim() === "" || locationDetails.address1.trim() === "")
        return "location";
    } else {
      if (locationDetails.city === "" || locationDetails.state === "")
        return "location";
    }
    if (endDate.getTime() <= startDate.getTime()) return "datetime";
    return null;
  };

  // Scroll to and focus on a specific field
  const focusOnField = (fieldName: string) => {
    setFocusedField(fieldName);

    // Scroll to the appropriate section based on field
    const scrollPositions = {
      name: 0,
      description: 0,
      category: 300,
      images: 600,
      location: 900,
      datetime: 1200,
    };

    const scrollPosition =
      scrollPositions[fieldName as keyof typeof scrollPositions] || 0;

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: scrollPosition,
        animated: true,
      });
    }, 100);

    // Clear focus after 3 seconds
    setTimeout(() => {
      setFocusedField(null);
    }, 3000);
  };

  const handleEventCreation = () => {
    const errors = getValidationErrors();

    if (errors.length > 0) {
      // Get the first missing field to focus on
      const firstMissingField = getFirstMissingField();

      if (firstMissingField) {
        // Focus on the missing field
        focusOnField(firstMissingField);

        // Show helpful toast
        Toast.show({
          type: "error",
          text1: "Complete Required Fields",
          text2: `Please fill in: ${errors[0]}`,
        });
      }
      return;
    }

    // All fields are complete, proceed with creation
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
      const results = await ImagePickerService.pickImage({
        allowsMultipleSelection: true,
        selectionLimit: 5, // Allow up to 5 images per selection
        quality: 0.8,
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (results.length > 0) {
        // Check if adding these images would exceed the limit
        if (images.length + results.length > 5) {
          Alert.alert(
            "Too Many Images",
            "You can only add up to 5 images. Please remove some images first.",
            [{ text: "OK" }]
          );
          return;
        }

        setImages((prevImages) => [...prevImages, ...results]);
        setHasUnsavedChanges(true);
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
        ...(eventID && { event_id: eventID }),
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
          ...(eventID && { event_id: eventID }),
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
      // Use POST for both create and update
      const apiUrl = `${process.env.BACKEND_MAP_URL}/api/events`;
      const method = "POST";
      
      // Add event_id to body if updating
      if (isUpdating) {
        eventData.event_id = editingEventId;
      }

      console.log(`${isUpdating ? "✏️ Updating" : "✨ Creating"} event:`, {
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

      // Get response text first (can only read body once)
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse as JSON, fallback to text if it fails
        let errorMessage = "Failed to create event";
        try {
          const responseData = JSON.parse(responseText);
          errorMessage = responseData.error || responseData.message || errorMessage;
        } catch (parseError) {
          // If parsing fails, use the text response
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      if (!isEditMode) {
        await clearDraft();
      }
      
      // Parse successful response
      let event;
      try {
        event = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        console.error("Response text:", responseText.substring(0, 200));
        throw new Error(`Invalid response format from server: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
      }
      // console.log("event>>", event);

      Toast.show({
        type: "success",
        text1: isEditMode ? "Activity Updated!" : "Activity Created!",
        text2: isEditMode
          ? "Your activity has been updated successfully"
          : "Your activity has been created successfully",
      });

      // Clear draft after successful creation (but not in edit mode)

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
          // Pass current map center for location change detection
          currentLat: (() => {
            const mapCenter = getCurrentMapCenter();
            return mapCenter ? mapCenter.latitude.toString() : "0";
          })(),
          currentLng: (() => {
            const mapCenter = getCurrentMapCenter();
            return mapCenter ? mapCenter.longitude.toString() : "0";
          })(),
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
    // Save draft before navigating away only if there are actual changes
    if (hasStateChanged() && (name.trim() || description.trim())) {
      await saveDraft(false);
    }

    console.log(
      "🔍 [CreateEvent] Back button pressed, params.from:",
      params.from
    );

    // Check if we came from a specific screen
    if (params.from === "map") {
      console.log("🔍 [CreateEvent] Going back to map");
      // Came from map, go back to map
      router.push("/(app)/(map)");
    } else if (params.from === "home") {
      console.log("🔍 [CreateEvent] Going back to home");
      // Came from home, go back to home
      router.push("/(app)/(home)");
    } else if (params.from === "social") {
      console.log("🔍 [CreateEvent] Going back to social");
      // Came from social, go back to social
      router.push("/(app)/(social)");
    } else if (params.from === "chat") {
      console.log("🔍 [CreateEvent] Going back to chat");
      // Came from chat, go back to chat
      router.push("/(app)/(chat)");
    } else if (params.from === "details") {
      console.log("🔍 [CreateEvent] Going back to details sheet");
      // Came from details sheet, use normal back navigation to return to the sheet
      router.back();
    } else if (params.from === "tab") {
      console.log("🔍 [CreateEvent] Going back to previous tab");
      // Came from bottom tab, use normal back navigation
      router.back();
    } else {
      console.log(
        "🔍 [CreateEvent] Using normal back navigation (no from param)"
      );
      // No from parameter, use normal back navigation
      router.back();
    }
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
          paddingTop: Math.max(insets.top + 5, 15),
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom + 20, 40),
        }}
      >
        {/* Compact Header */}
        <View style={{ marginBottom: 12 }}>
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
                {isEditMode
                  ? "Edit Activity"
                  : currentDraft?.name
                  ? `${currentDraft?.name} Draft`
                  : "Create Activity"}
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
                <Text
                  style={{ color: "white", fontSize: 12, fontWeight: "600" }}
                >
                  {isDraftSaving ? "Saving..." : "Save Draft"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ultra-Compact Step Indicator */}
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {(params.locationName || params.locationDescription) && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 250, delay: 80 }}
              style={{ marginBottom: 8 }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      overflow: "hidden",
                      marginRight: 10,
                    }}
                  >
                    <LinearGradient
                      colors={["#8B5CF6", "#A855F7"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MapPin size={16} color="#ffffff" />
                    </LinearGradient>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: theme.colors.text + "99",
                      letterSpacing: 0.3,
                    }}
                  >
                    From selected location
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: theme.colors.text,
                  }}
                  numberOfLines={1}
                >
                  {(params.locationName as string) || "Selected Location"}
                </Text>
                {(params.locationDescription as string) ? (
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: theme.colors.text + "99",
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    {params.locationDescription as string}
                  </Text>
                ) : null}
              </View>
            </MotiView>
          )}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
          >
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
              focusedField={focusedField}
            />

            <CategorySection
              selectedTopics={selectedTopics}
              selectedTopicsName={selectedTopicsName}
              onSelectTopic={setSelectedTopics}
            />

            {Array.isArray(prompts) && prompts.length > 0 ? (
              <PromptsSection
                prompts={prompts}
                selectedPrompts={selectedPrompts}
                setSelectedPrompts={setSelectedPrompts}
              />
            ) : (
              <></>
              // <View style={{ alignItems: "center", padding: 20 }}>
              //   <Text style={{ fontSize: 16, color: theme.colors.text + "CC" }}>
              //     No prompts available for this category
              //   </Text>
              // </View>
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
            <TouchableOpacity
              style={{
                borderRadius: 24,
                padding: 6,
                marginLeft: 20,
                borderWidth: 1,
                alignSelf: "flex-start",
                borderColor: theme.colors.primary + "88",
                marginBottom: 24,
                backgroundColor: showAdditionalInfo
                  ? theme.colors.primary
                  : "transparent",
              }}
              onPress={() => setShowAdditionalInfo(!showAdditionalInfo)}
            >
              <Text
                style={{
                  color: showAdditionalInfo
                    ? theme.colors.background
                    : theme.colors.text,
                  fontSize: 14,
                  lineHeight: 16,
                  fontWeight: "500",
                }}
              >
                Additional Info
              </Text>
            </TouchableOpacity>
            {showAdditionalInfo && (
              <AdditionalInfoSection
                externalUrl={externalUrl}
                setExternalUrl={setExternalUrl}
                externalUrlTitle={externalTitle}
                setExternalUrlTitle={setExternalTitle}
              />
            )}
          </MotiView>
        </ScrollView>

        {/* Enhanced Navigation Buttons */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: "spring",
            damping: 15,
            stiffness: 300,
            delay: 200,
          }}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: 16,
          }}
        >
          <MotiView
            from={{ scale: 1 }}
            animate={{ scale: validateCheck() ? 1 : 0.98 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleEventCreation();
              }}
              disabled={isLoading}
              style={{
                height: 56,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#8B5CF6",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
                opacity: isLoading ? 0.7 : 1,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={
                  validateCheck()
                    ? ["#8B5CF6", "#A855F7"]
                    : ["#8B5CF6", "#7C3AED"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 20,
                }}
              />

              {isLoading ? (
                <MotiView
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: "timing", duration: 200 }}
                >
                  <ActivityIndicator color="white" size="small" />
                </MotiView>
              ) : (
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 300 }}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: "white",
                      marginRight: 8,
                    }}
                  >
                    {validateCheck()
                      ? isEditMode
                        ? "Update Activity"
                        : "Create Activity"
                      : "Complete Required Fields"}
                  </Text>
                  {validateCheck() ? (
                    <MotiView
                      from={{ scale: 0, rotate: "180deg" }}
                      animate={{ scale: 1, rotate: "0deg" }}
                      transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 300,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 16 }}>✨</Text>
                    </MotiView>
                  ) : (
                    <MotiView
                      from={{ scale: 0, rotate: "180deg" }}
                      animate={{ scale: 1, rotate: "0deg" }}
                      transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 300,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 16 }}>👆</Text>
                    </MotiView>
                  )}
                </MotiView>
              )}
            </TouchableOpacity>
          </MotiView>
        </MotiView>
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
