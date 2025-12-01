-- Create FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS features_fts USING fts5(
  feature_id UNINDEXED,
  dataset_id UNINDEXED,
  properties_text,
  content='features',
  content_rowid='rowid'
);

-- Triggers to keep FTS index updated
CREATE TRIGGER IF NOT EXISTS features_fts_insert AFTER INSERT ON features BEGIN
  INSERT INTO features_fts(rowid, feature_id, dataset_id, properties_text)
  VALUES (new.rowid, new.id, new.dataset_id, new.properties_json);
END;

CREATE TRIGGER IF NOT EXISTS features_fts_delete AFTER DELETE ON features BEGIN
  INSERT INTO features_fts(features_fts, rowid, feature_id, dataset_id, properties_text)
  VALUES ('delete', old.rowid, old.id, old.dataset_id, old.properties_json);
END;

CREATE TRIGGER IF NOT EXISTS features_fts_update AFTER UPDATE ON features BEGIN
  INSERT INTO features_fts(features_fts, rowid, feature_id, dataset_id, properties_text)
  VALUES ('delete', old.rowid, old.id, old.dataset_id, old.properties_json);
  INSERT INTO features_fts(rowid, feature_id, dataset_id, properties_text)
  VALUES (new.rowid, new.id, new.dataset_id, new.properties_json);
END;

-- Layer styles table
CREATE TABLE IF NOT EXISTS layer_styles (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  style_json TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_layer_styles_dataset ON layer_styles(dataset_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
