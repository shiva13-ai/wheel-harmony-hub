-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add status to mechanic_profiles for online/offline/busy state
ALTER TABLE mechanic_profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'offline'));

-- Create mechanic_locations table for real-time location tracking
CREATE TABLE IF NOT EXISTS mechanic_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES mechanic_profiles(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  heading NUMERIC,
  speed NUMERIC,
  accuracy NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  UNIQUE(mechanic_id)
);

-- Create spatial index for fast geospatial queries
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_geography ON mechanic_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_mechanic_id ON mechanic_locations(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_job_id ON mechanic_locations(job_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_timestamp ON mechanic_locations(timestamp);

-- Enable RLS on mechanic_locations
ALTER TABLE mechanic_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mechanic_locations
CREATE POLICY "Mechanics can view all locations"
  ON mechanic_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mechanic_profiles
      WHERE mechanic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Mechanics can insert their own location"
  ON mechanic_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    mechanic_id IN (
      SELECT id FROM mechanic_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Mechanics can update their own location"
  ON mechanic_locations FOR UPDATE
  TO authenticated
  USING (
    mechanic_id IN (
      SELECT id FROM mechanic_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view mechanic location for their active job"
  ON mechanic_locations FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM service_requests
      WHERE customer_id = auth.uid()
      AND status IN ('assigned', 'in_progress')
    )
  );

-- Function to find nearby mechanics using geospatial query
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update mechanic location (upsert)
CREATE OR REPLACE FUNCTION update_mechanic_location(
  p_mechanic_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_heading NUMERIC DEFAULT NULL,
  p_speed NUMERIC DEFAULT NULL,
  p_accuracy NUMERIC DEFAULT NULL,
  p_job_id UUID DEFAULT NULL
)
RETURNS mechanic_locations AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for mechanic_locations
ALTER PUBLICATION supabase_realtime ADD TABLE mechanic_locations;