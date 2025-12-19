'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { vehicleService } from '@/services/vehicleService';
import { recommendationService } from '@/services/recommendationService';
import { feedbackService } from '@/services/feedbackService';
import { Vehicle, Recommendation } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useFavoriteStore } from '@/store/favoriteStore';
import VehicleCard from '@/components/VehicleCard';

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavoriteStore();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [similarVehicles, setSimilarVehicles] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const vehicleId = params.id as string;
  const favorite = vehicle ? isFavorite(vehicle.id) : false;

  useEffect(() => {
    if (vehicleId) {
      loadVehicleData();
      trackView();
    }
  }, [vehicleId]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getById(vehicleId);
      setVehicle(data);

      // Load similar vehicles
      const similar = await recommendationService.getSimilar(vehicleId, 4);
      setSimilarVehicles(similar);
    } catch (error) {
      console.error('Failed to load vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    if (isAuthenticated) {
      try {
        await feedbackService.trackInteraction({
          vehicle_id: vehicleId,
          action: 'view',
        });
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    }
  };

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!vehicle) return;

    try {
      if (favorite) {
        await feedbackService.removeFavorite(vehicle.id);
        removeFavorite(vehicle.id);
      } else {
        await feedbackService.addFavorite(vehicle.id);
        addFavorite(vehicle.id);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleContactClick = async () => {
    if (isAuthenticated && vehicle) {
      try {
        await feedbackService.trackInteraction({
          vehicle_id: vehicle.id,
          action: 'contact',
        });
      } catch (error) {
        console.error('Failed to track contact:', error);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Vehicle not found</p>
        <Link href="/search" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/search" className="text-primary-600 hover:text-primary-700">
        ← Back to search
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={vehicle.image_url || '/placeholder-car.jpg'}
              alt={vehicle.title}
              className="w-full h-96 object-cover"
            />
          </div>

          {/* Title and Basic Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{vehicle.title}</h1>
                <p className="text-xl text-gray-600">
                  {vehicle.brand} {vehicle.model} • {vehicle.year}
                </p>
              </div>
              <button
                onClick={handleFavoriteClick}
                className="p-3 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <svg
                  className={`w-8 h-8 ${favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                  fill={favorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              {vehicle.condition === 'new' && (
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  NEW
                </span>
              )}
              {vehicle.condition === 'used' && (
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  USED
                </span>
              )}
            </div>

            <p className="text-4xl font-bold text-primary-600 mb-6">
              {formatPrice(vehicle.price)}
            </p>

            <div className="grid grid-cols-2 gap-4 text-gray-700">
              {vehicle.mileage && (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🛣️</span>
                  <div>
                    <p className="text-sm text-gray-500">Mileage</p>
                    <p className="font-semibold">{vehicle.mileage.toLocaleString()} km</p>
                  </div>
                </div>
              )}
              {vehicle.transmission && (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⚙️</span>
                  <div>
                    <p className="text-sm text-gray-500">Transmission</p>
                    <p className="font-semibold">{vehicle.transmission}</p>
                  </div>
                </div>
              )}
              {vehicle.fuel_type && (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⛽</span>
                  <div>
                    <p className="text-sm text-gray-500">Fuel Type</p>
                    <p className="font-semibold">{vehicle.fuel_type}</p>
                  </div>
                </div>
              )}
              {vehicle.body_type && (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🚗</span>
                  <div>
                    <p className="text-sm text-gray-500">Body Type</p>
                    <p className="font-semibold">{vehicle.body_type}</p>
                  </div>
                </div>
              )}
              {vehicle.color && (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🎨</span>
                  <div>
                    <p className="text-sm text-gray-500">Color</p>
                    <p className="font-semibold">{vehicle.color}</p>
                  </div>
                </div>
              )}
              {vehicle.location && (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📍</span>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold">{vehicle.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {vehicle.description && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{vehicle.description}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seller Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Seller Information</h3>
            {vehicle.seller_name && (
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Name:</span> {vehicle.seller_name}
              </p>
            )}
            {vehicle.seller_phone && (
              <p className="text-gray-700 mb-4">
                <span className="font-semibold">Phone:</span> {vehicle.seller_phone}
              </p>
            )}
            <button
              onClick={handleContactClick}
              className="w-full bg-primary-600 text-white px-4 py-3 rounded-md hover:bg-primary-700 font-medium"
            >
              📞 Contact
            </button>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <Link
                href={`/compare?ids=${vehicle.id}`}
                className="block w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 text-center font-medium"
              >
                ⚖️ Compare with others
              </Link>
              <button
                onClick={handleFavoriteClick}
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 font-medium"
              >
                {favorite ? '❤️ Favorited' : '🤍 Add to favorites'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Vehicles */}
      {similarVehicles && similarVehicles.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            🔍 Similar Vehicles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarVehicles.map((reco) => (
              <VehicleCard key={reco.vehicle.id} vehicle={reco.vehicle} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
