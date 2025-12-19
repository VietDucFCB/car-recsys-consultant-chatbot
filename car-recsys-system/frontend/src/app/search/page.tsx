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
      // Map 'q' URL param to 'query' in SearchFilters
      if (key === 'q') {
        params.query = value;
      } else if (key === 'page' || key === 'page_size' || key === 'year_min' || key === 'year_max' || 
          key === 'price_min' || key === 'price_max' || key === 'mileage_max') {
        params[key as keyof SearchFilters] = parseInt(value) as any;
      } else if (key === 'sort_by') {
        params.sort_by = value;
      } else if (key === 'sort_order') {
        params.sort_order = value as 'asc' | 'desc';
      } else if (key === 'brand' || key === 'model' || 
                 key === 'fuel_type' || key === 'transmission' || key === 'body_type' || key === 'location') {
        params[key as keyof SearchFilters] = value as any;
      }
    });
    setFilters(params);
    performSearch(params);
  }, [searchParams]);

  const performSearch = async (filters: SearchFilters) => {
    try {
      setLoading(true);
      const result = await vehicleService.search({ ...filters, page_size: 20 });
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
      if (value !== undefined && value !== null && value !== '') {
        // Map 'query' to 'q' in URL for cleaner URLs
        if (key === 'query') {
          params.append('q', String(value));
        } else {
          params.append(key, String(value));
        }
      }
    });
    window.location.href = `/search?${params.toString()}`;
  };

  const handlePageChange = (newPage: number) => {
    handleSearch({ ...filters, page: newPage });
  };

  return (
    <div className="pt-16 space-y-8">
      {/* Search Bar Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <SearchBar 
            onSearch={handleSearch} 
            initialFilters={filters}
            resultCount={searchResult?.total}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Đang tìm kiếm...</p>
          </div>
        ) : searchResult ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Tìm thấy <span className="font-semibold text-gray-800">{searchResult.total}</span> kết quả
              </p>
              <select
                value={filters.sort_by ? (filters.sort_order === 'desc' ? `-${filters.sort_by}` : filters.sort_by) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    handleSearch({ ...filters, sort_by: undefined, sort_order: undefined });
                  } else if (value.startsWith('-')) {
                    handleSearch({ ...filters, sort_by: value.substring(1), sort_order: 'desc' });
                  } else {
                    handleSearch({ ...filters, sort_by: value, sort_order: 'asc' });
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-800 text-sm"
              >
                <option value="">Sắp xếp theo</option>
                <option value="price">Giá: Thấp đến Cao</option>
                <option value="-price">Giá: Cao đến Thấp</option>
                <option value="year">Năm: Cũ đến Mới</option>
                <option value="-year">Năm: Mới đến Cũ</option>
                <option value="mileage">Số km: Thấp đến Cao</option>
                <option value="-mileage">Số km: Cao đến Thấp</option>
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
                {searchResult.total > searchResult.page_size && (
                  <div className="flex justify-center items-center space-x-4 mt-12 pb-8">
                    <button
                      onClick={() => handlePageChange((filters.page || 1) - 1)}
                      disabled={!filters.page || filters.page === 1}
                      className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
                    >
                      ← Trước
                    </button>
                    <span className="text-gray-600 text-sm">
                      Trang {filters.page || 1} / {Math.ceil(searchResult.total / searchResult.page_size)}
                    </span>
                    <button
                      onClick={() => handlePageChange((filters.page || 1) + 1)}
                      disabled={(filters.page || 1) >= Math.ceil(searchResult.total / searchResult.page_size)}
                      className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
                    >
                      Sau →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 text-lg font-medium">Không tìm thấy kết quả</p>
                <p className="text-gray-500 mt-2 text-sm">Thử thay đổi bộ lọc tìm kiếm của bạn</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
