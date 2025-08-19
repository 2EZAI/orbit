-- RPC function to get prioritized map data based on user's preferred location
-- This ensures current location data loads first, then everything else

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_prioritized_map_data(double precision, double precision, integer);

CREATE OR REPLACE FUNCTION get_prioritized_map_data(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  -- Static locations with distance
  location_id UUID,
  location_name TEXT,
  location_description TEXT,
  location_coordinates GEOGRAPHY,
  location_address TEXT,
  location_type TEXT,
  location_category_name TEXT,
  location_category_id UUID,
  location_image_urls JSONB,
  location_operation_hours JSONB,
  location_place_id TEXT,
  location_rating NUMERIC,
  location_rating_count INTEGER,
  location_price_level INTEGER,
  location_phone TEXT,
  location_distance_meters DOUBLE PRECISION,
  
  -- Events with distance
  event_id UUID,
  event_name TEXT,
  event_description TEXT,
  event_start_datetime TIMESTAMPTZ,
  event_end_datetime TIMESTAMPTZ,
  event_coordinates GEOGRAPHY,
  event_venue_name TEXT,
  event_address TEXT,
  event_city TEXT,
  event_state TEXT,
  event_postal_code TEXT,
  event_image_urls TEXT[],
  event_type TEXT,
  event_category_name TEXT,
  event_category_id UUID,
  event_is_private BOOLEAN,
  event_distance_meters DOUBLE PRECISION,
  
  -- Priority flag (true for current location data, false for everything else)
  is_priority BOOLEAN,
  
  -- Single distance field for ordering
  sort_distance DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
  user_point GEOGRAPHY;
BEGIN
  -- Create geography point from user coordinates
  user_point := ST_MakePoint(user_lng, user_lat)::GEOGRAPHY;
  
  -- Return prioritized static locations first
  RETURN QUERY
  SELECT 
    sl.id::UUID,
    sl.name::TEXT,
    sl.description::TEXT,
    sl.location::GEOGRAPHY,
    sl.address::TEXT,
    sl.type::TEXT,
    lc.name::TEXT,
    sl.category_id::UUID,
    sl.image_urls::JSONB,
    sl.operation_hours::JSONB,
    sl.place_id::TEXT,
    sl.rating::NUMERIC,
    sl.rating_count::INTEGER,
    sl.price_level::INTEGER,
    sl.phone::TEXT,
    ST_Distance(sl.location, user_point)::DOUBLE PRECISION,
    
    -- Events (null values for location-only rows)
    NULL::UUID,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TIMESTAMPTZ,
    NULL::TIMESTAMPTZ,
    NULL::GEOGRAPHY,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT[],
    NULL::TEXT,
    NULL::TEXT,
    NULL::UUID,
    NULL::BOOLEAN,
    NULL::DOUBLE PRECISION,
    
    -- Priority flag: true if within priority radius (current location area)
    CASE 
      WHEN ST_Distance(sl.location, user_point) <= radius_meters THEN true 
      ELSE false 
    END,
    
    -- Sort distance for ordering
    ST_Distance(sl.location, user_point)::DOUBLE PRECISION
    
  FROM public.static_locations sl
  LEFT JOIN public.location_categories lc ON sl.category_id = lc.id
  WHERE sl.location IS NOT NULL
  
  UNION ALL
  
  -- Return prioritized events
  SELECT 
    -- Static locations (null values for event-only rows)
    NULL::UUID,
    NULL::TEXT,
    NULL::TEXT,
    NULL::GEOGRAPHY,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    NULL::UUID,
    NULL::JSONB,
    NULL::JSONB,
    NULL::TEXT,
    NULL::NUMERIC,
    NULL::INTEGER,
    NULL::INTEGER,
    NULL::TEXT,
    NULL::DOUBLE PRECISION,
    
    e.id::UUID,
    e.name::TEXT,
    e.description::TEXT,
    e.start_datetime::TIMESTAMPTZ,
    e.end_datetime::TIMESTAMPTZ,
    e.location::GEOGRAPHY,
    e.venue_name::TEXT,
    e.address::TEXT,
    e.city::TEXT,
    e.state::TEXT,
    e.postal_code::TEXT,
    e.image_urls::TEXT[],
    e.type::TEXT,
    ec.name::TEXT,
    e.category_id::UUID,
    e.is_private::BOOLEAN,
    ST_Distance(e.location, user_point)::DOUBLE PRECISION,
    
    -- Priority flag: true if within priority radius (current location area)
    CASE 
      WHEN ST_Distance(e.location, user_point) <= radius_meters THEN true 
      ELSE false 
    END,
    
    -- Sort distance for ordering
    ST_Distance(e.location, user_point)::DOUBLE PRECISION
    
  FROM public.events e
  LEFT JOIN public.location_categories ec ON e.category_id = ec.id
  WHERE e.location IS NOT NULL
    AND e.is_private = false
  
  -- Order by priority first (current location data), then by distance
  ORDER BY is_priority DESC, sort_distance ASC;
           
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_prioritized_map_data(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_prioritized_map_data(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;
