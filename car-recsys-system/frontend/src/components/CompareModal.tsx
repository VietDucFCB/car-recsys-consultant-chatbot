/**
 * Compare Modal - Search and select vehicle to compare
 */
import { useState, useEffect } from 'react';
import { Search, X, Loader2, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { vehiclesApi, formatPrice } from '@/lib/api';

interface Vehicle {
  vehicle_id: string;
  title: string;
  car_model?: string;
  brand?: string;
  price?: number;
  year?: number;
  image_url?: string;
  mileage_str?: string;
}

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (vehicle: Vehicle) => void;
  currentVehicleId?: string;
}

export default function CompareModal({ isOpen, onClose, onSelect, currentVehicleId }: CompareModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const response = await vehiclesApi.search({ query: searchQuery, limit: 10 });
        // Filter out current vehicle
        const filtered = response.items.filter(v => v.vehicle_id !== currentVehicleId);
        setSearchResults(filtered as any);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentVehicleId]);

  const handleSelect = (vehicle: Vehicle) => {
    onSelect(vehicle);
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  };

  const placeholderImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=150&fit=crop&q=80';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-accent" />
            Select Vehicle to Compare
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by make, model, or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((vehicle) => (
              <button
                key={vehicle.vehicle_id}
                onClick={() => handleSelect(vehicle)}
                className="w-full flex items-center gap-4 p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-all text-left"
              >
                <img
                  src={vehicle.image_url || placeholderImage}
                  alt={vehicle.title}
                  className="w-20 h-14 object-cover rounded-md bg-secondary"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImage;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {vehicle.title || vehicle.car_model}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatPrice(vehicle.price)}</span>
                    {vehicle.mileage_str && (
                      <>
                        <span>•</span>
                        <span>{vehicle.mileage_str}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : hasSearched ? (
            <div className="text-center py-10 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No vehicles found matching "{searchQuery}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Search for a vehicle to compare</p>
              <p className="text-sm mt-1">Enter make, model, or year</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
