'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useFavoriteStore } from '@/store/favoriteStore';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { favorites } = useFavoriteStore();

  // Check if current page should have transparent header (only homepage)
  const shouldBeTransparent = pathname === '/' && !isScrolled;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollPosition > 50);
    };

    // Check initial scroll position immediately
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mounted]);

  const handleLogout = () => {
    clearAuth();
    setShowUserMenu(false);
    window.location.href = '/';
  };

  // Avoid hydration mismatch - use same structure as mounted version
  if (!mounted) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white text-gray-800 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded transition-colors hover:bg-gray-100 text-gray-800" aria-label="Menu">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <span className="text-xl font-serif font-semibold tracking-wide text-gray-800">CarMarket</span>
            </Link>
            </div>
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Cars"
                  className="w-full px-4 pl-10 py-2 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm border border-gray-300"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/sell" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                Sell With Us
              </Link>
              <Link href="/login" className="px-4 py-2 text-sm font-medium rounded border border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          shouldBeTransparent
            ? 'text-white' 
            : 'bg-white text-gray-800 shadow-sm'
        }`} 
        style={shouldBeTransparent ? { 
          backgroundColor: 'transparent',
          background: 'transparent',
          backgroundImage: 'none'
        } : {}}
      >
        {/* Main Header */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8" style={shouldBeTransparent ? { backgroundColor: 'transparent' } : {}}>
          <div className="flex items-center justify-between h-16" style={shouldBeTransparent ? { backgroundColor: 'transparent' } : {}}>
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`p-2 rounded transition-colors ${
                  shouldBeTransparent 
                    ? 'hover:bg-white/10 text-white' 
                    : 'hover:bg-gray-100 text-gray-800'
                }`}
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <span className={`text-xl font-serif font-semibold tracking-wide ${
                  shouldBeTransparent ? 'text-white' : 'text-gray-800'
                }`}>
                  CarMarket
                    </span>
                </Link>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Cars"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchQuery) {
                      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
                    }
                  }}
                  className="w-full px-4 pl-10 py-2 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm border border-gray-300"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Right: Sell With Us + Login */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/sell"
                className={`text-sm font-medium transition-colors ${
                  shouldBeTransparent 
                    ? 'text-white hover:text-gray-300' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Sell With Us
                </Link>
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      shouldBeTransparent
                        ? 'border border-white text-white hover:bg-white/10'
                        : 'border border-gray-300 text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {user?.full_name || user?.email || 'Account'}
                  </button>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                      <div className="absolute right-0 mt-2 w-56 rounded border border-gray-200 shadow-lg py-1 z-20 bg-white">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-800">
                            {user?.full_name || 'User'}
                          </p>
                          <p className="text-xs truncate mt-0.5 text-gray-500">
                            {user?.email}
                          </p>
                        </div>
                        <Link 
                          href="/favorites" 
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Favorites
                        </Link>
                        <div className="border-t my-1 border-gray-200"></div>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
            ) : (
                <Link 
                  href="/login" 
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    shouldBeTransparent
                      ? 'border border-white text-white hover:bg-white/10'
                      : 'border border-gray-300 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
    </header>
    </>
  );
}

