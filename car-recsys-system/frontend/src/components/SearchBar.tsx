'use client';

import { useState } from 'react';
import { SearchFilters } from '@/types';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}

export default function SearchBar({ onSearch, initialFilters = {} }: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleChange = (field: keyof SearchFilters, value: any) => {
    setFilters({ ...filters, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search cars..."
          value={filters.q || ''}
          onChange={(e) => handleChange('q', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        
        <select
          value={filters.brand || ''}
          onChange={(e) => handleChange('brand', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Brands</option>
          <option value="Toyota">Toyota</option>
          <option value="Honda">Honda</option>
          <option value="Mazda">Mazda</option>
          <option value="Hyundai">Hyundai</option>
          <option value="Ford">Ford</option>
          <option value="Kia">Kia</option>
          <option value="Vinfast">Vinfast</option>
        </select>
        
        <select
          value={filters.condition || ''}
          onChange={(e) => handleChange('condition', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Condition</option>
          <option value="new">New</option>
          <option value="used">Used</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        {showAdvanced ? '▲ Hide Advanced Filters' : '▼ Show Advanced Filters'}
      </button>

      {showAdvanced && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
            <input
              type="number"
              placeholder="VND"
              value={filters.price_min || ''}
              onChange={(e) => handleChange('price_min', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
            <input
              type="number"
              placeholder="VND"
              value={filters.price_max || ''}
              onChange={(e) => handleChange('price_max', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Year</label>
            <input
              type="number"
              placeholder="2000"
              value={filters.year_min || ''}
              onChange={(e) => handleChange('year_min', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Year</label>
            <input
              type="number"
              placeholder="2024"
              value={filters.year_max || ''}
              onChange={(e) => handleChange('year_max', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <select
            value={filters.fuel_type || ''}
            onChange={(e) => handleChange('fuel_type', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Fuel Type</option>
            <option value="Xăng">Gasoline</option>
            <option value="Dầu diesel">Diesel</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Điện">Electric</option>
          </select>
          
          <select
            value={filters.transmission || ''}
            onChange={(e) => handleChange('transmission', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Transmission</option>
            <option value="Số tự động">Automatic</option>
            <option value="Số sàn">Manual</option>
          </select>
          
          <select
            value={filters.body_type || ''}
            onChange={(e) => handleChange('body_type', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Body Type</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="Hatchback">Hatchback</option>
            <option value="MPV">MPV</option>
            <option value="Bán tải">Pickup</option>
          </select>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Mileage (km)</label>
            <input
              type="number"
              placeholder="100000"
              value={filters.mileage_max || ''}
              onChange={(e) => handleChange('mileage_max', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="submit"
          className="w-full bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-medium"
        >
          🔍 Search
        </button>
      </div>
    </form>
  );
}
