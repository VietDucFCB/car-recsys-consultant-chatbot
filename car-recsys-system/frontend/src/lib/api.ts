/**
 * API Service Layer for Car Recommendation System
 * Provides typed interfaces and functions for all API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============== TYPES ==============

export interface Vehicle {
  id?: string;
  vehicle_id: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  title?: string;
  brand?: string;
  car_model?: string;
  trim?: string;
  body_type?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  exterior_color?: string;
  interior_color?: string;
  mileage?: number;
  mileage_str?: string;
  price?: number;
  condition?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  listing_url?: string;
  vehicle_url?: string;
  created_at?: string;
  image_url?: string;
  images?: string[];
  car_rating?: number;
  mpg?: string;
}

export interface VehicleDetail extends Vehicle {
  description?: string;
  features?: string[];
  comfort_rating?: number;
  interior_rating?: number;
  performance_rating?: number;
  value_rating?: number;
  exterior_rating?: number;
  reliability_rating?: number;
  percentage_recommend?: number;
  accidents_damage?: string;
  one_owner?: boolean;
  monthly_payment?: number;
  seller_info?: {
    name?: string;
    phone?: string;
    rating?: number;
  };
  similar_vehicles?: Vehicle[];
}

export interface SearchParams {
  query?: string;
  make?: string;
  model?: string;
  min_year?: number;
  max_year?: number;
  min_price?: number;
  max_price?: number;
  body_type?: string;
  transmission?: string;
  fuel_type?: string;
  drivetrain?: string;
  exterior_color?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SearchResponse {
  items: Vehicle[];
  total: number;
  limit: number;
  offset: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface RecommendationResponse {
  recommendations: Vehicle[];
  recommendation_type: string;
  total: number;
}

export interface Interaction {
  id: string;
  user_id: string;
  vehicle_id: string;
  interaction_type: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  created_at: string;
}

export interface Review {
  vehicle_id: string;
  title?: string;
  overall_rating?: number;
  review_time?: string;
  user_name?: string;
  user_location?: string;
  review_text?: string;
  comfort_rating?: number;
  interior_rating?: number;
  performance_rating?: number;
  value_rating?: number;
  exterior_rating?: number;
  reliability_rating?: number;
}

export interface Seller {
  seller_key: string;
  seller_name?: string;
  seller_address?: string;
  seller_city?: string;
  seller_state?: string;
  seller_zip?: string;
  seller_phone?: string;
  seller_website?: string;
  seller_rating?: number;
  seller_rating_count?: number;
  description?: string;
  hours_monday?: string;
  hours_tuesday?: string;
  hours_wednesday?: string;
  hours_thursday?: string;
  hours_friday?: string;
  hours_saturday?: string;
  hours_sunday?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Chat types
export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  vehicles?: Vehicle[];
}

export interface ChatConversation {
  conversation_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  response: string;
  vehicles: Vehicle[];
  timestamp: string;
}

// ============== HELPER FUNCTIONS ==============

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export function formatPrice(price: number | undefined): string {
  if (!price) return 'Call for Price';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatMileage(mileage: number | undefined): string {
  if (!mileage) return 'N/A';
  return new Intl.NumberFormat('en-US').format(mileage) + ' mi';
}

// ============== AUTH HELPERS ==============

export function storeAuthData(response: AuthResponse): void {
  localStorage.setItem('auth_token', response.access_token);
  localStorage.setItem('auth_user', JSON.stringify(response.user));
}

export function clearAuthData(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

export function getCurrentUser(): User | null {
  const userData = localStorage.getItem('auth_user');
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// ============== INTERACTION TRACKING ==============

export async function trackVehicleView(vehicleId: string): Promise<void> {
  if (!isAuthenticated()) return;
  
  try {
    await fetch(`${API_BASE_URL}/api/v1/interactions/track`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        vehicle_id: vehicleId,
        interaction_type: 'view'
      })
    });
  } catch (error) {
    console.warn('Failed to track view:', error);
  }
}

export async function trackVehicleClick(vehicleId: string): Promise<void> {
  if (!isAuthenticated()) return;
  
  try {
    await fetch(`${API_BASE_URL}/api/v1/interactions/track`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        vehicle_id: vehicleId,
        interaction_type: 'click'
      })
    });
  } catch (error) {
    console.warn('Failed to track click:', error);
  }
}

// ============== API SERVICES ==============

export const vehiclesApi = {
  async search(params: SearchParams): Promise<SearchResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(
      `${API_BASE_URL}/api/v1/search?${queryParams.toString()}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<SearchResponse>(response);
  },

  async getById(id: string): Promise<VehicleDetail> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/listing/${id}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<VehicleDetail>(response);
  },

  async getListings(limit = 10, offset = 0): Promise<Vehicle[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/listings?limit=${limit}&offset=${offset}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<Vehicle[]>(response);
  },

  async getFacets(): Promise<Record<string, string[]>> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/facets`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<Record<string, string[]>>(response);
  },

  async getReviews(vehicleId: string, limit = 10): Promise<Review[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reviews/${vehicleId}?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<Review[]>(response);
  },

  async getSeller(vehicleId: string): Promise<Seller | null> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/seller/${vehicleId}`,
      { headers: getAuthHeaders() }
    );
    if (response.status === 404) {
      return null;
    }
    return handleResponse<Seller>(response);
  }
};

export const recommendationsApi = {
  async getSimilar(vehicleId: string, limit = 6): Promise<RecommendationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reco/similar/${vehicleId}?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<RecommendationResponse>(response);
  },

  async getPersonalized(limit = 20): Promise<RecommendationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reco/for-you?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<RecommendationResponse>(response);
  },

  async getPopular(limit = 20): Promise<RecommendationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reco/popular?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<RecommendationResponse>(response);
  },

  async getHybrid(limit = 20): Promise<RecommendationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/reco/hybrid?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<RecommendationResponse>(response);
  }
};

export const interactionsApi = {
  async track(data: { vehicle_id: string; interaction_type: string }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/interactions/track`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<void>(response);
  },

  async getHistory(params?: { limit?: number; interaction_type?: string }): Promise<Interaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.interaction_type) queryParams.append('interaction_type', params.interaction_type);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/interactions/history?${queryParams.toString()}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<Interaction[]>(response);
  },

  async getFavorites(): Promise<Favorite[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/interactions/favorites`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<Favorite[]>(response);
  },

  async addFavorite(vehicleId: string): Promise<Favorite> {
    const response = await fetch(`${API_BASE_URL}/api/v1/interactions/favorites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ vehicle_id: vehicleId })
    });
    return handleResponse<Favorite>(response);
  },

  async removeFavorite(vehicleId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/interactions/favorites/${vehicleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to remove favorite');
    }
  }
};

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email,
        password: password
      })
    });
    return handleResponse<AuthResponse>(response);
  },

  async register(data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return handleResponse<AuthResponse>(response);
  },

  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    clearAuthData();
    if (!response.ok) {
      // Still clear local data even if server fails
      console.warn('Server logout failed, but local data cleared');
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse<User>(response);
  }
};

// ============== CHAT API ==============

export const chatApi = {
  async sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/message`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        conversation_id: conversationId
      })
    });
    return handleResponse<ChatResponse>(response);
  },

  async getConversations(limit = 20): Promise<ChatConversation[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/chat/conversations?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<ChatConversation[]>(response);
  },

  async getConversationMessages(conversationId: string, limit = 100): Promise<ChatMessage[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/chat/conversation/${conversationId}?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<ChatMessage[]>(response);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversation/${conversationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/health`);
    return handleResponse<{ status: string }>(response);
  }
};
