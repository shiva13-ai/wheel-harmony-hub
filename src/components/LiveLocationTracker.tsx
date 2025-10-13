import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Navigation } from 'lucide-react';
import { fetchETA, formatDuration, formatDistance } from '@/utils/mapHelpers';

// Fix default icon issue with Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LiveLocationTrackerProps {
  serviceRequestId: string;
  userRole: 'customer' | 'mechanic';
  userId: string;
}

function MapBoundsUpdater({ 
  customerPosition, 
  mechanicPosition 
}: { 
  customerPosition: LatLngTuple | null;
  mechanicPosition: LatLngTuple | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (customerPosition && mechanicPosition) {
      const bounds = L.latLngBounds([customerPosition, mechanicPosition]);
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
    } else if (customerPosition) {
      map.flyTo(customerPosition, 14);
    } else if (mechanicPosition) {
      map.flyTo(mechanicPosition, 14);
    }
  }, [customerPosition, mechanicPosition, map]);

  return null;
}

const LiveLocationTracker = ({ serviceRequestId, userRole, userId }: LiveLocationTrackerProps) => {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [otherUserLocation, setOtherUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<{ duration: number; distance: number } | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const etaInterval = useRef<NodeJS.Timeout | null>(null);

  const customerPosition: LatLngTuple | null = 
    userRole === 'customer' && myLocation 
      ? [myLocation.lat, myLocation.lng]
      : otherUserLocation && userRole === 'mechanic'
      ? [otherUserLocation.lat, otherUserLocation.lng]
      : null;

  const mechanicPosition: LatLngTuple | null =
    userRole === 'mechanic' && myLocation
      ? [myLocation.lat, myLocation.lng]
      : otherUserLocation && userRole === 'customer'
      ? [otherUserLocation.lat, otherUserLocation.lng]
      : null;

  // Calculate ETA periodically
  useEffect(() => {
    const calculateETA = async () => {
      if (!myLocation || !otherUserLocation) return;

      const result = await fetchETA(
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
      etaInterval.current = setInterval(calculateETA, 15000);
    }

    return () => {
      if (etaInterval.current) {
        clearInterval(etaInterval.current);
      }
    };
  }, [myLocation, otherUserLocation, userRole]);

  useEffect(() => {
    const channel = supabase.channel(`location:${serviceRequestId}`)
      .on(
        'broadcast',
        { event: 'location_update' },
        (payload) => {
          if (payload.payload.userId !== userId) {
            const { lat, lng } = payload.payload;
            setOtherUserLocation({ lat, lng });
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
    if (!isSharing) {
      startSharing();
    }
    
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const defaultCenter: LatLngTuple = [28.6139, 77.2090];

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

        <div className="w-full h-[400px] rounded-lg border shadow-sm overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsUpdater 
              customerPosition={customerPosition}
              mechanicPosition={mechanicPosition}
            />
            {customerPosition && (
              <Marker position={customerPosition} icon={blueIcon}>
                <Popup>
                  <p className="font-bold">
                    {userRole === 'customer' ? 'Your Location (Customer)' : 'Customer Location'}
                  </p>
                </Popup>
              </Marker>
            )}
            {mechanicPosition && (
              <Marker position={mechanicPosition} icon={redIcon}>
                <Popup>
                  <p className="font-bold">
                    {userRole === 'mechanic' ? 'Your Location (Mechanic)' : 'Mechanic Location'}
                  </p>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        
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
