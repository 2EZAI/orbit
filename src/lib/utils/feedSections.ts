// Utility functions
function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Create dynamic sections - NO DUPLICATES, RANDOMIZED CONTENT
export function createHomeFeedSections(
  allContent: any[],
  topics: any[],
  expandedSections: Set<string> = new Set()
) {
  const sections: any[] = [];
  const now = new Date();
  const usedItems = new Set(); // Track what we've used

  console.log("🔍 Total content received:", allContent.length);
  console.log(
    "🔍 Sample content:",
    allContent.slice(0, 3).map((e) => e.title)
  );

  // Debug: Log only the final sections being created
  const debugSections = () => {
    console.log("🎯 FINAL SECTIONS CREATED:");
    sections.forEach((section, index) => {
      console.log(
        `${index + 1}. ${section.title}: ${section.data.length} items`
      );
    });
    console.log(`🎯 Total sections: ${sections.length}`);
  };

  // Allow more reuse in later sections for maximum content variety
  const shouldAllowReuse = (sectionIndex: number) =>
    sectionIndex >= allowReuseAfterSection;

  // Helper function to get unique items (allow reuse across sections for better variety)
  const getUniqueItems = (
    items: any[],
    count: number,
    allowReuse = false,
    sectionKey?: string
  ) => {
    const shuffled = shuffleArray([...items]);

    // If this section is expanded, return more items
    const expandedCount = expandedSections.has(sectionKey || "")
      ? Math.min(count * 3, items.length)
      : count;

    if (allowReuse) {
      return shuffled.slice(0, expandedCount);
    } else {
      const unique = shuffled
        .filter((item) => !usedItems.has(item.id))
        .slice(0, expandedCount);
      unique.forEach((item) => usedItems.add(item.id));
      return unique;
    }
  };

  // Helper to allow reuse in later sections (after initial unique distribution)
  const allowReuseAfterSection = 10; // After 10 sections, allow reuse for maximum variety

  // Separate events and locations for better distribution
  const events = allContent.filter((item) => !item.isLocation);
  const locations = allContent.filter((item) => item.isLocation);

  console.log(
    "🔍 Events vs Locations:",
    events.length,
    "events,",
    locations.length,
    "locations"
  );

  // Count Google API events
  const googleApiEvents = events.filter((event) => event.is_ticketmaster);
  console.log("🔍 Google API events count:", googleApiEvents.length);
  console.log(
    "🔍 Sample Google API events:",
    googleApiEvents.slice(0, 3).map((e) => e.title)
  );

  // 1. FEATURED MIXED - Events + Locations together (MUCH larger section for thousands)
  const mixedContent = getUniqueItems(
    [...events, ...locations],
    1000, // Increased from 500 to handle thousands
    false,
    "mixed"
  );
  if (mixedContent.length > 0) {
    sections.push({
      key: "mixed",
      title: "🌟 Discover",
      data: mixedContent,
      layout: "horizontal",
      hasMoreData:
        mixedContent.length >= 1000 &&
        [...events, ...locations].length > mixedContent.length,
    });
  }

  // 1.5. QUICK BROWSE - Compact list format for more visibility
  const quickBrowseContent = getUniqueItems(
    [...events, ...locations],
    500, // Increased from 200
    true
  );
  if (quickBrowseContent.length > 0) {
    sections.push({
      key: "quick-browse",
      title: "⚡ Quick Browse",
      data: quickBrowseContent,
      layout: "list",
    });
  }

  // NEW: LOCATION CATEGORIES - Group locations by actual categories returned from API
  console.log("🏷️ Creating location category sections...");
  const locationsByCategory = new Map<string, any[]>();

  locations.forEach((location) => {
    // Check both category.name and type fields
    const categories = [];
    if (location.category?.name) {
      categories.push(location.category.name);
    }
    if (location.type && location.type !== location.category?.name) {
      categories.push(location.type);
    }

    categories.forEach((categoryName) => {
      if (!locationsByCategory.has(categoryName)) {
        locationsByCategory.set(categoryName, []);
      }
      locationsByCategory.get(categoryName)!.push(location);
    });
  });

  // Add category sections (top 10 most populated categories)
  Array.from(locationsByCategory.entries())
    .filter(([_, locations]) => locations.length >= 5) // Only categories with 5+ locations
    .sort(([_, a], [__, b]) => b.length - a.length) // Sort by most populated
    .slice(0, 10) // Top 10 categories
    .forEach(([categoryName, categoryLocations], index) => {
      const uniqueCategoryLocations = getUniqueItems(categoryLocations, 300); // Increased limit
      if (uniqueCategoryLocations.length > 0) {
        // Get appropriate emoji for category
        const getCategoryEmoji = (name: string) => {
          const lower = name.toLowerCase();
          if (lower.includes("restaurant") || lower.includes("food"))
            return "🍽️";
          if (lower.includes("park") || lower.includes("outdoor")) return "🌳";
          if (lower.includes("museum") || lower.includes("art")) return "🎨";
          if (lower.includes("bar") || lower.includes("club")) return "🍸";
          if (lower.includes("shopping") || lower.includes("store"))
            return "🛍️";
          if (lower.includes("hotel") || lower.includes("lodging")) return "🏨";
          if (lower.includes("beach") || lower.includes("water")) return "🏖️";
          if (lower.includes("gym") || lower.includes("fitness")) return "💪";
          if (lower.includes("hospital") || lower.includes("health"))
            return "🏥";
          if (lower.includes("school") || lower.includes("education"))
            return "🎓";
          return "📍";
        };

        sections.push({
          key: `location-category-${categoryName
            .replace(/\s+/g, "-")
            .toLowerCase()}`,
          title: `${getCategoryEmoji(categoryName)} ${categoryName}`,
          data: uniqueCategoryLocations,
          layout: index % 3 === 0 ? "grid" : "horizontal", // Alternate layouts
        });
      }
    });

  console.log(
    `🏷️ Created ${locationsByCategory.size} location category groups`
  );

  // DYNAMIC LOCATION SECTIONS - Only create sections that actually make sense with the data

  // Locations by rating (if available) - only if we have enough rated locations
  const highRatedLocations = locations.filter(
    (loc) => loc.rating && loc.rating >= 4.0
  );
  if (highRatedLocations.length >= 10) {
    // Only create if we have at least 10 highly rated places
    const uniqueHighRated = getUniqueItems(highRatedLocations, 400);
    console.log(
      `⭐ Found ${uniqueHighRated.length} highly rated locations (4.0+)`
    );
    sections.push({
      key: "high-rated-locations",
      title: "⭐ Highly Rated Places",
      data: uniqueHighRated,
      layout: "horizontal",
      category: "Quality",
    });
  }

  // Locations with photos (have image_urls) - only if significant portion have photos
  const locationsWithPhotos = locations.filter(
    (loc) => loc.image_urls && loc.image_urls.length > 0
  );
  if (locationsWithPhotos.length >= 50) {
    // Only create if we have enough photo locations
    const uniqueWithPhotos = getUniqueItems(locationsWithPhotos, 500);
    console.log(`📸 Found ${uniqueWithPhotos.length} locations with photos`);
    sections.push({
      key: "locations-with-photos",
      title: "📸 Picture Perfect Places",
      data: uniqueWithPhotos,
      layout: "grid",
      category: "Visual",
    });
  }

  // Locations with phone numbers (active businesses) - only if we have enough
  const activeBusinesses = locations.filter((loc) => loc.phone);
  if (activeBusinesses.length >= 20) {
    const uniqueActiveBiz = getUniqueItems(activeBusinesses, 350);
    console.log(
      `📞 Found ${uniqueActiveBiz.length} active businesses with phone numbers`
    );
    sections.push({
      key: "active-businesses",
      title: "📞 Active Businesses",
      data: uniqueActiveBiz,
      layout: "list",
      category: "Business",
    });
  }

  // Locations with operation hours - only if meaningful number
  const locationsWithHours = locations.filter((loc) => loc.operation_hours);
  if (locationsWithHours.length >= 15) {
    const uniqueWithHours = getUniqueItems(locationsWithHours, 400);
    console.log(
      `🕐 Found ${uniqueWithHours.length} locations with operation hours`
    );
    sections.push({
      key: "locations-with-hours",
      title: "🕐 Places with Hours",
      data: uniqueWithHours,
      layout: "horizontal",
      category: "Business",
    });
  }

  // Premium locations (with price_level info) - only if we have premium places
  const premiumLocations = locations.filter(
    (loc) => loc.price_level && loc.price_level >= 3
  );
  if (premiumLocations.length >= 5) {
    const uniquePremium = getUniqueItems(premiumLocations, 200);
    console.log(
      `💎 Found ${uniquePremium.length} premium locations (price level 3+)`
    );
    sections.push({
      key: "premium-locations",
      title: "💎 Premium Experiences",
      data: uniquePremium,
      layout: "horizontal",
      category: "Luxury",
    });
  }

  // Budget-friendly locations - only if we have budget options
  const budgetLocations = locations.filter(
    (loc) => loc.price_level && loc.price_level <= 2
  );
  if (budgetLocations.length >= 10) {
    const uniqueBudget = getUniqueItems(budgetLocations, 350);
    console.log(
      `💰 Found ${uniqueBudget.length} budget-friendly locations (price level 1-2)`
    );
    sections.push({
      key: "budget-locations",
      title: "💰 Budget Friendly",
      data: uniqueBudget,
      layout: "list",
      category: "Value",
    });
  }

  // Locations by distance (closest first)
  const nearbyFirst = [...locations].sort(
    (a, b) => (a.distance || 0) - (b.distance || 0)
  );
  const closestLocations = getUniqueItems(nearbyFirst.slice(0, 300), 300);
  if (closestLocations.length > 0) {
    sections.push({
      key: "closest-locations",
      title: "📍 Closest to You",
      data: closestLocations,
      layout: "grid",
    });
  }

  // Random shuffle sections for discovery - only if we have enough locations
  if (locations.length >= 100) {
    const shuffledLocations1 = getUniqueItems(
      shuffleArray([...locations]),
      400,
      true
    );
    console.log(
      `🎲 Creating discovery section with ${shuffledLocations1.length} locations`
    );
    sections.push({
      key: "discover-new-1",
      title: "🎲 Discover Something New",
      data: shuffledLocations1,
      layout: "horizontal",
      category: "Discovery",
    });
  }

  if (locations.length >= 200) {
    const shuffledLocations2 = getUniqueItems(
      shuffleArray([...locations]),
      350,
      true
    );
    console.log(
      `🌟 Creating random adventures section with ${shuffledLocations2.length} locations`
    );
    sections.push({
      key: "random-adventures",
      title: "🌟 Random Adventures",
      data: shuffledLocations2,
      layout: "list",
      category: "Adventure",
    });
  }

  // Locations with multiple photos
  const locationsWithMultiplePhotos = locations.filter(
    (loc) => loc.image_urls && loc.image_urls.length >= 3
  );
  if (locationsWithMultiplePhotos.length > 0) {
    const uniqueMultiPhoto = getUniqueItems(locationsWithMultiplePhotos, 300);
    if (uniqueMultiPhoto.length > 0) {
      sections.push({
        key: "multi-photo-locations",
        title: "📷 Photo Galleries",
        data: uniqueMultiPhoto,
        layout: "horizontal",
      });
    }
  }

  // Create more themed location sections
  const weekendDestinations = getUniqueItems(
    shuffleArray([...locations]),
    450,
    true
  );
  if (weekendDestinations.length > 0) {
    sections.push({
      key: "weekend-destinations",
      title: "🎉 Weekend Destinations",
      data: weekendDestinations,
      layout: "grid",
    });
  }

  const dateNightSpots = getUniqueItems(
    shuffleArray([...locations]),
    250,
    true
  );
  if (dateNightSpots.length > 0) {
    sections.push({
      key: "date-night-spots",
      title: "💕 Date Night Spots",
      data: dateNightSpots,
      layout: "horizontal",
    });
  }

  const familyFriendlyPlaces = getUniqueItems(
    shuffleArray([...locations]),
    400,
    true
  );
  if (familyFriendlyPlaces.length > 0) {
    sections.push({
      key: "family-friendly-places",
      title: "👨‍👩‍👧‍👦 Family Friendly",
      data: familyFriendlyPlaces,
      layout: "list",
    });
  }

  const instagramWorthy = getUniqueItems(
    shuffleArray([...locations]),
    350,
    true
  );
  if (instagramWorthy.length > 0) {
    sections.push({
      key: "instagram-worthy",
      title: "📱 Instagram Worthy",
      data: instagramWorthy,
      layout: "grid",
    });
  }

  const localGems = getUniqueItems(shuffleArray([...locations]), 300, true);
  if (localGems.length > 0) {
    sections.push({
      key: "local-gems",
      title: "💎 Local Gems",
      data: localGems,
      layout: "horizontal",
    });
  }

  const mustVisitPlaces = getUniqueItems(
    shuffleArray([...locations]),
    500,
    true
  );
  if (mustVisitPlaces.length > 0) {
    sections.push({
      key: "must-visit-places",
      title: "🏆 Must Visit Places",
      data: mustVisitPlaces,
      layout: "list",
    });
  }

  const uniqueExperiences = getUniqueItems(
    shuffleArray([...locations]),
    275,
    true
  );
  if (uniqueExperiences.length > 0) {
    sections.push({
      key: "unique-experiences",
      title: "✨ Unique Experiences",
      data: uniqueExperiences,
      layout: "horizontal",
    });
  }

  const trendingNow = getUniqueItems(shuffleArray([...locations]), 400, true);
  if (trendingNow.length > 0) {
    sections.push({
      key: "trending-now",
      title: "📈 Trending Now",
      data: trendingNow,
      layout: "grid",
    });
  }

  const secretSpots = getUniqueItems(shuffleArray([...locations]), 325, true);
  if (secretSpots.length > 0) {
    sections.push({
      key: "secret-spots",
      title: "🤫 Secret Spots",
      data: secretSpots,
      layout: "horizontal",
    });
  }

  const adventureTime = getUniqueItems(shuffleArray([...locations]), 375, true);
  if (adventureTime.length > 0) {
    sections.push({
      key: "adventure-time",
      title: "🏔️ Adventure Time",
      data: adventureTime,
      layout: "list",
    });
  }

  // 2. UPCOMING EVENTS (next 30 days) - increased limit
  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const daysUntil =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 30;
  });

  const uniqueUpcoming = getUniqueItems(upcomingEvents, 300);
  if (uniqueUpcoming.length > 0) {
    sections.push({
      key: "upcoming",
      title: "🔥 Happening Soon",
      data: uniqueUpcoming,
      layout: "horizontal",
    });
  } else if (locations.length > 0) {
    // If no upcoming events, show popular locations instead
    const popularLocations = getUniqueItems(locations, 200);
    sections.push({
      key: "upcoming",
      title: "🔥 Popular Now",
      data: popularLocations,
      layout: "horizontal",
    });
  }

  // 3. POPULAR PLACES - Only locations (much increased limit for thousands)
  const uniqueLocations = getUniqueItems(locations, 800); // Increased from 300
  if (uniqueLocations.length > 0) {
    sections.push({
      key: "popular-places",
      title: "📍 Popular Places",
      data: uniqueLocations,
      layout: "grid",
    });
  }

  // 3.2. MORE EVENTS LIST - Compact vertical view
  const moreEventsList = getUniqueItems(events, 400, true); // Increased from 150
  if (moreEventsList.length > 0) {
    sections.push({
      key: "more-events-list",
      title: "🎪 More Events",
      data: moreEventsList,
      layout: "list",
    });
  }

  // 3.5. TRENDING LOCATIONS - Additional location section
  const trendingLocations = getUniqueItems(locations, 600); // Increased from 250
  if (trendingLocations.length > 0) {
    sections.push({
      key: "trending-locations",
      title: "🔥 Trending Places",
      data: trendingLocations,
      layout: "horizontal",
    });
  }

  // 4. THIS MONTH EVENTS (increased limit)
  const thisMonthEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    return (
      eventDate.getFullYear() === now.getFullYear() &&
      eventDate.getMonth() === now.getMonth()
    );
  });

  const uniqueThisMonth = getUniqueItems(thisMonthEvents, 250);
  if (uniqueThisMonth.length > 0) {
    sections.push({
      key: "this-month",
      title: "📅 This Month",
      data: uniqueThisMonth,
      layout: "horizontal",
    });
  } else if (locations.length > 0) {
    // If no this month events, show new locations
    const newLocations = getUniqueItems(locations, 200);
    sections.push({
      key: "this-month",
      title: "📅 New Places",
      data: newLocations,
      layout: "horizontal",
    });
  }

  // 5. TICKETMASTER EVENTS (increased limit)
  const ticketmasterEvents = events.filter((event) => event.is_ticketmaster);
  const uniqueTicketmaster = getUniqueItems(ticketmasterEvents, 200);
  if (uniqueTicketmaster.length > 0) {
    sections.push({
      key: "ticketmaster",
      title: "🎫 Live Shows",
      data: uniqueTicketmaster,
      layout: "horizontal",
    });
  } else if (locations.length > 0) {
    // If no ticketmaster events, show trending locations
    const trendingLocations = getUniqueItems(locations, 150);
    sections.push({
      key: "ticketmaster",
      title: "🎫 Trending Places",
      data: trendingLocations,
      layout: "horizontal",
    });
  }

  // 6. NEXT MONTH EVENTS (increased limit)
  const nextMonthEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return (
      eventDate.getFullYear() === nextMonth.getFullYear() &&
      eventDate.getMonth() === nextMonth.getMonth()
    );
  });

  const uniqueNextMonth = getUniqueItems(nextMonthEvents, 250);
  if (uniqueNextMonth.length > 0) {
    sections.push({
      key: "next-month",
      title: "🗓️ Next Month",
      data: uniqueNextMonth,
      layout: "horizontal",
    });
  } else if (locations.length > 0) {
    // If no next month events, show featured locations
    const featuredLocations = getUniqueItems(locations, 200);
    sections.push({
      key: "next-month",
      title: "🗓️ Featured Places",
      data: featuredLocations,
      layout: "horizontal",
    });
  }

  // 7. CATEGORIES - Show categories with events
  const categoriesWithEvents = new Map();
  allContent.forEach((item) => {
    if (item.category_id && !usedItems.has(item.id)) {
      const topic = topics.find((t) => t.id === item.category_id);
      if (topic) {
        if (!categoriesWithEvents.has(topic.id)) {
          categoriesWithEvents.set(topic.id, { topic, events: [] });
        }
        categoriesWithEvents.get(topic.id).events.push(item);
      }
    }
  });

  // Add top 20 category sections with unique items (increased from 15)
  Array.from(categoriesWithEvents.values())
    .filter((cat) => cat.events.length >= 1)
    .sort((a, b) => b.events.length - a.events.length)
    .slice(0, 20)
    .forEach(({ topic, events }, index) => {
      const uniqueCategoryItems = getUniqueItems(events, 150);
      if (uniqueCategoryItems.length > 0) {
        // Alternate between horizontal and list layouts for variety
        const layout = index % 3 === 2 ? "list" : "horizontal";
        sections.push({
          key: `category-${topic.id}`,
          title: `${topic.icon || "📅"} ${topic.name}`,
          data: uniqueCategoryItems,
          layout: layout,
        });
      }
    });

  // 8. THIS WEEKEND EVENTS
  const thisWeekendEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const today = new Date();
    const daysUntil = Math.floor(
      (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil >= 0 && daysUntil <= 7; // This weekend + next few days
  });

  const uniqueThisWeekend = getUniqueItems(thisWeekendEvents, 200);
  if (uniqueThisWeekend.length > 0) {
    sections.push({
      key: "this-weekend",
      title: "🎉 This Weekend",
      data: uniqueThisWeekend,
      layout: "horizontal",
    });
  } else if (locations.length > 0) {
    // If no weekend events, show weekend locations
    const weekendLocations = getUniqueItems(locations, 200);
    sections.push({
      key: "this-weekend",
      title: "🎉 Weekend Spots",
      data: weekendLocations,
      layout: "horizontal",
    });
  }

  // 9. POPULAR EVENTS (by attendee count)
  const popularEvents = events
    .sort((a, b) => {
      const aAttendees = a.attendees?.count || 0;
      const bAttendees = b.attendees?.count || 0;
      return bAttendees - aAttendees;
    })
    .slice(0, 100);

  const uniquePopular = getUniqueItems(popularEvents, 200);
  if (uniquePopular.length > 0) {
    sections.push({
      key: "popular-events",
      title: "🔥 Trending",
      data: uniquePopular,
      layout: "horizontal",
    });
  } else if (locations.length > 0) {
    // If no popular events, show popular locations
    const popularLocations = getUniqueItems(locations, 80);
    sections.push({
      key: "popular-events",
      title: "🔥 Popular Places",
      data: popularLocations,
      layout: "horizontal",
    });
  }

  // 10. NEARBY LOCATIONS (if we have location data)
  const nearbyLocations = locations.slice(0, 100);
  const uniqueNearby = getUniqueItems(nearbyLocations, 80);
  if (uniqueNearby.length > 0) {
    sections.push({
      key: "nearby-locations",
      title: "📍 Nearby",
      data: uniqueNearby,
      layout: "grid",
    });
  }

  // 10.5. ADDITIONAL LOCATION SECTIONS
  const uniqueFeatured = getUniqueItems(locations, 80);
  if (uniqueFeatured.length > 0) {
    sections.push({
      key: "featured-locations",
      title: "⭐ Featured Places",
      data: uniqueFeatured,
      layout: "horizontal",
    });
  }

  const uniqueNew = getUniqueItems(locations, 80);
  if (uniqueNew.length > 0) {
    sections.push({
      key: "new-locations",
      title: "🆕 New Places",
      data: uniqueNew,
      layout: "horizontal",
    });
  }

  const uniqueHot = getUniqueItems(locations, 80);
  if (uniqueHot.length > 0) {
    sections.push({
      key: "hot-locations",
      title: "🔥 Hot Spots",
      data: uniqueHot,
      layout: "horizontal",
    });
  }

  const uniqueLocal = getUniqueItems(locations, 80);
  if (uniqueLocal.length > 0) {
    sections.push({
      key: "local-locations",
      title: "🏠 Local Favorites",
      data: uniqueLocal,
      layout: "horizontal",
    });
  }

  // 12. THIS WEEK EVENTS
  const thisWeekEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const today = new Date();
    const daysUntil = Math.floor(
      (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil >= 0 && daysUntil <= 14; // This week + next week
  });

  const uniqueThisWeek = getUniqueItems(thisWeekEvents, 80);
  if (uniqueThisWeek.length > 0) {
    sections.push({
      key: "this-week",
      title: "📅 This Week",
      data: uniqueThisWeek,
      layout: "horizontal",
    });
  }

  // 13. FREE EVENTS
  const freeEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("free") ||
      description.includes("free") ||
      name.includes("no cost") ||
      description.includes("no cost")
    );
  });

  const uniqueFree = getUniqueItems(freeEvents, 60);
  if (uniqueFree.length > 0) {
    sections.push({
      key: "free-events",
      title: "🎉 Free Events",
      data: uniqueFree,
      layout: "horizontal",
    });
  }

  // 14. OUTDOOR EVENTS
  const outdoorEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    const venue = event.venue_name?.toLowerCase() || "";
    return (
      name.includes("park") ||
      description.includes("park") ||
      venue.includes("park") ||
      name.includes("outdoor") ||
      description.includes("outdoor") ||
      name.includes("beach") ||
      description.includes("beach") ||
      name.includes("festival") ||
      description.includes("festival")
    );
  });

  const uniqueOutdoor = getUniqueItems(outdoorEvents, 60);
  if (uniqueOutdoor.length > 0) {
    sections.push({
      key: "outdoor-events",
      title: "🌳 Outdoor Events",
      data: uniqueOutdoor,
      layout: "horizontal",
    });
  }

  // 15. NIGHTLIFE EVENTS
  const nightlifeEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    const venue = event.venue_name?.toLowerCase() || "";
    return (
      name.includes("club") ||
      description.includes("club") ||
      venue.includes("club") ||
      name.includes("bar") ||
      description.includes("bar") ||
      venue.includes("bar") ||
      name.includes("night") ||
      description.includes("night") ||
      name.includes("party") ||
      description.includes("party")
    );
  });

  const uniqueNightlife = getUniqueItems(nightlifeEvents, 60);
  if (uniqueNightlife.length > 0) {
    sections.push({
      key: "nightlife-events",
      title: "🌙 Nightlife",
      data: uniqueNightlife,
      layout: "horizontal",
    });
  }

  // 16. FAMILY FRIENDLY EVENTS
  const familyEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("family") ||
      description.includes("family") ||
      name.includes("kids") ||
      description.includes("kids") ||
      name.includes("children") ||
      description.includes("children") ||
      name.includes("family-friendly") ||
      description.includes("family-friendly")
    );
  });

  const uniqueFamily = getUniqueItems(familyEvents, 60);
  if (uniqueFamily.length > 0) {
    sections.push({
      key: "family-events",
      title: "👨‍👩‍👧‍👦 Family Friendly",
      data: uniqueFamily,
      layout: "horizontal",
    });
  }

  // 17. SPORTS EVENTS
  const sportsEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    const isSports =
      name.includes("sport") ||
      description.includes("sport") ||
      name.includes("game") ||
      description.includes("game") ||
      name.includes("match") ||
      description.includes("match") ||
      name.includes("tournament") ||
      description.includes("tournament");

    if (isSports) {
      console.log("🔍 Feed Sections - Sports Event found:", event.name);
    }

    return isSports;
  });

  console.log(
    "🔍 Feed Sections - Total sports events found:",
    sportsEvents.length
  );
  const uniqueSports = getUniqueItems(sportsEvents, 60);
  if (uniqueSports.length > 0) {
    sections.push({
      key: "sports-events",
      title: "⚽ Sports",
      data: uniqueSports,
      layout: "horizontal",
    });
  }

  // 18. FOOD & DRINK EVENTS
  const foodEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("food") ||
      description.includes("food") ||
      name.includes("drink") ||
      description.includes("drink") ||
      name.includes("wine") ||
      description.includes("wine") ||
      name.includes("beer") ||
      description.includes("beer") ||
      name.includes("tasting") ||
      description.includes("tasting") ||
      name.includes("dinner") ||
      description.includes("dinner")
    );
  });

  const uniqueFood = getUniqueItems(foodEvents, 60);
  if (uniqueFood.length > 0) {
    sections.push({
      key: "food-events",
      title: "🍕 Food & Drink",
      data: uniqueFood,
      layout: "horizontal",
    });
  }

  // 19. ART & CULTURE EVENTS
  const artEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("art") ||
      description.includes("art") ||
      name.includes("museum") ||
      description.includes("museum") ||
      name.includes("gallery") ||
      description.includes("gallery") ||
      name.includes("exhibition") ||
      description.includes("exhibition") ||
      name.includes("culture") ||
      description.includes("culture")
    );
  });

  const uniqueArt = getUniqueItems(artEvents, 60);
  if (uniqueArt.length > 0) {
    sections.push({
      key: "art-events",
      title: "🎨 Art & Culture",
      data: uniqueArt,
      layout: "horizontal",
    });
  }

  // 20. MUSIC EVENTS
  const musicEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("concert") ||
      description.includes("concert") ||
      name.includes("music") ||
      description.includes("music") ||
      name.includes("band") ||
      description.includes("band") ||
      name.includes("dj") ||
      description.includes("dj") ||
      name.includes("live") ||
      description.includes("live")
    );
  });

  const uniqueMusic = getUniqueItems(musicEvents, 60);
  if (uniqueMusic.length > 0) {
    sections.push({
      key: "music-events",
      title: "🎵 Music",
      data: uniqueMusic,
      layout: "horizontal",
    });
  }

  // 21. BUSINESS & NETWORKING EVENTS
  const businessEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("business") ||
      description.includes("business") ||
      name.includes("networking") ||
      description.includes("networking") ||
      name.includes("conference") ||
      description.includes("conference") ||
      name.includes("workshop") ||
      description.includes("workshop") ||
      name.includes("seminar") ||
      description.includes("seminar")
    );
  });

  const uniqueBusiness = getUniqueItems(businessEvents, 60);
  if (uniqueBusiness.length > 0) {
    sections.push({
      key: "business-events",
      title: "💼 Business & Networking",
      data: uniqueBusiness,
      layout: "horizontal",
    });
  }

  // 22. TECH EVENTS
  const techEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("tech") ||
      description.includes("tech") ||
      name.includes("technology") ||
      description.includes("technology") ||
      name.includes("startup") ||
      description.includes("startup") ||
      name.includes("coding") ||
      description.includes("coding") ||
      name.includes("hackathon") ||
      description.includes("hackathon")
    );
  });

  const uniqueTech = getUniqueItems(techEvents, 60);
  if (uniqueTech.length > 0) {
    sections.push({
      key: "tech-events",
      title: "💻 Tech",
      data: uniqueTech,
      layout: "horizontal",
    });
  }

  // 23. WELLNESS & FITNESS EVENTS
  const wellnessEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("yoga") ||
      description.includes("yoga") ||
      name.includes("fitness") ||
      description.includes("fitness") ||
      name.includes("wellness") ||
      description.includes("wellness") ||
      name.includes("meditation") ||
      description.includes("meditation") ||
      name.includes("workout") ||
      description.includes("workout")
    );
  });

  const uniqueWellness = getUniqueItems(wellnessEvents, 60);
  if (uniqueWellness.length > 0) {
    sections.push({
      key: "wellness-events",
      title: "🧘 Wellness & Fitness",
      data: uniqueWellness,
      layout: "horizontal",
    });
  }

  // 24. EDUCATIONAL EVENTS
  const educationalEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("learn") ||
      description.includes("learn") ||
      name.includes("education") ||
      description.includes("education") ||
      name.includes("class") ||
      description.includes("class") ||
      name.includes("course") ||
      description.includes("course") ||
      name.includes("training") ||
      description.includes("training")
    );
  });

  const uniqueEducational = getUniqueItems(educationalEvents, 60);
  if (uniqueEducational.length > 0) {
    sections.push({
      key: "educational-events",
      title: "📚 Educational",
      data: uniqueEducational,
      layout: "horizontal",
    });
  }

  // 25. CHARITY & VOLUNTEER EVENTS
  const charityEvents = events.filter((event) => {
    const name = event.name?.toLowerCase() || "";
    const description = event.description?.toLowerCase() || "";
    return (
      name.includes("charity") ||
      description.includes("charity") ||
      name.includes("volunteer") ||
      description.includes("volunteer") ||
      name.includes("donation") ||
      description.includes("donation") ||
      name.includes("fundraiser") ||
      description.includes("fundraiser")
    );
  });

  const uniqueCharity = getUniqueItems(charityEvents, 60);
  if (uniqueCharity.length > 0) {
    sections.push({
      key: "charity-events",
      title: "❤️ Charity & Volunteer",
      data: uniqueCharity,
      layout: "horizontal",
    });
  }

  // 26. LATE NIGHT EVENTS (after 9 PM)
  const lateNightEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const hours = eventDate.getHours();
    return hours >= 21 || hours <= 6; // 9 PM to 6 AM
  });

  const uniqueLateNight = getUniqueItems(lateNightEvents, 60);
  if (uniqueLateNight.length > 0) {
    sections.push({
      key: "late-night-events",
      title: "🌃 Late Night",
      data: uniqueLateNight,
      layout: "horizontal",
    });
  }

  // 27. MORNING EVENTS (before 12 PM)
  const morningEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const hours = eventDate.getHours();
    return hours >= 6 && hours <= 12; // 6 AM to 12 PM
  });

  const uniqueMorning = getUniqueItems(morningEvents, 60);
  if (uniqueMorning.length > 0) {
    sections.push({
      key: "morning-events",
      title: "🌅 Morning Events",
      data: uniqueMorning,
      layout: "horizontal",
    });
  }

  // 28. AFTERNOON EVENTS (12 PM to 6 PM)
  const afternoonEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const hours = eventDate.getHours();
    return hours >= 12 && hours <= 18; // 12 PM to 6 PM
  });

  const uniqueAfternoon = getUniqueItems(afternoonEvents, 60);
  if (uniqueAfternoon.length > 0) {
    sections.push({
      key: "afternoon-events",
      title: "☀️ Afternoon Events",
      data: uniqueAfternoon,
      layout: "horizontal",
    });
  }

  // 29. EVENING EVENTS (6 PM to 9 PM)
  const eveningEvents = events.filter((event) => {
    const eventDate = new Date(event.start_datetime);
    const hours = eventDate.getHours();
    return hours >= 18 && hours <= 21; // 6 PM to 9 PM
  });

  const uniqueEvening = getUniqueItems(eveningEvents, 60);
  if (uniqueEvening.length > 0) {
    sections.push({
      key: "evening-events",
      title: "🌆 Evening Events",
      data: uniqueEvening,
      layout: "horizontal",
    });
  }

  // 30. EVERYTHING ELSE - Whatever's left
  const remainingItems = allContent.filter((item) => !usedItems.has(item.id));
  const uniqueRemaining = getUniqueItems(remainingItems, 200);
  if (uniqueRemaining.length > 0) {
    sections.push({
      key: "more",
      title: "✨ More For You",
      data: uniqueRemaining,
      layout: "horizontal",
    });
  }

  // BONUS SECTIONS - Maximum content with reuse allowed for discovery (MASSIVE INCREASE)
  const bonusEvents1 = getUniqueItems(events, 500, true); // Increased from 100
  if (bonusEvents1.length > 0) {
    sections.push({
      key: "bonus-events-1",
      title: "🎪 More Discoveries",
      data: bonusEvents1,
      layout: "list",
    });
  }

  const bonusLocations1 = getUniqueItems(locations, 800, true); // Increased from 150
  if (bonusLocations1.length > 0) {
    sections.push({
      key: "bonus-locations-1",
      title: "🗺️ Hidden Gems",
      data: bonusLocations1,
      layout: "horizontal",
    });
  }

  const bonusMixed1 = getUniqueItems([...events, ...locations], 1000, true); // Increased from 200
  if (bonusMixed1.length > 0) {
    sections.push({
      key: "bonus-mixed-1",
      title: "🎯 Don't Miss These",
      data: bonusMixed1,
      layout: "list",
    });
  }

  const bonusEvents2 = getUniqueItems(events, 400, true); // Increased from 120
  if (bonusEvents2.length > 0) {
    sections.push({
      key: "bonus-events-2",
      title: "🎊 Last Call Events",
      data: bonusEvents2,
      layout: "horizontal",
    });
  }

  const bonusLocations2 = getUniqueItems(locations, 500, true); // Increased from 100
  if (bonusLocations2.length > 0) {
    sections.push({
      key: "bonus-locations-2",
      title: "📍 Final Recommendations",
      data: bonusLocations2,
      layout: "grid",
    });
  }

  // ADDITIONAL THEMED SECTIONS - Only create if we have substantial data

  // Only create themed sections if we have enough locations to make them meaningful
  if (locations.length >= 500) {
    const diverseLocations1 = getUniqueItems(
      shuffleArray([...locations]),
      300,
      true
    );
    sections.push({
      key: "weekend-destinations",
      title: "🎉 Weekend Destinations",
      data: diverseLocations1,
      layout: "grid",
      category: "Weekend",
    });

    const diverseLocations2 = getUniqueItems(
      shuffleArray([...locations]),
      350,
      true
    );
    sections.push({
      key: "hidden-gems",
      title: "💎 Hidden Gems",
      data: diverseLocations2,
      layout: "horizontal",
      category: "Discovery",
    });

    const diverseLocations3 = getUniqueItems(
      shuffleArray([...locations]),
      400,
      true
    );
    sections.push({
      key: "local-favorites",
      title: "⭐ Local Favorites",
      data: diverseLocations3,
      layout: "list",
      category: "Popular",
    });

    const diverseLocations4 = getUniqueItems(
      shuffleArray([...locations]),
      250,
      true
    );
    sections.push({
      key: "trending-spots",
      title: "📈 Trending Spots",
      data: diverseLocations4,
      layout: "horizontal",
      category: "Trending",
    });

    const diverseLocations5 = getUniqueItems(
      shuffleArray([...locations]),
      450,
      true
    );
    sections.push({
      key: "explore-more",
      title: "🗺️ Explore More",
      data: diverseLocations5,
      layout: "grid",
      category: "Exploration",
    });

    const diverseLocations6 = getUniqueItems(
      shuffleArray([...locations]),
      500,
      true
    );
    sections.push({
      key: "endless-discovery",
      title: "♾️ Endless Discovery",
      data: diverseLocations6,
      layout: "horizontal",
      category: "Discovery",
    });

    console.log(
      "✨ Created 6 additional themed sections for extensive browsing"
    );
  }

  // Debug: Log the final sections
  debugSections();

  console.log("🔍 Used items:", usedItems.size, "out of", allContent.length);
  console.log(
    "🔍 Final sections:",
    sections.map((s) => `${s.title}: ${s.data.length} items`)
  );

  // Extract unique categories from created sections for top filter tags
  const dynamicCategories = new Set<string>();

  // First, add all actual location category names (highest priority)
  locationsByCategory.forEach((_, categoryName) => {
    dynamicCategories.add(categoryName);
  });

  // Then add section categories
  sections.forEach((section) => {
    if (section.category) {
      dynamicCategories.add(section.category);
    }
    // Also extract category names from location category sections
    if (section.key?.startsWith("location-category-")) {
      const categoryName = section.title.split(" ").slice(1).join(" "); // Remove emoji
      dynamicCategories.add(categoryName);
    }
  });

  console.log(
    "🏷️ Dynamic categories for top filters:",
    Array.from(dynamicCategories)
  );

  return {
    sections,
    dynamicCategories: Array.from(dynamicCategories),
  };
}
