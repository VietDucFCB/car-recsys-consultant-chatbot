'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { vehicleService } from '@/services/vehicleService';
import { SearchFilters, SearchResponse } from '@/types';
import VehicleCard from '@/components/VehicleCard';
import { getMockSearchResponse } from '@/data/mockVehicles';

// Category metadata
const categoryMetadata: Record<string, { title: string; description: string }> = {
  suv: {
    title: 'SUVs',
    description: 'Find the perfect SUV for your family. From compact crossovers to full-size SUVs, explore a wide selection of vehicles with spacious interiors and versatile capabilities.',
  },
  sedan: {
    title: 'Sedans',
    description: 'Discover reliable and comfortable sedans. Perfect for daily commuting and family trips, sedans offer excellent fuel economy and smooth rides.',
  },
  electric: {
    title: 'Electric Vehicles',
    description: 'Explore the future of driving with electric vehicles. Zero emissions, lower operating costs, and cutting-edge technology.',
  },
  hatchback: {
    title: 'Hatchbacks',
    description: 'Compact and efficient hatchbacks perfect for city driving. Great fuel economy and easy parking in tight spaces.',
  },
  pickup: {
    title: 'Pickup Trucks',
    description: 'Powerful and versatile pickup trucks for work and adventure. Built tough for any job or terrain.',
  },
  mpv: {
    title: 'MPVs',
    description: 'Family-friendly MPVs with spacious interiors and flexible seating. Ideal for large families and group trips.',
  },
};

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryName = params.categoryName as string;
  const category = categoryMetadata[categoryName.toLowerCase()] || { title: categoryName, description: '' };
  
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    // Map category name to filter values (matching mock data format)
    const categoryFilterMap: Record<string, { body_type?: string; fuel_type?: string }> = {
      'suv': { body_type: 'SUV' },
      'sedan': { body_type: 'Sedan' },
      'electric': { fuel_type: 'Điện' },
      'hatchback': { body_type: 'Hatchback' },
      'pickup': { body_type: 'Bán tải' },
      'mpv': { body_type: 'MPV' },
    };
    
    const categoryFilter = categoryFilterMap[categoryName.toLowerCase()] || {};
    const params: SearchFilters = { ...categoryFilter };
    
    // Parse URL params
    searchParams.forEach((value, key) => {
      if (key === 'page' || key === 'page_size' || key === 'year_min' || key === 'year_max' || 
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
  }, [categoryName, searchParams]);

  const performSearch = async (searchFilters: SearchFilters) => {
    try {
      setLoading(true);
      const result = await vehicleService.search({ ...searchFilters, page_size: 20 });
      setSearchResult(result);
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to mock data
      const mockResult = getMockSearchResponse(1, 20);
      // Filter mock data by category
      const categoryFilterMap: Record<string, (v: any) => boolean> = {
        'suv': (v) => v.body_type === 'SUV',
        'sedan': (v) => v.body_type === 'Sedan',
        'electric': (v) => v.fuel_type === 'Điện',
        'hatchback': (v) => v.body_type === 'Hatchback',
        'pickup': (v) => v.body_type === 'Bán tải',
        'mpv': (v) => v.body_type === 'MPV',
      };
      
      const filterFn = categoryFilterMap[categoryName.toLowerCase()] || (() => true);
      const filteredResults = mockResult.results.filter(filterFn);
      setSearchResult({
        ...mockResult,
        results: filteredResults,
        total: filteredResults.length,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (value: string) => {
    if (!value) {
      const newFilters = { ...filters };
      delete newFilters.sort_by;
      delete newFilters.sort_order;
      updateFilters(newFilters);
    } else if (value.startsWith('-')) {
      updateFilters({ ...filters, sort_by: value.substring(1), sort_order: 'desc' });
    } else {
      updateFilters({ ...filters, sort_by: value, sort_order: 'asc' });
    }
  };

  const updateFilters = (newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    router.push(`/category/${categoryName}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    updateFilters({ ...filters, page: newPage });
  };

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    updateFilters({ ...filters, [field]: value });
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-gray-600 hover:text-gray-800 transition-colors">
                Home
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-800 font-medium capitalize">{category.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Used {category.title} for sale
          </h1>
          {searchResult && (
            <p className="text-gray-600">
              {searchResult.total.toLocaleString()} {searchResult.total === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              <div className="space-y-5">
                {/* Basics */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Basics</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Make</label>
                      <select
                        value={filters.brand || ''}
                        onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                      >
                        <option value="">All makes</option>
                        <option value="Toyota">Toyota</option>
                        <option value="Honda">Honda</option>
                        <option value="Mazda">Mazda</option>
                        <option value="Hyundai">Hyundai</option>
                        <option value="Ford">Ford</option>
                        <option value="Kia">Kia</option>
                        <option value="Vinfast">Vinfast</option>
                        <option value="BMW">BMW</option>
                        <option value="Mercedes">Mercedes</option>
                        <option value="Audi">Audi</option>
                        <option value="Lexus">Lexus</option>
                        <option value="Porsche">Porsche</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Model</label>
                      <select
                        value={filters.model || ''}
                        onChange={(e) => handleFilterChange('model', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                      >
                        <option value="">All models</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Location</label>
                      <input
                        type="text"
                        placeholder="ZIP or city"
                        value={filters.location || ''}
                        onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Price</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Min</label>
                      <input
                        type="number"
                        placeholder="$0"
                        value={filters.price_min || ''}
                        onChange={(e) => handleFilterChange('price_min', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Max</label>
                      <input
                        type="number"
                        placeholder="$100k"
                        value={filters.price_max || ''}
                        onChange={(e) => handleFilterChange('price_max', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Year */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Year</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Min</label>
                      <select
                        value={filters.year_min || ''}
                        onChange={(e) => handleFilterChange('year_min', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                      >
                        <option value="">Oldest</option>
                        {Array.from({ length: 25 }, (_, i) => 2000 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Max</label>
                      <select
                        value={filters.year_max || ''}
                        onChange={(e) => handleFilterChange('year_max', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                      >
                        <option value="">Newest</option>
                        {Array.from({ length: 25 }, (_, i) => 2000 + i).reverse().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mileage */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Mileage</h3>
                  <select
                    value={filters.mileage_max || ''}
                    onChange={(e) => handleFilterChange('mileage_max', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                  >
                    <option value="">Any mileage</option>
                    {[10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000].map(mileage => (
                      <option key={mileage} value={mileage}>{mileage.toLocaleString()} or less</option>
                    ))}
                  </select>
                </div>

                {/* Fuel Type */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Fuel Type</h3>
                  <select
                    value={filters.fuel_type || ''}
                    onChange={(e) => handleFilterChange('fuel_type', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                  >
                    <option value="">All</option>
                    <option value="Xăng">Gasoline</option>
                    <option value="Dầu diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Điện">Electric</option>
                  </select>
                </div>

                {/* Transmission */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Transmission</h3>
                  <select
                    value={filters.transmission || ''}
                    onChange={(e) => handleFilterChange('transmission', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                  >
                    <option value="">All</option>
                    <option value="Số tự động">Automatic</option>
                    <option value="Số sàn">Manual</option>
                  </select>
                </div>

                {/* Reset Filters */}
                <button
                  onClick={() => {
                    const categoryFilterMap: Record<string, { body_type?: string; fuel_type?: string }> = {
                      'suv': { body_type: 'SUV' },
                      'sedan': { body_type: 'Sedan' },
                      'electric': { fuel_type: 'Điện' },
                      'hatchback': { body_type: 'Hatchback' },
                      'pickup': { body_type: 'Bán tải' },
                      'mpv': { body_type: 'MPV' },
                    };
                    const categoryFilter = categoryFilterMap[categoryName.toLowerCase()] || {};
                    updateFilters(categoryFilter);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            </div>
          </aside>

          {/* Right Content - Results */}
          <div className="lg:col-span-3">
            {/* Sort */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1"></div>
              <select
                value={filters.sort_by ? (filters.sort_order === 'desc' ? `-${filters.sort_by}` : filters.sort_by) : ''}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-800 text-sm"
              >
                <option value="">Best match</option>
                <option value="price">Lowest price</option>
                <option value="-price">Highest price</option>
                <option value="mileage">Lowest mileage</option>
                <option value="-mileage">Highest mileage</option>
                <option value="year">Newest year</option>
                <option value="-year">Oldest year</option>
              </select>
            </div>

            {/* Results */}
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading...</p>
              </div>
            ) : searchResult && searchResult.results && searchResult.results.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                  {searchResult.results.map((vehicle) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                  ))}
                </div>

                {/* Pagination */}
                {searchResult.total > searchResult.page_size && (
                  <div className="flex justify-center items-center space-x-4">
                    <button
                      onClick={() => handlePageChange((filters.page || 1) - 1)}
                      disabled={!filters.page || filters.page === 1}
                      className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-gray-600 text-sm">
                      Page {filters.page || 1} / {Math.ceil(searchResult.total / searchResult.page_size)}
                    </span>
                    <button
                      onClick={() => handlePageChange((filters.page || 1) + 1)}
                      disabled={(filters.page || 1) >= Math.ceil(searchResult.total / searchResult.page_size)}
                      className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 text-lg font-medium">No {category.title.toLowerCase()} found</p>
                <p className="text-gray-500 mt-2 text-sm">Try adjusting your search filters</p>
              </div>
            )}

            {/* About Section */}
            {category.description && (
              <section className="mt-16 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About {category.title}</h2>
                <p className="text-gray-600 leading-relaxed max-w-3xl">
                  {category.description}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

