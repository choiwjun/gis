-- Insert test users (all passwords are 'admin123')
INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES 
  ('user-001', 'editor@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Editor User', 'editor'),
  ('user-002', 'viewer@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Viewer User', 'viewer');

-- Insert test datasets
INSERT OR IGNORE INTO datasets (id, name, type, record_count, status, created_by) VALUES 
  ('dataset-001', '観測ポイント2025', 'geojson', 150, 'active', 'admin-001'),
  ('dataset-002', '施設データ', 'geojson', 80, 'active', 'admin-001');

-- Insert test features for dataset-001
INSERT OR IGNORE INTO features (id, dataset_id, geometry_type, min_lon, min_lat, max_lon, max_lat, properties_json) VALUES 
  ('feature-001', 'dataset-001', 'Point', 139.12, 35.15, 139.12, 35.15, '{"name":"観測地点A","category":"type1","score":82}'),
  ('feature-002', 'dataset-001', 'Point', 139.15, 35.18, 139.15, 35.18, '{"name":"観測地点B","category":"type2","score":75}'),
  ('feature-003', 'dataset-001', 'Point', 139.18, 35.12, 139.18, 35.12, '{"name":"観測地点C","category":"type1","score":90}');
