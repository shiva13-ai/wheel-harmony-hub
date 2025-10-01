import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock } from 'lucide-react';

interface ServiceRequest {
  id: string;
  vehicle_type: string;
  service_type: string;
  description: string;
  location_address: string;
  urgency_level: string;
  status: string;
  created_at: string;
  assigned_mechanic_id: string | null;
}

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          navigate('/auth');
          return;
        }
        setUser(currentUser);

        const { data: serviceRequests, error } = await supabase
          .from('service_requests')
          .select('*')
          .eq('customer_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setRequests(serviceRequests || []);
      } catch (error: any) {
        console.error('Error:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('my-requests-changes')
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'assigned':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
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
            <h1 className="text-3xl font-bold">My Service Requests</h1>
            <p className="text-muted-foreground">Track all your service bookings</p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            ← Back to Home
          </Button>
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No service requests yet</p>
                <Button onClick={() => navigate('/')}>Request a Service</Button>
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
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.toUpperCase()}
                        </Badge>
                        <Badge className={getUrgencyColor(request.urgency_level)}>
                          {request.urgency_level.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Vehicle:</span>
                          <span className="text-muted-foreground">{request.vehicle_type}</span>
                        </div>
                        
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
                      {request.status !== 'pending' && request.status !== 'cancelled' && (
                        <Button 
                          onClick={() => navigate(`/track/${request.id}`)}
                          className="w-full"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Track Mechanic
                        </Button>
                      )}
                      {request.status === 'pending' && (
                        <p className="text-sm text-muted-foreground text-center">
                          Waiting for mechanic...
                        </p>
                      )}
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

export default CustomerDashboard;
