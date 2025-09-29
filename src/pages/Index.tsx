import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import VehicleServices from "@/components/VehicleServices";
import FeaturesSection from "@/components/FeaturesSection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <VehicleServices />
        <FeaturesSection />
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
