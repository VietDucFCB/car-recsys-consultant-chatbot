/**
 * Compare Page - Side by side vehicle comparison
 */
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Car, 
  Loader2, 
  AlertCircle, 
  X, 
  RefreshCw,
  Star,
  Fuel,
  Gauge,
  Settings2,
  Palette,
  Shield,
  Check,
  Minus
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CompareModal from '@/components/CompareModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { vehiclesApi, formatPrice } from '@/lib/api';

interface VehicleDetail {
  vehicle_id: string;
  title: string;
  car_model?: string;
  brand?: string;
  price?: number;
  year?: number;
  condition?: string;
  mileage_str?: string;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  drivetrain?: string;
  exterior_color?: string;
  interior_color?: string;
  mpg?: string;
  engine?: string;
  body_type?: string;
  image_url?: string;
  images?: string[];
  car_rating?: number;
  comfort_rating?: number;
  interior_rating?: number;
  performance_rating?: number;
  value_rating?: number;
  reliability_rating?: number;
  percentage_recommend?: number;
  accidents_damage?: string;
  one_owner?: boolean;
}

const ComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicle1, setVehicle1] = useState<VehicleDetail | null>(null);
  const [vehicle2, setVehicle2] = useState<VehicleDetail | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectingVehicle, setSelectingVehicle] = useState<1 | 2>(1);

  const placeholderImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=400&fit=crop&q=80';

  // Load vehicles from URL params
  useEffect(() => {
    const id1 = searchParams.get('v1');
    const id2 = searchParams.get('v2');

    if (id1) {
      setLoading1(true);
      vehiclesApi.getById(id1)
        .then(setVehicle1)
        .catch(() => setVehicle1(null))
        .finally(() => setLoading1(false));
    }

    if (id2) {
      setLoading2(true);
      vehiclesApi.getById(id2)
        .then(setVehicle2)
        .catch(() => setVehicle2(null))
        .finally(() => setLoading2(false));
    }
  }, [searchParams]);

  const handleSelectVehicle = (vehicle: any, slot: 1 | 2) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(slot === 1 ? 'v1' : 'v2', vehicle.vehicle_id);
    setSearchParams(newParams);
  };

  const handleRemoveVehicle = (slot: 1 | 2) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(slot === 1 ? 'v1' : 'v2');
    setSearchParams(newParams);
    if (slot === 1) setVehicle1(null);
    else setVehicle2(null);
  };

  const openSelectModal = (slot: 1 | 2) => {
    setSelectingVehicle(slot);
    setIsModalOpen(true);
  };

  const swapVehicles = () => {
    const newParams = new URLSearchParams();
    if (vehicle2) newParams.set('v1', vehicle2.vehicle_id);
    if (vehicle1) newParams.set('v2', vehicle1.vehicle_id);
    setSearchParams(newParams);
  };

  // Comparison specs
  const compareSpecs = [
    { key: 'price', label: 'Price', format: (v: any) => formatPrice(v?.price), highlight: 'lower' },
    { key: 'year', label: 'Year', format: (v: any) => v?.year || 'N/A', highlight: 'higher' },
    { key: 'mileage', label: 'Mileage', format: (v: any) => v?.mileage_str || 'N/A', highlight: 'lower' },
    { key: 'fuel_type', label: 'Fuel Type', format: (v: any) => v?.fuel_type || 'N/A' },
    { key: 'transmission', label: 'Transmission', format: (v: any) => v?.transmission || 'N/A' },
    { key: 'drivetrain', label: 'Drivetrain', format: (v: any) => v?.drivetrain || 'N/A' },
    { key: 'mpg', label: 'MPG', format: (v: any) => v?.mpg || 'N/A' },
    { key: 'engine', label: 'Engine', format: (v: any) => v?.engine || 'N/A' },
    { key: 'body_type', label: 'Body Type', format: (v: any) => v?.body_type || 'N/A' },
    { key: 'exterior_color', label: 'Exterior Color', format: (v: any) => v?.exterior_color || 'N/A' },
    { key: 'interior_color', label: 'Interior Color', format: (v: any) => v?.interior_color || 'N/A' },
  ];

  const compareRatings = [
    { key: 'car_rating', label: 'Overall Rating', highlight: 'higher' },
    { key: 'comfort_rating', label: 'Comfort', highlight: 'higher' },
    { key: 'interior_rating', label: 'Interior', highlight: 'higher' },
    { key: 'performance_rating', label: 'Performance', highlight: 'higher' },
    { key: 'value_rating', label: 'Value', highlight: 'higher' },
    { key: 'reliability_rating', label: 'Reliability', highlight: 'higher' },
  ];

  const getBetterClass = (val1: any, val2: any, type: string | undefined) => {
    if (!type || val1 === val2 || !val1 || !val2) return ['', ''];
    const num1 = typeof val1 === 'number' ? val1 : parseFloat(val1);
    const num2 = typeof val2 === 'number' ? val2 : parseFloat(val2);
    if (isNaN(num1) || isNaN(num2)) return ['', ''];
    
    if (type === 'higher') {
      return num1 > num2 ? ['text-green-500 font-semibold', ''] : num1 < num2 ? ['', 'text-green-500 font-semibold'] : ['', ''];
    } else {
      return num1 < num2 ? ['text-green-500 font-semibold', ''] : num1 > num2 ? ['', 'text-green-500 font-semibold'] : ['', ''];
    }
  };

  const renderVehicleCard = (vehicle: VehicleDetail | null, loading: boolean, slot: 1 | 2) => {
    if (loading) {
      return (
        <div className="flex-1 bg-secondary/30 rounded-2xl p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      );
    }

    if (!vehicle) {
      return (
        <div 
          onClick={() => openSelectModal(slot)}
          className="flex-1 bg-secondary/30 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-border hover:border-accent cursor-pointer transition-colors"
        >
          <Car className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Select Vehicle {slot}</p>
          <p className="text-sm text-muted-foreground mt-1">Click to search and add</p>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-secondary/30 rounded-2xl overflow-hidden">
        <div className="relative">
          <img
            src={vehicle.image_url || vehicle.images?.[0] || placeholderImage}
            alt={vehicle.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = placeholderImage;
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full h-8 w-8"
            onClick={() => handleRemoveVehicle(slot)}
          >
            <X className="h-4 w-4" />
          </Button>
          {vehicle.condition && (
            <Badge className="absolute top-2 left-2 capitalize">
              {vehicle.condition}
            </Badge>
          )}
        </div>
        <div className="p-4">
          <p className="text-sm text-accent font-medium uppercase tracking-wider">
            {vehicle.brand}
          </p>
          <h3 className="font-heading text-lg font-semibold text-foreground line-clamp-2 mt-1">
            {vehicle.title || vehicle.car_model}
          </h3>
          <p className="text-2xl font-bold text-foreground mt-2">
            {formatPrice(vehicle.price)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => openSelectModal(slot)}
          >
            Change Vehicle
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Search
              </Link>
              <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
                Compare Vehicles
              </h1>
              <p className="text-muted-foreground mt-1">
                See detailed side-by-side comparison
              </p>
            </div>
            {vehicle1 && vehicle2 && (
              <Button variant="outline" onClick={swapVehicles} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Swap
              </Button>
            )}
          </div>

          {/* Vehicle Cards */}
          <div className="flex gap-6 mb-10">
            {renderVehicleCard(vehicle1, loading1, 1)}
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                VS
              </div>
            </div>
            {renderVehicleCard(vehicle2, loading2, 2)}
          </div>

          {/* Comparison Table */}
          {vehicle1 && vehicle2 && (
            <div className="space-y-8">
              {/* Specifications */}
              <div className="bg-secondary/30 rounded-2xl overflow-hidden">
                <div className="bg-secondary/50 px-6 py-4 border-b border-border">
                  <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-accent" />
                    Specifications
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {compareSpecs.map((spec) => {
                    const val1 = vehicle1[spec.key as keyof VehicleDetail];
                    const val2 = vehicle2[spec.key as keyof VehicleDetail];
                    const [class1, class2] = getBetterClass(val1, val2, spec.highlight);
                    
                    return (
                      <div key={spec.key} className="grid grid-cols-3 px-6 py-4">
                        <div className={`text-center ${class1}`}>
                          {spec.format(vehicle1)}
                        </div>
                        <div className="text-center text-muted-foreground font-medium">
                          {spec.label}
                        </div>
                        <div className={`text-center ${class2}`}>
                          {spec.format(vehicle2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ratings */}
              <div className="bg-secondary/30 rounded-2xl overflow-hidden">
                <div className="bg-secondary/50 px-6 py-4 border-b border-border">
                  <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 text-accent" />
                    Ratings
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {compareRatings.map((rating) => {
                    const val1 = vehicle1[rating.key as keyof VehicleDetail] as number | undefined;
                    const val2 = vehicle2[rating.key as keyof VehicleDetail] as number | undefined;
                    const [class1, class2] = getBetterClass(val1, val2, rating.highlight);
                    
                    return (
                      <div key={rating.key} className="grid grid-cols-3 px-6 py-4">
                        <div className={`text-center ${class1}`}>
                          {val1 ? (
                            <span className="text-xl font-bold">{val1.toFixed(1)}</span>
                          ) : (
                            <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-center text-muted-foreground font-medium">
                          {rating.label}
                        </div>
                        <div className={`text-center ${class2}`}>
                          {val2 ? (
                            <span className="text-xl font-bold">{val2.toFixed(1)}</span>
                          ) : (
                            <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Recommendation percentage */}
                  <div className="grid grid-cols-3 px-6 py-4 bg-accent/5">
                    <div className="text-center">
                      {vehicle1.percentage_recommend ? (
                        <span className="text-xl font-bold text-accent">{vehicle1.percentage_recommend}%</span>
                      ) : (
                        <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center text-muted-foreground font-medium">
                      Owners Recommend
                    </div>
                    <div className="text-center">
                      {vehicle2.percentage_recommend ? (
                        <span className="text-xl font-bold text-accent">{vehicle2.percentage_recommend}%</span>
                      ) : (
                        <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle History */}
              <div className="bg-secondary/30 rounded-2xl overflow-hidden">
                <div className="bg-secondary/50 px-6 py-4 border-b border-border">
                  <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-accent" />
                    Vehicle History
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-3 px-6 py-4">
                    <div className="text-center">
                      {vehicle1.accidents_damage ? (
                        <span className={vehicle1.accidents_damage.toLowerCase().includes('none') ? 'text-green-500' : 'text-yellow-500'}>
                          {vehicle1.accidents_damage}
                        </span>
                      ) : (
                        <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center text-muted-foreground font-medium">
                      Accidents
                    </div>
                    <div className="text-center">
                      {vehicle2.accidents_damage ? (
                        <span className={vehicle2.accidents_damage.toLowerCase().includes('none') ? 'text-green-500' : 'text-yellow-500'}>
                          {vehicle2.accidents_damage}
                        </span>
                      ) : (
                        <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 px-6 py-4">
                    <div className="text-center">
                      {vehicle1.one_owner !== undefined ? (
                        vehicle1.one_owner ? (
                          <span className="text-green-500 flex items-center justify-center gap-1">
                            <Check className="h-4 w-4" /> Single Owner
                          </span>
                        ) : (
                          <span>Multiple Owners</span>
                        )
                      ) : (
                        <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center text-muted-foreground font-medium">
                      Ownership
                    </div>
                    <div className="text-center">
                      {vehicle2.one_owner !== undefined ? (
                        vehicle2.one_owner ? (
                          <span className="text-green-500 flex items-center justify-center gap-1">
                            <Check className="h-4 w-4" /> Single Owner
                          </span>
                        ) : (
                          <span>Multiple Owners</span>
                        )
                      ) : (
                        <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-6">
                <Link to={`/vehicle/${vehicle1.vehicle_id}`}>
                  <Button className="w-full h-12 rounded-xl" variant="outline">
                    View {vehicle1.brand} Details
                  </Button>
                </Link>
                <Link to={`/vehicle/${vehicle2.vehicle_id}`}>
                  <Button className="w-full h-12 rounded-xl" variant="outline">
                    View {vehicle2.brand} Details
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!vehicle1 && !vehicle2 && !loading1 && !loading2 && (
            <div className="text-center py-20">
              <Car className="h-20 w-20 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h2 className="font-heading text-2xl font-semibold mb-2">Start Comparing</h2>
              <p className="text-muted-foreground mb-6">
                Select two vehicles to see a detailed side-by-side comparison
              </p>
              <Button onClick={() => openSelectModal(1)} className="rounded-xl">
                Select First Vehicle
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <CompareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(v) => handleSelectVehicle(v, selectingVehicle)}
        currentVehicleId={selectingVehicle === 1 ? vehicle2?.vehicle_id : vehicle1?.vehicle_id}
      />
    </div>
  );
};

export default ComparePage;
