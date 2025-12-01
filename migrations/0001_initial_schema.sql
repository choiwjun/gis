-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'editor', 'viewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Datasets table (메타데이터)
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('geojson', 'csv', 'shp')),
  record_count INTEGER DEFAULT 0,
  r2_key TEXT,
  schema_json TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'processing')),
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Features table (GeoJSON 데이터 - 간단한 속성만 저장)
-- 실제 GeoJSON은 R2에 저장하고, 검색용으로만 일부 데이터 저장
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  geometry_type TEXT NOT NULL CHECK(geometry_type IN ('Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon')),
  -- 간단한 BBOX 저장 (공간 인덱스 대용)
  min_lon REAL,
  min_lat REAL,
  max_lon REAL,
  max_lat REAL,
  properties_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_datasets_created_by ON datasets(created_by);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_features_dataset_id ON features(dataset_id);
CREATE INDEX IF NOT EXISTS idx_features_bbox ON features(min_lon, min_lat, max_lon, max_lat);

-- Insert default admin user (password: admin123)
-- SHA-256 hash for 'admin123': echo -n "admin123" | sha256sum
INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES 
  ('admin-001', 'admin@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin User', 'admin');
