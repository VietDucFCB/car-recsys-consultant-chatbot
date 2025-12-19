'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { vehicleService } from '@/services/vehicleService';
import { SearchFilters, SearchResponse } from '@/types';
import VehicleCard from '@/components/VehicleCard';

export default function AdvancedSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    // Parse search params
    const params: SearchFilters = {};
    searchParams.forEach((value, key) => {
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
    // Auto search if there are any filters
    if (Object.keys(params).length > 0) {
      performSearch(params);
    }
  }, [searchParams]);

  const handleChange = (field: keyof SearchFilters, value: any) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'query') {
          params.append('q', String(value));
        } else {
          params.append(key, String(value));
        }
      }
    });
    router.push(`/search/advanced?${params.toString()}`);
  };

  const performSearch = async (searchFilters: SearchFilters) => {
    try {
      setLoading(true);
      const result = await vehicleService.search({ ...searchFilters, page_size: 20 });
      setSearchResult(result);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/" className="text-gray-600 hover:text-gray-800">Home</Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-800">Advanced search</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-20">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Advanced search</h1>
              {searchResult && (
                <p className="text-sm text-gray-600 mb-6">{searchResult.total.toLocaleString()}+ matches</p>
              )}

              <div className="space-y-6">
                {/* Location/Distance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Distance</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                  >
                    <option value="50">50 miles</option>
                    <option value="10">10 miles</option>
                    <option value="20">20 miles</option>
                    <option value="30">30 miles</option>
                    <option value="100">100 miles</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                  <input
                    type="text"
                    placeholder="90606"
                    value={filters.location || ''}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white">
                    <option value="">New, used & CPO</option>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="cpo">CPO</option>
                  </select>
                </div>

                {/* Make */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                  <select
                    value={filters.brand || ''}
                    onChange={(e) => handleChange('brand', e.target.value)}
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

                {/* Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min year</label>
                    <select
                      value={filters.year_min || ''}
                      onChange={(e) => handleChange('year_min', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                    >
                      <option value="">Oldest</option>
                      {Array.from({ length: 25 }, (_, i) => 2000 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max year</label>
                    <select
                      value={filters.year_max || ''}
                      onChange={(e) => handleChange('year_max', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                    >
                      <option value="">Newest</option>
                      {Array.from({ length: 25 }, (_, i) => 2000 + i).reverse().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min price</label>
                    <select
                      value={filters.price_min || ''}
                      onChange={(e) => handleChange('price_min', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                    >
                      <option value="">Lowest</option>
                      {[5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000].map(price => (
                        <option key={price} value={price}>${price.toLocaleString()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max price</label>
                    <select
                      value={filters.price_max || ''}
                      onChange={(e) => handleChange('price_max', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                    >
                      <option value="">Highest</option>
                      {[30000, 40000, 50000, 60000, 75000, 100000, 150000, 200000].map(price => (
                        <option key={price} value={price}>${price.toLocaleString()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mileage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mileage</label>
                  <select
                    value={filters.mileage_max || ''}
                    onChange={(e) => handleChange('mileage_max', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500 text-sm bg-white"
                  >
                    <option value="">Any mileage</option>
                    {[10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000].map(mileage => (
                      <option key={mileage} value={mileage}>{mileage.toLocaleString()} miles</option>
                    ))}
                  </select>
                </div>

                {/* Transmission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Transmission</label>
                  <div className="space-y-2">
                    {[
                      { value: 'Automatic', count: 10172 },
                      { value: 'Manual', count: 1519 },
                      { value: 'CVT', count: 1261 },
                      { value: 'Automanual', count: 50 },
                    ].map((item) => (
                      <label key={item.value} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.transmission === item.value}
                          onChange={(e) => handleChange('transmission', e.target.checked ? item.value : undefined)}
                          className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {item.value} ({item.count.toLocaleString()})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fuel Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Fuel type</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[
                      { value: 'Gasoline', count: 71081 },
                      { value: 'Hybrid', count: 14562 },
                      { value: 'Electric', count: 3326 },
                      { value: 'Diesel', count: 1214 },
                      { value: 'E85 Flex Fuel', count: 949 },
                      { value: 'Plug-In Hybrid', count: 18 },
                    ].map((item) => (
                      <label key={item.value} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.fuel_type === item.value}
                          onChange={(e) => handleChange('fuel_type', e.target.checked ? item.value : undefined)}
                          className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {item.value} ({item.count.toLocaleString()})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Drivetrain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Drivetrain</label>
                  <div className="space-y-2">
                    {[
                      { value: 'All-wheel Drive', count: 42221 },
                      { value: 'Four-wheel Drive', count: 6315 },
                      { value: 'Front-wheel Drive', count: 5875 },
                      { value: 'Rear-wheel Drive', count: 5095 },
                    ].map((item) => (
                      <label key={item.value} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {item.value} ({item.count.toLocaleString()})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium text-sm transition-colors"
              >
                {searchResult ? `Show ${searchResult.total.toLocaleString()}+ matches` : 'Show matches'}
              </button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Searching...</p>
              </div>
            ) : searchResult && searchResult.results && searchResult.results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResult.results.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600 text-lg">No results found</p>
                <p className="text-gray-500 mt-2 text-sm">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

