# Location Bookmarks API Documentation

## Overview

The Location Bookmarks API enables users to save and organize locations (static locations, events, and posts) into customizable folders. Similar to Instagram's bookmark system, users can create folders, add bookmarks, share folders with friends, and collaborate on collections. This API supports collaborative bookmarking where folder owners can invite others to contribute.

## Base URL

```
/api/bookmarks
```

## Authentication

**All endpoints require authentication.** Include the user's JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Use Cases

### Primary Use Cases

1. **Personal Organization**: Users can create folders like "Food places", "Weekend spots", "Must visit" to organize saved locations
2. **Collaborative Planning**: Share folders with friends to plan trips, events, or discover new places together
3. **Location Discovery**: Bookmark interesting locations, events, or posts for later reference
4. **Social Sharing**: Share curated location collections with the community (public folders)

### Folder Ownership Model

- **Folder Creator**: Permanent owner who cannot be removed
- **Editors**: Users added by the owner who can add/remove bookmarks but cannot modify folder settings
- **Public Folders**: Folders can be made public for community discovery

## Data Models

### BookmarkFolder

```typescript
interface BookmarkFolder {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  member_count?: number;
  bookmark_count?: number;
}
```

### BookmarkFolderMember

```typescript
interface BookmarkFolderMember {
  id: string;
  folder_id: string;
  user_id: string;
  role: "owner" | "editor";
  added_by: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}
```

### LocationBookmark

```typescript
interface LocationBookmark {
  id: string;
  folder_id: string;
  location_type: "static_location" | "event" | "post";
  static_location_id?: string;
  event_id?: string;
  post_id?: string;
  added_by: string;
  notes?: string;
  created_at: string;
  static_location?: {
    id: string;
    name: string;
    address?: string;
    location?: {
      type: "Point";
      coordinates: [number, number];
    };
    image_urls?: string[];
    category_id?: string;
  };
  event?: {
    id: string;
    name: string;
    description?: string;
    start_datetime: string;
    venue_name?: string;
    address?: string;
    image_urls?: string[];
    category_id?: string;
  };
  post?: {
    id: string;
    content: string;
    media_urls?: string[];
    user_id: string;
    created_at: string;
  };
  added_by_user?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}
```

## API Endpoints

### Folder Management

#### 1. Create Bookmark Folder

**POST** `/bookmarks/folders`

Creates a new bookmark folder. The creator automatically becomes the permanent owner.

**Request Body:**

```json
{
  "name": "Food places",
  "description": "My favorite restaurants and cafes",
  "is_public": false
}
```

**Request Parameters:**

| Parameter     | Type    | Required | Description                          |
| ------------- | ------- | -------- | ------------------------------------ |
| `name`        | string  | Yes      | Folder name                          |
| `description` | string  | No       | Folder description                   |
| `is_public`   | boolean | No       | Whether folder is publicly visible   |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Food places",
    "description": "My favorite restaurants and cafes",
    "created_by": "user-id-123",
    "is_public": false,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "creator": {
      "id": "user-id-123",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  },
  "message": "Folder created successfully"
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing required field
{
  "error": "Folder name is required"
}

// 401 Unauthorized
{
  "error": "Authorization token required"
}
```

#### 2. Get User's Folders

**GET** `/bookmarks/folders`

Retrieves all folders the user owns, is a member of, or public folders.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Food places",
      "description": "My favorite restaurants",
      "created_by": "user-id-123",
      "is_public": false,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "bookmark_count": 12,
      "member_count": 3,
      "creator": {
        "id": "user-id-123",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://example.com/avatar.jpg"
      }
    }
  ],
  "message": "Folders retrieved successfully"
}
```

#### 3. Get Folder Details

**GET** `/bookmarks/folders/:folderId`

Retrieves detailed information about a specific folder, including bookmark and member counts.

**Path Parameters:**

| Parameter  | Type   | Required | Description        |
| ---------- | ------ | -------- | ----------------- |
| `folderId` | string | Yes      | Folder ID         |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Food places",
    "description": "My favorite restaurants",
    "created_by": "user-id-123",
    "is_public": false,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "bookmark_count": 12,
    "member_count": 3,
    "creator": {
      "id": "user-id-123",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  },
  "message": "Folder retrieved successfully"
}
```

**Error Responses:**

```json
// 404 Not Found
{
  "error": "Folder not found"
}

// 404 Not Found - Access denied
{
  "error": "Access denied"
}
```

#### 4. Update Folder

**PUT** `/bookmarks/folders/:folderId`

Updates folder details. Only the folder owner can update.

**Path Parameters:**

| Parameter  | Type   | Required | Description        |
| ---------- | ------ | -------- | ----------------- |
| `folderId` | string | Yes      | Folder ID         |

**Request Body:**

```json
{
  "name": "Best Food Places",
  "description": "Updated description",
  "is_public": true
}
```

**Request Parameters:**

| Parameter     | Type    | Required | Description                          |
| ------------- | ------- | -------- | ------------------------------------ |
| `name`        | string  | No       | New folder name                      |
| `description` | string  | No       | New folder description               |
| `is_public`   | boolean | No       | Whether folder is publicly visible   |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Best Food Places",
    "description": "Updated description",
    "is_public": true,
    "updated_at": "2025-01-15T11:00:00Z"
  },
  "message": "Folder updated successfully"
}
```

**Error Responses:**

```json
// 403 Forbidden - Not folder owner
{
  "error": "Only folder owner can update folder"
}

// 404 Not Found
{
  "error": "Folder not found"
}
```

#### 5. Delete Folder

**DELETE** `/bookmarks/folders/:folderId`

Deletes a folder and all its bookmarks. Only the folder owner can delete. This action cannot be undone.

**Path Parameters:**

| Parameter  | Type   | Required | Description        |
| ---------- | ------ | -------- | ----------------- |
| `folderId` | string | Yes      | Folder ID         |

**Response:**

```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

**Error Responses:**

```json
// 403 Forbidden - Not folder owner
{
  "error": "Only folder owner can delete folder"
}

// 404 Not Found
{
  "error": "Folder not found"
}
```

### Folder Sharing

#### 6. Add Folder Member

**POST** `/bookmarks/folders/:folderId/members`

Adds a user to a folder as an editor. Only the folder owner can add members.

**Path Parameters:**

| Parameter  | Type   | Required | Description        |
| ---------- | ------ | -------- | ----------------- |
| `folderId` | string | Yes      | Folder ID         |

**Request Body:**

```json
{
  "user_id": "friend-user-id-456",
  "role": "editor"
}
```

**Request Parameters:**

| Parameter  | Type   | Required | Description                                    |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `user_id`  | string | Yes      | User ID to add to folder                       |
| `role`     | string | No       | Role (default: "editor", only "editor" allowed) |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "member-id-789",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "friend-user-id-456",
    "role": "editor",
    "added_by": "user-id-123",
    "created_at": "2025-01-15T11:30:00Z",
    "user": {
      "id": "friend-user-id-456",
      "username": "janedoe",
      "first_name": "Jane",
      "last_name": "Doe",
      "avatar_url": "https://example.com/jane-avatar.jpg"
    }
  },
  "message": "Member added successfully"
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing user_id
{
  "error": "User ID is required"
}

// 403 Forbidden - Not folder owner
{
  "error": "Only folder owner can add members"
}

// 409 Conflict - Already a member
{
  "error": "User is already a member of this folder"
}
```

#### 7. Get Folder Members

**GET** `/bookmarks/folders/:folderId/members`

Retrieves all members of a folder.

**Path Parameters:**

| Parameter  | Type   | Required | Description        |
| ---------- | ------ | -------- | ----------------- |
| `folderId` | string | Yes      | Folder ID         |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "member-id-789",
      "folder_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-id-123",
      "role": "owner",
      "added_by": "user-id-123",
      "created_at": "2025-01-15T10:30:00Z",
      "user": {
        "id": "user-id-123",
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://example.com/avatar.jpg"
      }
    },
    {
      "id": "member-id-790",
      "folder_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "friend-user-id-456",
      "role": "editor",
      "added_by": "user-id-123",
      "created_at": "2025-01-15T11:30:00Z",
      "user": {
        "id": "friend-user-id-456",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe",
        "avatar_url": "https://example.com/jane-avatar.jpg"
      }
    }
  ],
  "message": "Members retrieved successfully"
}
```

#### 8. Remove Folder Member

**DELETE** `/bookmarks/folders/:folderId/members/:userId`

Removes a user from a folder. Only the folder owner can remove members. The folder owner cannot be removed.

**Path Parameters:**

| Parameter  | Type   | Required | Description        |
| ---------- | ------ | -------- | ----------------- |
| `folderId` | string | Yes      | Folder ID         |
| `userId`   | string | Yes      | User ID to remove |

**Response:**

```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Error Responses:**

```json
// 400 Bad Request - Cannot remove owner
{
  "error": "Cannot remove folder owner"
}

// 403 Forbidden - Not folder owner
{
  "error": "Only folder owner can remove members"
}

// 404 Not Found
{
  "error": "Folder not found"
}
```

### Bookmark Management

#### 9. Create Bookmark

**POST** `/bookmarks`

Adds a bookmark to a folder. Folder owners and editors can add bookmarks.

**Request Body:**

```json
{
  "folder_id": "550e8400-e29b-41d4-a716-446655440000",
  "location_type": "static_location",
  "static_location_id": "location-id-123",
  "notes": "Great coffee, try the cappuccino"
}
```

**Request Parameters:**

| Parameter            | Type   | Required | Description                                    |
| -------------------- | ------ | -------- | ---------------------------------------------- |
| `folder_id`          | string | Yes      | Folder ID to add bookmark to                   |
| `location_type`      | string | Yes      | Type: "static_location", "event", or "post"   |
| `static_location_id`  | string | Conditional | Required if `location_type` is "static_location" |
| `event_id`           | string | Conditional | Required if `location_type` is "event"         |
| `post_id`            | string | Conditional | Required if `location_type` is "post"         |
| `notes`              | string | No       | User notes about this bookmark                  |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "bookmark-id-123",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "location_type": "static_location",
    "static_location_id": "location-id-123",
    "added_by": "user-id-123",
    "notes": "Great coffee, try the cappuccino",
    "created_at": "2025-01-15T12:00:00Z",
    "static_location": {
      "id": "location-id-123",
      "name": "Blue Bottle Coffee",
      "address": "315 Linden St, San Francisco, CA 94102",
      "location": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "image_urls": ["https://example.com/coffee.jpg"],
      "category_id": "category-id-123"
    },
    "added_by_user": {
      "id": "user-id-123",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  },
  "message": "Bookmark created successfully"
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing required fields
{
  "error": "Folder ID and location type are required"
}

// 400 Bad Request - Missing location ID
{
  "error": "static_location_id is required"
}

// 404 Not Found - Location not found
{
  "error": "Static location not found"
}

// 403 Forbidden - No edit access
{
  "error": "Access denied. Only folder owners and editors can add bookmarks."
}

// 409 Conflict - Duplicate bookmark
{
  "error": "Bookmark already exists in this folder"
}
```

#### 10. Get Bookmarks

**GET** `/bookmarks`

Retrieves bookmarks with optional filtering.

**Query Parameters:**

| Parameter            | Type   | Required | Description                                    |
| -------------------- | ------ | -------- | ---------------------------------------------- |
| `folder_id`          | string | No       | Filter by folder ID                            |
| `location_type`      | string | No       | Filter by type: "static_location", "event", "post" |
| `static_location_id` | string | No       | Filter by specific static location ID (requires `location_type=static_location`) |
| `event_id`           | string | No       | Filter by specific event ID (requires `location_type=event`) |
| `post_id`            | string | No       | Filter by specific post ID (requires `location_type=post`) |
| `limit`              | number | No       | Number of results (default: 50, max: 100)      |
| `offset`             | number | No       | Pagination offset (default: 0)                |

**Example Requests:**

```
# Get all bookmarks in a folder
GET /api/bookmarks?folder_id=550e8400-e29b-41d4-a716-446655440000&limit=20&offset=0

# Check if a specific event is bookmarked
GET /api/bookmarks?location_type=event&event_id=abc123

# Check if a specific location is bookmarked
GET /api/bookmarks?location_type=static_location&static_location_id=xyz789

# Check if a specific post is bookmarked
GET /api/bookmarks?location_type=post&post_id=post456
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "bookmark-id-123",
      "folder_id": "550e8400-e29b-41d4-a716-446655440000",
      "location_type": "static_location",
      "static_location_id": "location-id-123",
      "added_by": "user-id-123",
      "notes": "Great coffee",
      "created_at": "2025-01-15T12:00:00Z",
      "static_location": {
        "id": "location-id-123",
        "name": "Blue Bottle Coffee",
        "address": "315 Linden St, San Francisco, CA 94102"
      }
    }
  ],
  "count": 12,
  "message": "Bookmarks retrieved successfully"
}
```

#### 11. Get Bookmark Details

**GET** `/bookmarks/:bookmarkId`

Retrieves detailed information about a specific bookmark.

**Path Parameters:**

| Parameter    | Type   | Required | Description        |
| ------------ | ------ | -------- | ----------------- |
| `bookmarkId` | string | Yes      | Bookmark ID        |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "bookmark-id-123",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "location_type": "event",
    "event_id": "event-id-456",
    "added_by": "user-id-123",
    "notes": "Can't wait for this!",
    "created_at": "2025-01-15T12:00:00Z",
    "event": {
      "id": "event-id-456",
      "name": "Summer Music Festival",
      "description": "Outdoor music festival",
      "start_datetime": "2025-07-15T18:00:00Z",
      "venue_name": "Golden Gate Park",
      "address": "501 Stanyan St",
      "image_urls": ["https://example.com/festival.jpg"]
    }
  },
  "message": "Bookmark retrieved successfully"
}
```

#### 12. Update Bookmark

**PUT** `/bookmarks/:bookmarkId`

Updates bookmark notes. Only the user who added the bookmark can update it.

**Path Parameters:**

| Parameter    | Type   | Required | Description        |
| ------------ | ------ | -------- | ----------------- |
| `bookmarkId` | string | Yes      | Bookmark ID        |

**Request Body:**

```json
{
  "notes": "Updated notes about this place"
}
```

**Request Parameters:**

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `notes`   | string | No       | Updated notes            |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "bookmark-id-123",
    "notes": "Updated notes about this place",
    "updated_at": "2025-01-15T13:00:00Z"
  },
  "message": "Bookmark updated successfully"
}
```

**Error Responses:**

```json
// 403 Forbidden - Not the bookmark creator
{
  "error": "Only the user who added the bookmark can update it"
}

// 404 Not Found
{
  "error": "Bookmark not found"
}
```

#### 13. Delete Bookmark

**DELETE** `/bookmarks/:bookmarkId`

Removes a bookmark from a folder. Folder owners and editors can remove bookmarks.

**Path Parameters:**

| Parameter    | Type   | Required | Description        |
| ------------ | ------ | -------- | ----------------- |
| `bookmarkId` | string | Yes      | Bookmark ID        |

**Response:**

```json
{
  "success": true,
  "message": "Bookmark deleted successfully"
}
```

**Error Responses:**

```json
// 403 Forbidden - No edit access
{
  "error": "Access denied. Only folder owners and editors can remove bookmarks."
}

// 404 Not Found
{
  "error": "Bookmark not found"
}
```

## Error Handling

### Common Error Codes

| Status Code | Description                          |
| ----------- | ------------------------------------ |
| 400         | Bad Request - Invalid input          |
| 401         | Unauthorized - Missing/invalid token |
| 403         | Forbidden - Insufficient permissions |
| 404         | Not Found - Resource doesn't exist   |
| 409         | Conflict - Duplicate resource       |
| 500         | Server Error - Internal error        |

### Error Response Format

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

## Examples

### Example: Creating a Folder and Adding Bookmarks

```javascript
// 1. Create a folder
const folderResponse = await fetch('/api/bookmarks/folders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Weekend Spots',
    description: 'Places to visit on weekends',
    is_public: false
  })
});

const folder = await folderResponse.json();

// 2. Add a bookmark
const bookmarkResponse = await fetch('/api/bookmarks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    folder_id: folder.data.id,
    location_type: 'static_location',
    static_location_id: 'location-id-123',
    notes: 'Great brunch spot'
  })
});

const bookmark = await bookmarkResponse.json();
```

### Example: Sharing a Folder with Friends

```javascript
// Add a friend as an editor
const memberResponse = await fetch(`/api/bookmarks/folders/${folderId}/members`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 'friend-user-id-456',
    role: 'editor'
  })
});

// Get all members
const membersResponse = await fetch(`/api/bookmarks/folders/${folderId}/members`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const members = await membersResponse.json();
```

### Example: Getting All Bookmarks in a Folder

```javascript
const response = await fetch(`/api/bookmarks?folder_id=${folderId}&limit=50`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: bookmarks, count } = await response.json();
```

## Best Practices

### Folder Organization

1. **Use Descriptive Names**: Choose clear, descriptive folder names that help you find bookmarks later
2. **Leverage Descriptions**: Add descriptions to folders to provide context for collaborators
3. **Public vs Private**: Use public folders for sharing with the community, private for personal collections

### Collaboration

1. **Add Trusted Editors**: Only add users you trust as editors, as they can add/remove bookmarks
2. **Communicate Purpose**: Use folder descriptions to explain the folder's purpose to collaborators
3. **Regular Cleanup**: Periodically review and remove outdated bookmarks

### Performance

1. **Pagination**: Always use pagination when fetching bookmarks to avoid loading too much data
2. **Filter by Folder**: Use `folder_id` filter to get bookmarks for a specific folder
3. **Cache Folders**: Cache folder lists on the client side to reduce API calls

### Security

1. **Token Management**: Always include the JWT token in the Authorization header
2. **Access Control**: Respect folder access permissions - only owners can modify folder settings
3. **Validation**: Validate location IDs before creating bookmarks to avoid errors

## Database Schema

### Tables

- **location_bookmark_folders**: Stores folder information
- **location_bookmark_folder_members**: Tracks folder members and their roles
- **location_bookmarks**: Stores individual bookmarks

### Row Level Security (RLS)

All tables have RLS policies that enforce:
- Users can only see folders they own, are members of, or public folders
- Only folder owners can modify folder settings
- Only folder owners and editors can add/remove bookmarks
- Users can only update their own bookmark notes

## Integration Notes

### Frontend Integration

1. **Folder List**: Display user's folders in a sidebar or dropdown
2. **Bookmark UI**: Show bookmark icon/button on location, event, and post cards
3. **Folder Sharing**: Provide UI for adding/removing folder members
4. **Bookmark Notes**: Allow users to add/edit notes when creating or viewing bookmarks

### Real-time Updates

Consider implementing real-time updates for:
- New bookmarks added by collaborators
- Folder member changes
- Folder updates (name, description, visibility)

