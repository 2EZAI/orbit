/**
 * Web API Section Mapper
 * Maps web API sections directly to mobile UI components
 * This replaces the hardcoded section creation with dynamic web API-based sections
 */

import { FeedSection } from "~/src/services/feedService";
import { transformEvent, transformLocation } from "~/src/lib/utils/transformers";

export interface MobileSection {
  key: string;
  title: string;
  subtitle?: string;
  data: any[];
  layout: "horizontal" | "grid" | "list";
  hasMoreData?: boolean;
  sectionType?: string;
  algorithm?: string;
  metadata?: any;
}

export interface MobileFeedData {
  sections: MobileSection[];
  featuredEvents: any[];
  flatListData: any[];
  allContent: any[];
  dynamicCategories: any[];
}

/**
 * Maps web API sections to mobile UI sections
 */
export function mapFeedCategoriesFromAPI(
  webApiSections: FeedSection[],
  topics: any[] = []
): MobileFeedData {
  console.log("🌐 [WebApiMapper] Mapping web API sections to mobile UI");
  console.log("🌐 [WebApiMapper] Web API sections count:", webApiSections.length);

  const mobileSections: MobileSection[] = [];
  const allContent: any[] = [];
  const featuredEvents: any[] = [];

  // Process each web API section
  webApiSections.forEach((webSection, index) => {
    console.log(`🌐 [WebApiMapper] Processing section ${index + 1}: ${webSection.title}`);
    console.log(`🌐 [WebApiMapper] Section items count: ${webSection.items.length}`);
    console.log(`🌐 [WebApiMapper] Section type: ${webSection.sectionType}`);
    console.log(`🌐 [WebApiMapper] Section algorithm: ${webSection.algorithm}`);

    // Transform items based on their type
    const transformedItems = webSection.items.map((item) => {
      // Check if it's an event (has start_datetime)
      if (item.start_datetime) {
        const transformedEvent = transformEvent(item);
        allContent.push(transformedEvent);
        return transformedEvent;
      }
      // Check if it's a location (has location but no start_datetime)
      else if (item.location && !item.start_datetime) {
        const transformedLocation = transformLocation(item);
        allContent.push(transformedLocation);
        return transformedLocation;
      }
      // Check if it's a social post (has content)
      else if (item.content) {
        allContent.push(item);
        return item;
      }
      // Default: treat as event
      else {
        const transformedEvent = transformEvent(item);
        allContent.push(transformedEvent);
        return transformedEvent;
      }
    });

    // Determine layout based on section type and algorithm
    const layout = determineLayout(webSection);

    // Create mobile section
    const mobileSection: MobileSection = {
      key: webSection.id || `section-${index}`,
      title: webSection.title,
      subtitle: webSection.subtitle,
      data: transformedItems,
      layout: layout,
      hasMoreData: transformedItems.length >= 10, // Assume more data if we have 10+ items
      sectionType: webSection.sectionType,
      algorithm: webSection.algorithm,
      metadata: webSection.metadata,
    };

    mobileSections.push(mobileSection);

    // Add to featured events if it's a featured section
    if (webSection.sectionType === "featured" || webSection.title.toLowerCase().includes("featured")) {
      featuredEvents.push(...transformedItems.filter(item => !item.isLocation).slice(0, 5));
    }
  });

  // Create flat list data for the main feed
  const flatListData = createFlatListData(mobileSections, featuredEvents);

  // Create dynamic categories from topics
  const dynamicCategories = topics.map(topic => ({
    id: topic.id,
    name: topic.name,
    icon: topic.icon || "🎯",
    count: allContent.filter(item => 
      item.category === topic.name || 
      item.type === topic.name
    ).length
  }));

  console.log("🌐 [WebApiMapper] Mapping complete:");
  console.log(`🌐 [WebApiMapper] - Mobile sections: ${mobileSections.length}`);
  console.log(`🌐 [WebApiMapper] - Featured events: ${featuredEvents.length}`);
  console.log(`🌐 [WebApiMapper] - Total content: ${allContent.length}`);
  console.log(`🌐 [WebApiMapper] - Dynamic categories: ${dynamicCategories.length}`);

  return {
    sections: mobileSections,
    featuredEvents,
    flatListData,
    allContent,
    dynamicCategories,
  };
}

/**
 * Determines the appropriate layout for a section based on web API data
 */
function determineLayout(webSection: FeedSection): "horizontal" | "grid" | "list" {
  // Check section type
  if (webSection.sectionType === "featured") {
    return "horizontal";
  }
  
  if (webSection.sectionType === "locations" || webSection.sectionType === "places") {
    return "grid";
  }
  
  if (webSection.sectionType === "events" || webSection.sectionType === "upcoming") {
    return "horizontal";
  }
  
  // Check algorithm
  if (webSection.algorithm === "popularity" || webSection.algorithm === "trending") {
    return "horizontal";
  }
  
  if (webSection.algorithm === "location_based" || webSection.algorithm === "nearby") {
    return "grid";
  }
  
  // Check title keywords
  const title = webSection.title.toLowerCase();
  if (title.includes("places") || title.includes("locations") || title.includes("nearby")) {
    return "grid";
  }
  
  if (title.includes("featured") || title.includes("trending") || title.includes("popular")) {
    return "horizontal";
  }
  
  if (title.includes("events") || title.includes("upcoming") || title.includes("this week")) {
    return "horizontal";
  }
  
  // Default to horizontal for most content
  return "horizontal";
}

/**
 * Creates flat list data structure for the main feed
 */
function createFlatListData(mobileSections: MobileSection[], featuredEvents: any[]): any[] {
  const flatListData: any[] = [];
  
  // Add featured events first if we have any
  if (featuredEvents.length > 0) {
    flatListData.push({
      type: "stories",
      data: featuredEvents.slice(0, 5)
    });
  }
  
  // Add all sections
  mobileSections.forEach(section => {
    if (section.data.length > 0) {
      flatListData.push({
        type: "section",
        data: section
      });
    }
  });
  
  return flatListData;
}

/**
 * Gets section display info for debugging
 */
export function getSectionDisplayInfo(sections: MobileSection[]): string {
  return sections.map((section, index) => 
    `${index + 1}. ${section.title} (${section.layout}): ${section.data.length} items`
  ).join('\n');
}
