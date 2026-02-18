// ─────────────────────────────────────────
// API Configuration - Connects to Real API
// ─────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

// ─────────────────────────────────────────
// Token Management — In-Memory Storage
//
// WHY: Access tokens must NOT be stored in localStorage (XSS vulnerable).
// The token lives only in this module-level variable during the browser session.
//
// HOW MIDDLEWARE READS IT:
// Next.js middleware runs on the server edge and cannot access memory.
// We write a short-lived JS cookie (access_token) ONLY so middleware.ts
// can decode the role and redirect accordingly. The cookie does NOT replace
// memory — all API calls still read from _accessToken (memory).
// ─────────────────────────────────────────

let _accessToken: string | null = null;

const COOKIE_NAME = 'access_token';

function setMiddlewareCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + 15 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${token}; expires=${expires}; path=/; SameSite=Strict`;
}

function clearMiddlewareCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}

export const tokenManager = {
  get: (): string | null => {
    return _accessToken;
  },

  set: (token: string): void => {
    _accessToken = token;
    setMiddlewareCookie(token);
  },

  remove: (): void => {
    _accessToken = null;
    clearMiddlewareCookie();
  },
};

// ─────────────────────────────────────────
// API Client Class
// ─────────────────────────────────────────

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const token = tokenManager.get();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && !isRetry) {
      const newToken = await this.tryRefreshToken();
      if (newToken) {
        return this.request<T>(endpoint, options, true);
      } else {
        tokenManager.remove();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError('UNAUTHORIZED', 'Session expired. Please log in again.', []);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An error occurred',
        data.error?.details || []
      );
    }

    return data.data !== undefined ? data.data : data;
  }

  private async tryRefreshToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }
    this.isRefreshing = true;
    this.refreshPromise = fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = await res.json();
        const newToken: string | null = body?.data?.accessToken ?? null;
        if (newToken) tokenManager.set(newToken);
        return newToken;
      })
      .catch(() => null)
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// ─────────────────────────────────────────
// Custom Error Class
// ─────────────────────────────────────────

export class ApiError extends Error {
  code: string;
  details: Array<{ field: string; message: string }>;

  constructor(code: string, message: string, details: Array<{ field: string; message: string }> = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

// ─────────────────────────────────────────
// Export singleton instance
// ─────────────────────────────────────────

export const api = new ApiClient(API_BASE_URL);

// ─────────────────────────────────────────
// API Endpoints Object
// ─────────────────────────────────────────

export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  
  // Tenants
  tenants: {
    list: '/tenants',
    create: '/tenants',
    get: (id: string) => `/tenants/${id}`,
    update: (id: string) => `/tenants/${id}`,
    updateStatus: (id: string) => `/tenants/${id}/status`,
  },
  
  // Branches
  branches: {
    list: '/branches',
    create: '/branches',
    get: (id: string) => `/branches/${id}`,
    update: (id: string) => `/branches/${id}`,
    updateStatus: (id: string) => `/branches/${id}/status`,
  },
  
  // Users
  users: {
    list: '/users',
    create: '/users',
    get: (id: string) => `/users/${id}`,
    updateStatus: (id: string) => `/users/${id}/status`,
    updateBranch: (id: string) => `/users/${id}/branch`,
  },
  
  // Shipments
  shipments: {
    list: '/shipments',
    create: '/shipments',
    get: (id: string) => `/shipments/${id}`,
    history: (id: string) => `/shipments/${id}/history`,
    assign: (id: string) => `/shipments/${id}/assign`,
    updateStatus: (id: string) => `/shipments/${id}/status`,
    cancel: (id: string) => `/shipments/${id}`,
    tracking: (trackingNumber: string) => `/shipments/tracking/${trackingNumber}`,
  },
  
  // COD
  cod: {
    records: '/cod/records',
    record: (id: string) => `/cod/records/${id}`,
    balance: (merchantId: string) => `/cod/balance/${merchantId}`,
    settlements: '/cod/settlements',
    createSettlement: '/cod/settlements',
    settlement: (id: string) => `/cod/settlements/${id}`,
    confirmPayout: (id: string) => `/cod/settlements/${id}/pay`,
  },
  
  // Pricing
  pricing: {
    list: '/pricing-rules',
    create: '/pricing-rules',
    get: (id: string) => `/pricing-rules/${id}`,
    update: (id: string) => `/pricing-rules/${id}`,
    delete: (id: string) => `/pricing-rules/${id}`,
    calculate: '/pricing-rules/calculate',
  },
  
  // Stats
  stats: {
    company: '/stats/company',
    branch: '/stats/branch',
    merchant: '/stats/merchant',
    courier: '/stats/courier',
  },
};
