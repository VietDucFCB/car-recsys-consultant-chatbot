import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Plus, Camera } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { brands, fuelTypes, transmissions } from "@/data/vehicles";

const SellPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = () => {
    // Mock image upload - in real app, this would open file picker
    const mockImages = [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop&q=80",
    ];
    if (images.length < 6) {
      setImages([...images, mockImages[images.length % 2]]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Listing submitted successfully!",
        description: "Your listing will be reviewed within 24 hours.",
      });
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-3">
              Sell Your Car
            </h1>
            <p className="text-muted-foreground text-lg">
              Fill in the details about your car to find a buyer quickly
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Images Section */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-accent/10 rounded-xl">
                  <Camera className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <Label className="text-lg font-semibold">Vehicle Photos</Label>
                  <p className="text-sm text-muted-foreground">Add up to 6 photos of your vehicle</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden bg-secondary group"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-background/90 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-md">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
                {images.length < 6 && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-accent flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-accent transition-all bg-secondary/30"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-sm font-medium">Add Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6">Basic Information</h3>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Select required>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input id="model" placeholder="e.g., Camry, CR-V..." required className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Select required>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => 2024 - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input id="price" type="number" placeholder="45000" required className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage (km) *</Label>
                  <Input id="mileage" type="number" placeholder="10000" required className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel">Fuel Type *</Label>
                  <Select required>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((fuel) => (
                        <SelectItem key={fuel} value={fuel}>
                          {fuel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transmission">Transmission *</Label>
                  <Select required>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissions.map((trans) => (
                        <SelectItem key={trans} value={trans}>
                          {trans}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color *</Label>
                  <Input id="color" placeholder="e.g., White, Black..." required className="h-12 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6">Description</h3>
              <Textarea
                id="description"
                placeholder="Describe the vehicle condition, maintenance history, notable features..."
                className="min-h-[140px] rounded-xl resize-none"
              />
            </div>

            {/* Contact Info */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6">Contact Information</h3>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" placeholder="John Doe" required className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" placeholder="+1 555-0123" required className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input id="location" placeholder="City, State" required className="h-12 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 rounded-xl text-base"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-14 rounded-xl text-base bg-accent hover:bg-gold-dark text-accent-foreground shadow-gold" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Upload className="h-5 w-5 mr-2 animate-pulse" />
                    Submitting...
                  </>
                ) : (
                  "Submit Listing"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SellPage;
