// GIS Web App Frontend
// Using Vanilla JS with MapLibre GL JS

// API Configuration
const API_BASE = window.location.origin + '/api';
let accessToken = localStorage.getItem('accessToken');
let currentUser = null;
let map = null;
let datasets = [];
let currentDataset = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (accessToken) {
    loadUser();
  } else {
    showLogin();
  }
});

// Show login form
function showLogin() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-map-marked-alt mr-2"></i>
          GIS Web App
        </h1>
        <div id="error-message" class="hidden mb-4 p-3 bg-red-100 text-red-700 rounded"></div>
        <form id="login-form">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-semibold mb-2">
              メールアドレス
            </label>
            <input type="email" id="email" required
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              value="admin@example.com">
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-semibold mb-2">
              パスワード
            </label>
            <input type="password" id="password" required
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              value="admin123">
          </div>
          <button type="submit" 
            class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
            ログイン
          </button>
        </form>
        <p class="mt-4 text-sm text-gray-600">
          デフォルト: admin@example.com / admin123
        </p>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      
      if (result.success) {
        accessToken = result.data.accessToken;
        currentUser = result.data.user;
        localStorage.setItem('accessToken', accessToken);
        showApp();
      } else {
        showError(result.error.message);
      }
    } catch (error) {
      showError('ログインに失敗しました: ' + error.message);
    }
  });
}

function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}

// Load current user
async function loadUser() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const result = await response.json();
    
    if (result.success) {
      currentUser = result.data;
      showApp();
    } else {
      localStorage.removeItem('accessToken');
      showLogin();
    }
  } catch (error) {
    localStorage.removeItem('accessToken');
    showLogin();
  }
}

// Show main app
async function showApp() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="flex h-screen bg-gray-100">
      <!-- Left Panel -->
      <div class="w-80 bg-white shadow-lg overflow-y-auto">
        <!-- Header -->
        <div class="p-4 border-b bg-blue-600 text-white">
          <h1 class="text-xl font-bold">
            <i class="fas fa-map-marked-alt mr-2"></i>
            GIS Web App
          </h1>
          <p class="text-sm mt-1">${currentUser.name} (${currentUser.role})</p>
          <button onclick="logout()" class="mt-2 text-sm underline hover:text-blue-200">
            <i class="fas fa-sign-out-alt mr-1"></i>
            ログアウト
          </button>
        </div>

        <!-- Search Panel -->
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold mb-3">
            <i class="fas fa-search mr-2"></i>
            検索
          </h2>
          <input type="text" id="search-input" placeholder="キーワード検索..."
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500">
          <button onclick="performSearch()" 
            class="w-full mt-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            検索
          </button>
        </div>

        <!-- Layer Panel -->
        <div class="p-4 border-b">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-lg font-semibold">
              <i class="fas fa-layer-group mr-2"></i>
              レイヤー
            </h2>
            <button onclick="loadDatasets()" class="text-blue-600 hover:text-blue-800">
              <i class="fas fa-sync"></i>
            </button>
          </div>
          <div id="layers-list"></div>
        </div>

        <!-- Dataset Management -->
        ${currentUser.role !== 'viewer' ? `
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold mb-3">
            <i class="fas fa-database mr-2"></i>
            データセット管理
          </h2>
          <button onclick="showUploadForm()" 
            class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 mb-2">
            <i class="fas fa-upload mr-2"></i>
            アップロード
          </button>
        </div>
        ` : ''}

        <!-- Advanced Tools -->
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-3">
            <i class="fas fa-tools mr-2"></i>
            高度なツール
          </h2>
          <div class="space-y-2">
            <button onclick="showAdvancedSearchDialog()" 
              class="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 text-sm">
              <i class="fas fa-search-plus mr-2"></i>
              高度な検索
            </button>
            ${currentUser.role !== 'viewer' ? `
            <button onclick="toggleDrawMode()" id="draw-toggle-btn"
              class="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 text-sm">
              <i class="fas fa-draw-polygon mr-2"></i>
              描画モード
            </button>
            ` : ''}
            <button onclick="showExportMenu()" 
              class="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700 text-sm">
              <i class="fas fa-download mr-2"></i>
              エクスポート
            </button>
            <button onclick="captureMap()" 
              class="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 text-sm">
              <i class="fas fa-camera mr-2"></i>
              スクリーンショット
            </button>
          </div>
        </div>
      </div>

      <!-- Map Container -->
      <div class="flex-1 relative">
        <div id="map"></div>
        
        <!-- Detail Panel (Slide-in) -->
        <div id="detail-panel" 
          class="absolute top-0 right-0 w-96 h-full bg-white shadow-xl transform translate-x-full transition-transform duration-300">
          <div class="p-4 h-full overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">詳細情報</h2>
              <button onclick="closeDetailPanel()" class="text-gray-600 hover:text-gray-800">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div id="detail-content"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize map
  initMap();
  
  // Load datasets
  loadDatasets();
  
  // Initialize advanced features
  setTimeout(() => {
    if (typeof initAdvancedFeatures !== 'undefined') {
      initAdvancedFeatures(map, API_BASE, accessToken);
    }
  }, 1000);
}

// Initialize MapLibre map
function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [139.15, 35.15],
    zoom: 10
  });

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  
  // Add scale control
  map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

  map.on('load', () => {
    console.log('Map loaded');
  });
}

// Load datasets
async function loadDatasets() {
  try {
    const response = await fetch(`${API_BASE}/datasets`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const result = await response.json();
    
    if (result.success) {
      datasets = result.data.items;
      renderLayers();
    }
  } catch (error) {
    console.error('Failed to load datasets:', error);
  }
}

// Render layer list
function renderLayers() {
  const layersList = document.getElementById('layers-list');
  
  if (datasets.length === 0) {
    layersList.innerHTML = '<p class="text-gray-500 text-sm">データセットがありません</p>';
    return;
  }

  layersList.innerHTML = datasets.map(dataset => `
    <div class="mb-2 p-2 border rounded hover:bg-gray-50">
      <label class="flex items-center cursor-pointer">
        <input type="checkbox" class="mr-2" 
          onchange="toggleLayer('${dataset.id}')" 
          ${currentDataset && currentDataset.id === dataset.id ? 'checked' : ''}>
        <div class="flex-1">
          <div class="font-semibold">${dataset.name}</div>
          <div class="text-xs text-gray-500">
            ${dataset.type} | ${dataset.record_count} 件
          </div>
        </div>
      </label>
    </div>
  `).join('');
}

// Toggle layer visibility
async function toggleLayer(datasetId) {
  const dataset = datasets.find(d => d.id === datasetId);
  
  if (currentDataset && currentDataset.id === datasetId) {
    // Remove layer
    if (map.getLayer('points')) {
      map.removeLayer('points');
    }
    if (map.getSource('dataset')) {
      map.removeSource('dataset');
    }
    currentDataset = null;
    return;
  }

  // Remove existing layer
  if (map.getLayer('points')) {
    map.removeLayer('points');
  }
  if (map.getSource('dataset')) {
    map.removeSource('dataset');
  }

  // Load and add new layer
  currentDataset = dataset;
  await loadAndDisplayDataset(datasetId);
}

// Load and display dataset on map
async function loadAndDisplayDataset(datasetId) {
  try {
    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    
    const response = await fetch(
      `${API_BASE}/map/data?datasetId=${datasetId}&bbox=${bbox}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const result = await response.json();
    
    if (result.success) {
      const geojson = result.data;
      
      // Add source
      map.addSource('dataset', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster layer
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'dataset',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#E5F0FF', 10,
            '#1E6EFF', 50,
            '#0C4FCC'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            14, 10,
            18, 50,
            22
          ]
        }
      });

      // Add cluster count layer
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'dataset',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Semibold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#111827'
        }
      });

      // Add points layer
      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'dataset',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#1E6EFF',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Click on cluster
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('dataset').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        });
      });

      // Click on point
      map.on('click', 'points', (e) => {
        const feature = e.features[0];
        showFeatureDetail(feature);
      });

      // Change cursor on hover
      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'points', () => {
        map.getCanvas().style.cursor = '';
      });

      // Fit to bounds
      if (geojson.features.length > 0) {
        const coordinates = geojson.features.map(f => f.geometry.coordinates);
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
        
        map.fitBounds(bounds, { padding: 50 });
      }
    }
  } catch (error) {
    console.error('Failed to load dataset:', error);
  }
}

// Show feature detail panel
function showFeatureDetail(feature) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  
  const properties = feature.properties;
  const propsHtml = Object.keys(properties).map(key => `
    <div class="mb-3">
      <div class="text-sm font-semibold text-gray-600">${key}</div>
      <div class="text-base">${properties[key]}</div>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="mb-4 p-4 bg-blue-50 rounded">
      <div class="text-sm text-gray-600">フィーチャーID</div>
      <div class="font-mono text-sm">${feature.id}</div>
    </div>
    <h3 class="text-lg font-semibold mb-3">プロパティ</h3>
    ${propsHtml}
  `;

  panel.classList.remove('translate-x-full');
}

// Close detail panel
function closeDetailPanel() {
  const panel = document.getElementById('detail-panel');
  panel.classList.add('translate-x-full');
}

// Perform search
async function performSearch() {
  const query = document.getElementById('search-input').value;
  
  if (!currentDataset) {
    alert('検索するにはまずレイヤーを選択してください');
    return;
  }

  if (!query) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/search?datasetId=${currentDataset.id}&q=${encodeURIComponent(query)}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const result = await response.json();
    
    if (result.success && result.data.features.length > 0) {
      // Update map data
      map.getSource('dataset').setData(result.data);
      
      // Fit to bounds
      const coordinates = result.data.features.map(f => f.geometry.coordinates);
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
      
      map.fitBounds(bounds, { padding: 50 });
    } else {
      alert('検索結果がありません');
    }
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Show upload form
function showUploadForm() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-96">
      <h2 class="text-xl font-bold mb-4">データセットアップロード</h2>
      <form id="upload-form">
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">名前</label>
          <input type="text" id="dataset-name" required
            class="w-full px-3 py-2 border rounded">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">タイプ</label>
          <select id="dataset-type" required
            class="w-full px-3 py-2 border rounded">
            <option value="geojson">GeoJSON</option>
            <option value="csv">CSV</option>
            <option value="shp">Shapefile (ZIP)</option>
          </select>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">ファイル</label>
          <input type="file" id="dataset-file" required
            class="w-full px-3 py-2 border rounded">
        </div>
        <div class="flex gap-2">
          <button type="submit" 
            class="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            アップロード
          </button>
          <button type="button" onclick="this.closest('.fixed').remove()"
            class="px-4 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('dataset-name').value);
    formData.append('type', document.getElementById('dataset-type').value);
    formData.append('file', document.getElementById('dataset-file').files[0]);
    
    try {
      const response = await fetch(`${API_BASE}/datasets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('アップロード成功！');
        modal.remove();
        loadDatasets();
      } else {
        alert('アップロード失敗: ' + result.error.message);
      }
    } catch (error) {
      alert('アップロード失敗: ' + error.message);
    }
  });
}

// Logout
function logout() {
  localStorage.removeItem('accessToken');
  accessToken = null;
  currentUser = null;
  location.reload();
}

// Advanced feature functions
function showAdvancedSearchDialog() {
  if (!currentDataset) {
    alert('まずレイヤーを選択してください');
    return;
  }
  if (window.advancedSearch) {
    window.advancedSearch.showSearchDialog(currentDataset.id);
  }
}

let drawModeActive = false;
function toggleDrawMode() {
  if (!currentDataset) {
    alert('まずレイヤーを選択してください');
    return;
  }
  
  if (!window.featureEditor) {
    alert('機能が初期化されていません');
    return;
  }
  
  drawModeActive = !drawModeActive;
  const btn = document.getElementById('draw-toggle-btn');
  
  if (drawModeActive) {
    window.featureEditor.enableDrawMode(currentDataset.id);
    btn.classList.add('bg-red-600');
    btn.classList.remove('bg-orange-600');
    btn.innerHTML = '<i class="fas fa-times mr-2"></i>描画終了';
  } else {
    window.featureEditor.disableDrawMode();
    btn.classList.remove('bg-red-600');
    btn.classList.add('bg-orange-600');
    btn.innerHTML = '<i class="fas fa-draw-polygon mr-2"></i>描画モード';
  }
}

function showExportMenu() {
  if (!currentDataset) {
    alert('まずレイヤーを選択してください');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-80">
      <h2 class="text-xl font-bold mb-4">エクスポート</h2>
      <div class="space-y-2">
        <button onclick="exportGeoJSON(); this.closest('.fixed').remove();"
          class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          <i class="fas fa-file-code mr-2"></i>GeoJSON
        </button>
        <button onclick="exportCSV(); this.closest('.fixed').remove();"
          class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
          <i class="fas fa-file-csv mr-2"></i>CSV
        </button>
        <button onclick="showSummary(); this.closest('.fixed').remove();"
          class="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
          <i class="fas fa-chart-bar mr-2"></i>統計情報
        </button>
        <button onclick="this.closest('.fixed').remove()"
          class="w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
          キャンセル
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function exportGeoJSON() {
  if (window.dataExporter && currentDataset) {
    window.dataExporter.exportGeoJSON(currentDataset.id, currentDataset.name);
  }
}

function exportCSV() {
  if (window.dataExporter && currentDataset) {
    window.dataExporter.exportCSV(currentDataset.id, currentDataset.name);
  }
}

function showSummary() {
  if (window.dataExporter && currentDataset) {
    window.dataExporter.getSummary(currentDataset.id);
  }
}

function captureMap() {
  if (window.captureMapScreenshot && map) {
    const filename = `map_${new Date().toISOString().slice(0,10)}.png`;
    window.captureMapScreenshot(map, filename);
  }
}

// Make functions globally accessible
window.logout = logout;
window.performSearch = performSearch;
window.toggleLayer = toggleLayer;
window.loadDatasets = loadDatasets;
window.showUploadForm = showUploadForm;
window.closeDetailPanel = closeDetailPanel;
window.loadAndDisplayDataset = loadAndDisplayDataset;
window.showAdvancedSearchDialog = showAdvancedSearchDialog;
window.toggleDrawMode = toggleDrawMode;
window.showExportMenu = showExportMenu;
window.exportGeoJSON = exportGeoJSON;
window.exportCSV = exportCSV;
window.showSummary = showSummary;
window.captureMap = captureMap;
