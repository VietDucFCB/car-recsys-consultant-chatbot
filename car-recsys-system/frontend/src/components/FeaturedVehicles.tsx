import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import VehicleCard from "./VehicleCard";
import { vehicles } from "@/data/vehicles";
import { Button } from "@/components/ui/button";

const FeaturedVehicles = () => {
  const featuredVehicles = vehicles.slice(0, 4);

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className="absolute top-1/2 -right-64 w-80 h-80 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
          <div className="max-w-xl">
            <span className="text-[10px] tracking-[0.2em] text-accent uppercase mb-4 block">
              Hand-picked selection
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-medium text-foreground mb-4 tracking-tight">
              Featured Vehicles
            </h2>
            <p className="text-muted-foreground">
              Discover our most exclusive listings, carefully selected for
              quality and value.
            </p>
          </div>

          <Link to="/search">
            <Button
              variant="outline"
              className="group tracking-wide px-6 h-12 rounded-sm border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all duration-500"
            >
              View All Inventory
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredVehicles.map((vehicle, index) => (
            <div
              key={vehicle.id}
              className="animate-fade-in opacity-0"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <VehicleCard {...vehicle} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground mb-8">
            Looking for something specific? We can help you find it.
          </p>
          <Link to="/search">
            <Button
              size="lg"
              className="bg-accent hover:bg-champagne-dark text-accent-foreground font-body tracking-wide px-8 h-14 rounded-sm shadow-soft hover:shadow-elegant transition-all duration-500"
            >
              Search Our Full Inventory
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedVehicles;
