import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VehicleCard from "@/components/VehicleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { vehicles, brands, fuelTypes, transmissions, categories } from "@/data/vehicles";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "");
  const [location, setLocation] = useState<string>("");
  const [selectedFuel, setSelectedFuel] = useState<string>("");
  const [selectedTransmission, setSelectedTransmission] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [yearMin, setYearMin] = useState<string>("");
  const [yearMax, setYearMax] = useState<string>("");
  const [selectedMileage, setSelectedMileage] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get unique models based on selected brand
  const availableModels = useMemo(() => {
    if (!selectedBrand || selectedBrand === "all") {
      return [...new Set(vehicles.map((v) => v.model))];
    }
    return [...new Set(vehicles.filter((v) => v.brand === selectedBrand).map((v) => v.model))];
  }, [selectedBrand]);

  // Get unique years from vehicles
  const availableYears = useMemo(() => {
    const years = [...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a);
    return years;
  }, []);

  // Get unique locations
  const availableLocations = useMemo(() => {
    return [...new Set(vehicles.map((v) => v.seller.location))];
  }, []);

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      searchQuery === "" ||
      vehicle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBrand = selectedBrand === "" || selectedBrand === "all" || vehicle.brand === selectedBrand;
    const matchesModel = selectedModel === "" || selectedModel === "all" || vehicle.model === selectedModel;
    const matchesCategory = selectedCategory === "" || selectedCategory === "all" || vehicle.category === selectedCategory || vehicle.fuelType === selectedCategory;
    const matchesLocation = location === "" || vehicle.seller.location.toLowerCase().includes(location.toLowerCase());
    const matchesFuel = selectedFuel === "" || selectedFuel === "all" || vehicle.fuelType === selectedFuel;
    const matchesTransmission =
      selectedTransmission === "" || selectedTransmission === "all" || vehicle.transmission === selectedTransmission;

    // Price filtering
    let matchesPrice = true;
    if (priceMin) {
      const minPrice = parseInt(priceMin.replace(/\D/g, ""), 10);
      if (!isNaN(minPrice)) matchesPrice = vehicle.priceValue >= minPrice;
    }
    if (priceMax && matchesPrice) {
      const maxPrice = parseInt(priceMax.replace(/\D/g, ""), 10);
      if (!isNaN(maxPrice)) matchesPrice = vehicle.priceValue <= maxPrice;
    }

    // Year filtering
    let matchesYear = true;
    if (yearMin && yearMin !== "all") {
      matchesYear = vehicle.year >= parseInt(yearMin, 10);
    }
    if (yearMax && yearMax !== "all" && matchesYear) {
      matchesYear = vehicle.year <= parseInt(yearMax, 10);
    }

    // Mileage filtering
    let matchesMileage = true;
    if (selectedMileage && selectedMileage !== "all") {
      const maxMileage = parseInt(selectedMileage, 10);
      matchesMileage = vehicle.mileageValue <= maxMileage;
    }

    return matchesSearch && matchesBrand && matchesModel && matchesCategory && matchesLocation && matchesFuel && matchesTransmission && matchesPrice && matchesYear && matchesMileage;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedCategory("");
    setLocation("");
    setSelectedFuel("");
    setSelectedTransmission("");
    setPriceMin("");
    setPriceMax("");
    setYearMin("");
    setYearMax("");
    setSelectedMileage("");
  };

  const hasActiveFilters =
    searchQuery || selectedBrand || selectedModel || selectedCategory || location || selectedFuel || selectedTransmission || priceMin || priceMax || yearMin || yearMax || selectedMileage;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Basics Section */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-4">Basics</h4>
        <div className="space-y-4">
          {/* Make/Brand */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Make</Label>
            <Select value={selectedBrand} onValueChange={(val) => { setSelectedBrand(val); setSelectedModel(""); }}>
              <SelectTrigger className="h-10 rounded-lg bg-background border-input">
                <SelectValue placeholder="All makes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All makes</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-10 rounded-lg bg-background border-input">
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 rounded-lg bg-background border-input">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input
              type="text"
              placeholder="ZIP or city"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-10 rounded-lg bg-background border-input"
            />
          </div>
        </div>
      </div>

      {/* Price Section */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-4">Price</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Input
              type="text"
              placeholder="$0"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="h-10 rounded-lg bg-background border-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Input
              type="text"
              placeholder="$100k"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="h-10 rounded-lg bg-background border-input"
            />
          </div>
        </div>
      </div>

      {/* Year Section */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-4">Year</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Select value={yearMin} onValueChange={setYearMin}>
              <SelectTrigger className="h-10 rounded-lg bg-background border-input">
                <SelectValue placeholder="Oldest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Oldest</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Select value={yearMax} onValueChange={setYearMax}>
              <SelectTrigger className="h-10 rounded-lg bg-background border-input">
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Newest</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mileage Section */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-4">Mileage</h4>
        <Select value={selectedMileage} onValueChange={setSelectedMileage}>
          <SelectTrigger className="h-10 rounded-lg bg-background border-input">
            <SelectValue placeholder="Any mileage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any mileage</SelectItem>
            <SelectItem value="5000">Under 5,000 km</SelectItem>
            <SelectItem value="10000">Under 10,000 km</SelectItem>
            <SelectItem value="20000">Under 20,000 km</SelectItem>
            <SelectItem value="50000">Under 50,000 km</SelectItem>
            <SelectItem value="100000">Under 100,000 km</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fuel Type Section */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-4">Fuel Type</h4>
        <Select value={selectedFuel} onValueChange={setSelectedFuel}>
          <SelectTrigger className="h-10 rounded-lg bg-background border-input">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {fuelTypes.map((fuel) => (
              <SelectItem key={fuel} value={fuel}>
                {fuel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transmission Section */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-4">Transmission</h4>
        <Select value={selectedTransmission} onValueChange={setSelectedTransmission}>
          <SelectTrigger className="h-10 rounded-lg bg-background border-input">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {transmissions.map((trans) => (
              <SelectItem key={trans} value={trans}>
                {trans}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reset Filters Button */}
      <Button 
        variant="outline" 
        onClick={clearFilters} 
        className="w-full h-10 rounded-lg border-input"
      >
        Reset filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-2">
              Browse Inventory
            </h1>
            <p className="text-muted-foreground">
              Explore our collection of premium vehicles
            </p>
          </div>

          {/* Search Header */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
              <Input
                type="text"
                placeholder="Search by make, model, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-accent"
              />
            </div>

            {/* Mobile filter button */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden h-12 rounded-xl">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="font-heading">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex gap-8">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden md:block w-72 shrink-0">
              <div className="sticky top-28 bg-card border border-border rounded-2xl p-6">
                <h3 className="font-heading text-lg font-semibold mb-6">Filters</h3>
                <FilterContent />
              </div>
            </aside>

            {/* Results */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  Found <span className="text-foreground font-semibold">{filteredVehicles.length}</span> vehicles
                </p>
              </div>

              {filteredVehicles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredVehicles.map((vehicle, index) => (
                    <div
                      key={vehicle.id}
                      className="animate-fade-in opacity-0"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <VehicleCard {...vehicle} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/30 rounded-2xl">
                  <p className="text-muted-foreground text-lg mb-4">No vehicles found</p>
                  <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchPage;
