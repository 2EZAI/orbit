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

  // 1. FEATURED MIXED - Events + Locations together (larger section)
  const mixedContent = getUniqueItems(
    [...events, ...locations],
    500,
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
        mixedContent.length >= 500 &&
        [...events, ...locations].length > mixedContent.length,
    });
  }

  // 1.5. QUICK BROWSE - Compact list format for more visibility
  const quickBrowseContent = getUniqueItems(
    [...events, ...locations],
    200,
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

  // 3. POPULAR PLACES - Only locations (increased limit)
  const uniqueLocations = getUniqueItems(locations, 300);
  if (uniqueLocations.length > 0) {
    sections.push({
      key: "popular-places",
      title: "📍 Popular Places",
      data: uniqueLocations,
      layout: "grid",
    });
  }

  // 3.2. MORE EVENTS LIST - Compact vertical view
  const moreEventsList = getUniqueItems(events, 150, true);
  if (moreEventsList.length > 0) {
    sections.push({
      key: "more-events-list",
      title: "🎪 More Events",
      data: moreEventsList,
      layout: "list",
    });
  }

  // 3.5. TRENDING LOCATIONS - Additional location section
  const trendingLocations = getUniqueItems(locations, 250);
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

  // BONUS SECTIONS - Maximum content with reuse allowed for discovery
  const bonusEvents1 = getUniqueItems(events, 100, true);
  if (bonusEvents1.length > 0) {
    sections.push({
      key: "bonus-events-1",
      title: "🎪 More Discoveries",
      data: bonusEvents1,
      layout: "list",
    });
  }

  const bonusLocations1 = getUniqueItems(locations, 150, true);
  if (bonusLocations1.length > 0) {
    sections.push({
      key: "bonus-locations-1",
      title: "🗺️ Hidden Gems",
      data: bonusLocations1,
      layout: "horizontal",
    });
  }

  const bonusMixed1 = getUniqueItems([...events, ...locations], 200, true);
  if (bonusMixed1.length > 0) {
    sections.push({
      key: "bonus-mixed-1",
      title: "🎯 Don't Miss These",
      data: bonusMixed1,
      layout: "list",
    });
  }

  const bonusEvents2 = getUniqueItems(events, 120, true);
  if (bonusEvents2.length > 0) {
    sections.push({
      key: "bonus-events-2",
      title: "🎊 Last Call Events",
      data: bonusEvents2,
      layout: "horizontal",
    });
  }

  const bonusLocations2 = getUniqueItems(locations, 100, true);
  if (bonusLocations2.length > 0) {
    sections.push({
      key: "bonus-locations-2",
      title: "📍 Final Recommendations",
      data: bonusLocations2,
      layout: "grid",
    });
  }

  // Debug: Log the final sections
  debugSections();

  console.log("🔍 Used items:", usedItems.size, "out of", allContent.length);
  console.log(
    "🔍 Final sections:",
    sections.map((s) => `${s.title}: ${s.data.length} items`)
  );

  return sections;
}
