import { Link } from "react-router-dom";

const categories = [
  "Electric",
  "SUV",
  "Sedan",
  "Pickup Truck",
  "Luxury",
  "Crossover",
  "Hybrid",
  "Diesel",
  "Coupe",
  "Hatchback",
  "Wagon",
  "Convertible",
];

const PopularCategories = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-heading text-2xl font-medium text-foreground mb-8 tracking-tight">
          Popular categories
        </h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((category, index) => (
            <Link
              key={category}
              to={`/search?category=${encodeURIComponent(category)}`}
              className={`px-5 py-2.5 rounded-sm text-sm tracking-wide transition-all duration-300 ${
                index === 0
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-secondary/50 text-foreground border border-border/50 hover:bg-accent hover:text-accent-foreground hover:border-accent"
              }`}
            >
              {category}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularCategories;
