export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Vehicle {
  id: number;
  title: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
  mileage: number | null;
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
  color: string | null;
  seats: number | null;
  origin: string | null;
  description: string | null;
  image_url: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  location: string | null;
  url: string | null;
  posted_date: string | null;
}

export interface SearchFilters {
  query?: string;
  brand?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  mileage_max?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  location?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface SearchResponse {
  results: Vehicle[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LoginRequest {
  username: string;  // Can be username or email
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Recommendation {
  vehicle: Vehicle;
  score: number;
  reason?: string;
}
