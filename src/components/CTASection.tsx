import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.1)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto animate-fadeIn">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Get Started Today
          </h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Join thousands of satisfied customers who trust AutoAid for their vehicle needs. 
            Download our app or book online now.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg" 
              className="text-lg px-8 bg-white text-primary hover:bg-white/90 shadow-medium hover:shadow-strong"
            >
              <Smartphone className="w-5 h-5" />
              Download App
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary"
            >
              Book Online
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;