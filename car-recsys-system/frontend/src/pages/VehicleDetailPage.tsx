import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Share2,
  Phone,
  MessageCircle,
  MapPin,
  Fuel,
  Gauge,
  Settings2,
  Calendar,
  Palette,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { vehicles } from "@/data/vehicles";

const VehicleDetailPage = () => {
  const { id } = useParams();
  const vehicle = vehicles.find((v) => v.id === Number(id));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-28 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-3xl mb-4">Vehicle not found</h1>
            <Link to="/search">
              <Button className="rounded-xl">Back to Search</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length);
  };

  const specs = [
    { icon: Calendar, label: "Year", value: vehicle.year },
    { icon: Gauge, label: "Mileage", value: vehicle.mileage },
    { icon: Fuel, label: "Fuel Type", value: vehicle.fuelType },
    { icon: Settings2, label: "Transmission", value: vehicle.transmission },
    { icon: Palette, label: "Color", value: vehicle.color },
    { icon: Users, label: "Seats", value: `${vehicle.seats} seats` },
    { icon: Zap, label: "Engine", value: vehicle.engine },
    { icon: Zap, label: "Power", value: vehicle.power },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back button */}
          <Link
            to="/search"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </Link>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-secondary">
                <img
                  src={vehicle.images[currentImageIndex]}
                  alt={vehicle.title}
                  className="w-full h-full object-cover"
                />
                {vehicle.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}

                {/* Image counter */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium">
                  {currentImageIndex + 1} / {vehicle.images.length}
                </div>
              </div>

              {/* Thumbnails */}
              {vehicle.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {vehicle.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`shrink-0 w-24 h-18 rounded-xl overflow-hidden border-2 transition-all ${
                        index === currentImageIndex 
                          ? "border-accent ring-2 ring-accent/20" 
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-medium text-accent uppercase tracking-wider mb-1">
                      {vehicle.brand}
                    </p>
                    <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
                      {vehicle.model}
                    </h1>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-11 w-11"
                      onClick={() => setIsFavorite(!isFavorite)}
                    >
                      <Heart
                        className={`h-5 w-5 ${isFavorite ? "fill-accent text-accent" : ""}`}
                      />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full h-11 w-11">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  {vehicle.title}
                </p>
              </div>

              <p className="font-heading text-4xl font-bold text-foreground">{vehicle.price}</p>

              <Separator className="my-6" />

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-4">
                {specs.map((spec, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                    <div className="p-2.5 bg-accent/10 rounded-lg">
                      <spec.icon className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{spec.label}</p>
                      <p className="text-sm font-medium text-foreground">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              {/* Description */}
              <div>
                <h3 className="font-heading text-xl font-semibold mb-4">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{vehicle.description}</p>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-heading text-xl font-semibold mb-4">Features</h3>
                <div className="flex flex-wrap gap-2">
                  {vehicle.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1.5 rounded-lg text-sm font-normal">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Seller Info */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-5">
                  <Avatar className="h-14 w-14 border-2 border-accent/20">
                    <AvatarImage src={vehicle.seller.avatar} />
                    <AvatarFallback className="text-lg">{vehicle.seller.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-lg">{vehicle.seller.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {vehicle.seller.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                    <Shield className="h-3.5 w-3.5" />
                    Verified
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1 h-12 rounded-xl bg-accent hover:bg-gold-dark text-accent-foreground shadow-gold">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Now
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 rounded-xl">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VehicleDetailPage;
