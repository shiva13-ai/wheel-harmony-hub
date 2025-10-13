import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Navigation, TrendingUp } from 'lucide-react';
import { animateMarker, fetchETA, formatDuration, formatDistance } from '@/utils/mapHelpers';

interface LiveLocationTrackerProps {
  serviceRequestId: string;
  userRole: 'customer' | 'mechanic';
  userId: string;
}

const LiveLocationTracker = ({ serviceRequestId, userRole, userId }: LiveLocationTrackerProps) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [otherUserLocation, setOtherUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<{ duration: number; distance: number } | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const customerMarker = useRef<mapboxgl.Marker | null>(null);
  const mechanicMarker = useRef<mapboxgl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const etaInterval = useRef<NodeJS.Timeout | null>(null);
  const lastMarkerPosition = useRef<{ customer?: [number, number]; mechanic?: [number, number] }>({});
  const mapboxToken = localStorage.getItem('mapbox_token') || '';

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.2090, 28.6139],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Calculate ETA periodically
  useEffect(() => {
    const calculateETA = async () => {
      if (!myLocation || !otherUserLocation || !mapboxToken) return;

      // For customer: mechanic location to customer location
      // For mechanic: mechanic location to customer location
      const result = await fetchETA(
        mapboxToken,
        userRole === 'customer' ? otherUserLocation.lng : myLocation.lng,
        userRole === 'customer' ? otherUserLocation.lat : myLocation.lat,
        userRole === 'customer' ? myLocation.lng : otherUserLocation.lng,
        userRole === 'customer' ? myLocation.lat : otherUserLocation.lat
      );

      if (result) {
        setEta(result);
      }
    };

    if (myLocation && otherUserLocation) {
      calculateETA();
      // Update ETA every 15 seconds
      etaInterval.current = setInterval(calculateETA, 15000);
    }

    return () => {
      if (etaInterval.current) {
        clearInterval(etaInterval.current);
      }
    };
  }, [myLocation, otherUserLocation, mapboxToken, userRole]);

  useEffect(() => {
    const channel = supabase.channel(`location:${serviceRequestId}`)
      .on(
        'broadcast',
        { event: 'location_update' },
        (payload) => {
          if (payload.payload.userId !== userId) {
            const { lat, lng, role } = payload.payload;
            setOtherUserLocation({ lat, lng });

            if (map.current) {
              const marker = role === 'customer' ? customerMarker : mechanicMarker;
              const markerKey = role as 'customer' | 'mechanic';
              const color = role === 'customer' ? '#3b82f6' : '#ef4444';
              const label = role === 'customer' ? 'Customer Location' : 'Mechanic Location';
              const newPosition: [number, number] = [lng, lat];

              if (marker.current) {
                // Smooth animation from last position to new position
                const lastPos = lastMarkerPosition.current[markerKey];
                if (lastPos) {
                  animateMarker(marker.current, lastPos, newPosition, 2000);
                } else {
                  marker.current.setLngLat(newPosition);
                }
              } else {
                marker.current = new mapboxgl.Marker({ color })
                  .setLngLat(newPosition)
                  .setPopup(new mapboxgl.Popup().setHTML(`<p class="font-bold">${label}</p>`))
                  .addTo(map.current);
              }

              lastMarkerPosition.current[markerKey] = newPosition;

              // Fit bounds to show both markers if both exist
              if (customerMarker.current && mechanicMarker.current) {
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend(customerMarker.current.getLngLat());
                bounds.extend(mechanicMarker.current.getLngLat());
                map.current.fitBounds(bounds, { padding: 100, maxZoom: 15 });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceRequestId, userId]);

  const startSharing = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setMyLocation({ lat: latitude, lng: longitude });

        await supabase.channel(`location:${serviceRequestId}`).send({
          type: 'broadcast',
          event: 'location_update',
          payload: {
            lat: latitude,
            lng: longitude,
            userId,
            role: userRole,
          },
        });

        if (map.current) {
          const marker = userRole === 'customer' ? customerMarker : mechanicMarker;
          const markerKey = userRole as 'customer' | 'mechanic';
          const color = userRole === 'customer' ? '#3b82f6' : '#ef4444';
          const label = userRole === 'customer' ? 'Your Location (Customer)' : 'Your Location (Mechanic)';
          const newPosition: [number, number] = [longitude, latitude];

          if (marker.current) {
            // Smooth animation for own marker too
            const lastPos = lastMarkerPosition.current[markerKey];
            if (lastPos) {
              animateMarker(marker.current, lastPos, newPosition, 2000);
            } else {
              marker.current.setLngLat(newPosition);
            }
          } else {
            marker.current = new mapboxgl.Marker({ color })
              .setLngLat(newPosition)
              .setPopup(new mapboxgl.Popup().setHTML(`<p class="font-bold">${label}</p>`))
              .addTo(map.current);
          }

          lastMarkerPosition.current[markerKey] = newPosition;

          // Fit bounds to show both markers if both exist
          if (customerMarker.current && mechanicMarker.current) {
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend(customerMarker.current.getLngLat());
            bounds.extend(mechanicMarker.current.getLngLat());
            map.current.fitBounds(bounds, { padding: 100, maxZoom: 15 });
          } else {
            map.current.flyTo({ center: [longitude, latitude], zoom: 14 });
          }
        }

        setIsSharing(true);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: 'Location Error',
          description: 'Could not get your location. Please enable location services.',
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  };

  const stopSharing = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsSharing(false);
  };

  // Auto-start location sharing when component mounts
  useEffect(() => {
    if (mapboxToken && !isSharing) {
      startSharing();
    }
    
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  if (!mapboxToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Location Tracking</CardTitle>
          <CardDescription>Please set up Mapbox token first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Live Location Tracking</CardTitle>
            <CardDescription>
              {userRole === 'customer' 
                ? 'Share your location with the mechanic'
                : 'Track customer location in real-time'}
            </CardDescription>
          </div>
          {isSharing ? (
            <Badge variant="default" className="bg-green-500">Sharing Location</Badge>
          ) : (
            <Badge variant="secondary">Not Sharing</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ETA and Distance Display */}
        {eta && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-accent rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ETA</p>
                <p className="text-lg font-bold">{formatDuration(eta.duration)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-lg font-bold">{formatDistance(eta.distance)}</p>
              </div>
            </div>
          </div>
        )}

        <div ref={mapContainer} className="w-full h-[400px] rounded-lg border shadow-sm" />
        
        <div className="flex gap-2">
          <Button onClick={stopSharing} variant="outline" className="w-full" disabled={!isSharing}>
            Stop Sharing Location
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveLocationTracker;
