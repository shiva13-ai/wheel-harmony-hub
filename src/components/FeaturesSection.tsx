import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  MessageCircle, 
  ShoppingCart, 
  Star, 
  CreditCard, 
  Phone, 
  AlertTriangle,
  History 
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: <MapPin className="w-8 h-8 text-primary" />,
      title: "Location-Based Discovery",
      description: "Find nearby mechanics using GPS and Google Maps integration",
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-primary" />,
      title: "AI Chatbot Assistant", 
      description: "24/7 troubleshooting, FAQs, and guided booking assistance",
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-primary" />,
      title: "Online Accessories Store",
      description: "Shop from local stores with cart, checkout, and tracking",
    },
    {
      icon: <Star className="w-8 h-8 text-primary" />,
      title: "Ratings & Reviews",
      description: "Transparent feedback system for mechanics and shops",
    },
    {
      icon: <CreditCard className="w-8 h-8 text-primary" />,
      title: "Multiple Payment Options",
      description: "UPI, Stripe, PayPal integration for seamless transactions",
    },
    {
      icon: <Phone className="w-8 h-8 text-primary" />,
      title: "In-App Communication",
      description: "Direct chat and call between users and service providers",
    },
    {
      icon: <AlertTriangle className="w-8 h-8 text-emergency" />,
      title: "Emergency SOS",
      description: "Instant emergency assistance with location sharing",
    },
    {
      icon: <History className="w-8 h-8 text-primary" />,
      title: "Service History",
      description: "Track all your services and purchases in one place",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fadeIn">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful Features for Modern Vehicle Care
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to maintain your vehicles, connect with trusted mechanics, 
            and shop for accessories - all in one comprehensive platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="group bg-gradient-card shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border-0 animate-slideUp"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center group-hover:animate-float">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;