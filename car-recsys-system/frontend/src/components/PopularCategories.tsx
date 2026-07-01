import { Link } from "react-router-dom";
import { Car, Zap, Leaf, Droplet, Wind, Truck, CarFront, Caravan } from "lucide-react";

// Only categories we can actually filter on: fuel (Electric/Hybrid/Diesel ->
// gold.vehicles.fuel_type) and body type (the rest -> gold.vehicles.body_type,
// derived from the model via a dbt seed). Luxury/Crossover dropped — no clean
// signal in the data.
const categories = [
  { name: "Electric", icon: Zap },
  { name: "SUV", icon: Truck },
  { name: "Sedan", icon: Car },
  { name: "Pickup Truck", icon: Truck },
  { name: "Hybrid", icon: Leaf },
  { name: "Diesel", icon: Droplet },
  { name: "Coupe", icon: CarFront },
  { name: "Hatchback", icon: Car },
  { name: "Wagon", icon: Caravan },
  { name: "Convertible", icon: Wind },
];

const PopularCategories = () => {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A87601]">
            Browse by type
          </span>
          <h2 className="mt-2 font-poppins text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Our Categories
          </h2>
          <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-[#A87601]" />
        </div>

        {/* 10 tiles → clean 5-col / 2-row on desktop, responsive down */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {categories.map(({ name, icon: Icon }, i) => (
            <Link
              key={name}
              to={`/search?category=${encodeURIComponent(name)}`}
              className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card px-4 py-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[#A87601]/60 hover:shadow-[0_18px_40px_-16px_rgba(168,118,1,0.45)] animate-fade-in opacity-0"
              style={{ animationDelay: `${i * 45}ms`, animationFillMode: "forwards" }}
            >
              {/* gold wash that fades in on hover */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#A87601]/0 to-[#A87601]/0 transition-colors duration-300 group-hover:from-[#A87601]/[0.06] group-hover:to-[#A87601]/[0.02]" />
              {/* icon chip */}
              <span className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-[#A87601]/10 text-[#A87601] ring-1 ring-[#A87601]/15 transition-all duration-300 group-hover:bg-[#A87601] group-hover:text-white group-hover:ring-[#A87601] group-hover:scale-110">
                <Icon className="h-6 w-6" />
              </span>
              <span className="relative text-sm font-semibold text-foreground/90 transition-colors duration-300 group-hover:text-[#A87601]">
                {name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularCategories;
