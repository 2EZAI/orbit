export interface AIDescriptionRequest {
  userDescription: string;
  eventName: string;
  startDateTime: string;
  endDateTime?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  locationId?: string;
  additionalDetails?: string;
}

export interface AIDescriptionResponse {
  success: boolean;
  description: string;
  enhanced: boolean;
  suggestions: string[];
  meta: {
    user_id: string;
    event_name: string;
    has_location_data: boolean;
  };
}

export interface AIRefineRequest {
  originalDescription: string;
  userFeedback: string;
  eventName: string;
  startDateTime: string;
  endDateTime?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  locationId?: string;
  additionalDetails?: string;
}

export interface AIDescriptionState {
  isGenerating: boolean;
  isRefining: boolean;
  generatedDescription: string;
  isTyping: boolean;
  currentText: string;
  error: string | null;
  suggestions: string[];
}
