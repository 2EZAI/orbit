// Comprehensive color scheme for map markers and categories
export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  border: string;
  text: string;
  shadow: string;
}

export interface CategoryColors {
  [key: string]: ColorScheme;
}

// Event source types
export type EventSource =
  | "user-event"
  | "ticketmaster"
  | "api-event"
  | "static-location"
  | "featured-events"
  | "community-events"
  | "ticketed-events";

// Location types
export type LocationType =
  | "googleApi"
  | "static"
  | "beach"
  | "park"
  | "club"
  | "restaurant"
  | "museum"
  | "theater"
  | "sports"
  | "entertainment";

// Event categories
export type EventCategory =
  | "music"
  | "sports"
  | "arts-&-theatre"
  | "miscellaneous"
  | "comedy"
  | "family"
  | "film"
  | "food"
  | "nightlife"
  | "outdoor"
  | "business"
  | "education"
  | "health"
  | "technology";

// Base color schemes for different marker types
export const MARKER_COLORS: Record<EventSource, ColorScheme> = {
  "user-event": {
    primary: "#10B981", // Emerald green - community events
    secondary: "#059669",
    accent: "#34D399",
    background: "#ECFDF5",
    border: "#10B981",
    text: "#065F46",
    shadow: "rgba(16, 185, 129, 0.3)",
  },
  ticketmaster: {
    primary: "#F59E0B", // Amber - ticketed events
    secondary: "#D97706",
    accent: "#FBBF24",
    background: "#FFFBEB",
    border: "#F59E0B",
    text: "#92400E",
    shadow: "rgba(245, 158, 11, 0.3)",
  },
  "api-event": {
    primary: "#8B5CF6", // Purple - featured events
    secondary: "#7C3AED",
    accent: "#A78BFA",
    background: "#F3F4F6",
    border: "#8B5CF6",
    text: "#5B21B6",
    shadow: "rgba(139, 92, 246, 0.3)",
  },
  "static-location": {
    primary: "#3B82F6", // Blue - static locations
    secondary: "#2563EB",
    accent: "#60A5FA",
    background: "#EFF6FF",
    border: "#3B82F6",
    text: "#1E40AF",
    shadow: "rgba(59, 130, 246, 0.3)",
  },
  "featured-events": {
    primary: "#8B5CF6", // Purple - same as api-event
    secondary: "#7C3AED",
    accent: "#A78BFA",
    background: "#F3F4F6",
    border: "#8B5CF6",
    text: "#5B21B6",
    shadow: "rgba(139, 92, 246, 0.3)",
  },
  "community-events": {
    primary: "#10B981", // Green - same as user-event
    secondary: "#059669",
    accent: "#34D399",
    background: "#ECFDF5",
    border: "#10B981",
    text: "#065F46",
    shadow: "rgba(16, 185, 129, 0.3)",
  },
  "ticketed-events": {
    primary: "#F59E0B", // Amber - same as ticketmaster
    secondary: "#D97706",
    accent: "#FBBF24",
    background: "#FFFBEB",
    border: "#F59E0B",
    text: "#92400E",
    shadow: "rgba(245, 158, 11, 0.3)",
  },
};

// Category-specific color schemes
export const CATEGORY_COLORS: CategoryColors = {
  // Event Categories
  music: {
    primary: "#EC4899", // Pink
    secondary: "#DB2777",
    accent: "#F472B6",
    background: "#FDF2F8",
    border: "#EC4899",
    text: "#BE185D",
    shadow: "rgba(236, 72, 153, 0.3)",
  },
  sports: {
    primary: "#EF4444", // Red
    secondary: "#DC2626",
    accent: "#F87171",
    background: "#FEF2F2",
    border: "#EF4444",
    text: "#B91C1C",
    shadow: "rgba(239, 68, 68, 0.3)",
  },
  "arts-&-theatre": {
    primary: "#8B5CF6", // Purple
    secondary: "#7C3AED",
    accent: "#A78BFA",
    background: "#F3F4F6",
    border: "#8B5CF6",
    text: "#5B21B6",
    shadow: "rgba(139, 92, 246, 0.3)",
  },
  miscellaneous: {
    primary: "#6B7280", // Gray
    secondary: "#4B5563",
    accent: "#9CA3AF",
    background: "#F9FAFB",
    border: "#6B7280",
    text: "#374151",
    shadow: "rgba(107, 114, 128, 0.3)",
  },
  comedy: {
    primary: "#F97316", // Orange
    secondary: "#EA580C",
    accent: "#FB923C",
    background: "#FFF7ED",
    border: "#F97316",
    text: "#C2410C",
    shadow: "rgba(249, 115, 22, 0.3)",
  },
  family: {
    primary: "#06B6D4", // Cyan
    secondary: "#0891B2",
    accent: "#22D3EE",
    background: "#ECFEFF",
    border: "#06B6D4",
    text: "#0E7490",
    shadow: "rgba(6, 182, 212, 0.3)",
  },
  film: {
    primary: "#7C3AED", // Violet
    secondary: "#6D28D9",
    accent: "#A78BFA",
    background: "#F5F3FF",
    border: "#7C3AED",
    text: "#5B21B6",
    shadow: "rgba(124, 58, 237, 0.3)",
  },
  food: {
    primary: "#F59E0B", // Amber
    secondary: "#D97706",
    accent: "#FBBF24",
    background: "#FFFBEB",
    border: "#F59E0B",
    text: "#92400E",
    shadow: "rgba(245, 158, 11, 0.3)",
  },
  nightlife: {
    primary: "#6366F1", // Indigo
    secondary: "#4F46E5",
    accent: "#818CF8",
    background: "#EEF2FF",
    border: "#6366F1",
    text: "#3730A3",
    shadow: "rgba(99, 102, 241, 0.3)",
  },
  outdoor: {
    primary: "#10B981", // Emerald
    secondary: "#059669",
    accent: "#34D399",
    background: "#ECFDF5",
    border: "#10B981",
    text: "#065F46",
    shadow: "rgba(16, 185, 129, 0.3)",
  },
  business: {
    primary: "#3B82F6", // Blue
    secondary: "#2563EB",
    accent: "#60A5FA",
    background: "#EFF6FF",
    border: "#3B82F6",
    text: "#1E40AF",
    shadow: "rgba(59, 130, 246, 0.3)",
  },
  education: {
    primary: "#8B5CF6", // Purple
    secondary: "#7C3AED",
    accent: "#A78BFA",
    background: "#F3F4F6",
    border: "#8B5CF6",
    text: "#5B21B6",
    shadow: "rgba(139, 92, 246, 0.3)",
  },
  health: {
    primary: "#10B981", // Emerald
    secondary: "#059669",
    accent: "#34D399",
    background: "#ECFDF5",
    border: "#10B981",
    text: "#065F46",
    shadow: "rgba(16, 185, 129, 0.3)",
  },
  technology: {
    primary: "#6366F1", // Indigo
    secondary: "#4F46E5",
    accent: "#818CF8",
    background: "#EEF2FF",
    border: "#6366F1",
    text: "#3730A3",
    shadow: "rgba(99, 102, 241, 0.3)",
  },

  // Location Types
  beach: {
    primary: "#06B6D4", // Cyan - water theme
    secondary: "#0891B2",
    accent: "#22D3EE",
    background: "#ECFEFF",
    border: "#06B6D4",
    text: "#0E7490",
    shadow: "rgba(6, 182, 212, 0.3)",
  },
  park: {
    primary: "#10B981", // Emerald - nature theme
    secondary: "#059669",
    accent: "#34D399",
    background: "#ECFDF5",
    border: "#10B981",
    text: "#065F46",
    shadow: "rgba(16, 185, 129, 0.3)",
  },
  club: {
    primary: "#6366F1", // Indigo - nightlife theme
    secondary: "#4F46E5",
    accent: "#818CF8",
    background: "#EEF2FF",
    border: "#6366F1",
    text: "#3730A3",
    shadow: "rgba(99, 102, 241, 0.3)",
  },
  restaurant: {
    primary: "#F59E0B", // Amber - food theme
    secondary: "#D97706",
    accent: "#FBBF24",
    background: "#FFFBEB",
    border: "#F59E0B",
    text: "#92400E",
    shadow: "rgba(245, 158, 11, 0.3)",
  },
  museum: {
    primary: "#8B5CF6", // Purple - culture theme
    secondary: "#7C3AED",
    accent: "#A78BFA",
    background: "#F3F4F6",
    border: "#8B5CF6",
    text: "#5B21B6",
    shadow: "rgba(139, 92, 246, 0.3)",
  },
  theater: {
    primary: "#EC4899", // Pink - arts theme
    secondary: "#DB2777",
    accent: "#F472B6",
    background: "#FDF2F8",
    border: "#EC4899",
    text: "#BE185D",
    shadow: "rgba(236, 72, 153, 0.3)",
  },

  static: {
    primary: "#6B7280", // Gray - default for static locations
    secondary: "#4B5563",
    accent: "#9CA3AF",
    background: "#F9FAFB",
    border: "#6B7280",
    text: "#374151",
    shadow: "rgba(107, 114, 128, 0.3)",
  },
};

// Utility functions for color management
export class MapColorManager {
  /**
   * Get color scheme for an event based on its source and category
   */
  static getEventColors(event: any): ColorScheme {
    // First, try to get category-specific colors
    const categoryName = this.getCategoryName(event);
    if (categoryName && CATEGORY_COLORS[categoryName.toLowerCase()]) {
      return CATEGORY_COLORS[categoryName.toLowerCase()];
    }

    // Fall back to source-based colors
    const source = this.getEventSource(event);
    return MARKER_COLORS[source] || MARKER_COLORS["api-event"];
  }

  /**
   * Get color scheme for a location based on its type and category
   */
  static getLocationColors(location: any): ColorScheme {
    // First, try to get category-specific colors
    if (location.category?.name) {
      const categoryKey = location.category.name
        .toLowerCase()
        .replace(/\s+/g, "-");
      if (CATEGORY_COLORS[categoryKey]) {
        return CATEGORY_COLORS[categoryKey];
      }
    }

    // Then try type-based colors
    if (location.type) {
      const typeKey = location.type.toLowerCase();
      if (CATEGORY_COLORS[typeKey]) {
        return CATEGORY_COLORS[typeKey];
      }
    }

    // Fall back to default location colors
    return MARKER_COLORS["static-location"];
  }

  /**
   * Get unified color scheme for any map item (event or location)
   */
  static getUnifiedColors(item: any): ColorScheme {
    if (this.isEvent(item)) {
      return this.getEventColors(item);
    } else {
      return this.getLocationColors(item);
    }
  }

  /**
   * Get marker type for events
   */
  static getEventSource(event: any): EventSource {
    if (event.created_by) {
      return "user-event";
    }
    if (event.is_ticketmaster || event.source === "ticketmaster") {
      return "ticketmaster";
    }
    if (event.source === "supabase") {
      return "api-event";
    }
    return "api-event";
  }

  /**
   * Extract category name from event or location
   */
  static getCategoryName(item: any): string {
    if (item.categories && item.categories.length > 0) {
      return item.categories[0].name;
    }
    if (item.category?.name) {
      return item.category.name;
    }
    if (item.type) {
      return item.type;
    }
    return "";
  }

  /**
   * Check if item is an event
   */
  static isEvent(item: any): boolean {
    return item.start_datetime !== undefined || item.end_datetime !== undefined;
  }

  /**
   * Get priority color for mixed clusters
   */
  static getClusterPriorityColor(items: any[]): ColorScheme {
    if (!items || items.length === 0) {
      return MARKER_COLORS["api-event"];
    }

    // Priority order: user events > ticketed events > featured events > locations
    const priorities = [
      "user-event",
      "ticketmaster",
      "api-event",
      "static-location",
    ];

    for (const priority of priorities) {
      const hasPriorityItem = items.some((item) => {
        if (this.isEvent(item)) {
          return this.getEventSource(item) === priority;
        } else {
          return priority === "static-location";
        }
      });

      if (hasPriorityItem) {
        return MARKER_COLORS[priority as EventSource];
      }
    }

    return MARKER_COLORS["api-event"];
  }

  /**
   * Get gradient colors for clusters
   */
  static getClusterGradientColors(items: any[]): {
    start: string;
    end: string;
  } {
    const colors = items.map((item) => this.getUnifiedColors(item).primary);

    if (colors.length === 0) {
      return { start: "#8B5CF6", end: "#7C3AED" };
    }

    if (colors.length === 1) {
      return { start: colors[0], end: colors[0] };
    }

    return { start: colors[0], end: colors[colors.length - 1] };
  }

  /**
   * Get accessibility-friendly text color
   */
  static getAccessibleTextColor(backgroundColor: string): string {
    // Simple contrast calculation - you might want to use a more sophisticated algorithm
    const hex = backgroundColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 128 ? "#000000" : "#FFFFFF";
  }

  /**
   * Get hover/pressed state color
   */
  static getHoverColor(baseColor: string): string {
    // Darken the base color by 20%
    const hex = baseColor.replace("#", "");
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 51);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 51);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 51);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}

// Export default instance for easy use
export default MapColorManager;
