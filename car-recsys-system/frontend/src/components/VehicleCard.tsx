'use client';

'use client';

import { Vehicle } from '@/types';
import Link from 'next/link';
import { useFavoriteStore } from '@/store/favoriteStore';
import { feedbackService } from '@/services/feedbackService';
import { useAuthStore } from '@/store/authStore';

interface VehicleCardProps {
  vehicle: Vehicle;
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoriteStore();
  const { isAuthenticated } = useAuthStore();
  const favorite = isFavorite(String(vehicle.id));

  const handleFavoriteClick = async (e: React.MouseEvent) => {
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
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <Link href={`/vehicle/${vehicle.id}`} onClick={handleClick}>
        <div className="relative overflow-hidden">
          <img
            src={vehicle.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}
            alt={vehicle.title || 'Vehicle'}
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </Link>
      
      <button
        onClick={handleFavoriteClick}
        className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2.5 hover:bg-white shadow-lg transition-all duration-200 hover:scale-110 z-10"
      >
        <svg
          className={`w-5 h-5 transition-colors ${favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          fill={favorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
      
      <Link href={`/vehicle/${vehicle.id}`} onClick={handleClick}>
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {vehicle.title || 'Untitled'}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {vehicle.brand || 'N/A'} {vehicle.model || ''}
          </p>
          
          <div className="mb-4">
            <span className="text-2xl font-bold text-primary-600">{formatPrice(vehicle.price)}</span>
          </div>
          
          <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-3 border-t border-gray-100">
            {vehicle.mileage && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">📏</span>
                <span>{vehicle.mileage.toLocaleString()} km</span>
              </div>
            )}
            {vehicle.fuel_type && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">⛽</span>
                <span>{vehicle.fuel_type}</span>
              </div>
            )}
            {vehicle.transmission && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">⚙️</span>
                <span>{vehicle.transmission}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
