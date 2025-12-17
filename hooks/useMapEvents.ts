import { MapLocation } from "./useUnifiedMapData";

interface Location {
  latitude: number;
  longitude: number;
}
interface EventAttendee {
  id: string;
  avatar_url: string;
  name: string;
}

interface EventCategory {
  id: string;
  name: string;
  icon: string;
}

export interface MapEvent {
  id: string;
  name: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  location: Location;
  address: string;
  image_urls: string[];
  distance: number;
  attendees: {
    count: number;
    profiles: EventAttendee[];
  };
  categories: EventCategory[];
  category: Category;
  type: string;
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  static_location?: MapLocation;
}

export interface Prompt {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  location_id: string | null;
  category_id: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
  source: string;
  prompts: Prompt[];
}
