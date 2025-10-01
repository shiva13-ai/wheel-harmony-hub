import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LiveLocationTracker from '@/components/LiveLocationTracker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TrackService = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [serviceRequest, setServiceRequest] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'customer' | 'mechanic' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          navigate('/auth');
          return;
        }
        setUser(currentUser);

        const { data: request, error } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (error) throw error;

        if (!request) {
          toast({
            title: 'Error',
            description: 'Service request not found',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setServiceRequest(request);

        // Determine user role
        if (request.customer_id === currentUser.id) {
          setUserRole('customer');
        } else {
          // Check if user is the assigned mechanic
          const { data: mechanicProfile } = await supabase
            .from('mechanic_profiles')
            .select('id')
            .eq('user_id', currentUser.id)
            .single();

          if (mechanicProfile && request.assigned_mechanic_id === mechanicProfile.id) {
            setUserRole('mechanic');
          } else {
            toast({
              title: 'Access Denied',
              description: 'You do not have access to this service request',
              variant: 'destructive',
            });
            navigate('/');
            return;
          }
        }
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
  }, [requestId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!serviceRequest || !userRole) {
    return null;
  }

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

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          ← Back to Home
        </Button>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Service Request Details</CardTitle>
                  <CardDescription>Request ID: {requestId?.slice(0, 8)}...</CardDescription>
                </div>
                <Badge className={getStatusColor(serviceRequest.status)}>
                  {serviceRequest.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle Type</p>
                  <p className="font-medium">{serviceRequest.vehicle_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <p className="font-medium">{serviceRequest.service_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Urgency Level</p>
                  <p className="font-medium capitalize">{serviceRequest.urgency_level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{serviceRequest.location_address}</p>
                </div>
              </div>
              {serviceRequest.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{serviceRequest.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {serviceRequest.status !== 'pending' && serviceRequest.status !== 'cancelled' && (
            <LiveLocationTracker
              serviceRequestId={requestId!}
              userRole={userRole}
              userId={user.id}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackService;
