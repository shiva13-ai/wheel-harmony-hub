-- Fix search_path for security definer functions
DROP FUNCTION IF EXISTS find_nearby_mechanics(NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS update_mechanic_location(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID);

-- Recreate find_nearby_mechanics with proper search_path
CREATE OR REPLACE FUNCTION find_nearby_mechanics(
  user_lat NUMERIC,
  user_lng NUMERIC,
  radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  mechanic_id UUID,
  distance_km NUMERIC,
  mechanic_name TEXT,
  rating NUMERIC,
  hourly_rate NUMERIC,
  location_lat NUMERIC,
  location_lng NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    ROUND(
      ST_Distance(
        ST_MakePoint(user_lng, user_lat)::geography,
        ml.location
      ) / 1000, 2
    ) AS distance_km,
    p.full_name,
    mp.rating,
    mp.hourly_rate,
    ml.location_lat,
    ml.location_lng
  FROM mechanic_profiles mp
  JOIN mechanic_locations ml ON mp.id = ml.mechanic_id
  JOIN profiles p ON mp.user_id = p.id
  WHERE 
    mp.status = 'online'
    AND ST_DWithin(
      ST_MakePoint(user_lng, user_lat)::geography,
      ml.location,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT 10;
END;
$$;

-- Recreate update_mechanic_location with proper search_path
CREATE OR REPLACE FUNCTION update_mechanic_location(
  p_mechanic_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_heading NUMERIC DEFAULT NULL,
  p_speed NUMERIC DEFAULT NULL,
  p_accuracy NUMERIC DEFAULT NULL,
  p_job_id UUID DEFAULT NULL
)
RETURNS mechanic_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result mechanic_locations;
BEGIN
  INSERT INTO mechanic_locations (
    mechanic_id,
    location,
    location_lat,
    location_lng,
    heading,
    speed,
    accuracy,
    job_id,
    timestamp
  )
  VALUES (
    p_mechanic_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_lat,
    p_lng,
    p_heading,
    p_speed,
    p_accuracy,
    p_job_id,
    NOW()
  )
  ON CONFLICT (mechanic_id)
  DO UPDATE SET
    location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    location_lat = p_lat,
    location_lng = p_lng,
    heading = p_heading,
    speed = p_speed,
    accuracy = p_accuracy,
    job_id = p_job_id,
    timestamp = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$;