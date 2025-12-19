'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import VehicleCard from '@/components/VehicleCard';
import { vehicleService } from '@/services/vehicleService';
import { SearchFilters, SearchResponse } from '@/types';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    // Parse search params
    const params: SearchFilters = {};
    searchParams.forEach((value, key) => {
      if (key === 'page' || key === 'limit' || key === 'year_min' || key === 'year_max' || 
          key === 'price_min' || key === 'price_max' || key === 'mileage_max') {
        params[key as keyof SearchFilters] = parseInt(value) as any;
      } else {
        params[key as keyof SearchFilters] = value as any;
      }
    });
    setFilters(params);
    performSearch(params);
  }, [searchParams]);

  const performSearch = async (filters: SearchFilters) => {
    try {
      setLoading(true);
      const result = await vehicleService.search({ ...filters, limit: 20 });
      setSearchResult(result);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });
    window.location.href = `/search?${params.toString()}`;
  };

  const handlePageChange = (newPage: number) => {
    handleSearch({ ...filters, page: newPage });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Search Cars</h1>

      <SearchBar onSearch={handleSearch} initialFilters={filters} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : searchResult ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Found <span className="font-bold">{searchResult.total}</span> results
            </p>
            <select
              value={filters.sort || ''}
              onChange={(e) => handleSearch({ ...filters, sort: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sort by</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="year">Year: Old to New</option>
              <option value="-year">Year: New to Old</option>
              <option value="mileage">Mileage: Low to High</option>
              <option value="-mileage">Mileage: High to Low</option>
            </select>
          </div>

          {searchResult.results && searchResult.results.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResult.results.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>

              {/* Pagination */}
              {searchResult.total > searchResult.limit && (
                <div className="flex justify-center items-center space-x-2">
                  <button
                    onClick={() => handlePageChange((filters.page || 1) - 1)}
                    disabled={!filters.page || filters.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="text-gray-600">
                    Page {filters.page || 1} / {Math.ceil(searchResult.total / searchResult.limit)}
                  </span>
                  <button
                    onClick={() => handlePageChange((filters.page || 1) + 1)}
                    disabled={(filters.page || 1) >= Math.ceil(searchResult.total / searchResult.limit)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No results found</p>
              <p className="text-gray-500 mt-2">Try changing your search filters</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
