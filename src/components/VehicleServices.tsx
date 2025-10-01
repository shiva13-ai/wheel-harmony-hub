import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bike, Car, Truck, Wrench, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import LocationMap from "./LocationMap";

const serviceRequestSchema = z.object({
  vehicleType: z.string().min(1, "Please select a vehicle type"),
  serviceType: z.string().trim().min(2, "Service type is required").max(100),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional(),
  locationAddress: z.string().trim().min(5, "Location address is required").max(200),
  urgencyLevel: z.enum(['low', 'normal', 'high', 'emergency']),
});

const VehicleServices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  
  // Form fields
  const [vehicleType, setVehicleType] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'normal' | 'high' | 'emergency'>('normal');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleRequestService = (service: string, vehicle: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to request a service",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setSelectedService(service);
    setVehicleType(vehicle);
    setServiceType(service);
    setDialogOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = serviceRequestSchema.parse({
        vehicleType,
        serviceType,
        description: description || undefined,
        locationAddress,
        urgencyLevel,
      });

      const { error } = await supabase.from('service_requests').insert({
        customer_id: user.id,
        vehicle_type: validated.vehicleType,
        service_type: validated.serviceType,
        description: validated.description,
        location_address: validated.locationAddress,
        location_lat: locationLat,
        location_lng: locationLng,
        urgency_level: validated.urgencyLevel,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: "Service requested!",
        description: "A mechanic will contact you shortly",
      });
      
      setDialogOpen(false);
      // Reset form
      setVehicleType("");
      setServiceType("");
      setDescription("");
      setLocationAddress("");
      setLocationLat(null);
      setLocationLng(null);
      setUrgencyLevel('normal');
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Could not submit service request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const services = [
    {
      icon: <Bike className="w-12 h-12 text-primary" />,
      title: "Bicycle Services",
      type: "Bicycle",
      description: "Professional bicycle maintenance and repair services",
      services: ["Puncture Repair", "Brake Fix", "Chain Repair", "Gear Adjustment"],
      emergency: true,
    },
    {
      icon: <Bike className="w-12 h-12 text-primary transform scale-150" />,
      title: "Bike Services", 
      type: "Motorcycle",
      description: "Complete motorcycle and bike maintenance solutions",
      services: ["Oil Change", "Tyre Replacement", "Engine Tuning", "Battery Service"],
      emergency: true,
    },
    {
      icon: <Truck className="w-12 h-12 text-primary" />,
      title: "Auto Services",
      type: "Auto",
      description: "Comprehensive auto rickshaw and commercial vehicle care", 
      services: ["Engine Repair", "Transmission", "AC Service", "Electrical Work"],
      emergency: true,
    },
    {
      icon: <Car className="w-12 h-12 text-primary" />,
      title: "Car Services",
      type: "Car",
      description: "Full-service car maintenance and emergency assistance",
      services: ["AC Service", "Towing", "Engine Diagnostics", "Brake Service"],
      emergency: true,
    },
  ];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fadeIn">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Vehicle Type
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional services for all types of vehicles with certified mechanics
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card 
              key={service.title}
              className="group bg-gradient-card shadow-soft hover:shadow-strong transition-all duration-500 hover:-translate-y-2 border-0 animate-slideUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                {/* Emergency Badge */}
                {service.emergency && (
                  <div className="mb-4">
                    <Badge variant="destructive" className="bg-gradient-emergency">
                      Emergency Available
                    </Badge>
                  </div>
                )}

                {/* Icon */}
                <div className="mb-6 group-hover:animate-float">
                  {service.icon}
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-3 text-foreground">
                  {service.title}
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  {service.description}
                </p>

                {/* Services List */}
                <ul className="space-y-2 mb-6">
                  {service.services.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <Wrench className="w-3 h-3 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                  onClick={() => handleRequestService(service.title, service.type)}
                >
                  Request Service
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Service Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request {selectedService}</DialogTitle>
            <DialogDescription>
              Fill in the details and we'll connect you with a nearby mechanic
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Vehicle Type</Label>
              <Input
                id="vehicle-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="e.g., Car, Bike, Truck"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-type">Service Type</Label>
              <Input
                id="service-type"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="e.g., Oil Change, Tire Replacement"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details about your service needs"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Your address or location"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Select Location on Map</Label>
              <LocationMap
                onLocationSelect={(lat, lng, address) => {
                  setLocationLat(lat);
                  setLocationLng(lng);
                  setLocationAddress(address);
                }}
                initialLat={locationLat || undefined}
                initialLng={locationLng || undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select value={urgencyLevel} onValueChange={(v) => setUrgencyLevel(v as any)}>
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VehicleServices;
