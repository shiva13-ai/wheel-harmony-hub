import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

interface UseLocationTrackingProps {
  mechanicId: string;
  jobId?: string;
  enabled: boolean;
  updateInterval?: number; // in milliseconds, default 4000 (4 seconds)
}

export const useLocationTracking = ({
  mechanicId,
  jobId,
  enabled,
  updateInterval = 4000,
}: UseLocationTrackingProps) => {
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTime = useRef<number>(0);

  const updateLocation = async (position: GeolocationPosition) => {
    const now = Date.now();
    const { latitude, longitude, heading, speed, accuracy } = position.coords;

    // Throttle updates to prevent excessive API calls
    if (now - lastUpdateTime.current < updateInterval) {
      return;
    }

    lastUpdateTime.current = now;

    const locationData: LocationData = {
      lat: latitude,
      lng: longitude,
      heading: heading || undefined,
      speed: speed || undefined,
      accuracy: accuracy || undefined,
    };

    setCurrentLocation(locationData);

    try {
      // Call the database function to update location
      const { error } = await supabase.rpc('update_mechanic_location', {
        p_mechanic_id: mechanicId,
        p_lat: latitude,
        p_lng: longitude,
        p_heading: heading || null,
        p_speed: speed || null,
        p_accuracy: accuracy || null,
        p_job_id: jobId || null,
      });

      if (error) {
        console.error('Error updating location:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Failed to update location:', error);
      toast({
        title: 'Location Update Failed',
        description: 'Failed to update your location. Please check your connection.',
        variant: 'destructive',
      });
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not Supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return;
    }

    // Request high-accuracy location tracking
    watchId.current = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: 'Location Error',
          description: 'Unable to access your location. Please enable location services.',
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    setIsTracking(true);
    console.log('Location tracking started');
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    setIsTracking(false);
    console.log('Location tracking stopped');
  };

  useEffect(() => {
    if (enabled && mechanicId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, mechanicId, jobId]);

  return {
    isTracking,
    currentLocation,
    startTracking,
    stopTracking,
  };
};
