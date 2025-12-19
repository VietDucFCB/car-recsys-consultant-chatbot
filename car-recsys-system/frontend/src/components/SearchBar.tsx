'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchFilters } from '@/types';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
  resultCount?: number;
}

export default function SearchBar({ onSearch, initialFilters = {}, resultCount }: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleChange = (field: keyof SearchFilters, value: any) => {
    setFilters({ ...filters, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      {/* Free-text Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Try using your own words"
          value={filters.query || ''}
          onChange={(e) => handleChange('query', e.target.value)}
          className="w-full px-5 py-3 pr-12 rounded-full border-2 border-gray-300 focus:outline-none focus:border-gray-500 text-sm bg-white"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-500">- Or search by -</span>
        </div>
      </div>

      {/* Structured Filters */}
      <div className="space-y-3">
        {/* Filter Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">New/used</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm bg-white appearance-none pr-8"
            >
              <option value="">New & used</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
            <div className="absolute right-3 top-8 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Make</label>
            <select
              value={filters.brand || ''}
              onChange={(e) => handleChange('brand', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm bg-white appearance-none pr-8"
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
            <div className="absolute right-3 top-8 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Model</label>
            <select
              value={filters.model || ''}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm bg-white appearance-none pr-8"
            >
              <option value="">All models</option>
            </select>
            <div className="absolute right-3 top-8 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Distance</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm bg-white appearance-none pr-8"
            >
              <option value="">30 miles</option>
              <option value="10">10 miles</option>
              <option value="20">20 miles</option>
              <option value="50">50 miles</option>
              <option value="100">100 miles</option>
            </select>
            <div className="absolute right-3 top-8 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">ZIP</label>
            <input
              type="text"
              placeholder="60606"
              value={filters.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm bg-white"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              {resultCount !== undefined ? `Show ${resultCount} matches` : 'Search'}
            </button>
          </div>
        </div>

        {/* Advanced Filters Link */}
        <div className="flex justify-end">
          <Link
            href="/search/advanced"
            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Advanced search
          </Link>
        </div>
      </div>
    </form>
  );
}
