import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LiveLocationTrackerProps {
  serviceRequestId: string;
  userRole: 'customer' | 'mechanic';
  userId: string;
}

const LiveLocationTracker = ({ serviceRequestId, userRole, userId }: LiveLocationTrackerProps) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [otherUserLocation, setOtherUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const customerMarker = useRef<mapboxgl.Marker | null>(null);
  const mechanicMarker = useRef<mapboxgl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
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
              const color = role === 'customer' ? '#3b82f6' : '#ef4444';

              if (marker.current) {
                marker.current.setLngLat([lng, lat]);
              } else {
                marker.current = new mapboxgl.Marker({ color })
                  .setLngLat([lng, lat])
                  .setPopup(new mapboxgl.Popup().setHTML(`<p>${role === 'customer' ? 'Customer' : 'Mechanic'} Location</p>`))
                  .addTo(map.current);
              }

              map.current.flyTo({ center: [lng, lat], zoom: 14 });
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
          const color = userRole === 'customer' ? '#3b82f6' : '#ef4444';

          if (marker.current) {
            marker.current.setLngLat([longitude, latitude]);
          } else {
            marker.current = new mapboxgl.Marker({ color })
              .setLngLat([longitude, latitude])
              .setPopup(new mapboxgl.Popup().setHTML('<p>Your Location</p>'))
              .addTo(map.current);
          }

          map.current.flyTo({ center: [longitude, latitude], zoom: 14 });
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
        maximumAge: 10000,
        timeout: 5000,
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

  useEffect(() => {
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
        <div ref={mapContainer} className="w-full h-[400px] rounded-lg border shadow-sm" />
        <div className="flex gap-2">
          {!isSharing ? (
            <Button onClick={startSharing} className="w-full">
              Start Sharing Location
            </Button>
          ) : (
            <Button onClick={stopSharing} variant="destructive" className="w-full">
              Stop Sharing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveLocationTracker;
