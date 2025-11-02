import React from "react";
import { View } from "react-native";
import EventCategoriesSection from "./EventCategoriesSection";
import { EventAttendeesSection } from "./sections/EventAttendeesSection";
import { EventDetailsSection } from "./sections/EventDetailsSection";
import { EventSimilarSection } from "./sections/EventSimilarSection";
import { LocationBusinessInfoSection } from "./sections/LocationBusinessInfoSection";
import { LocationDetailsSection } from "./sections/LocationDetailsSection";
import { LocationEventsSection } from "./sections/LocationEventsSection";
import { LocationSimilarSection } from "./sections/LocationSimilarSection";
import { TicketmasterDetailsSection } from "./sections/TicketmasterDetailsSection";

export interface UnifiedDetailsSheetContentProps {
  data: any;
  isEventType: boolean;
  isTicketmasterEvent: boolean;
  isUserEvent: boolean;
  isGoogleApiEvent: boolean;
  isCreator: boolean;
  isJoined: boolean;
  hasTickets: boolean;
  attendeeCount: number;
  attendeeProfiles: any[];
  locationEvents: any[];
  loadingLocationEvents: boolean;
  nearbyData: any[];
  onDataSelect: (data: any) => void;
  onShowControler: () => void;
}

export function UnifiedDetailsSheetContent({
  data,
  isEventType,
  isTicketmasterEvent,
  isCreator,
  isJoined,
  hasTickets,
  attendeeCount,
  attendeeProfiles,
  locationEvents,
  loadingLocationEvents,
  nearbyData,
  onDataSelect,
}: UnifiedDetailsSheetContentProps) {
  if (isEventType) {
    // EVENT CONTENT
    if (isTicketmasterEvent) {
      // TICKETMASTER EVENT CONTENT
      return (
        <View>
          <TicketmasterDetailsSection data={data} />
          {/* Categories (for events) */}
          {data.categories && data.categories.length > 0 && (
            <EventCategoriesSection categories={data.categories} />
          )}
          <EventAttendeesSection
            data={data}
            attendeeCount={attendeeCount}
            attendeeProfiles={attendeeProfiles}
          />
          <EventSimilarSection
            data={data}
            nearbyData={nearbyData}
            onDataSelect={onDataSelect}
          />
        </View>
      );
    } else {
      // REGULAR EVENT CONTENT (User Events)
      return (
        <View>
          <EventDetailsSection
            data={data}
            isCreator={isCreator}
            isJoined={isJoined}
            hasTickets={hasTickets}
          />
          {/* Categories (for events) */}
          {data.categories && data.categories.length > 0 && (
            <EventCategoriesSection categories={data.categories} />
          )}
          <EventAttendeesSection
            data={data}
            attendeeCount={attendeeCount}
            attendeeProfiles={attendeeProfiles}
          />
          <EventSimilarSection
            data={data}
            nearbyData={nearbyData}
            onDataSelect={onDataSelect}
          />
        </View>
      );
    }
  } else {
    // LOCATION CONTENT
    return (
      <View>
        <LocationDetailsSection data={data} />
        <LocationBusinessInfoSection data={data} />
        <LocationEventsSection
          data={data}
          locationEvents={locationEvents}
          loadingLocationEvents={loadingLocationEvents}
          onDataSelect={onDataSelect}
        />
        <LocationSimilarSection
          data={data}
          nearbyData={nearbyData}
          onDataSelect={onDataSelect}
        />
      </View>
    );
  }
}
