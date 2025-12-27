import { Link } from "react-router-dom";
import { Heart, Fuel, Gauge, Settings2 } from "lucide-react";
import { useState } from "react";

interface VehicleCardProps {
  id: number;
  title: string;
  brand: string;
  model: string;
  price: string;
  mileage: string;
  fuelType: string;
  transmission: string;
  image: string;
  year?: number;
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoriteStore();
  const { isAuthenticated } = useAuthStore();
  const favorite = isFavorite(String(vehicle.id));
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Generate a better placeholder image based on vehicle brand/model
  const getPlaceholderImage = () => {
    // Use Unsplash Source API for beautiful car images with different car types
    const carImages = [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop&q=80', // Sedan
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&q=80', // SUV
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop&q=80', // Sports car
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=600&fit=crop&q=80', // Luxury car
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop&q=80', // Modern car
    ];
    
    // Select image based on vehicle ID for variety
    const index = (vehicle.id || 0) % carImages.length;
    return carImages[index];
  };
  
  // Always use placeholder if no image_url or if error occurred
  const imageUrl = imageError || !vehicle.image_url 
    ? getPlaceholderImage()
    : vehicle.image_url;

  const handleFavoriteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    const vehicleIdStr = String(vehicle.id);
    try {
      if (favorite) {
        await feedbackService.removeFavorite(vehicleIdStr);
        removeFavorite(vehicleIdStr);
      } else {
        await feedbackService.addFavorite(vehicleIdStr);
        addFavorite(vehicleIdStr);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleClick = async () => {
    if (isAuthenticated) {
      try {
        await feedbackService.trackInteraction({
          vehicle_id: String(vehicle.id),
          action: 'click',
        });
      } catch (error) {
        console.error('Failed to track click:', error);
      }
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'Contact';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Link
      to={`/vehicle/${id}`}
      className="group block bg-card rounded-sm overflow-hidden border border-border/30 hover:border-accent/30 transition-all duration-500 hover-lift minimal-card"
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {!isImageLoaded && (
          <div className="absolute inset-0 bg-secondary animate-pulse" />
        )}
        <img
          src={image}
          alt={title}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsImageLoaded(true)}
        />
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Year badge */}
        {year && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-sm text-xs tracking-wide text-foreground">
            {year}
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-sm flex items-center justify-center transition-all duration-300 ${
            isFavorite
              ? "bg-accent text-accent-foreground shadow-soft"
              : "bg-background/90 backdrop-blur-sm text-foreground hover:bg-background"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Brand & Model */}
        <p className="text-[10px] tracking-[0.15em] text-accent uppercase mb-2">
          {brand}
        </p>
        <h3 className="font-heading text-xl font-medium text-foreground mb-1 line-clamp-1 group-hover:text-accent transition-colors duration-300">
          {model}
        </h3>
        <p className="text-sm text-muted-foreground mb-5 line-clamp-1">
          {title}
        </p>

        {/* Price */}
        <p className="font-heading text-xl font-medium text-foreground mb-5">
          {price}
        </p>

        {/* Specs */}
        <div className="flex items-center gap-4 pt-4 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5 text-accent/60" />
            <span>{mileage}</span>
          </div>
          <div className="w-px h-3 bg-border/50" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Fuel className="h-3.5 w-3.5 text-accent/60" />
            <span>{fuelType}</span>
          </div>
          <div className="w-px h-3 bg-border/50" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5 text-accent/60" />
            <span>{transmission}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VehicleCard;
