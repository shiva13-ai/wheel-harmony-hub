import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, Navigation, Power, PowerOff } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ServiceRequest {
  id: string;
  vehicle_type: string;
  service_type: string;
  description: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  urgency_level: string;
  status: string;
  created_at: string;
  distance?: number;
}

const MechanicDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mechanicProfile, setMechanicProfile] = useState<any>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [mechanicLocation, setMechanicLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapboxToken = localStorage.getItem('mapbox_token') || '';

  // Continuous location tracking hook
  const { isTracking, currentLocation } = useLocationTracking({
    mechanicId: mechanicProfile?.id || '',
    jobId: activeJobId || undefined,
    enabled: isOnline && !!mechanicProfile,
    updateInterval: 4000,
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Update mechanic status when online/offline changes
  useEffect(() => {
    const updateMechanicStatus = async () => {
      if (!mechanicProfile) return;

      const { error } = await supabase
        .from('mechanic_profiles')
        .update({ status: isOnline ? 'online' : 'offline' })
        .eq('id', mechanicProfile.id);

      if (error) {
        console.error('Error updating mechanic status:', error);
      }
    };

    updateMechanicStatus();
  }, [isOnline, mechanicProfile]);

  // Update mechanic location from tracking hook
  useEffect(() => {
    if (currentLocation) {
      setMechanicLocation(currentLocation);
    }
  }, [currentLocation]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Get mechanic profile
        const { data: profile, error: profileError } = await supabase
          .from('mechanic_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          toast({
            title: 'Not a mechanic',
            description: 'You need to create a mechanic profile first',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setMechanicProfile(profile);
        setIsOnline(profile.status === 'online');

        // Check for active job
        const { data: activeJob } = await supabase
          .from('service_requests')
          .select('id')
          .eq('assigned_mechanic_id', profile.id)
          .in('status', ['assigned', 'in_progress'])
          .maybeSingle();

        if (activeJob) {
          setActiveJobId(activeJob.id);
        }

        // Get mechanic's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              setMechanicLocation({ lat: latitude, lng: longitude });

              // Update mechanic location in database
              await supabase
                .from('mechanic_profiles')
                .update({
                  location_lat: latitude,
                  location_lng: longitude,
                })
                .eq('id', profile.id);

              // Fetch pending requests
              const { data: serviceRequests, error: requestsError } = await supabase
                .from('service_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

              if (requestsError) throw requestsError;

              // Calculate distances and filter by service radius
              const requestsWithDistance = serviceRequests
                ?.map((req: any) => ({
                  ...req,
                  distance: req.location_lat && req.location_lng
                    ? calculateDistance(latitude, longitude, req.location_lat, req.location_lng)
                    : null,
                }))
                .filter((req) => !req.distance || req.distance <= (profile.service_radius || 50))
                .sort((a, b) => (a.distance || 0) - (b.distance || 0)) || [];

              setRequests(requestsWithDistance);
              setLoading(false);
            },
            (error) => {
              console.error('Location error:', error);
              toast({
                title: 'Location Required',
                description: 'Please enable location services to see nearby requests',
                variant: 'destructive',
              });
              setLoading(false);
            }
          );
        }
      } catch (error: any) {
        console.error('Error:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('service-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, toast]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !mechanicLocation) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [mechanicLocation.lng, mechanicLocation.lat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add mechanic marker
    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([mechanicLocation.lng, mechanicLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<p>Your Location</p>'))
      .addTo(map.current);

    // Add request markers
    requests.forEach((request) => {
      if (request.location_lat && request.location_lng) {
        new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([request.location_lng, request.location_lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<div>
                <p class="font-bold">${request.service_type}</p>
                <p>${request.vehicle_type}</p>
                <p class="text-sm">${request.distance?.toFixed(1)} km away</p>
              </div>`
            )
          )
          .addTo(map.current!);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, mechanicLocation, requests]);

  const handleAcceptRequest = async (requestId: string) => {
    if (!mechanicProfile) return;

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          assigned_mechanic_id: mechanicProfile.id,
          status: 'assigned',
        })
        .eq('id', requestId);

      if (error) throw error;

      setActiveJobId(requestId);
      setIsOnline(true);

      // Update mechanic status to busy
      await supabase
        .from('mechanic_profiles')
        .update({ status: 'busy' })
        .eq('id', mechanicProfile.id);

      toast({
        title: 'Request Accepted',
        description: 'Your location will be shared with the customer',
      });

      navigate(`/track/${requestId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'emergency':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mechanic Dashboard</h1>
            <p className="text-muted-foreground">
              Service Radius: {mechanicProfile?.service_radius || 50} km
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Switch
                id="online-status"
                checked={isOnline}
                onCheckedChange={setIsOnline}
              />
              <Label htmlFor="online-status" className="flex items-center gap-2 cursor-pointer">
                {isOnline ? (
                  <>
                    <Power className="w-4 h-4 text-success" />
                    <span className="text-success font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <PowerOff className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Offline</span>
                  </>
                )}
              </Label>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              ← Back to Home
            </Button>
          </div>
        </div>

        {isTracking && (
          <Card className="mb-6 border-primary">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <p className="font-medium">Live location tracking active - Location updated every 4 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {mapboxToken && mechanicLocation && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Nearby Service Requests</CardTitle>
              <CardDescription>
                Red marker: Your location | Blue markers: Service requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={mapContainer} className="w-full h-[400px] rounded-lg border shadow-sm" />
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Available Requests ({requests.length})</h2>
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No service requests available in your area</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold">{request.service_type}</h3>
                        <Badge className={getUrgencyColor(request.urgency_level)}>
                          {request.urgency_level.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Vehicle:</span>
                          <span className="text-muted-foreground">{request.vehicle_type}</span>
                        </div>
                        
                        {request.distance && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium">{request.distance.toFixed(1)} km away</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">
                            {new Date(request.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Location:</p>
                        <p className="text-sm text-muted-foreground">{request.location_address}</p>
                      </div>

                      {request.description && (
                        <div>
                          <p className="text-sm font-medium">Description:</p>
                          <p className="text-sm text-muted-foreground">{request.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 md:w-48">
                      <Button onClick={() => handleAcceptRequest(request.id)} className="w-full">
                        <Navigation className="w-4 h-4 mr-2" />
                        Accept & Navigate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicDashboard;
