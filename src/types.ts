// Cloudflare bindings
export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
};

// User types
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface UserWithPassword extends User {
  password: string;
}

// Dataset types
export type DatasetType = 'geojson' | 'csv' | 'shp';
export type DatasetStatus = 'active' | 'inactive' | 'processing';

export interface Dataset {
  id: string;
  name: string;
  type: DatasetType;
  record_count: number;
  r2_key?: string | null;
  schema_json?: string | null;
  status: DatasetStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Feature types
export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';

export interface Feature {
  id: string;
  dataset_id: string;
  geometry_type: GeometryType;
  min_lon: number | null;
  min_lat: number | null;
  max_lon: number | null;
  max_lat: number | null;
  properties_json: string;
  created_at: string;
}

// GeoJSON types
export interface GeoJSONGeometry {
  type: GeometryType;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  geometry: GeoJSONGeometry;
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Dataset API types
export interface DatasetListQuery {
  page?: number;
  pageSize?: number;
  type?: DatasetType;
}

export interface DatasetListResponse {
  items: Dataset[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DatasetUploadRequest {
  name: string;
  type: DatasetType;
  overwrite?: boolean;
}

// Map API types
export interface MapDataQuery {
  datasetId: string;
  bbox?: string; // "minLon,minLat,maxLon,maxLat"
  zoom?: number;
  limit?: number;
}

export interface NearbySearchQuery {
  datasetId: string;
  lat: number;
  lon: number;
  radius: number; // meters
}

export interface SearchQuery {
  datasetId: string;
  q?: string;
  category?: string;
  minScore?: number;
  maxScore?: number;
}
