import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bike, Car, Truck, Wrench, ArrowRight } from "lucide-react";

const VehicleServices = () => {
  const services = [
    {
      icon: <Bike className="w-12 h-12 text-primary" />,
      title: "Bicycle Services",
      description: "Professional bicycle maintenance and repair services",
      services: ["Puncture Repair", "Brake Fix", "Chain Repair", "Gear Adjustment"],
      emergency: true,
    },
    {
      icon: <Bike className="w-12 h-12 text-primary transform scale-150" />,
      title: "Bike Services", 
      description: "Complete motorcycle and bike maintenance solutions",
      services: ["Oil Change", "Tyre Replacement", "Engine Tuning", "Battery Service"],
      emergency: true,
    },
    {
      icon: <Truck className="w-12 h-12 text-primary" />,
      title: "Auto Services",
      description: "Comprehensive auto rickshaw and commercial vehicle care", 
      services: ["Engine Repair", "Transmission", "AC Service", "Electrical Work"],
      emergency: true,
    },
    {
      icon: <Car className="w-12 h-12 text-primary" />,
      title: "Car Services",
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
                >
                  View Services
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VehicleServices;