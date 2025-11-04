import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Product, 
  AuthResponse, 
  CreateProductRequest, 
  UpdateProductRequest,
  ProductHistory,
  BlockchainBlock,
  UserRole
} from '@/types';


const DEFAULT_API_BASE_URL = 'http://127.0.0.1:5000';

function resolveApiBaseUrl() {
  try {
    const url = new URL(window.location.href);
    const fromParam = url.searchParams.get('api_base_url');
    if (fromParam) {
      localStorage.setItem('api_base_url', fromParam);
      return fromParam;
    }
  } catch {}
  return localStorage.getItem('api_base_url') || DEFAULT_API_BASE_URL;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

//  Request Interceptor - Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//  Response Interceptor - Handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// API SERVICES
// Authentication Services
export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { username, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async register(username: string, password: string, role: UserRole): Promise<{ message: string; user: User }> {
    const { data } = await api.post('/api/auth/register', { username, password, role });
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>('/api/auth/me');
    return data;
  },

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  },

  async getAllUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>('/api/auth/users');
    return data;
  },

  async deleteUser(username: string, cascade: boolean = false): Promise<any> {
    const { data } = await api.delete(`/api/auth/users/${username}?cascade=${cascade}`);
    return data;
  }
};

//  User Services
export const userService = {
  async getUsersByRole(role: UserRole): Promise<{ username: string }[]> {
    const { data } = await api.get(`/api/users/list_by_role?role=${role}`);
    return data;
  }
};

//  Product Services  
export const productService = {
  async createProduct(productData: CreateProductRequest): Promise<any> {
    const { data } = await api.post('/api/products/', productData);
    return data;
  },

  async updateProduct(updateData: UpdateProductRequest): Promise<any> {
    const { data } = await api.post('/api/products/update', updateData);
    return data;
  },

  async getProduct(productId: string): Promise<Product> {
    const { data } = await api.get<Product>(`/api/products/${productId}`);
    return data;
  },

  async getProducts(params?: {
      page?: number;
      per_page?: number;
      status?: string;
      owner?: string;
      custodian?: string; // frontend param; backend may expect current_custodian
      sort?: string;
    }): Promise<{ page: number; per_page: number; total: number; products: Product[] }> {
      // Normalize params for backend compatibility
      const normalizedParams: any = { ...(params || {}) };
      if (normalizedParams.custodian && !normalizedParams.current_custodian) {
        normalizedParams.current_custodian = normalizedParams.custodian;
        delete normalizedParams.custodian;
      }

      // Prefer no trailing slash and handle different possible response shapes
      const { data } = await api.get('/api/products/', { params: normalizedParams });

      if (Array.isArray(data)) {
        return { page: 1, per_page: data.length, total: data.length, products: data };
      }
      if (data && Array.isArray(data.products)) {
        return data;
      }
      if (data && Array.isArray(data.items)) {
        return { page: data.page ?? 1, per_page: data.per_page ?? data.items.length, total: data.total ?? data.items.length, products: data.items };
      }
      return { page: 1, per_page: 0, total: 0, products: [] };
    },

  async searchProducts(query: string): Promise<Product[]> {
    const { data } = await api.get(`/api/products/search?query=${encodeURIComponent(query)}`);
    return data;
  },

  async deleteProduct(productId: string): Promise<any> {
    const { data } = await api.delete(`/api/products/${productId}`);
    return data;
  },

  async getProductHistory(productId: string): Promise<ProductHistory> {
    const { data } = await api.get<ProductHistory>(`/api/products/${productId}/history`);
    return data;
  },

  async getQRCode(productId: string): Promise<Blob> {
    const response = await api.get(`/api/products/${productId}/qrcode`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async exportProductHistory(productId: string): Promise<Blob> {
    const response = await api.get(`/api/products/${productId}/export`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Blockchain Services
export const blockchainService = {
  async getFullChain(): Promise<{ chain: BlockchainBlock[]; valid: boolean; message: string }> {
    const { data } = await api.get('/api/chain/');
    return data;
  },

  async validateChain(): Promise<{ valid: boolean; message: string }> {
    const { data } = await api.get('/api/chain/validate');
    return data;
  },

  async getProductBlockchain(productId: string): Promise<BlockchainBlock[]> {
    const { data } = await api.get(`/api/products/blockchain/${productId}`);
    return data;
  },

  async getAllProductsBlockchain(): Promise<BlockchainBlock[]> {
    const { data } = await api.get('/api/products/blockchain');
    return data;
  },

  async verifyBlockchain(): Promise<{ valid: boolean; message: string }> {
    const { data } = await api.get('/api/products/blockchain/verify');
    return data;
  }
};

//  Geolocation Service
export const locationService = {
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
};

// Public Verification Service (No Auth Required)
export const publicVerifyService = {
  async verifyProduct(productId: string): Promise<ProductHistory> {
    const publicApi = axios.create({
      baseURL: resolveApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { data } = await publicApi.get<ProductHistory>(`/api/public/verify/${productId}`);
    return data;
  }
};

//  Order Services
export const orderService = {
  // Fetch available products (supports optional supplier filter)
  async getAvailableProducts(params?: { supplier_username?: string }): Promise<Product[]> {
    const query = params?.supplier_username
      ? `?supplier_username=${encodeURIComponent(params.supplier_username)}`
      : '';
    const { data } = await api.get(`/api/products/available${query}`);
    return data;
  },

  // Create a new order
  async createOrder(orderData: {
    product_id: string;
    to_username?: string;
    message: string;
  }): Promise<any> {
    const { data } = await api.post('/api/orders/create', orderData);
    return data;
  },

  // Update order status
  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string
  ): Promise<any> {
    const { data } = await api.post(`/api/orders/${orderId}/update_status`, {
      status,
      note,
    });
    return data;
  },

  //  Fetch current user's orders
  async getMyOrders(params?: {
    role_filter?: 'sent' | 'received';
    status?: string;
  }): Promise<any[]> {
    const { data } = await api.get('/api/orders/my_orders', { params });
    return data;
  },
};



export default api;