import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with parallax effect */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&h=1080&fit=crop&q=80"
          alt="Luxury sports car on scenic road"
          className="w-full h-full object-cover scale-105"
        />
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIi8+PC9zdmc+')]" />
      </div>

      {/* Subtle decorative elements */}
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent/3 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-24">
        <div className="max-w-2xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-secondary/40 backdrop-blur-sm border border-border/30 mb-10 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">
              Premium Collection
            </span>
          </div>

          {/* Main heading */}
          <h1
            className="font-heading text-5xl md:text-6xl lg:text-7xl font-medium text-foreground leading-[1.05] mb-8 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Find Your
            <br />
            <span className="text-gradient-champagne">Dream Car</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg text-muted-foreground max-w-lg mb-12 leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            Explore our curated collection of luxury vehicles, supercars, and
            exotic automobiles from trusted sellers worldwide.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 animate-fade-in"
            style={{ animationDelay: "0.6s" }}
          >
            <Link to="/search">
              <Button
                size="lg"
                className="group bg-accent hover:bg-champagne-dark text-accent-foreground font-body tracking-wide px-8 h-14 rounded-sm shadow-soft hover:shadow-elegant transition-all duration-500"
              >
                Browse Inventory
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/sell">
              <Button
                size="lg"
                variant="outline"
                className="font-body tracking-wide px-8 h-14 rounded-sm border-border/50 hover:bg-secondary/50 hover:border-accent/30 transition-all duration-500"
              >
                <Play className="mr-2 h-4 w-4" />
                Sell Your Car
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-10 mt-20 pt-10 border-t border-border/20 animate-fade-in"
            style={{ animationDelay: "0.8s" }}
          >
            {[
              { value: "15K+", label: "Vehicles Listed" },
              { value: "8.5K", label: "Happy Buyers" },
              { value: "99%", label: "Satisfaction" },
            ].map((stat, index) => (
              <div key={index} className="text-center sm:text-left">
                <p className="font-heading text-2xl md:text-3xl font-medium text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs tracking-wide text-muted-foreground mt-1 uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: "1s" }}>
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-accent/60 to-transparent" />
      </div>
    </section>
  );
};

export default Hero;
