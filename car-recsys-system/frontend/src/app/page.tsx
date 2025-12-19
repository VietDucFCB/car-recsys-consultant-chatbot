'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import VehicleCard from '@/components/VehicleCard';
import { vehicleService } from '@/services/vehicleService';
import { recommendationService } from '@/services/recommendationService';
import { SearchFilters, Vehicle, Recommendation } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { getMockSearchResponse } from '@/data/mockVehicles';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('electric');
  const categoriesRef = useRef<HTMLDivElement>(null);
  
  const categories = [
    { id: 'electric', name: 'Electric', filter: { fuel_type: 'Điện' } },
    { id: 'suv', name: 'SUV', filter: { body_type: 'SUV' } },
    { id: 'sedan', name: 'Sedan', filter: { body_type: 'Sedan' } },
    { id: 'pickup', name: 'Pickup Truck', filter: { body_type: 'Bán tải' } },
    { id: 'luxury', name: 'Luxury', filter: { price_min: 2000000000 } },
    { id: 'crossover', name: 'Crossover', filter: { body_type: 'Crossover' } },
    { id: 'hybrid', name: 'Hybrid', filter: { fuel_type: 'Hybrid' } },
    { id: 'diesel', name: 'Diesel', filter: { fuel_type: 'Dầu diesel' } },
    { id: 'coupe', name: 'Coupe', filter: { body_type: 'Coupe' } },
    { id: 'hatchback', name: 'Hatchback', filter: { body_type: 'Hatchback' } },
    { id: 'wagon', name: 'Wagon', filter: { body_type: 'Wagon' } },
    { id: 'convertible', name: 'Convertible', filter: { body_type: 'Convertible' } },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadHomepageData();
    }
  }, [mounted, isAuthenticated]);

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      // Try to load featured vehicles from API
      try {
      const searchResult = await vehicleService.search({ page_size: 8, sort_by: 'id', sort_order: 'desc' });
      setFeaturedVehicles(searchResult.results);
      } catch (apiError) {
        // If API fails (backend not running), use mock data
        console.warn('Backend not available, using mock data:', apiError);
        const mockResult = getMockSearchResponse(1, 8);
        setFeaturedVehicles(mockResult.results);
      }

      // Load personalized recommendations if authenticated
      if (isAuthenticated) {
        try {
        const recos = await recommendationService.getHybrid(8);
        setRecommendations(recos);
        } catch (apiError) {
          console.warn('Recommendations API not available:', apiError);
        }
      }
    } catch (error) {
      console.error('Failed to load homepage data:', error);
      // Fallback to mock data on any error
      const mockResult = getMockSearchResponse(1, 8);
      setFeaturedVehicles(mockResult.results);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: SearchFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });
    window.location.href = `/search?${params.toString()}`;
  };

  // Prevent hydration mismatch by not rendering auth-dependent content until mounted
  if (!mounted) {
    return (
      <div className="space-y-16">
        {/* Hero Section */}
        <section className="bg-gray-800 text-white p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-semibold mb-3">
            Find Your Perfect Car
          </h1>
          <p className="text-base text-gray-300 mb-8">
            Thousands of new and used cars waiting for you to discover
          </p>
          <SearchBar onSearch={handleSearch} />
        </section>
        
        {/* Loading placeholder */}
        <section>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section with Full Screen Banner */}
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-16">
        {/* Full Screen Banner Image */}
        <div className="relative h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden bg-gray-900">
          <img
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&h=1080&fit=crop&q=80"
            alt="Luxury cars"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" style={{ top: 0, left: 0 }}></div>
          
          {/* Text Overlay - Bottom Left */}
          <div className="absolute bottom-8 left-4 md:bottom-16 md:left-8 lg:left-16 max-w-2xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-4">
              Luxury Cars
          </h1>
            <p className="text-base md:text-lg lg:text-xl text-white/90 font-light leading-relaxed">
              EXPLORE THOUSANDS OF LUXURY CARS, SUPERCARS AND EXOTIC CARS FOR SALE WORLDWIDE IN ONE SIMPLE SEARCH.
          </p>
          </div>
        </div>
      </section>

      {/* Content Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

      {/* Personalized Recommendations */}
      {isAuthenticated && recommendations.length > 0 && (
          <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Recommendations for You
            </h2>
              <Link href="/recommendations" className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
              View all →
            </Link>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations && recommendations.map((reco) => (
              <VehicleCard key={reco.vehicle.id} vehicle={reco.vehicle} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Vehicles */}
        <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Featured Vehicles
          </h2>
            <Link href="/search" className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto"></div>
          </div>
        ) : featuredVehicles && featuredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
              <p className="text-gray-500">No vehicles available</p>
          </div>
        )}
      </section>

        {/* Popular Categories */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Popular categories
        </h2>
          </div>
          <div className="w-full">
            <div
              ref={categoriesRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {categories.map((category) => {
                const isActive = selectedCategory === category.id;
                // Map category id to route name
                const routeMap: Record<string, string> = {
                  'electric': 'electric',
                  'suv': 'suv',
                  'sedan': 'sedan',
                  'pickup': 'pickup',
                  'hatchback': 'hatchback',
                  'mpv': 'mpv',
                };
                const routeName = routeMap[category.id] || category.id;
                
                return (
                  <Link
                    key={category.id}
                    href={`/category/${routeName}`}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 inline-block
                      ${isActive 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {category.name}
                  </Link>
                );
              })}
            </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
          <section className="bg-gray-100 border border-gray-200 p-8 text-center mb-16">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Sign up now to get personalized car recommendations
          </h2>
            <p className="text-sm text-gray-600 mb-6">
            Our AI system will suggest the most suitable cars for your needs
          </p>
            <Link href="/register" className="inline-block bg-gray-800 text-white px-6 py-2.5 hover:bg-gray-700 font-medium text-sm transition-colors">
            Sign Up Free
          </Link>
        </section>
      )}
      </div>
    </div>
  );
}
