// In-memory demo data for Vercel deployment
export const demoUsers = [
  {
    id: 'admin-001',
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    created_at: '2025-12-01 07:07:13'
  },
  {
    id: 'user-001',
    email: 'editor@example.com',
    password: 'editor123',
    name: 'Editor User',
    role: 'editor',
    created_at: '2025-12-01 07:07:13'
  }
];

export const demoDatasets = [
  {
    id: 'dataset-tokyo-001',
    name: '東京の主要観光スポット 2025',
    type: 'geojson',
    record_count: 30,
    r2_key: null,
    schema_json: '{"properties":{"name":"string","name_en":"string","category":"string"}}',
    status: 'active',
    created_by: 'admin-001',
    created_at: '2025-12-01 08:00:00',
    updated_at: '2025-12-01 08:00:00'
  },
  {
    id: 'dataset-001',
    name: '観測ポイント2025',
    type: 'geojson',
    record_count: 150,
    r2_key: null,
    schema_json: '{"properties":{"name":"string","category":"string"}}',
    status: 'active',
    created_by: 'admin-001',
    created_at: '2025-12-01 07:07:19',
    updated_at: '2025-12-01 07:07:19'
  }
];

export const demoFeatures = [
  {
    id: 'feat-tokyo-001',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.7671,
    min_lat: 35.6812,
    max_lon: 139.7671,
    max_lat: 35.6812,
    properties_json: JSON.stringify({
      name: '東京駅',
      name_en: 'Tokyo Station',
      category: '交通',
      type: '駅',
      score: 96,
      address: '東京都千代田区丸の内1丁目',
      description: '日本の鉄道の玄関口、赤レンガ駅舎が美しい'
    })
  },
  {
    id: 'feat-tokyo-002',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.7006,
    min_lat: 35.6897,
    max_lon: 139.7006,
    max_lat: 35.6897,
    properties_json: JSON.stringify({
      name: '新宿駅',
      name_en: 'Shinjuku Station',
      category: '交通',
      type: '駅',
      score: 98,
      address: '東京都新宿区新宿3丁目',
      description: '世界一利用者数が多い駅'
    })
  },
  {
    id: 'feat-tokyo-003',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.6503,
    min_lat: 35.6762,
    max_lon: 139.6503,
    max_lat: 35.6762,
    properties_json: JSON.stringify({
      name: '渋谷駅',
      name_en: 'Shibuya Station',
      category: '交通',
      type: '駅',
      score: 95,
      address: '東京都渋谷区道玄坂1丁目',
      description: '若者文化の中心地、スクランブル交差点が有名'
    })
  },
  {
    id: 'feat-tokyo-004',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.7024,
    min_lat: 35.6284,
    max_lon: 139.7024,
    max_lat: 35.6284,
    properties_json: JSON.stringify({
      name: '東京タワー',
      name_en: 'Tokyo Tower',
      category: '観光',
      type: 'ランドマーク',
      score: 93,
      address: '東京都港区芝公園4-2-8',
      description: '333m、東京のシンボルタワー'
    })
  },
  {
    id: 'feat-tokyo-005',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.8107,
    min_lat: 35.7101,
    max_lon: 139.8107,
    max_lat: 35.7101,
    properties_json: JSON.stringify({
      name: '東京スカイツリー',
      name_en: 'Tokyo Skytree',
      category: '観光',
      type: 'ランドマーク',
      score: 97,
      address: '東京都墨田区押上1-1-2',
      description: '634m、世界一高い自立式電波塔'
    })
  },
  {
    id: 'feat-tokyo-006',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.7454,
    min_lat: 35.6586,
    max_lon: 139.7454,
    max_lat: 35.6586,
    properties_json: JSON.stringify({
      name: '皇居',
      name_en: 'Imperial Palace',
      category: '観光',
      type: '史跡',
      score: 90,
      address: '東京都千代田区千代田1-1',
      description: '天皇陛下のお住まい、江戸城跡'
    })
  },
  {
    id: 'feat-tokyo-007',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.7638,
    min_lat: 35.6654,
    max_lon: 139.7638,
    max_lat: 35.6654,
    properties_json: JSON.stringify({
      name: '秋葉原',
      name_en: 'Akihabara',
      category: '文化',
      type: '電気街',
      score: 92,
      address: '東京都千代田区外神田',
      description: 'オタク文化の聖地、電気街'
    })
  },
  {
    id: 'feat-tokyo-008',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.7967,
    min_lat: 35.7148,
    max_lon: 139.7967,
    max_lat: 35.7148,
    properties_json: JSON.stringify({
      name: '浅草寺',
      name_en: 'Senso-ji Temple',
      category: '観光',
      type: '寺院',
      score: 94,
      address: '東京都台東区浅草2-3-1',
      description: '東京最古の寺、雷門で有名'
    })
  },
  {
    id: 'feat-tokyo-009',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.6993,
    min_lat: 35.6658,
    max_lon: 139.6993,
    max_lat: 35.6658,
    properties_json: JSON.stringify({
      name: '明治神宮',
      name_en: 'Meiji Shrine',
      category: '観光',
      type: '神社',
      score: 91,
      address: '東京都渋谷区代々木神園町1-1',
      description: '明治天皇を祀る神社、広大な森'
    })
  },
  {
    id: 'feat-tokyo-010',
    dataset_id: 'dataset-tokyo-001',
    geometry_type: 'Point',
    min_lon: 139.6917,
    min_lat: 35.6938,
    max_lon: 139.6917,
    max_lat: 35.6938,
    properties_json: JSON.stringify({
      name: '新宿御苑',
      name_en: 'Shinjuku Gyoen',
      category: '公園',
      type: '庭園',
      score: 88,
      address: '東京都新宿区内藤町11',
      description: '四季折々の花が美しい広大な庭園'
    })
  }
];
