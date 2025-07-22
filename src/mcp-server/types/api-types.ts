// Common API Response Structure
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Product Related Types
export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  stock: number;
  sku: string;
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tags: string[];
  images: ProductImage[];
  brand?: Brand;
  category?: Category;
  variants?: ProductVariant[];
  specifications?: ProductSpecification[];
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  featured: boolean;
  ratings: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  stock: number;
  sku: string;
  barcode?: string;
  image?: string;
  attributes: VariantAttribute[];
}

export interface VariantAttribute {
  name: string;
  value: string;
}

export interface ProductSpecification {
  id: string;
  name: string;
  value: string;
  group?: string;
}

// Brand and Category Types
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  featured: boolean;
  productsCount: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  level: number;
  isLeaf: boolean;
  productsCount: number;
  children?: Category[];
}

// Order Related Types
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  user?: User;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress?: Address;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  tracking?: TrackingInfo;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  total: number;
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
}

export interface TrackingInfo {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

// User Related Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  preferences?: UserPreferences;
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'USER' | 'SELLER' | 'ADMIN';

export interface UserPreferences {
  currency: string;
  language: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

// Search and Filter Types
export interface SearchParams {
  query?: string;
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  tags?: string[];
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type SortOption =
  | 'relevance'
  | 'price'
  | 'name'
  | 'rating'
  | 'popularity'
  | 'newest'
  | 'discount';

export interface SearchResponse {
  products: Product[];
  facets: SearchFacets;
  pagination: PaginationMeta;
  suggestions?: string[];
}

export interface SearchFacets {
  categories: FacetItem[];
  brands: FacetItem[];
  priceRanges: PriceRangeFacet[];
  attributes: AttributeFacet[];
}

export interface FacetItem {
  id: string;
  name: string;
  count: number;
}

export interface PriceRangeFacet {
  min: number;
  max: number;
  count: number;
}

export interface AttributeFacet {
  name: string;
  values: FacetItem[];
}

// Analytics Types
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AnalyticsData {
  popularProducts: Product[];
  conversionMetrics: ConversionMetrics;
  searchMetrics: SearchMetrics;
  userBehavior: UserBehaviorMetrics;
}

export interface ConversionMetrics {
  totalViews: number;
  totalOrders: number;
  conversionRate: number;
  averageOrderValue: number;
  cartAbandonmentRate: number;
}

export interface SearchMetrics {
  totalSearches: number;
  topQueries: string[];
  zeroResultQueries: string[];
  averageResultsPerQuery: number;
}

export interface UserBehaviorMetrics {
  averageSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  returnVisitorRate: number;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  location?: string;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  reference?: string;
  createdAt: string;
  createdBy: string;
}

// Authentication Types
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

// MCP Specific Types
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
}

// API Client Request/Response Types
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  headers?: Record<string, string>;
}

export interface APIClientResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}
