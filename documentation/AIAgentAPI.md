# Orbit AI Agent API

This API allows AI agents (ChatGPT, Claude, etc.) to query and interact with Orbit's event and location data.

## Overview

The Orbit AI Agent API provides programmatic access to:
- Event search and discovery
- Location data
- Event creation (with authentication)
- User events and attendee information

## Base URL

```
https://orbit-map-backend-c2b17aebdb75.herokuapp.com/api
```

## Authentication

For authenticated endpoints, include JWT token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Available Endpoints for AI Agents

### 1. Search Events by Location

**Endpoint:** `POST /events/user-location`

**Description:** Search for events and locations near a specific location.

**Request Body:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "category": "music",  // Optional: filter by category
  "timeRange": "today"  // Optional: "today", "week", "weekend"
}
```

**Response:**
```json
{
  "events": [
    {
      "id": "event-uuid",
      "name": "Concert in the Park",
      "description": "Live music performance",
      "start_datetime": "2024-01-15T19:00:00Z",
      "location": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "city": "San Francisco",
      "state": "CA",
      "attendees": {
        "count": 25
      }
    }
  ],
  "locations": [...],
  "summary": {
    "events_count": 25,
    "locations_count": 15
  }
}
```

### 2. Search Events by Query

**Endpoint:** `POST /events/search`

**Description:** Search events by name, description, or keywords.

**Request Body:**
```json
{
  "query": "concert",
  "latitude": 37.7749,  // Optional: for location-based ranking
  "longitude": -122.4194
}
```

### 3. Get Event Details

**Endpoint:** `GET /events/{eventId}`

**Description:** Get detailed information about a specific event.

**Response:**
```json
{
  "id": "event-uuid",
  "name": "Concert in the Park",
  "description": "Full event description",
  "start_datetime": "2024-01-15T19:00:00Z",
  "end_datetime": "2024-01-15T22:00:00Z",
  "location": {...},
  "attendees": {
    "count": 25,
    "profiles": [...]
  },
  "created_by": {
    "name": "John Doe",
    "username": "johndoe"
  }
}
```

### 4. Create Event (Requires Authentication)

**Endpoint:** `POST /events/create`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My Event",
  "description": "Event description",
  "start_datetime": "2024-01-15T19:00:00Z",
  "end_datetime": "2024-01-15T22:00:00Z",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip": "94102",
  "category_id": "music-uuid",
  "is_private": false
}
```

## OpenAPI Schema for AI Agents

### Function Calling Schema (OpenAI)

```json
{
  "type": "function",
  "function": {
    "name": "search_orbit_events",
    "description": "Search for events and locations in Orbit near a specific location",
    "parameters": {
      "type": "object",
      "properties": {
        "latitude": {
          "type": "number",
          "description": "Latitude coordinate"
        },
        "longitude": {
          "type": "number",
          "description": "Longitude coordinate"
        },
        "category": {
          "type": "string",
          "description": "Event category filter (e.g., music, sports, food)",
          "enum": ["music", "sports", "food", "art", "technology"]
        },
        "query": {
          "type": "string",
          "description": "Search query for event name or description"
        }
      },
      "required": ["latitude", "longitude"]
    }
  }
}
```

### Anthropic Tools Schema (Claude)

```json
{
  "name": "search_orbit_events",
  "description": "Search for events and locations in Orbit social app",
  "input_schema": {
    "type": "object",
    "properties": {
      "latitude": {
        "type": "number",
        "description": "Latitude coordinate"
      },
      "longitude": {
        "type": "number",
        "description": "Longitude coordinate"
      },
      "category": {
        "type": "string",
        "description": "Event category"
      }
    },
    "required": ["latitude", "longitude"]
  }
}
```

## Example AI Agent Usage

### ChatGPT Plugin

1. **Configure OpenAI Function Calling:**
```javascript
const functions = [
  {
    name: "search_orbit_events",
    description: "Search for events in Orbit",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" },
        category: { type: "string" }
      },
      required: ["latitude", "longitude"]
    }
  }
];

// Use with OpenAI API
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "user",
      content: "Find music events in San Francisco"
    }
  ],
  functions: functions,
  function_call: "auto"
});
```

2. **Make API Call:**
```javascript
if (response.choices[0].message.function_call?.name === "search_orbit_events") {
  const args = JSON.parse(response.choices[0].message.function_call.arguments);
  const orbitData = await fetch(`${ORBIT_API_URL}/events/user-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
}
```

### Claude Tool Use

```javascript
const tools = [{
  name: "search_orbit_events",
  description: "Search for events in Orbit social app",
  input_schema: {
    type: "object",
    properties: {
      latitude: { type: "number" },
      longitude: { type: "number" },
      category: { type: "string" }
    },
    required: ["latitude", "longitude"]
  }
}];

const message = await anthropic.messages.create({
  model: "claude-3-opus-20240229",
  max_tokens: 1024,
  tools: tools,
  messages: [{
    role: "user",
    content: "Find events happening this weekend near me"
  }]
});
```

## Rate Limits

- **Public endpoints:** 100 requests/minute
- **Authenticated endpoints:** 500 requests/minute

## Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

## Example Use Cases

1. **"Show me concerts in San Francisco this weekend"**
   - AI calls `search_orbit_events` with SF coordinates and `category: "music"`

2. **"Find food events near my location"**
   - AI gets user location, calls API with `category: "food"`

3. **"What events are happening at Central Park?"**
   - AI calls search with Central Park coordinates

4. **"Create an event for a birthday party next Saturday"**
   - AI calls `create_event` endpoint with event details

## Integration Guide

### For Backend Developers

Add these endpoints to your backend API and document them for AI agents. Consider:

1. **Rate limiting** for public endpoints
2. **CORS headers** for web-based AI agents
3. **Authentication** for event creation
4. **Structured responses** that are easy for AI to parse

### For AI Agent Developers

1. Register Orbit API endpoints as available functions/tools
2. Map user queries to appropriate API calls
3. Parse and format responses for natural language output
4. Handle authentication for user-specific operations

