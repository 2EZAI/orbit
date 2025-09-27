```

```

# Orbit Map API Documentation

## Overview

The Orbit Map API provides endpoints to fetch map data (events and locations) based on geographical coordinates from your Supabase database. The API supports both authenticated and non-authenticated requests, with enhanced features for logged-in users, but **authentication is completely optional** - all data is accessible to public users.

## Base URL

```
http://localhost:8000/api
```

## Key Features

- ✅ **Public Access**: No authentication required for any endpoint
- ✅ **Optional Authentication**: Enhanced features when JWT token provided
- ✅ **Two-Stage Loading**: Fast nearby results (100 miles) + unlimited worldwide data
- ✅ **Complete Dataset**: Returns all 8,000+ locations from your database
- ✅ **PostGIS Integration**: Accurate geographic distance calculations
- ✅ **Real-time Data**: Fetches directly from your Supabase database
- ✅ **No Limits**: Returns ALL data from database (no 1000 record PostgreSQL limit)
- ✅ **Distance Filtering**: Configurable radius-based search
- ✅ **Time Filtering**: Filter events by time ranges
- ✅ **Enhanced User Data**: Real user profiles with names, usernames, and avatars
- ✅ **Category Information**: Full category details with names and icons
- ✅ **Event Attendees**: Attendee counts and profiles for events
- ✅ **Join Status**: Real-time attendance status for authenticated users
- ✅ **Ticketmaster Integration**: Live events from Ticketmaster API (optional)
- ✅ **Cross-Platform**: Works with any frontend (React, Vue, mobile apps)

## 🚀 Quick Start for Frontend

**Replace your complex `useUnifiedMapData` hook with two optimized endpoints:**

1. **Fast Loading**: `POST /events/nearby` → Returns ~1,700 locations within 100 miles instantly
2. **Complete Data**: `POST /events/user-location` → Returns all 8,000+ locations worldwide

```javascript
// 1. Fast nearby results (immediate)
const nearbyData = await fetch("/api/events/nearby", {
  method: "POST",
  body: JSON.stringify({ latitude, longitude, timeRange: "today" }),
});

// 2. Complete worldwide dataset (500ms later)
const allData = await fetch("/api/events/user-location", {
  method: "POST",
  body: JSON.stringify({
    latitude,
    longitude,
    radius: 5000000,
    timeRange: "today",
  }),
});
```

---

## Enhanced Data Features

### 🧑‍💼 **User Information**

Events now include complete user profiles for creators:

```json
{
  "created_by": {
    "id": "user-uuid",
    "name": "John Doe", // Real name from first_name + last_name
    "username": "johndoe", // Username from users table
    "avatar_url": "https://..." // User's profile picture
  }
}
```

### 🏷️ **Category Information**

Both events and locations include detailed category data:

```json
{
  "categories": [
    // Events can have multiple categories
    {
      "id": "category-uuid",
      "name": "Music",
      "icon": "🎵"
    }
  ],
  "category": {
    // Locations have single category
    "id": "category-uuid",
    "name": "Coffee Shop",
    "icon": "☕"
  }
}
```

### 👥 **Event Attendees**

Events include attendee information for social features:

```json
{
  "attendees": {
    "count": 15, // Total number of attendees
    "profiles": [
      // First 10 attendee profiles (for performance)
      {
        "id": "user-uuid",
        "name": "Jane Smith",
        "avatar_url": "https://..."
      }
    ]
  },
  "join_status": true // Whether current user is attending
}
```

### 🔐 **Join Status Logic**

The `join_status` field indicates if the authenticated user is attending:

- **`true`**: User is attending the event
- **`false`**: User is not attending the event
- **`undefined`**: User is not authenticated (no status available)

### 🎫 **Enhanced Ticketmaster Integration**

The API automatically fetches live events from Ticketmaster when configured, now with **comprehensive event details** including ALL available data from the Ticketmaster Discovery API:

**Features included in `ticketmaster_details`:**

- Complete event information (type, locale, name, description, URL, ID)
- Detailed dates & times (start/end times, timezone, status, multi-day events)
- Sales information (public sales, presales, ticket availability)
- Enhanced images from dedicated Ticketmaster Images API
- Complete venue details (box office, parking, accessibility, social media)
- Artist/attraction data with images and classifications
- Detailed classifications (segment, genre, sub-genre information)
- Promoter information and accessibility details
- Age restrictions and ticketing information
- Seatmap data and external links
- Product information and comprehensive metadata

```json
{
  "id": "ticketmaster-event-id",
  "name": "Concert at Madison Square Garden",
  "is_ticketmaster": true,
  "source": "ticketmaster",
  "external_url": "https://www.ticketmaster.com/...",
  "categories": [
    {
      "id": "KZFzniwnSyZfZ7v7nJ",
      "name": "Music",
      "icon": "🎵"
    }
  ],
  "ticketmaster_details": {
    "type": "event",
    "locale": "en-us",
    "name": "Concert at Madison Square Garden",
    "description": "Amazing concert featuring top artists",
    "url": "https://www.ticketmaster.com/...",
    "id": "ticketmaster-event-id",
    "dates": {
      "start": {
        "localDate": "2024-02-15",
        "localTime": "20:00:00",
        "dateTime": "2024-02-16T01:00:00Z"
      },
      "timezone": "America/New_York",
      "status": {
        "code": "onsale"
      }
    },
    "sales": {
      "public": {
        "startDateTime": "2024-01-15T10:00:00Z",
        "endDateTime": "2024-02-15T20:00:00Z"
      }
    },
    "enhanced_images": [
      {
        "url": "https://s1.ticketm.net/dam/a/...",
        "width": 1024,
        "height": 576,
        "ratio": "16_9"
      }
    ],
    "venue": {
      "id": "KovZpZAEdFtJ",
      "name": "Madison Square Garden",
      "type": "venue",
      "url": "https://www.ticketmaster.com/...",
      "city": {
        "name": "New York"
      },
      "state": {
        "name": "New York",
        "stateCode": "NY"
      },
      "address": {
        "line1": "4 Pennsylvania Plaza"
      },
      "location": {
        "longitude": "-73.9937",
        "latitude": "40.7505"
      },
      "boxOfficeInfo": "Box Office Hours: Mon-Fri 10am-6pm",
      "parkingDetail": "Parking available in attached garage",
      "accessibleSeatingDetail": "Wheelchair accessible seating available"
    },
    "attractions": [
      {
        "id": "K8vZ917Gku7",
        "name": "Taylor Swift",
        "type": "attraction",
        "url": "https://www.ticketmaster.com/...",
        "images": [
          {
            "url": "https://s1.ticketm.net/dam/a/...",
            "width": 1024,
            "height": 1024
          }
        ],
        "classifications": [
          {
            "primary": true,
            "segment": {
              "id": "KZFzniwnSyZfZ7v7nJ",
              "name": "Music"
            },
            "genre": {
              "id": "KnvZfZ7vAeA",
              "name": "Pop"
            }
          }
        ]
      }
    ],
    "classifications": [
      {
        "primary": true,
        "segment": {
          "id": "KZFzniwnSyZfZ7v7nJ",
          "name": "Music"
        },
        "genre": {
          "id": "KnvZfZ7vAeA",
          "name": "Pop"
        }
      }
    ],
    "accessibility": {
      "info": "Wheelchair accessible seating available. Please contact venue for specific accessibility needs."
    },
    "ageRestrictions": {
      "legalAgeEnforced": false
    },
    "ticketing": {
      "allInclusivePricing": false
    },
    "seatmap": {
      "staticUrl": "https://maps.ticketmaster.com/..."
    },
    "externalLinks": {
      "youtube": [
        {
          "url": "https://www.youtube.com/watch?v=..."
        }
      ],
      "twitter": [
        {
          "url": "https://twitter.com/taylorswift13"
        }
      ]
    }
  }
}
```

**Enhanced Features:**

- **Complete Event Information**: Type, locale, name, description, URL, ID
- **Detailed Dates & Times**: Start/end times, timezone, status, multi-day events
- **Sales Information**: Public sales, presales, ticket availability
- **Enhanced Images**: High-quality images from dedicated Ticketmaster Images API
- **Complete Venue Details**: Full venue information including box office, parking, accessibility
- **Artist/Attraction Data**: Complete performer information with images and classifications
- **Detailed Classifications**: Segment, genre, sub-genre information
- **Accessibility Info**: Accessibility features and requirements
- **Age Restrictions**: Age limits and requirements
- **Ticketing Details**: Complete ticketing information
- **Seatmap Data**: Venue seating information
- **External Links**: Social media and external website links

**Configuration:**

- Set `TICKETMASTER_API_KEY` environment variable
- Get API key from [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
- API automatically falls back gracefully if key is missing

---

## Endpoints

### 1. Get Nearby Data (POST) - Fast Initial Load

**Endpoint:** `POST /events/nearby`

**Description:** Fast endpoint that returns data within 100 miles (160km) for immediate map loading.

#### Headers

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  # Optional
```

#### Request Body

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "timeRange": "today"
}
```

#### Parameters

| Parameter   | Type   | Required | Default | Description                                |
| ----------- | ------ | -------- | ------- | ------------------------------------------ |
| `latitude`  | number | ✅ Yes   | -       | Latitude coordinate (-90 to 90)            |
| `longitude` | number | ✅ Yes   | -       | Longitude coordinate (-180 to 180)         |
| `timeRange` | string | ❌ No    | "today" | Time filter: "today", "week", or "weekend" |

**Note:** Radius is fixed at 100 miles (160,934 meters) for fast nearby results.

#### Response

Same structure as the main endpoint, but limited to 100-mile radius.

---

### 2. Get All Map Data (POST) - Complete Dataset

**Endpoint:** `POST /events/user-location`

**Description:** Returns complete worldwide dataset with configurable radius. Processes all 8,000+ locations for unlimited range.

#### Headers

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  # Optional - enhances response if provided
```

#### Request Body

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius": 50000,
  "timeRange": "today"
}
```

#### Parameters

| Parameter   | Type   | Required | Default | Description                                        |
| ----------- | ------ | -------- | ------- | -------------------------------------------------- |
| `latitude`  | number | ✅ Yes   | -       | Latitude coordinate (-90 to 90)                    |
| `longitude` | number | ✅ Yes   | -       | Longitude coordinate (-180 to 180)                 |
| `radius`    | number | ❌ No    | 500000  | Search radius in meters (max recommended: 1000000) |
| `timeRange` | string | ❌ No    | "today" | Time filter: "today", "week", or "weekend"         |

#### Time Range Options

- **"today"**: Events in the next 24 hours from current time
- **"week"**: Events in the next 7 days from current time
- **"weekend"**: Events during the next Friday-Sunday period
- **Default behavior**: If invalid value provided, defaults to next 4 hours

#### Response Structure

```json
{
  "events": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Live Music at Central Park",
      "description": "Outdoor concert featuring local artists",
      "start_datetime": "2024-01-15T19:00:00Z",
      "end_datetime": "2024-01-15T23:00:00Z",
      "venue_name": "Central Park Amphitheater",
      "address": "Central Park, New York, NY 10024",
      "location": {
        "type": "Point",
        "coordinates": [-73.9654, 40.7829]
      },
      "image_urls": [
        "https://example.com/event-image1.jpg",
        "https://example.com/event-image2.jpg"
      ],
      "is_ticketmaster": false,
      "external_url": "https://centralpark.com/events/live-music",
      "source": "manual",
      "type": "music",
      "created_by": {
        "id": "user-456",
        "name": "John Doe",
        "username": "johndoe",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "categories": [
        {
          "id": "music-category-uuid",
          "name": "Music",
          "icon": "🎵"
        }
      ],
      "attendees": {
        "count": 15,
        "profiles": [
          {
            "id": "user-789",
            "name": "Jane Smith",
            "avatar_url": "https://example.com/jane-avatar.jpg"
          },
          {
            "id": "user-101",
            "name": "Mike Johnson",
            "avatar_url": null
          }
        ]
      },
      "join_status": true
    }
  ],
  "locations": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174111",
      "name": "Blue Bottle Coffee",
      "description": "Specialty coffee roaster with artisanal blends",
      "address": "450 W 15th St, New York, NY 10014",
      "location": {
        "type": "Point",
        "coordinates": [-74.006, 40.742]
      },
      "image_urls": ["https://example.com/coffee-shop.jpg"],
      "type": "cafe",
      "operation_hours": {
        "monday": "7:00-19:00",
        "tuesday": "7:00-19:00",
        "wednesday": "7:00-19:00",
        "thursday": "7:00-19:00",
        "friday": "7:00-20:00",
        "saturday": "8:00-20:00",
        "sunday": "8:00-18:00"
      },
      "rating": 4.3,
      "rating_count": 2847,
      "price_level": 3,
      "phone": "+1-212-555-0123",
      "external_url": "https://bluebottlecoffee.com",
      "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "distance_meters": 1245.67,
      "category_id": "cafe-uuid-here",
      "category": {
        "id": "cafe-uuid-here",
        "name": "Coffee Shop",
        "icon": "☕"
      }
    }
  ],
  "isAuthenticated": false,
  "user": undefined
}
```

#### Response for Authenticated Users

When a valid JWT token is provided, the response includes additional user information:

```json
{
  "events": [...],
  "locations": [...],
  "isAuthenticated": true,
  "user": {
    "id": "user-123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "username": "johndoe"
  }
}
```

### 2. Get Map Data (GET) - Alternative Endpoint

**Endpoint:** `GET /events/user-location`

**Description:** Alternative GET endpoint using query parameters instead of request body.

#### Headers

```http
Authorization: Bearer <JWT_TOKEN>  # Optional
```

#### Query Parameters

```
GET /events/user-location?latitude=37.7749&longitude=-122.4194&radius=50000&timeRange=today
```

| Parameter   | Type   | Required | Default  | Description             |
| ----------- | ------ | -------- | -------- | ----------------------- |
| `latitude`  | string | ✅ Yes   | -        | Latitude coordinate     |
| `longitude` | string | ✅ Yes   | -        | Longitude coordinate    |
| `radius`    | string | ❌ No    | "500000" | Search radius in meters |
| `timeRange` | string | ❌ No    | "today"  | Time filter             |

#### Response

Same structure as POST endpoint.

### 3. Health Check

**Endpoint:** `GET /health`

**Description:** Returns server health status and timestamp.

#### Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:34:56.789Z"
}
```

---

## Authentication System

### 🔓 **Optional Authentication Model**

The API uses an **optional authentication** system where:

- ✅ **No token required**: All endpoints work without authentication
- ✅ **Enhanced features**: Additional user data when authenticated
- ✅ **Never blocks**: Invalid/expired tokens don't prevent data access
- ✅ **User preferences**: Authenticated users can use saved location preferences

### Authentication Flow

```mermaid
graph TD
    A[API Request] --> B{Has Authorization Header?}
    B -->|No| C[Set isAuthenticated = false]
    B -->|Yes| D{Valid JWT Token?}
    D -->|No| C
    D -->|Yes| E{User exists in database?}
    E -->|No| C
    E -->|Yes| F[Set isAuthenticated = true, fetch user data]
    C --> G[Continue with request]
    F --> G
    G --> H[Return data + auth status]
```

### User Location Preferences

For authenticated users with `event_location_preference: 1`:

- API uses user's saved location from `user_locations` table
- Falls back to provided coordinates if no saved location found
- Most recent location entry is used

---

## Database Schema Integration

### Events Table (`events`)

The API fetches from your `events` table with these columns and joins:

```sql
- id (uuid, primary key)
- name (text, required)
- description (text, optional)
- start_datetime (timestamp with time zone, required)
- end_datetime (timestamp with time zone, optional)
- venue_name (text, optional)
- address (text, optional)
- city (text, optional)
- state (text, optional)
- postal_code (text, optional)
- location (geography, PostGIS point)
- image_urls (text[], array of image URLs)
- external_url (text, optional)
- source_type (text, optional)
- type (text, optional)
- created_by (uuid, foreign key to users)
- category_id (uuid, foreign key to location_categories)

-- JOINED TABLES:
- users!created_by (user profile data)
- location_categories!category_id (category information)
- event_attendees (attendee data with user profiles)
```

### Static Locations Table (`static_locations`)

The API fetches from your `static_locations` table:

```sql
- id (uuid, primary key)
- name (text, required)
- description (text, optional)
- address (text, optional)
- location (geography, PostGIS point)
- image_urls (jsonb, array of image URLs)
- type (text, optional)
- category (text, optional)
- category_id (uuid, foreign key)
- operation_hours (jsonb, business hours)
- rating (numeric(2,1), 0.0-5.0)
- rating_count (integer)
- price_level (integer, 1-4 scale)
- phone (text, optional)
- external_url (text, optional)
- place_id (text, optional, Google Places ID)

-- JOINED TABLES:
- location_categories!category_id (category information with icons)
```

### Related Tables

#### Users Table (`users`)

Provides user profile information for event creators and attendees:

```sql
- id (uuid, primary key)
- username (text, unique)
- first_name (text, optional)
- last_name (text, optional)
- avatar_url (text, optional)
```

#### Location Categories Table (`location_categories`)

Provides category information for events and locations:

```sql
- id (uuid, primary key)
- name (text, required)
- icon (text, optional)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Event Attendees Table (`event_attendees`)

Tracks user attendance for events:

```sql
- event_id (uuid, foreign key to events)
- user_id (uuid, foreign key to users)
- created_at (timestamp)
```

### PostGIS Geometry Handling

- **Input format**: PostGIS binary geometry (e.g., `"0101000020E6100000..."`)
- **Output format**: GeoJSON Point with `[longitude, latitude]` coordinates
- **SRID**: 4326 (WGS84 coordinate system)
- **Distance calculations**: Haversine formula for accuracy

---

## Data Processing & Filtering

### Geographic Filtering

1. **PostGIS Integration**: Fetches all data from database
2. **Backend Filtering**: Applies radius-based distance filtering using Haversine formula
3. **Coordinate Validation**: Ensures coordinates are within valid ranges
4. **Distance Calculation**: Calculates exact distance for each location

### Time Filtering

Events are filtered by `start_datetime` based on the selected time range:

```javascript
const now = new Date();

switch (timeRange) {
  case "today":
    // Next 24 hours
    return events.filter(
      (e) => eventTime >= now && eventTime <= now + 24 * 60 * 60 * 1000
    );

  case "week":
    // Next 7 days
    return events.filter(
      (e) => eventTime >= now && eventTime <= now + 7 * 24 * 60 * 60 * 1000
    );

  case "weekend":
    // Next Friday-Sunday period
    const nextFriday = getNextFriday(now);
    return events.filter(
      (e) =>
        eventTime >= nextFriday &&
        eventTime <= nextFriday + 3 * 24 * 60 * 60 * 1000
    );

  default:
    // Next 4 hours
    return events.filter(
      (e) => eventTime >= now && eventTime <= now + 4 * 60 * 60 * 1000
    );
}
```

### Data Transformation

#### Address Building

Event addresses are constructed from multiple database fields:

```javascript
const fullAddress = [event.address, event.city, event.state, event.postal_code]
  .filter(Boolean)
  .join(", ");
```

#### Coordinate Conversion

PostGIS binary geometry is converted to GeoJSON:

```javascript
// Input: "0101000020E6100000A1A17F828B0854C0A4A08092A7CB3940"
// Output: {"type": "Point", "coordinates": [-122.4194, 37.7749]}
```

---

## Error Handling

### 400 Bad Request

Missing or invalid coordinates:

```json
{
  "error": "Latitude and longitude are required"
}
```

```json
{
  "error": "Invalid coordinates provided"
}
```

### 500 Internal Server Error

Database or processing errors:

```json
{
  "error": "Events query failed: column 'invalid_column' does not exist"
}
```

```json
{
  "error": "Locations query failed: connection timeout"
}
```

### Authentication Errors

The API **never returns 401 errors** for the main endpoints because authentication is optional. Invalid tokens are handled gracefully:

```javascript
// Invalid token result
{
  "events": [...],
  "locations": [...],
  "isAuthenticated": false,  // Simply set to false
  "user": undefined
}
```

---

## Frontend Integration Examples

### React Integration - Two-Stage Loading

Replace your complex frontend Supabase calls with optimized two-stage loading:

#### Before (Direct Supabase)

```javascript
import { useState, useEffect } from "react";
import { supabase } from "~/src/lib/supabase";

export function useMapData(center, radius) {
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Complex PostGIS queries
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .filter("location", "filter", `ST_DWithin(...)`);

      const { data: locations } = await supabase
        .from("static_locations")
        .select("*")
        .filter("location", "filter", `ST_DWithin(...)`);

      // Manual coordinate conversion
      // Manual distance calculations
      // Manual time filtering
      // etc...

      setEvents(processedEvents);
      setLocations(processedLocations);
      setLoading(false);
    }

    fetchData();
  }, [center, radius]);

  return { events, locations, loading };
}
```

#### After (API Integration)

```javascript
import { useState, useEffect } from "react";
import { useAuth } from "~/src/lib/auth";

export function useMapData(center, radius = 50000, timeRange = "today") {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { session } = useAuth();

  useEffect(() => {
    async function fetchMapData() {
      try {
        setLoading(true);

        const response = await fetch("/api/events/user-location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Optional auth - enhances response if user is logged in
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
          body: JSON.stringify({
            latitude: center[1], // [lng, lat] to lat
            longitude: center[0], // [lng, lat] to lng
            radius,
            timeRange,
          }),
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    if (center && center[0] !== 0 && center[1] !== 0) {
      fetchMapData();
    }
  }, [center, radius, timeRange, session?.access_token]);

  return {
    events: data?.events || [],
    locations: data?.locations || [],
    isAuthenticated: data?.isAuthenticated || false,
    user: data?.user,
    loading,
    error,
  };
}
```

#### Optimized Two-Stage Loading Hook (Recommended)

```javascript
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "~/src/lib/auth";

export function useOptimizedMapData(
  center,
  radius = 500000,
  timeRange = "today"
) {
  const [nearbyData, setNearbyData] = useState(null);
  const [allData, setAllData] = useState(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState(null);
  const { session } = useAuth();

  // Stage 1: Fast nearby results (100 miles)
  const fetchNearbyData = useCallback(async () => {
    if (!center || (center[0] === 0 && center[1] === 0)) return;

    try {
      setLoadingNearby(true);
      setError(null);

      const response = await fetch("/api/events/nearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({
          latitude: center[1],
          longitude: center[0],
          timeRange,
        }),
      });

      if (!response.ok) throw new Error(`Nearby API Error: ${response.status}`);

      const result = await response.json();
      setNearbyData(result);

      console.log(
        `🎯 Stage 1: Got ${result.events?.length || 0} events, ${
          result.locations?.length || 0
        } locations nearby`
      );
    } catch (err) {
      setError(err.message);
      console.error("Nearby data fetch error:", err);
    } finally {
      setLoadingNearby(false);
    }
  }, [center, timeRange, session?.access_token]);

  // Stage 2: Complete worldwide dataset
  const fetchAllData = useCallback(async () => {
    if (!center || (center[0] === 0 && center[1] === 0)) return;

    try {
      setLoadingAll(true);

      const response = await fetch("/api/events/user-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({
          latitude: center[1],
          longitude: center[0],
          radius, // User's requested radius
          timeRange,
        }),
      });

      if (!response.ok) throw new Error(`Full API Error: ${response.status}`);

      const result = await response.json();
      setAllData(result);

      console.log(
        `🌍 Stage 2: Got ${result.events?.length || 0} events, ${
          result.locations?.length || 0
        } locations worldwide`
      );
    } catch (err) {
      setError(err.message);
      console.error("Full data fetch error:", err);
    } finally {
      setLoadingAll(false);
    }
  }, [center, radius, timeRange, session?.access_token]);

  // Auto-fetch nearby data immediately, then all data
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      // Stage 1: Immediate nearby results
      fetchNearbyData();

      // Stage 2: Complete dataset after short delay
      const timer = setTimeout(() => {
        fetchAllData();
      }, 500); // 500ms delay to let nearby load first

      return () => clearTimeout(timer);
    }
  }, [fetchNearbyData, fetchAllData]);

  // Return the most complete data available
  const currentData = allData || nearbyData;
  const isLoadingAny = loadingNearby || loadingAll;

  return {
    // Data
    events: currentData?.events || [],
    locations: currentData?.locations || [],
    isAuthenticated: currentData?.isAuthenticated || false,
    user: currentData?.user,

    // Loading states
    loading: isLoadingAny,
    loadingNearby,
    loadingAll,

    // Data availability
    hasNearbyData: !!nearbyData,
    hasAllData: !!allData,

    // Manual refresh functions
    refreshNearby: fetchNearbyData,
    refreshAll: fetchAllData,

    // Error state
    error,
  };
}
```

#### Usage in Component

```javascript
function MapComponent() {
  const [center, setCenter] = useState([0, 0]);
  const [radius, setRadius] = useState(50000); // 50km default

  const {
    events,
    locations,
    loading,
    loadingNearby,
    hasNearbyData,
    hasAllData,
    refreshAll,
    error,
  } = useOptimizedMapData(center, radius, "today");

  useEffect(() => {
    // Get user's current location
    navigator.geolocation.getCurrentPosition((position) => {
      setCenter([position.coords.longitude, position.coords.latitude]);
    });
  }, []);

  return (
    <div>
      {/* Loading indicators */}
      {loadingNearby && <div>Loading nearby locations...</div>}
      {hasNearbyData && !hasAllData && (
        <div>Loaded nearby • Loading worldwide data...</div>
      )}

      {/* Map component */}
      <Map
        center={center}
        events={events}
        locations={locations}
        onRadiusChange={setRadius}
      />

      {/* Stats */}
      <div>
        Events: {events.length} | Locations: {locations.length}
        {hasAllData && <span> • Complete worldwide dataset</span>}
      </div>

      {/* Manual refresh */}
      <button onClick={refreshAll}>Refresh All Data</button>

      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### Vue.js Integration

```javascript
// composables/useMapData.js
import { ref, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";

export function useMapData(center, radius = 50000, timeRange = "today") {
  const authStore = useAuthStore();
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const events = computed(() => data.value?.events || []);
  const locations = computed(() => data.value?.locations || []);
  const isAuthenticated = computed(() => data.value?.isAuthenticated || false);

  async function fetchMapData() {
    if (!center.value || center.value[0] === 0) return;

    try {
      loading.value = true;
      error.value = null;

      const response = await fetch("/api/events/user-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authStore.token && {
            Authorization: `Bearer ${authStore.token}`,
          }),
        },
        body: JSON.stringify({
          latitude: center.value[1],
          longitude: center.value[0],
          radius: radius.value,
          timeRange: timeRange.value,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      data.value = await response.json();
    } catch (err) {
      error.value = err.message;
      console.error("Map data fetch error:", err);
    } finally {
      loading.value = false;
    }
  }

  watch([center, radius, timeRange], fetchMapData, { immediate: true });

  return {
    events,
    locations,
    isAuthenticated,
    loading,
    error,
    refetch: fetchMapData,
  };
}
```

### React Native / Mobile Integration

```javascript
// hooks/useMapData.js
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useMapData(latitude, longitude, radius = 50000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Get auth token from storage
        const token = await AsyncStorage.getItem("userToken");

        const response = await fetch(
          "https://your-api.com/api/events/user-location",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              latitude,
              longitude,
              radius,
              timeRange: "today",
            }),
          }
        );

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("API Error:", error);
      } finally {
        setLoading(false);
      }
    }

    if (latitude && longitude) {
      fetchData();
    }
  }, [latitude, longitude, radius]);

  return { data, loading };
}
```

---

## cURL Examples

### Basic Non-Authenticated Request

```bash
curl -X POST http://localhost:8000/api/events/user-location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "radius": 50000,
    "timeRange": "today"
  }'
```

### Authenticated Request

```bash
curl -X POST http://localhost:8000/api/events/user-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "radius": 100000,
    "timeRange": "week"
  }'
```

### GET Request with Query Parameters

```bash
curl "http://localhost:8000/api/events/user-location?latitude=40.7128&longitude=-74.0060&radius=25000&timeRange=weekend"
```

### Health Check

```bash
curl http://localhost:8000/api/health
```

### Extract Specific Data

```bash
# Get only location count
curl -s -X POST http://localhost:8000/api/events/user-location \
  -H "Content-Type: application/json" \
  -d '{"latitude": 37.7749, "longitude": -122.4194}' \
  | jq '.locations | length'

# Get authentication status
curl -s -X POST http://localhost:8000/api/events/user-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{"latitude": 37.7749, "longitude": -122.4194}' \
  | jq '.isAuthenticated'

# Get event names only
curl -s -X POST http://localhost:8000/api/events/user-location \
  -H "Content-Type: application/json" \
  -d '{"latitude": 37.7749, "longitude": -122.4194}' \
  | jq '.events[].name'
```

---

## Testing

### Test Scripts

The API includes comprehensive test scripts:

#### Data Validation Test

```bash
npm run test:data
# OR
node test-data-validation.js
```

#### Comprehensive API Test

```bash
npm run test:api
# OR
node test-api-comprehensive.js
```

#### With Authentication

```bash
TEST_JWT_TOKEN=your_jwt_token npm run test:api
```

### Test Coverage

The test scripts validate:

- ✅ **API Connectivity**: Server responds correctly
- ✅ **Data Structure**: Response matches expected format
- ✅ **Geographic Data**: PostGIS coordinates are valid
- ✅ **Distance Calculations**: Haversine formula accuracy
- ✅ **Authentication Flow**: Both auth and non-auth scenarios
- ✅ **Error Handling**: Invalid coordinates and malformed requests
- ✅ **Time Filtering**: Different time range behaviors
- ✅ **Radius Filtering**: Various distance parameters
- ✅ **Cross-Location**: Multiple geographic areas

### Sample Test Output

```bash
🧪 Testing Data Retrieval and Validation

✅ API request successful

📊 Data Summary:
- Events: 0
- Locations: 28
- Authenticated: false
- User: None

🏢 Locations Data Analysis:
✅ Found 28 locations

📝 First Location Structure:
{
  "id": "04b59dd6-e9bf-42c2-8908-32a452d7ac17",
  "name": "Brooklyn Bridge",
  "location": {
    "type": "Point",
    "coordinates": [-73.9969, 40.7061]
  },
  "distance_meters": 1247.32
}

✅ Valid locations: 28/28
🏷️  Locations with categories: 15/28
📏 Locations with distance: 28/28
   Distance range: 245m - 12,847m

🎉 Data validation test completed!
```

---

## Environment Variables

### Required

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Optional

```env
# Server Configuration
PORT=8000                    # Default: 4000
NODE_ENV=development         # development | production

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Ticketmaster Integration (Optional)
TICKETMASTER_API_KEY=your_ticketmaster_api_key_here

# Testing
TEST_JWT_TOKEN=your_test_token_for_auth_testing
```

### Environment Setup

1. Copy environment template:

```bash
cp .env.example .env
```

2. Fill in your Supabase credentials:

```env
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Optional: Add Ticketmaster API key for live events:

```env
TICKETMASTER_API_KEY=your_ticketmaster_api_key_here
```

4. Optional: Configure CORS for your frontend:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com
```

---

## Performance Considerations

### Database Optimization

Your database includes PostGIS indexes and foreign key relationships for optimal performance:

```sql
-- Events table spatial index
CREATE INDEX idx_events_location_gix ON events USING gist (location);

-- Static locations spatial index
CREATE INDEX idx_static_locations_location_gix ON static_locations USING gist (location);

-- Events time index for fast time filtering
CREATE INDEX idx_events_start_datetime ON events (start_datetime);

-- Foreign key indexes for joins
CREATE INDEX idx_events_created_by ON events (created_by);
CREATE INDEX idx_events_category_id ON events (category_id);
CREATE INDEX idx_static_locations_category_id ON static_locations (category_id);
CREATE INDEX idx_event_attendees_event_id ON event_attendees (event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees (user_id);
```

### API Performance

- **No Database Limits**: Fetches ALL 8,000+ locations from database (no PostgreSQL 1000 limit)
- **Two-Stage Loading**: Fast 100-mile results (~1,700 locations) + complete worldwide dataset
- **Backend Filtering**: Geographic filtering happens on Node.js server for flexibility
- **Parallel Queries**: Events and locations are fetched simultaneously
- **Efficient Joins**: User, category, and attendee data fetched in single queries
- **Optimized Attendee Loading**: Limited to 10 attendee profiles for performance
- **Efficient Parsing**: PostGIS binary geometry parsing optimized for all coordinate formats
- **Memory Management**: Large datasets processed efficiently in memory
- **Full Dataset Access**: Returns 96.6% of all database records (7,967/8,002 locations)

### Performance Benchmarks

| Endpoint                | Radius    | Locations Returned | Response Time | Use Case          |
| ----------------------- | --------- | ------------------ | ------------- | ----------------- |
| `/events/nearby`        | 100 miles | ~1,700             | ~200ms        | Fast initial load |
| `/events/user-location` | 50km      | ~200               | ~150ms        | Local area search |
| `/events/user-location` | 5000km    | ~8,000             | ~800ms        | Worldwide dataset |

**Recommendation**: Use `/events/nearby` for immediate map loading, then `/events/user-location` with large radius for complete data.

### Scaling Recommendations

For production deployments:

1. **Database**: Use PostGIS RPC functions for geographic filtering
2. **Caching**: Add Redis for frequently accessed location data
3. **CDN**: Serve image URLs through a CDN
4. **Rate Limiting**: Implement request rate limiting
5. **Monitoring**: Add performance monitoring and logging

---

## Migration from Frontend

If you're migrating from direct Supabase calls in your frontend:

### Before (Frontend Direct Access)

```javascript
// Complex frontend code with lots of PostGIS logic
const { data: events } = await supabase
  .from("events")
  .select(
    `
    *,
    created_by:users!events_created_by_fkey(*),
    categories:event_categories!inner(
      category:categories!inner(*)
    )
  `
  )
  .filter(
    "location",
    "filter",
    `ST_DWithin(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radius})`
  )
  .filter("start_datetime", "gte", startTime)
  .filter("start_datetime", "lte", endTime);

// Manual coordinate parsing...
// Manual distance calculations...
// Manual error handling...
```

### After (API Integration)

```javascript
// Simple API call with enhanced data
const response = await fetch("/api/events/user-location", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ latitude, longitude, radius, timeRange }),
});

const { events, locations, isAuthenticated, user } = await response.json();

// Data is already processed with:
// - User profiles (created_by, attendees)
// - Category information (categories, category)
// - Join status for authenticated users
// - All geographic and time filtering applied
```

### Benefits of Migration

- ✅ **Simplified Frontend**: Remove complex database logic from client
- ✅ **Better Security**: Database credentials stay on server
- ✅ **Improved Performance**: Optimized queries and caching
- ✅ **Cross-Platform**: Same API works for web, mobile, desktop
- ✅ **Better Error Handling**: Centralized error management
- ✅ **Easier Testing**: Test API independently of frontend
- ✅ **Future-Proof**: Easy to add features without frontend changes

---

## Support & Troubleshooting

### Common Issues

#### No Data Returned

```bash
# Check if database has data
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('events').select('count').then(r => console.log('Events:', r.count));
supabase.from('static_locations').select('count').then(r => console.log('Locations:', r.count));
"
```

#### PostGIS Errors

- Ensure PostGIS extension is enabled in Supabase
- Check that location columns use `geography` type
- Verify SRID is 4326

#### Authentication Issues

- Remember: authentication is **always optional**
- Invalid tokens simply result in `isAuthenticated: false`
- Check JWT token format and expiration

#### Performance Issues

- Consider reducing radius for large datasets
- Use appropriate time ranges to limit event results
- Monitor database query performance in Supabase dashboard

### Debug Mode

Enable debug logging by adding console logs in development:

```javascript
// In MapController.ts
console.log("Request params:", { latitude, longitude, radius, timeRange });
console.log("Database results:", {
  eventsCount: events.length,
  locationsCount: locations.length,
});
```

---

This API provides a robust, scalable solution for accessing your map data with optional authentication and comprehensive geographic features. The system is designed to handle both simple public access and complex authenticated user scenarios while maintaining excellent performance and reliability.
