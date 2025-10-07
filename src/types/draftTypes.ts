export interface EventDraft {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  venue_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  location_id?: string;
  category_id?: string;
  is_private: boolean;
  external_url?: string;
  image_urls?: string[]; // Array of image URLs (matches events table)
  type?: string;
  created_at: string;
  updated_at: string;
}

export interface DraftFormData {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  locationId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  address: string;
  categoryId: string;
  categoryName: string;
  isPrivate: boolean;
  externalUrl: string;
  images: Array<{
    uri: string;
    type: string;
    name: string;
  }>;
}

export interface DraftService {
  saveDraft: (draftData: Partial<EventDraft>) => Promise<EventDraft>;
  getDrafts: () => Promise<EventDraft[]>;
  getDraft: (draftId: string) => Promise<EventDraft | null>;
  updateDraft: (draftId: string, draftData: Partial<EventDraft>) => Promise<EventDraft>;
  deleteDraft: (draftId: string) => Promise<void>;
  clearDraft: (draftId: string) => Promise<void>;
}
