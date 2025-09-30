-- Create enum for user types
CREATE TYPE user_type AS ENUM ('customer', 'mechanic', 'store');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mechanic_profiles table for additional mechanic info
CREATE TABLE public.mechanic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  specializations TEXT[],
  experience_years INTEGER,
  hourly_rate DECIMAL(10,2),
  service_radius INTEGER,
  location_address TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(10,8),
  is_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create store_profiles table for local auto stores
CREATE TABLE public.store_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  store_name TEXT NOT NULL,
  store_type TEXT,
  address TEXT NOT NULL,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(10,8),
  phone TEXT,
  opening_hours JSONB,
  services_offered TEXT[],
  is_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create service_requests table
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  location_address TEXT NOT NULL,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(10,8),
  urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'emergency')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_mechanic_id UUID REFERENCES public.mechanic_profiles(id),
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Mechanics profiles are viewable by everyone"
  ON public.mechanic_profiles FOR SELECT
  USING (true);

CREATE POLICY "Mechanics can update their own profile"
  ON public.mechanic_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Mechanics can insert their own profile"
  ON public.mechanic_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Store profiles are viewable by everyone"
  ON public.store_profiles FOR SELECT
  USING (true);

CREATE POLICY "Stores can update their own profile"
  ON public.store_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Stores can insert their own profile"
  ON public.store_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for service_requests
CREATE POLICY "Customers can view their own requests"
  ON public.service_requests FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Mechanics can view all pending and assigned requests"
  ON public.service_requests FOR SELECT
  USING (status IN ('pending', 'assigned') OR assigned_mechanic_id IN (
    SELECT id FROM public.mechanic_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Customers can create service requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own requests"
  ON public.service_requests FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Mechanics can update assigned requests"
  ON public.service_requests FOR UPDATE
  USING (assigned_mechanic_id IN (
    SELECT id FROM public.mechanic_profiles WHERE user_id = auth.uid()
  ));

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();