import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Camera, Sparkles, Loader2, Check } from "lucide-react";
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

// Same live estimator backend the /price-estimate page uses.
const PRICE_API =
  import.meta.env.VITE_PRICE_API_URL ||
  "https://car-price-backend-893613114700.us-central1.run.app";

interface EstimateResult {
  low: number;
  mid: number;
  high: number;
}

const SellPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Controlled fields (needed so the AI estimate can read the vehicle info).
  const [form, setForm] = useState({
    brand: "", model: "", year: "", price: "",
    mileage: "", fuel: "", transmission: "", color: "",
  });
  const setField = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // AI price estimate state.
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const canEstimate =
    form.brand && form.model && form.year && form.mileage && form.fuel && form.transmission;

  const estimatePrice = async () => {
    if (!canEstimate || estimating) return;
    setEstimating(true);
    setEstimate(null);
    setEstimateError(null);
    try {
      const fd = new FormData();
      fd.append("title", `${form.year} ${form.brand} ${form.model}`);
      fd.append("brand", form.brand);
      fd.append("model_style", "Sedan"); // body style unknown on the sell form
      fd.append("engine", "Unknown");
      fd.append("fuel_type", form.fuel);
      fd.append("transmission", form.transmission);
      fd.append("exterior_color", form.color || "Unknown");
      fd.append("year", form.year);
      fd.append("mileage", form.mileage);
      const res = await fetch(`${PRICE_API}/predict_price`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setEstimate({
        low: data.price_range_usd?.low ?? data.estimated_price_usd,
        mid: data.estimated_price_usd,
        high: data.price_range_usd?.high ?? data.estimated_price_usd,
      });
    } catch {
      setEstimateError("Could not estimate right now. Please try again.");
    } finally {
      setEstimating(false);
    }
  };

  const handleImageUpload = () => {
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* soft gold glow at the top for atmosphere (no flat gray) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(168,118,1,0.10), transparent 70%)" }}
      />
      <Header />
      <main className="flex-1 pt-28 pb-16 relative z-10">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A87601]">
              List your vehicle
            </span>
            <h1 className="mt-2 font-poppins text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Sell Your Car
            </h1>
            <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#A87601]" />
            <p className="mt-4 text-muted-foreground text-lg">
              Fill in the details to find a buyer quickly — and get an instant AI price estimate.
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
              <h3 className="font-poppins text-lg font-semibold mb-6">Basic Information</h3>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Select required value={form.brand} onValueChange={(v) => setField("brand", v)}>
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
                  <Input id="model" placeholder="e.g., Camry, CR-V..." required className="h-12 rounded-xl"
                    value={form.model} onChange={(e) => setField("model", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Select required value={form.year} onValueChange={(v) => setField("year", v)}>
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
                  <Input id="price" type="number" placeholder="45000" required className="h-12 rounded-xl"
                    value={form.price} onChange={(e) => setField("price", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage (mi) *</Label>
                  <Input id="mileage" type="number" placeholder="10000" required className="h-12 rounded-xl"
                    value={form.mileage} onChange={(e) => setField("mileage", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel">Fuel Type *</Label>
                  <Select required value={form.fuel} onValueChange={(v) => setField("fuel", v)}>
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
                  <Select required value={form.transmission} onValueChange={(v) => setField("transmission", v)}>
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
                  <Input id="color" placeholder="e.g., White, Black..." required className="h-12 rounded-xl"
                    value={form.color} onChange={(e) => setField("color", e.target.value)} />
                </div>
              </div>

              {/* ── AI price estimate (integrates the /price-estimate model) ── */}
              <div className="mt-6 rounded-xl border border-[#A87601]/30 bg-[#A87601]/[0.04] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#A87601]/12 text-[#A87601]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Not sure how to price it?</p>
                      <p className="text-sm text-muted-foreground">
                        Get an instant AI estimate from the vehicle details above.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={estimatePrice}
                    disabled={!canEstimate || estimating}
                    className="rounded-xl bg-[#A87601] text-white hover:bg-[#c48c07] disabled:opacity-50"
                  >
                    {estimating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Estimating…</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Estimate with AI</>
                    )}
                  </Button>
                </div>

                {!canEstimate && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Fill in brand, model, year, mileage, fuel and transmission to enable the estimate.
                  </p>
                )}
                {estimateError && (
                  <p className="mt-3 text-sm text-destructive">{estimateError}</p>
                )}
                {estimate && (
                  <div className="mt-4 rounded-lg border border-border bg-card p-4 animate-fade-in opacity-0" style={{ animationFillMode: "forwards" }}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated market value</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-2xl font-bold text-[#A87601]">${Math.round(estimate.mid).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">
                        range ${Math.round(estimate.low).toLocaleString()} – ${Math.round(estimate.high).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setField("price", String(Math.round(estimate.mid)))}
                      className="mt-3 rounded-lg border-[#A87601]/40 text-[#A87601] hover:bg-[#A87601]/10"
                    >
                      <Check className="mr-1.5 h-4 w-4" /> Use this price
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-poppins text-lg font-semibold mb-6">Description</h3>
              <Textarea
                id="description"
                placeholder="Describe the vehicle condition, maintenance history, notable features..."
                className="min-h-[140px] rounded-xl resize-none"
              />
            </div>

            {/* Contact Info */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-poppins text-lg font-semibold mb-6">Contact Information</h3>

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
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-14 rounded-xl text-base bg-[#A87601] hover:bg-[#A87601]/85 hover:shadow-lg text-white font-semibold transition-all duration-200"
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