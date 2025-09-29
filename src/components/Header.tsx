import { Button } from "@/components/ui/button";
import { Wrench, Phone, MapPin, User } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-soft">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AutoAid</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#services" className="text-muted-foreground hover:text-primary transition-colors">
              Services
            </a>
            <a href="#mechanics" className="text-muted-foreground hover:text-primary transition-colors">
              Find Mechanics
            </a>
            <a href="#store" className="text-muted-foreground hover:text-primary transition-colors">
              Store
            </a>
            <Button variant="emergency" size="sm">
              <Phone className="w-4 h-4" />
              Emergency
            </Button>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <User className="w-4 h-4" />
              Sign In
            </Button>
            <Button variant="hero" size="sm">
              Join as Mechanic
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;