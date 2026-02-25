/**
 * API Client for Torium Backend
 * All API calls go through this module
 */

// NEXT_PUBLIC_* vars must be inlined at build time.
// If missing, we detect production by hostname and use the correct URL.
function getApiBase(): string {
  // Check build-time env var first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Runtime fallback: detect production by hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'app.torium.app' || hostname === 'torium.app') {
      return 'https://torium.app/api/v1';
    }
    // Local development
    if (hostname === 'localhost') {
      return 'http://localhost:8787/api/v1';
    }
  }
  
  // Server-side or unknown: use relative (will fail on wrong domain but at least we tried)
  return '/api/v1';
}

const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, error.code || 'UNKNOWN', error.message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================
// Auth API
// ============================================================

export interface AuthRequestResponse {
  message: string;
}

export interface AuthVerifyResponse {
  user: {
    id: string;
    email: string;
    plan: 'free' | 'pro';
    createdAt: string;
  };
}

export const auth = {
  async requestMagicLink(email: string): Promise<AuthRequestResponse> {
    return request('/auth/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verify(token: string): Promise<AuthVerifyResponse> {
    return request(`/auth/verify?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
  },

  async logout(): Promise<void> {
    return request('/auth/logout', { method: 'POST' });
  },

  async me(): Promise<AuthVerifyResponse> {
    return request('/auth/me');
  },
};

// ============================================================
// Links API
// ============================================================

export interface Link {
  id: string;
  slug: string;
  destination: string;
  clicks7d: number;
  clicks30d: number;
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface LinksResponse {
  links: Link[];
  total: number;
}

export interface CreateLinkInput {
  destination: string;
  slug?: string;
}

export interface UpdateLinkInput {
  destination?: string;
  slug?: string;
  status?: 'active' | 'paused';
}

export const links = {
  async list(): Promise<LinksResponse> {
    return request('/links');
  },

  async get(id: string): Promise<Link> {
    return request(`/links/${id}`);
  },

  async create(data: CreateLinkInput): Promise<Link> {
    return request('/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateLinkInput): Promise<Link> {
    return request(`/links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request(`/links/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Analytics API
// ============================================================

export interface AnalyticsOverview {
  clicksTotal: number;
  clicks30d: number;
  clicks7d: number;
  linksCount: number;
  topLinks: Array<{ id: string; slug: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
  topCountries: Array<{ country: string; clicks: number }>;
  usage: {
    current: number;
    limit: number;
    period: string;
  };
}

export interface ClicksOverTime {
  data: Array<{ date: string; clicks: number }>;
}

export interface ReferrerBreakdown {
  data: Array<{ referrer: string; clicks: number; percentage: number }>;
}

export interface CountryBreakdown {
  data: Array<{ country: string; countryCode: string; clicks: number; percentage: number }>;
}

export interface DeviceBreakdown {
  data: Array<{ device: string; clicks: number; percentage: number }>;
}

export interface LinkAnalytics {
  link: Link;
  clicksOverTime: ClicksOverTime;
  referrers: ReferrerBreakdown;
  countries: CountryBreakdown;
  devices: DeviceBreakdown;
}

export type TimeRange = '7d' | '30d' | '90d' | 'all';

export const analytics = {
  async overview(): Promise<AnalyticsOverview> {
    return request('/analytics/overview');
  },

  async clicks(range: TimeRange = '30d'): Promise<ClicksOverTime> {
    return request(`/analytics/clicks?range=${range}`);
  },

  async linkAnalytics(linkId: string, range: TimeRange = '30d'): Promise<LinkAnalytics> {
    return request(`/analytics/links/${linkId}?range=${range}`);
  },

  async referrers(range: TimeRange = '30d'): Promise<ReferrerBreakdown> {
    return request(`/analytics/referrers?range=${range}`);
  },

  async countries(range: TimeRange = '30d'): Promise<CountryBreakdown> {
    return request(`/analytics/countries?range=${range}`);
  },

  async devices(range: TimeRange = '30d'): Promise<DeviceBreakdown> {
    return request(`/analytics/devices?range=${range}`);
  },
};

// ============================================================
// Billing API
// ============================================================

export interface BillingStatus {
  plan: 'free' | 'pro';
  status?: 'active' | 'past_due' | 'canceled';
  usage: {
    current: number;
    included: number;
    overage: number;
    overageRate: string;
  };
  currentPeriodEnd?: string;
}

export interface CheckoutResponse {
  url: string;
}

export interface PortalResponse {
  url: string;
}

export const billing = {
  async status(): Promise<BillingStatus> {
    return request('/billing/status');
  },

  async checkout(): Promise<CheckoutResponse> {
    return request('/billing/checkout', { method: 'POST' });
  },

  async portal(): Promise<PortalResponse> {
    return request('/billing/portal', { method: 'POST' });
  },
};
