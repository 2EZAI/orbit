# User Location API

## Overview

The User Location API (`/events/user-location`) is a specialized endpoint designed to fetch events and static locations within a configurable radius around a user's specific location. This API is optimized for local discovery and provides a focused view of nearby activities and places.

**Note**: This API returns raw event and location data. Clustering and map visualization logic is handled on the frontend side for better performance and flexibility.

## ⚠️ Important Update: Location Data Format Change

**As of the latest update, static locations now return GeoJSON format instead of simple latitude/longitude objects.**

### Before (Old Format):

```json
{
  "location": {
    "longitude": -122.4862,
    "latitude": 37.7694
  }
}
```

### After (New Format):

```json
{
  "location": {
    "type": "Point",
    "coordinates": [-122.4862, 37.7694] // [longitude, latitude]
  }
}
```

**Frontend developers need to update their code to handle the new GeoJSON format for location coordinates.**

## Quick Start

### Endpoint

```
POST /events/user-location
```

### Basic Usage

```bash
# Get ALL events and locations (no pagination)
curl -X POST http://localhost:3000/events/user-location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194
  }'

# Get paginated results (first 25 events)
curl -X POST "http://localhost:3000/events/user-location?page=1&limit=25" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194
  }'
```

### Response

```json
{
  "events": [...],
  "locations": [...],
  "pagination": {...},
  "summary": {
    "events_count": 25,
    "locations_count": 15,
    "radius_miles": 50,
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "debug_info": {
      "search_center": "POINT(-122.4194 37.7749)",
      "radius_meters": 80467,
      "locations_with_coordinates": 15,
      "locations_without_coordinates": 0
    }
  }
}
```

## Purpose & Use Cases

### Primary Use Cases

- **Local Event Discovery**: Find events happening near the user's current location
- **Nearby Places**: Discover static locations (restaurants, venues, attractions) in the user's area
- **Focused Search**: Get relevant results without overwhelming global data
- **Mobile Applications**: Optimized for location-based mobile experiences
- **Performance**: Faster response times compared to global searches

### Target Scenarios

- User opens the app and wants to see what's happening nearby
- Location-based recommendations for events and places
- Quick discovery of local activities within a reasonable travel distance
- Reduced data usage for mobile users

## API Reference

### Request Format

#### Headers

```
Content-Type: application/json
```

#### Request Body

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "category": "music"
}
```

#### Query Parameters

- `page` (optional): Page number for pagination (default: 1) - **Only used when pagination is explicitly requested**
- `limit` (optional): Number of results per page (default: 50, max: 100) - **Only used when pagination is explicitly requested**

**Important**: If no pagination parameters are provided, the API returns ALL events and locations within the radius. Pagination is only applied when `page` or `limit` query parameters are explicitly specified.

### Parameters

| Parameter   | Type   | Required | Description                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------- |
| `latitude`  | number | ✅       | User's latitude coordinate                                  |
| `longitude` | number | ✅       | User's longitude coordinate                                 |
| `category`  | string | ❌       | Filter events by category (e.g., "music", "sports")         |
| `page`      | number | ❌       | Page number for pagination (only when pagination requested) |
| `limit`     | number | ❌       | Results per page (1-100, only when pagination requested)    |

### Response Format

#### Success Response (200)

```json
{
  "events": [
    {
      "id": "event-uuid",
      "name": "Concert in the Park",
      "description": "Live music performance",
      "start_datetime": "2024-01-15T19:00:00Z",
      "end_datetime": "2024-01-15T22:00:00Z",
      "address": "123 Main St, San Francisco, CA 94102",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94102",
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "image_urls": ["https://example.com/image1.jpg"],
      "is_ticketmaster": false,
      "external_url": "https://example.com/event",
      "created_by": {
        "id": "user-uuid",
        "name": "John Doe",
        "username": "johndoe",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "attendees": {
        "count": 25,
        "profiles": [
          {
            "id": "user-uuid",
            "avatar_url": "https://example.com/avatar.jpg",
            "name": "Jane Smith",
            "first_name": "Jane",
            "last_name": "Smith"
          }
        ]
      },
      "categories": [
        {
          "id": "music",
          "name": "Music",
          "icon": "🎵"
        }
      ],
      "static_location": {
        "id": "location-uuid",
        "name": "Golden Gate Park",
        "address": "Golden Gate Park, San Francisco, CA",
        "description": "Famous urban park",
        "type": "park",
        "category_id": "park-category",
        "external_url": "https://example.com/park",
        "image_urls": ["https://example.com/park.jpg"],
        "location": {
          "type": "Point",
          "coordinates": [-122.4862, 37.7694]
        },
        "category": {
          "id": "park-category",
          "name": "Parks",
          "icon": "🌳",
          "prompts": []
        }
      }
    }
  ],
  "locations": [
    {
      "id": "location-uuid",
      "name": "Golden Gate Park",
      "image_urls": ["https://example.com/park.jpg"],
      "operation_hours": {
        "monday": "6:00 AM - 10:00 PM",
        "tuesday": "6:00 AM - 10:00 PM"
      },
      "address": "Golden Gate Park, San Francisco, CA",
      "type": "park",
      "location": {
        "type": "Point",
        "coordinates": [-122.4862, 37.7694]
      },
      "description": "Famous urban park in San Francisco",
      "external_url": "https://example.com/park",
      "category_id": "park-category",
      "distance_meters": 2500.5,
      "place_id": "ChIJKxjxuxl-j4ARbq2JQhQJqkE",
      "rating": 4.5,
      "rating_count": 1250,
      "price_level": 1,
      "phone": "+1-415-831-2700",
      "category": {
        "id": "park-category",
        "name": "Parks",
        "icon": "🌳",
        "prompts": [
          {
            "id": "prompt-uuid",
            "name": "What's your favorite spot in the park?",
            "created_at": "2024-01-01T00:00:00Z"
          }
        ]
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 132,
    "total_count": 132,
    "total_pages": 1,
    "has_next_page": false,
    "has_prev_page": false,
    "next_page": null,
    "prev_page": null
  },
  "summary": {
    "events_count": 50,
    "locations_count": 25,
    "radius_miles": 50,
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "debug_info": {
      "search_center": "POINT(-122.4194 37.7749)",
      "radius_meters": 80467,
      "locations_with_coordinates": 25,
      "locations_without_coordinates": 0,
      "pagination_applied": false,
      "total_events_found": 132
    }
  }
}
```

#### Error Responses

##### 400 Bad Request

```json
{
  "error": "Latitude and longitude are required"
}
```

##### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Failed to fetch events and locations for user location"
}
```

## Debug Endpoint

### GET /events/user-location/debug

A new debug endpoint is available to help troubleshoot location queries and verify database functionality.

#### Usage

```bash
curl "https://your-app.herokuapp.com/api/events/user-location/debug?latitude=40.7128&longitude=-74.006&radius=50"
```

#### Response

```json
{
  "function_check": {
    "exists": true,
    "data": []
  },
  "debug_result": {
    "locations": [...],
    "total_count": 15,
    "all_locations_sample": [...]
  },
  "test_parameters": {
    "latitude": 40.7128,
    "longitude": -74.006,
    "radius_miles": 50,
    "radius_meters": 80467,
    "center_point": "SRID=4326;POINT(-74.006 40.7128)"
  }
}
```

**Use this endpoint to:**

- Verify the database function exists and is working
- Test location queries with specific coordinates
- Debug missing locations issues
- Check the structure of location data

## Frontend Integration Guide

### Handling the New Location Format

#### Before (Old Code):

```typescript
// Old way of accessing coordinates
const lat = location.location.latitude;
const lng = location.location.longitude;
```

#### After (New Code):

```typescript
// New way of accessing coordinates from GeoJSON
const [lng, lat] = location.location.coordinates; // Note: GeoJSON is [lng, lat] order
```

#### Complete Example:

```typescript
interface LocationData {
  id: string;
  name: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
  distance_meters?: number | null;
  // ... other fields
}

// Usage in your component
const renderLocation = (location: LocationData) => {
  if (!location.location) {
    return <div>No coordinates available</div>;
  }

  const [longitude, latitude] = location.location.coordinates;

  return (
    <div>
      <h3>{location.name}</h3>
      <p>
        Lat: {latitude}, Lng: {longitude}
      </p>
      {location.distance_meters && (
        <p>Distance: {(location.distance_meters / 1609.34).toFixed(1)} miles</p>
      )}
    </div>
  );
};
```

### Map Integration

#### Leaflet Example:

```typescript
import L from "leaflet";

const addLocationToMap = (location: LocationData, map: L.Map) => {
  if (!location.location) return;

  const [lng, lat] = location.location.coordinates;

  const marker = L.marker([lat, lng]).bindPopup(location.name).addTo(map);
};
```

#### Google Maps Example:

```typescript
const addLocationToMap = (location: LocationData, map: google.maps.Map) => {
  if (!location.location) return;

  const [lng, lat] = location.location.coordinates;

  const marker = new google.maps.Marker({
    position: { lat, lng },
    map: map,
    title: location.name,
  });
};
```

### Additional Location Fields

The updated API now includes additional fields for locations:

```typescript
interface LocationData {
  // ... existing fields
  distance_meters?: number | null; // Distance from search center
  place_id?: string | null; // Google Places ID
  rating?: number | null; // Rating (0-5)
  rating_count?: number | null; // Number of ratings
  price_level?: number | null; // Price level (0-4)
  phone?: string | null; // Phone number
}
```

## Implementation Details

### Business Logic Flow

1. **Input Validation**

   - Validate required latitude and longitude parameters
   - Ensure coordinates are valid numbers
   - Parse optional pagination parameters

2. **Configuration**

   - Load radius from environment variable `USER_LOCATION_RADIUS_MILES` (default: 50 miles)
   - Convert radius to meters for database queries
   - Set up pagination limits

3. **Parallel Data Fetching**
   The API fetches data from three sources simultaneously for optimal performance:

   - **Database Events**: Query Supabase events table with complex joins
   - **Ticketmaster Events**: Fetch events from Ticketmaster Discovery API
   - **Static Locations**: Query static_locations table using PostGIS RPC functions

4. **Data Processing**

   - Combine events from both sources
   - Filter out past events
   - Apply category filtering if specified
   - Remove duplicate events based on name and location
   - Sort events by start date
   - Convert PostGIS geometry to GeoJSON format for locations

5. **Pagination**

   - Check if pagination parameters are provided
   - If no pagination requested: return all events and locations within radius
   - If pagination requested: apply pagination and return specified page
   - Calculate pagination metadata for both scenarios
   - **Important**: Locations are never paginated - all locations within radius are always returned

6. **Response Assembly**

   - Format events and locations according to API specification
   - Include pagination information
   - Add summary statistics with debug information
   - Maintain backward compatibility with existing response format

### Frontend Integration Notes

- **Clustering**: Event and location clustering is handled on the frontend for better performance
- **Map Visualization**: Map markers and clustering logic should be implemented in the frontend
- **Real-time Updates**: Frontend should implement caching and refresh strategies
- **Error Handling**: Frontend should handle partial data scenarios gracefully
- **GeoJSON Format**: Locations now use standard GeoJSON Point format for better compatibility

### Services Used

#### EventService

- `fetchDatabaseEvents()`: Fetches events from Supabase database
- `fetchTicketmasterEvents()`: Fetches events from Ticketmaster API
- `filterEventsByCategory()`: Filters events by category
- `filterUpcomingEvents()`: Filters out past events
- `removeDuplicateEvents()`: Removes duplicate events
- `sortEventsByDate()`: Sorts events by start date

#### LocationService

- `fetchStaticLocations()`: Fetches static locations from database using PostGIS
- `processLocationData()`: Transforms location data to GeoJSON format
- `filterLocationsByType()`: Filters locations by type
- `filterLocationsByCategory()`: Filters locations by category

### Database Functions Used

- `get_event_location(event_id)`: Get coordinates for an event
- `get_static_locations_within_radius(center, radius_meters)`: Get locations within radius using PostGIS

## Configuration

### Environment Variables

```env
# Radius for user location searches (miles)
USER_LOCATION_RADIUS_MILES=50

# Ticketmaster API configuration
TICKETMASTER_API_KEY=your_api_key_here
TICKETMASTER_RADIUS_MILES=50
TICKETMASTER_MAX_PAGES=3

# Pagination limits
MAX_EVENTS_PER_PAGE=100
DEFAULT_EVENTS_PER_PAGE=50
```

### Default Values

- **Radius**: 50 miles (configurable via environment variable)
- **Page Size**: 50 events per page (max 100) - only when pagination is requested
- **Default Behavior**: Returns ALL events and locations when no pagination parameters provided
- **Location Behavior**: All locations within radius are always returned (never paginated)
- **Ticketmaster Radius**: 500 miles (API maximum)
- **Ticketmaster Pages**: 3 pages (600 events max) - configurable via `TICKETMASTER_MAX_PAGES`

## Examples

### Get All Events and Locations (Default Behavior - No Pagination)

#### JavaScript/TypeScript

```typescript
// Returns ALL events and locations (no pagination)
const response = await fetch("/events/user-location", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    latitude: 37.7749,
    longitude: -122.4194,
    category: "music",
  }),
});

const data = await response.json();
console.log(
  `Found ${data.events.length} events and ${data.locations.length} locations`
);
console.log(
  `Pagination applied: ${data.summary.debug_info.pagination_applied}`
);
console.log(
  `Total events found: ${data.summary.debug_info.total_events_found}`
);

// Handle new location format
data.locations.forEach((location) => {
  if (location.location) {
    const [longitude, latitude] = location.location.coordinates;
    console.log(`${location.name}: ${latitude}, ${longitude}`);
  }
});
```

#### Python

```python
import requests

# Returns ALL events and locations (no pagination)
response = requests.post('http://localhost:3000/events/user-location', json={
    'latitude': 37.7749,
    'longitude': -122.4194,
    'category': 'music'
})

data = response.json()
print(f"Found {len(data['events'])} events and {len(data['locations'])} locations")
print(f"Pagination applied: {data['summary']['debug_info']['pagination_applied']}")
print(f"Total events found: {data['summary']['debug_info']['total_events_found']}")

# Handle new location format
for location in data['locations']:
    if location['location']:
        longitude, latitude = location['location']['coordinates']
        print(f"{location['name']}: {latitude}, {longitude}")
```

#### React/Next.js

```typescript
const fetchAllNearbyEvents = async (lat: number, lng: number) => {
  try {
    const response = await fetch("/api/events/user-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        category: "music",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const data = await response.json();

    // Process locations with new format
    const processedLocations = data.locations.map((location) => ({
      ...location,
      coordinates: location.location?.coordinates || null,
      latitude: location.location?.coordinates?.[1] || null,
      longitude: location.location?.coordinates?.[0] || null,
    }));

    return {
      ...data,
      locations: processedLocations,
    };
  } catch (error) {
    console.error("Error fetching nearby events:", error);
    throw error;
  }
};
```

### Get Paginated Events (Optional - Only When Explicitly Requested)

#### JavaScript/TypeScript

```typescript
// Returns paginated results (first 25 events)
const response = await fetch("/events/user-location?page=1&limit=25", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    latitude: 37.7749,
    longitude: -122.4194,
    category: "music",
  }),
});

const data = await response.json();
console.log(
  `Page ${data.pagination.current_page} of ${data.pagination.total_pages}`
);
console.log(
  `Showing ${data.events.length} of ${data.pagination.total_count} events`
);
console.log(
  `Pagination applied: ${data.summary.debug_info.pagination_applied}`
);
// Note: data.locations still contains ALL locations within radius
console.log(`All locations returned: ${data.locations.length}`);
```

#### Python

```python
import requests

# Returns paginated results (first 25 events)
response = requests.post('http://localhost:3000/events/user-location?page=1&limit=25', json={
    'latitude': 37.7749,
    'longitude': -122.4194,
    'category': 'music'
})

data = response.json()
print(f"Page {data['pagination']['current_page']} of {data['pagination']['total_pages']}")
print(f"Showing {len(data['events'])} of {data['pagination']['total_count']} events")
print(f"Pagination applied: {data['summary']['debug_info']['pagination_applied']}")
# Note: data['locations'] still contains ALL locations within radius
print(f"All locations returned: {len(data['locations'])}")
```

#### React/Next.js with Pagination

```typescript
const fetchPaginatedEvents = async (
  lat: number,
  lng: number,
  page: number = 1,
  limit: number = 25
) => {
  try {
    const response = await fetch(
      `/api/events/user-location?page=${page}&limit=${limit}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          category: "music",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const data = await response.json();
    return {
      events: data.events,
      locations: data.locations, // Always contains ALL locations
      pagination: data.pagination,
      hasMore: data.pagination.has_next_page,
      paginationApplied: data.summary.debug_info.pagination_applied,
    };
  } catch (error) {
    console.error("Error fetching paginated events:", error);
    throw error;
  }
};
```

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing**: Fetch data from multiple sources simultaneously
2. **Database Indexing**: Leverage existing spatial indexes on location columns
3. **RPC Functions**: Use optimized database functions for spatial queries
4. **Pagination**: Limit result sets to prevent memory issues
5. **Error Isolation**: Continue processing if one data source fails
6. **PostGIS Optimization**: Use spatial functions for efficient location queries

### Expected Performance

- **Response Time**: < 2 seconds for typical queries
- **Throughput**: 100+ concurrent requests
- **Cache Hit Rate**: 0% (Redis not implemented yet)
- **Error Rate**: < 1% for successful requests

### Caching Strategy (Future)

- **TODO**: Implement Redis caching for Ticketmaster API responses
- Cache key format: `ticketmaster:${lat}:${lng}:${radius}:${page}`
- TTL: 15-30 minutes (configurable)
- Cache invalidation on errors

## Error Handling

### Graceful Degradation

- If Ticketmaster API is unavailable, return database events only
- If database query fails, return Ticketmaster events only
- Log errors but don't break the entire request
- Return partial results with appropriate error messages

### Error Types

1. **Validation Errors**: Invalid coordinates or parameters
2. **API Errors**: Ticketmaster API failures
3. **Database Errors**: Supabase query failures
4. **Processing Errors**: Data transformation issues

### Debug Information

The API includes comprehensive logging for debugging:

- Request parameters and validation
- Data source performance metrics
- Error details and stack traces
- Processing pipeline statistics
- Debug endpoint for troubleshooting

## Migration Notes

### From /all Endpoint

- This API provides a more focused alternative to the global `/all` endpoint
- Same response format for backward compatibility
- Better performance for location-based queries
- Configurable radius instead of global search

### Breaking Changes

- **Location Format**: Static locations now use GeoJSON format instead of simple lat/lng objects
- **New Fields**: Added distance_meters, place_id, rating, rating_count, price_level, phone fields
- **Debug Info**: Added debug_info to summary for troubleshooting

### Migration Checklist for Frontend

- [ ] Update location coordinate access from `location.latitude/longitude` to `location.coordinates[1]/[0]`
- [ ] Handle null location values (locations without coordinates)
- [ ] Update map integration to use GeoJSON format
- [ ] Add handling for new location fields (distance, rating, etc.)
- [ ] Test with debug endpoint to verify functionality

## Troubleshooting

### Common Issues

1. **No Results**: Check if coordinates are valid and within expected range
2. **Slow Response**: Verify database indexes and network connectivity
3. **Missing Events**: Check Ticketmaster API key and rate limits
4. **Pagination Issues**: Ensure page and limit parameters are valid
5. **Missing Locations**: Use debug endpoint to verify database function and data

### Debug Steps

1. **Use Debug Endpoint**: Test with `/events/user-location/debug` to verify functionality
2. Check server logs for detailed error messages
3. Verify environment variables are set correctly
4. Test database connectivity
5. Validate Ticketmaster API key and quota
6. Check coordinate format and range
7. Verify PostGIS function exists in database

### Debug Endpoint Usage

```bash
# Test with specific coordinates
curl "https://your-app.herokuapp.com/api/events/user-location/debug?latitude=40.7128&longitude=-74.006&radius=50"

# Check function existence
curl "https://your-app.herokuapp.com/api/events/user-location/debug?latitude=0&longitude=0&radius=1"
```

## Future Enhancements

### Planned Features

1. **Redis Caching**: Implement caching for improved performance
2. **Advanced Filtering**: Add date range, price, and popularity filters
3. **Real-time Updates**: WebSocket support for live event updates
4. **Personalization**: User preference-based filtering
5. **Analytics**: Track popular locations and event types

### Performance Improvements

1. **Database Optimization**: Additional indexes for common queries
2. **CDN Integration**: Cache static location images
3. **Background Processing**: Pre-compute popular queries
4. **Load Balancing**: Distribute requests across multiple instances

## Related Documentation

- [API Overview](../api-overview.md) - General API documentation
- [Database Schema](../../tables.sql) - Complete database structure
- [EventService](../../../src/services/EventService.ts) - Event service implementation
- [LocationService](../../../src/services/LocationService.ts) - Location service implementation
- [Debug Utilities](../../../src/utils/debugDatabase.ts) - Debug and troubleshooting utilities
