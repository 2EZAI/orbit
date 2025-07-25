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
export function createHomeFeedSections(allContent: any[], topics: any[]) {
  const sections: any[] = [];
  const now = new Date();
  const usedItems = new Set(); // Track what we've used

  console.log("🔍 Total content received:", allContent.length);
  console.log(
    "🔍 Sample content:",
    allContent.slice(0, 3).map((e) => e.title)
  );

  // Helper function to get unused items and mark them as used
  const getUniqueItems = (items: any[], count: number) => {
    const shuffled = shuffleArray([...items]);
    const unique = shuffled
      .filter((item) => !usedItems.has(item.id))
      .slice(0, count);
    unique.forEach((item) => usedItems.add(item.id));
    return unique;
  };

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

  // 1. MIXED SECTION - Events + Locations together
  const mixedContent = getUniqueItems([...events, ...locations], 100);
  if (mixedContent.length > 0) {
    sections.push({
      key: "mixed",
      title: "🌟 Discover",
      data: mixedContent,
      layout: "horizontal",
    });
  }

  // 2. UPCOMING EVENTS (next 30 days)
  const upcomingEvents = events.filter((event) => {
    if (event.is_ticketmaster) return false;
    const eventDate = new Date(event.start_datetime);
    const daysUntil =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 30;
  });

  const uniqueUpcoming = getUniqueItems(upcomingEvents, 80);
  if (uniqueUpcoming.length > 0) {
    sections.push({
      key: "upcoming",
      title: "🔥 Happening Soon",
      data: uniqueUpcoming,
      layout: "horizontal",
    });
  }

  // 3. POPULAR PLACES - Only locations
  const uniqueLocations = getUniqueItems(locations, 60);
  if (uniqueLocations.length > 0) {
    sections.push({
      key: "popular-places",
      title: "📍 Popular Places",
      data: uniqueLocations,
      layout: "grid",
    });
  }

  // 4. THIS MONTH EVENTS
  const thisMonthEvents = events.filter((event) => {
    if (event.is_ticketmaster) return false;
    const eventDate = new Date(event.start_datetime);
    return (
      eventDate.getFullYear() === now.getFullYear() &&
      eventDate.getMonth() === now.getMonth()
    );
  });

  const uniqueThisMonth = getUniqueItems(thisMonthEvents, 70);
  if (uniqueThisMonth.length > 0) {
    sections.push({
      key: "this-month",
      title: "📅 This Month",
      data: uniqueThisMonth,
      layout: "horizontal",
    });
  }

  // 5. TICKETMASTER EVENTS
  const ticketmasterEvents = events.filter((event) => event.is_ticketmaster);
  const uniqueTicketmaster = getUniqueItems(ticketmasterEvents, 50);
  if (uniqueTicketmaster.length > 0) {
    sections.push({
      key: "ticketmaster",
      title: "🎫 Live Shows",
      data: uniqueTicketmaster,
      layout: "horizontal",
    });
  }

  // 6. NEXT MONTH EVENTS
  const nextMonthEvents = events.filter((event) => {
    if (event.is_ticketmaster) return false;
    const eventDate = new Date(event.start_datetime);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return (
      eventDate.getFullYear() === nextMonth.getFullYear() &&
      eventDate.getMonth() === nextMonth.getMonth()
    );
  });

  const uniqueNextMonth = getUniqueItems(nextMonthEvents, 70);
  if (uniqueNextMonth.length > 0) {
    sections.push({
      key: "next-month",
      title: "🗓️ Next Month",
      data: uniqueNextMonth,
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

  // Add top 8 category sections with unique items
  Array.from(categoriesWithEvents.values())
    .filter((cat) => cat.events.length >= 1)
    .sort((a, b) => b.events.length - a.events.length)
    .slice(0, 8)
    .forEach(({ topic, events }) => {
      const uniqueCategoryItems = getUniqueItems(events, 50);
      if (uniqueCategoryItems.length > 0) {
        sections.push({
          key: `category-${topic.id}`,
          title: `${topic.icon || "📅"} ${topic.name}`,
          data: uniqueCategoryItems,
          layout: "horizontal",
        });
      }
    });

  // 8. EVERYTHING ELSE - Whatever's left
  const remainingItems = allContent.filter((item) => !usedItems.has(item.id));
  const uniqueRemaining = getUniqueItems(remainingItems, 100);
  if (uniqueRemaining.length > 0) {
    sections.push({
      key: "more",
      title: "✨ More For You",
      data: uniqueRemaining,
      layout: "horizontal",
    });
  }

  console.log("🔍 Used items:", usedItems.size, "out of", allContent.length);
  console.log(
    "🔍 Final sections:",
    sections.map((s) => `${s.title}: ${s.data.length} items`)
  );

  return sections;
}
