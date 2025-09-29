import { Button } from "@/components/ui/button";
import { MapPin, Clock, Shield, Star } from "lucide-react";
import heroImage from "@/assets/hero-vehicles.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-background via-accent/20 to-background overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage}
          alt="Professional vehicle service with multiple vehicles in modern garage"
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/90"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          {/* Hero Content */}
          <div className="animate-fadeIn">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Your{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                One-Stop Solution
              </span>
              <br />
              for All Vehicle Services
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              From bicycles to cars, find trusted mechanics, emergency services, 
              and accessories all in one place. Available 24/7 with instant booking.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button variant="hero" size="lg" className="text-lg px-8">
                <MapPin className="w-5 h-5" />
                Book Service Now
              </Button>
              <Button variant="emergency" size="lg" className="text-lg px-8">
                Emergency SOS
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-slideUp">
            <div className="bg-gradient-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <MapPin className="w-8 h-8 text-primary mb-2" />
                <div className="text-3xl font-bold text-foreground">500+</div>
                <div className="text-sm text-muted-foreground">Mechanics</div>
              </div>
            </div>
            
            <div className="bg-gradient-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <Clock className="w-8 h-8 text-primary mb-2" />
                <div className="text-3xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </div>
            
            <div className="bg-gradient-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <Shield className="w-8 h-8 text-success mb-2" />
                <div className="text-3xl font-bold text-foreground">100%</div>
                <div className="text-sm text-muted-foreground">Verified</div>
              </div>
            </div>
            
            <div className="bg-gradient-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <Star className="w-8 h-8 text-emergency mb-2" />
                <div className="text-3xl font-bold text-foreground">4.9</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;