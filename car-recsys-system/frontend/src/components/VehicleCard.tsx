'use client';

import React, { useState } from 'react';
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
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="group bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 relative">
      <Link href={`/vehicle/${vehicle.id}`} onClick={handleClick}>
        <div className="relative overflow-hidden bg-gray-100 aspect-[4/3]">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 z-10">
              <svg className="w-12 h-12 text-gray-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <img
            src={imageUrl}
            alt={vehicle.title || `${vehicle.brand} ${vehicle.model}` || 'Vehicle'}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onError={() => {
              if (!imageError) {
                setImageError(true);
                setImageLoading(false);
              }
            }}
            onLoad={() => {
              setImageLoading(false);
            }}
            loading="lazy"
          />
          {/* Subtle overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-black/0 group-hover:from-black/5 transition-all duration-300 pointer-events-none"></div>
        </div>
      </Link>
      
      <button
        onClick={handleFavoriteClick}
        className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-all duration-200 z-10 border border-gray-200"
        aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg
          className={`w-4 h-4 transition-colors ${favorite ? 'fill-gray-700 text-gray-700' : 'text-gray-400'}`}
          fill={favorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.5}
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
        <div className="p-4">
          <h3 className="text-base font-semibold text-gray-800 mb-1 line-clamp-1 group-hover:text-gray-600 transition-colors">
            {vehicle.title || 'Untitled'}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {vehicle.brand || 'N/A'} {vehicle.model || ''}
          </p>
          
          <div className="mb-4">
            <span className="text-xl font-semibold text-gray-800">{formatPrice(vehicle.price)}</span>
          </div>
          
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
            {vehicle.mileage && (
              <div className="flex items-center gap-1.5">
                <span>{vehicle.mileage.toLocaleString()} km</span>
              </div>
            )}
            {vehicle.fuel_type && (
              <div className="flex items-center gap-1.5">
                <span>{vehicle.fuel_type}</span>
              </div>
            )}
            {vehicle.transmission && (
              <div className="flex items-center gap-1.5">
                <span>{vehicle.transmission}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
