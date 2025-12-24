'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { vehicleService } from '@/services/vehicleService';
import { feedbackService } from '@/services/feedbackService';
import { Vehicle } from '@/types';
import { useAuthStore } from '@/store/authStore';

function ComparePageContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',') || [];
    if (ids.length > 0) {
      loadVehicles(ids);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadVehicles = async (ids: string[]) => {
    try {
      setLoading(true);
      const vehicleData = await vehicleService.compare(ids);
      setVehicles(vehicleData);

      // Track compare action
      if (isAuthenticated && ids.length > 0) {
        await feedbackService.trackInteraction({
          vehicle_id: ids[0],
          action: 'compare',
          context: { compared_with: ids.slice(1) },
        });
      }
    } catch (error) {
      console.error('Failed to load vehicles for comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const addVehicle = () => {
    const id = prompt('Enter car ID to add to comparison:');
    if (id) {
      const currentIds = searchParams.get('ids')?.split(',') || [];
      const newIds = [...currentIds, id].filter((v, i, a) => a.indexOf(v) === i);
      window.location.href = `/compare?ids=${newIds.join(',')}`;
    }
  };

  const removeVehicle = (id: string) => {
    const currentIds = searchParams.get('ids')?.split(',') || [];
    const newIds = currentIds.filter(vid => vid !== id);
    if (newIds.length > 0) {
      window.location.href = `/compare?ids=${newIds.join(',')}`;
    } else {
      window.location.href = '/compare';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">⚖️ So sánh xe</h1>
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="text-6xl mb-4">🚗</div>
          <p className="text-gray-600 text-lg mb-2">No cars to compare</p>
          <p className="text-gray-500 mb-6">
            Add cars from search or vehicle detail pages
          </p>
          <a
            href="/search"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-medium"
          >
            Search Cars
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">⚖️ Compare Cars</h1>
        {vehicles.length < 4 && (
          <button
            onClick={addVehicle}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium"
          >
            + Add Car
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50">
                Attribute
              </th>
              {vehicles.map((vehicle) => (
                <th key={vehicle.id} className="px-6 py-3 text-center min-w-[250px]">
                  <div className="relative">
                    <button
                      onClick={() => removeVehicle(String(vehicle.id))}
                      className="absolute top-0 right-0 text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                    <img
                      src={vehicle.image_url || '/placeholder-car.jpg'}
                      alt={vehicle.title}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <p className="font-semibold text-gray-900">{vehicle.title}</p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Price</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center text-primary-600 font-bold">
                  {formatPrice(vehicle.price)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Brand</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.brand}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Model</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.model}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Year</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.year}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Condition</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    vehicle.condition === 'new' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {vehicle.condition === 'new' ? 'New' : 'Used'}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Mileage</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">
                  {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Transmission</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.transmission || 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Fuel Type</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.fuel_type || 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Body Type</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.body_type || 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Color</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.color || 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white">Location</td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">{vehicle.location || 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white"></td>
              {vehicles.map((vehicle) => (
                <td key={vehicle.id} className="px-6 py-4 text-center">
                  <a
                    href={`/vehicle/${vehicle.id}`}
                    className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium"
                  >
                    View Details
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Đang tải...</p>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  );
}
