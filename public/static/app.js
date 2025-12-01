// GIS Web App - Complete Frontend Implementation
// All unimplemented features included

// ==================== Configuration ====================
const API_BASE_URL = window.location.origin;
const ACCESS_TOKEN_KEY = 'gis_access_token';
const BASEMAP_STYLES = {
  standard: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

// ==================== Global State ====================
let map = null;
let currentUser = null;
let currentDataset = null;
let selectedFeatureId = null;
let allDatasets = [];
let currentBasemap = 'standard';
let highlightedFeature = null;

// ==================== Toast Notification System ====================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-all duration-300 transform translate-x-0 opacity-100`;
  
  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  
  toast.classList.add(bgColors[type] || bgColors.info);
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== Authentication ====================
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    clearAccessToken();
    showLogin();
    throw new Error('Unauthorized');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'API Error');
  }
  
  return data.data;
}

async function login(email, password) {
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    setAccessToken(data.accessToken);
    await loadUser();
    initApp();
    showToast('Login successful', 'success');
  } catch (error) {
    showToast('Login failed: ' + error.message, 'error');
  }
}

async function loadUser() {
  try {
    currentUser = await apiRequest('/api/auth/me');
  } catch (error) {
    console.error('Load user error:', error);
    clearAccessToken();
    showLogin();
  }
}

function logout() {
  clearAccessToken();
  currentUser = null;
  showToast('Logged out successfully', 'info');
  setTimeout(() => location.reload(), 500);
}

function showLogin() {
  document.getElementById('app').innerHTML = `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 class="text-2xl font-bold mb-6 text-gray-800">
          <i class="fas fa-map-marked-alt mr-2"></i>GIS Login
        </h2>
        <form id="loginForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="email" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" 
                   value="admin@example.com" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" id="password" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" 
                   value="admin123" required>
          </div>
          <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition">
            <i class="fas fa-sign-in-alt mr-2"></i>Login
          </button>
        </form>
        <div class="mt-4 text-sm text-gray-600">
          <p>Demo credentials:</p>
          <p>admin@example.com / admin123</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
  });
}

// ==================== Map Initialization ====================
function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: [BASEMAP_STYLES[currentBasemap]],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [{
        id: 'osm',
        type: 'raster',
        source: 'osm'
      }]
    },
    center: [139.7, 35.7],
    zoom: 10
  });
  
  map.addControl(new maplibregl.NavigationControl());
  map.addControl(new maplibregl.ScaleControl());
  
  // Add highlight layer
  map.on('load', () => {
    map.addSource('highlight', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    
    map.addLayer({
      id: 'highlight-layer',
      type: 'circle',
      source: 'highlight',
      paint: {
        'circle-radius': 12,
        'circle-color': '#FFD700',
        'circle-opacity': 0.6,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FF6B00'
      }
    });
  });
}

// ==================== Basemap Switching ====================
function switchBasemap(style) {
  currentBasemap = style;
  
  if (map.getSource('osm')) {
    map.getSource('osm').setTiles([BASEMAP_STYLES[style]]);
  }
  
  // Update UI
  document.querySelectorAll('[data-basemap]').forEach(btn => {
    btn.classList.toggle('bg-blue-500', btn.dataset.basemap === style);
    btn.classList.toggle('text-white', btn.dataset.basemap === style);
    btn.classList.toggle('bg-gray-200', btn.dataset.basemap !== style);
  });
  
  showToast(`Basemap switched to ${style}`, 'info');
}

// ==================== Dataset Management ====================
async function loadDatasets() {
  try {
    const data = await apiRequest('/api/datasets?pageSize=100');
    allDatasets = data.items;
    renderDatasetList();
  } catch (error) {
    showToast('Failed to load datasets: ' + error.message, 'error');
  }
}

function renderDatasetList() {
  const container = document.getElementById('datasetList');
  
  if (allDatasets.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-database text-4xl mb-2"></i>
        <p>No datasets available</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = allDatasets.map(dataset => `
    <div class="bg-white p-4 rounded border hover:shadow-md transition cursor-pointer dataset-item"
         data-id="${dataset.id}"
         onclick="selectDataset('${dataset.id}')">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h3 class="font-medium text-gray-800">${dataset.name}</h3>
          <div class="text-sm text-gray-600 mt-1">
            <span class="mr-3"><i class="fas fa-layer-group mr-1"></i>${dataset.type}</span>
            <span><i class="fas fa-map-pin mr-1"></i>${dataset.record_count} records</span>
          </div>
        </div>
        ${currentUser.role === 'admin' ? `
          <button onclick="deleteDataset('${dataset.id}', event)" 
                  class="text-red-500 hover:text-red-700 ml-2">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function selectDataset(datasetId) {
  // Highlight selected dataset
  document.querySelectorAll('.dataset-item').forEach(item => {
    item.classList.toggle('bg-blue-50', item.dataset.id === datasetId);
    item.classList.toggle('border-blue-300', item.dataset.id === datasetId);
  });
  
  currentDataset = datasetId;
  await loadAndDisplayDataset(datasetId);
  showToast('Dataset loaded on map', 'success');
}

async function loadAndDisplayDataset(datasetId) {
  try {
    // Remove existing layer
    if (map.getLayer('points')) {
      map.removeLayer('points');
      map.removeLayer('clusters');
      map.removeLayer('cluster-count');
      map.removeSource('dataset');
    }
    
    // Fetch data
    const bounds = map.getBounds();
    const data = await apiRequest(`/api/map/data?datasetId=${datasetId}&minLon=${bounds.getWest()}&minLat=${bounds.getSouth()}&maxLon=${bounds.getEast()}&maxLat=${bounds.getNorth()}`);
    
    // Add source with clustering
    map.addSource('dataset', {
      type: 'geojson',
      data: data,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });
    
    // Clusters
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'dataset',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6', 10,
          '#f1f075', 30,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, 10,
          30, 30,
          40
        ]
      }
    });
    
    // Cluster count
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'dataset',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold'],
        'text-size': 12
      }
    });
    
    // Individual points
    map.addLayer({
      id: 'points',
      type: 'circle',
      source: 'dataset',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#1E6EFF',
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
      }
    });
    
    // Cluster click - zoom in
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0].properties.cluster_id;
      map.getSource('dataset').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      });
    });
    
    // Point click - show detail
    map.on('click', 'points', (e) => {
      const feature = e.features[0];
      showFeatureDetail(feature);
      highlightFeature(feature);
    });
    
    // Cursor
    map.on('mouseenter', 'clusters', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'clusters', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'points', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'points', () => map.getCanvas().style.cursor = '');
    
    // Fit bounds
    if (data.features && data.features.length > 0) {
      const coordinates = data.features.map(f => f.geometry.coordinates);
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
      
      map.fitBounds(bounds, { padding: 50 });
    }
  } catch (error) {
    showToast('Failed to load dataset: ' + error.message, 'error');
  }
}

// ==================== Feature Highlight ====================
function highlightFeature(feature) {
  selectedFeatureId = feature.id;
  
  // Update highlight layer
  if (map.getSource('highlight')) {
    map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: [feature]
    });
  }
  
  highlightedFeature = feature;
}

function clearHighlight() {
  selectedFeatureId = null;
  highlightedFeature = null;
  
  if (map.getSource('highlight')) {
    map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: []
    });
  }
}

// ==================== Detail Panel ====================
function showFeatureDetail(feature) {
  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');
  
  content.innerHTML = `
    <div class="mb-4">
      <h3 class="text-lg font-bold text-gray-800 mb-2">
        <i class="fas fa-map-marker-alt mr-2 text-blue-500"></i>Feature Details
      </h3>
      <div class="text-sm text-gray-600 mb-2">
        ID: ${feature.id || 'N/A'}
      </div>
    </div>
    
    <div class="space-y-3">
      ${Object.entries(feature.properties || {}).map(([key, value]) => `
        <div class="border-b pb-2">
          <div class="text-xs text-gray-500 uppercase">${key}</div>
          <div class="text-sm font-medium text-gray-800">${value}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="mt-4 p-3 bg-gray-50 rounded text-xs">
      <div class="font-medium text-gray-700 mb-1">Coordinates</div>
      <div class="text-gray-600">${JSON.stringify(feature.geometry.coordinates)}</div>
    </div>
  `;
  
  panel.classList.remove('hidden');
  panel.classList.add('slide-in');
}

function closeDetailPanel() {
  const panel = document.getElementById('detailPanel');
  panel.classList.add('hidden');
  panel.classList.remove('slide-in');
  clearHighlight();
}

// ==================== Search ====================
async function performSearch() {
  const query = document.getElementById('searchInput').value.trim();
  
  if (!query) {
    showToast('Please enter a search query', 'warning');
    return;
  }
  
  if (!currentDataset) {
    showToast('Please select a dataset first', 'warning');
    return;
  }
  
  try {
    const data = await apiRequest(`/api/search?q=${encodeURIComponent(query)}&datasetId=${currentDataset}`);
    
    if (data.features && data.features.length > 0) {
      // Update map with search results
      if (map.getSource('dataset')) {
        map.getSource('dataset').setData(data);
      }
      
      // Fly to first result
      const firstFeature = data.features[0];
      map.flyTo({
        center: firstFeature.geometry.coordinates,
        zoom: 14,
        duration: 1500
      });
      
      showToast(`Found ${data.features.length} results`, 'success');
    } else {
      showToast('No results found', 'info');
    }
  } catch (error) {
    showToast('Search failed: ' + error.message, 'error');
  }
}

// ==================== Upload Dataset with Progress ====================
function showUploadForm() {
  document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadForm() {
  document.getElementById('uploadModal').classList.add('hidden');
  document.getElementById('uploadForm').reset();
  document.getElementById('uploadProgress').classList.add('hidden');
}

async function uploadDataset(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const file = formData.get('file');
  
  if (!file) {
    showToast('Please select a file', 'warning');
    return;
  }
  
  // Show progress bar
  const progressContainer = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  progressContainer.classList.remove('hidden');
  progressBar.style.width = '0%';
  
  try {
    // Simulate progress (in real app, use XMLHttpRequest for real progress)
    const progressInterval = setInterval(() => {
      const currentWidth = parseFloat(progressBar.style.width) || 0;
      if (currentWidth < 90) {
        progressBar.style.width = (currentWidth + 10) + '%';
      }
    }, 200);
    
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/datasets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Dataset uploaded successfully', 'success');
      closeUploadForm();
      await loadDatasets();
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    showToast('Upload failed: ' + error.message, 'error');
  } finally {
    setTimeout(() => {
      progressContainer.classList.add('hidden');
    }, 1000);
  }
}

// ==================== User Management UI ====================
function showUserManagement() {
  if (currentUser.role !== 'admin') {
    showToast('Admin access required', 'warning');
    return;
  }
  
  document.getElementById('userManagementModal').classList.remove('hidden');
  loadUsers();
}

function closeUserManagement() {
  document.getElementById('userManagementModal').classList.add('hidden');
}

async function loadUsers() {
  try {
    const data = await apiRequest('/api/admin/users?pageSize=50');
    
    const container = document.getElementById('userList');
    container.innerHTML = data.items.map(user => `
      <div class="flex items-center justify-between p-3 border-b hover:bg-gray-50">
        <div class="flex-1">
          <div class="font-medium text-gray-800">${user.name}</div>
          <div class="text-sm text-gray-600">${user.email}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 text-xs rounded ${
            user.role === 'admin' ? 'bg-red-100 text-red-800' :
            user.role === 'editor' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }">${user.role}</span>
          <button onclick="editUser('${user.id}')" class="text-blue-500 hover:text-blue-700">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showToast('Failed to load users: ' + error.message, 'error');
  }
}

async function deleteDataset(datasetId, event) {
  event.stopPropagation();
  
  if (!confirm('Are you sure you want to delete this dataset?')) {
    return;
  }
  
  try {
    await apiRequest(`/api/datasets/${datasetId}`, { method: 'DELETE' });
    showToast('Dataset deleted successfully', 'success');
    await loadDatasets();
    
    if (currentDataset === datasetId) {
      currentDataset = null;
      if (map.getLayer('points')) {
        map.removeLayer('points');
        map.removeLayer('clusters');
        map.removeLayer('cluster-count');
        map.removeSource('dataset');
      }
    }
  } catch (error) {
    showToast('Failed to delete dataset: ' + error.message, 'error');
  }
}

// ==================== App Initialization ====================
function initApp() {
  document.getElementById('app').innerHTML = `
    <!-- Main Layout -->
    <div class="flex h-screen bg-gray-100">
      <!-- Left Sidebar - Dataset List -->
      <div class="w-80 bg-white border-r flex flex-col">
        <div class="p-4 border-b bg-blue-500 text-white">
          <h2 class="text-xl font-bold flex items-center">
            <i class="fas fa-database mr-2"></i>
            Datasets
          </h2>
          <div class="text-sm mt-1">Welcome, ${currentUser.name}</div>
        </div>
        
        <div class="p-4 border-b">
          <button onclick="showUploadForm()" 
                  class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
            <i class="fas fa-upload mr-2"></i>Upload Dataset
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-2" id="datasetList">
          <!-- Dataset items will be rendered here -->
        </div>
        
        <div class="p-4 border-t">
          <button onclick="logout()" 
                  class="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition">
            <i class="fas fa-sign-out-alt mr-2"></i>Logout
          </button>
        </div>
      </div>
      
      <!-- Center - Map -->
      <div class="flex-1 relative">
        <div id="map" class="w-full h-full"></div>
        
        <!-- Map Controls -->
        <div class="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
          <div class="text-xs font-medium text-gray-700 mb-2">Basemap</div>
          <button data-basemap="standard" onclick="switchBasemap('standard')"
                  class="w-full px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 transition">
            <i class="fas fa-map mr-1"></i>Standard
          </button>
          <button data-basemap="satellite" onclick="switchBasemap('satellite')"
                  class="w-full px-3 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition">
            <i class="fas fa-satellite mr-1"></i>Satellite
          </button>
        </div>
        
        <!-- Search Bar -->
        <div class="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 w-80">
          <div class="flex gap-2">
            <input type="text" id="searchInput" placeholder="Search features..." 
                   class="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                   onkeypress="if(event.key==='Enter') performSearch()">
            <button onclick="performSearch()" 
                    class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
        
        ${currentUser.role === 'admin' ? `
        <!-- Admin Controls -->
        <div class="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
          <button onclick="showUserManagement()" 
                  class="px-4 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition">
            <i class="fas fa-users-cog mr-2"></i>User Management
          </button>
        </div>
        ` : ''}
      </div>
      
      <!-- Right Sidebar - Detail Panel -->
      <div id="detailPanel" class="w-96 bg-white border-l hidden">
        <div class="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 class="font-bold text-gray-800">Details</h3>
          <button onclick="closeDetailPanel()" 
                  class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="detailContent" class="p-4 overflow-y-auto" style="height: calc(100vh - 80px);">
          <!-- Feature details will be rendered here -->
        </div>
      </div>
    </div>
    
    <!-- Upload Modal -->
    <div id="uploadModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-upload mr-2"></i>Upload Dataset
          </h3>
          <button onclick="closeUploadForm()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="uploadForm" onsubmit="uploadDataset(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dataset Name</label>
            <input type="text" name="name" required 
                   class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select name="type" required 
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
              <option value="geojson">GeoJSON</option>
              <option value="csv">CSV (with lat/lon columns)</option>
              <option value="shp">Shapefile (ZIP)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input type="file" name="file" required accept=".geojson,.json,.csv,.zip"
                   class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
            <div class="text-xs text-gray-500 mt-1">
              CSV files should have 'lat' and 'lon' (or similar) columns
            </div>
          </div>
          
          <div id="uploadProgress" class="hidden">
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div id="progressBar" class="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
          </div>
          
          <button type="submit" 
                  class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
            <i class="fas fa-cloud-upload-alt mr-2"></i>Upload
          </button>
        </form>
      </div>
    </div>
    
    <!-- User Management Modal -->
    <div id="userManagementModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-2xl max-w-full mx-4" style="max-height: 80vh;">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-users-cog mr-2"></i>User Management
          </h3>
          <button onclick="closeUserManagement()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div id="userList" class="overflow-y-auto" style="max-height: 60vh;">
          <!-- Users will be rendered here -->
        </div>
      </div>
    </div>
  `;
  
  // Initialize map
  initMap();
  
  // Load datasets
  loadDatasets();
  
  // ESC key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailPanel();
      closeUploadForm();
      closeUserManagement();
    }
  });
}

// ==================== App Start ====================
(async function() {
  const token = getAccessToken();
  
  if (token) {
    try {
      await loadUser();
      initApp();
    } catch (error) {
      showLogin();
    }
  } else {
    showLogin();
  }
})();
