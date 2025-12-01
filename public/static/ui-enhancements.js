// UI Enhancements for GIS Web App

// Feature Highlight System
class FeatureHighlight {
  constructor(map) {
    this.map = map;
    this.highlightedFeatureId = null;
  }

  highlight(featureId) {
    this.clear();
    this.highlightedFeatureId = featureId;
    
    // Update point paint to highlight selected feature
    if (this.map.getLayer('points')) {
      this.map.setPaintProperty('points', 'circle-color', [
        'case',
        ['==', ['id'], featureId],
        '#EF4444', // Red for highlighted
        '#1E6EFF'  // Default blue
      ]);
      
      this.map.setPaintProperty('points', 'circle-radius', [
        'case',
        ['==', ['id'], featureId],
        10, // Larger for highlighted
        6   // Default size
      ]);
      
      this.map.setPaintProperty('points', 'circle-stroke-width', [
        'case',
        ['==', ['id'], featureId],
        3,  // Thicker stroke
        2   // Default stroke
      ]);
    }
  }

  clear() {
    if (this.highlightedFeatureId && this.map.getLayer('points')) {
      // Reset to default styling
      this.map.setPaintProperty('points', 'circle-color', '#1E6EFF');
      this.map.setPaintProperty('points', 'circle-radius', 6);
      this.map.setPaintProperty('points', 'circle-stroke-width', 2);
    }
    this.highlightedFeatureId = null;
  }
}

// Basemap Switcher
class BasemapSwitcher {
  constructor(map) {
    this.map = map;
    this.currentBasemap = 'osm';
    this.basemaps = {
      osm: {
        name: 'OpenStreetMap',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors'
      },
      satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri'
      },
      terrain: {
        name: 'Terrain',
        url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png',
        attribution: '&copy; Stamen Design'
      }
    };
  }

  switchTo(basemapId) {
    if (!this.basemaps[basemapId]) return;
    
    const basemap = this.basemaps[basemapId];
    
    // Remove old source
    if (this.map.getLayer('osm')) {
      this.map.removeLayer('osm');
    }
    if (this.map.getSource('osm')) {
      this.map.removeSource('osm');
    }
    
    // Add new source
    this.map.addSource('osm', {
      type: 'raster',
      tiles: [basemap.url],
      tileSize: 256,
      attribution: basemap.attribution
    });
    
    // Add layer at the bottom
    this.map.addLayer({
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }, this.map.getStyle().layers[0]?.id);
    
    this.currentBasemap = basemapId;
    
    if (window.toast) {
      window.toast.success(`ベースマップを ${basemap.name} に切り替えました`);
    }
  }

  showSwitcher() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-80">
        <h2 class="text-xl font-bold mb-4">ベースマップ選択</h2>
        <div class="space-y-2">
          ${Object.entries(this.basemaps).map(([id, basemap]) => `
            <button onclick="window.basemapSwitcher.switchTo('${id}'); this.closest('.fixed').remove();"
              class="w-full text-left px-4 py-3 rounded border-2 ${this.currentBasemap === id ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}">
              <div class="font-semibold">${basemap.name}</div>
              ${this.currentBasemap === id ? '<div class="text-sm text-blue-600">現在使用中</div>' : ''}
            </button>
          `).join('')}
        </div>
        <button onclick="this.closest('.fixed').remove()"
          class="mt-4 w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
          閉じる
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Keyboard Shortcuts
class KeyboardShortcuts {
  constructor() {
    this.handlers = new Map();
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const handler = this.handlers.get(key);
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    });
  }

  register(key, handler) {
    this.handlers.set(key.toLowerCase(), handler);
  }

  unregister(key) {
    this.handlers.delete(key.toLowerCase());
  }
}

// Layer Drag & Drop
class LayerReorder {
  constructor() {
    this.draggedElement = null;
  }

  enable(layersListElement) {
    const items = layersListElement.querySelectorAll('.layer-item');
    
    items.forEach(item => {
      item.draggable = true;
      item.classList.add('cursor-move');
      
      item.addEventListener('dragstart', (e) => {
        this.draggedElement = item;
        item.classList.add('opacity-50');
      });
      
      item.addEventListener('dragend', (e) => {
        item.classList.remove('opacity-50');
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = this.getDragAfterElement(layersListElement, e.clientY);
        if (afterElement == null) {
          layersListElement.appendChild(this.draggedElement);
        } else {
          layersListElement.insertBefore(this.draggedElement, afterElement);
        }
      });
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.layer-item:not(.opacity-50)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
}

// Progress Bar
class ProgressBar {
  show(message = 'アップロード中...') {
    const existing = document.getElementById('progress-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'progress-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-96">
        <div class="text-center mb-4">
          <div class="text-lg font-semibold">${message}</div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div id="progress-bar" class="bg-blue-600 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
        </div>
        <div id="progress-text" class="text-center mt-2 text-sm text-gray-600">0%</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  update(percent) {
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${Math.round(percent)}%`;
  }

  hide() {
    const overlay = document.getElementById('progress-overlay');
    if (overlay) overlay.remove();
  }
}

// BBOX Search UI
class BBoxSearchUI {
  constructor(map) {
    this.map = map;
    this.enabled = false;
    this.rectangle = null;
  }

  enable() {
    this.enabled = true;
    this.map.getCanvas().style.cursor = 'crosshair';
    
    if (window.toast) {
      window.toast.info('地図上でドラッグして範囲を選択してください');
    }
    
    let start = null;
    
    const mouseDown = (e) => {
      if (!this.enabled) return;
      start = e.lngLat;
    };
    
    const mouseMove = (e) => {
      if (!this.enabled || !start) return;
      
      // Draw rectangle
      if (this.rectangle) {
        this.map.removeLayer('bbox-search');
        this.map.removeSource('bbox-search');
      }
      
      const current = e.lngLat;
      
      this.map.addSource('bbox-search', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [start.lng, start.lat],
              [current.lng, start.lat],
              [current.lng, current.lat],
              [start.lng, current.lat],
              [start.lng, start.lat]
            ]]
          }
        }
      });
      
      this.map.addLayer({
        id: 'bbox-search',
        type: 'fill',
        source: 'bbox-search',
        paint: {
          'fill-color': '#1E6EFF',
          'fill-opacity': 0.2
        }
      });
      
      this.rectangle = true;
    };
    
    const mouseUp = (e) => {
      if (!this.enabled || !start) return;
      
      const end = e.lngLat;
      const bbox = `${Math.min(start.lng, end.lng)},${Math.min(start.lat, end.lat)},${Math.max(start.lng, end.lng)},${Math.max(start.lat, end.lat)}`;
      
      this.disable();
      
      // Trigger search
      if (window.performBBoxSearch) {
        window.performBBoxSearch(bbox);
      }
    };
    
    this.map.on('mousedown', mouseDown);
    this.map.on('mousemove', mouseMove);
    this.map.on('mouseup', mouseUp);
    
    this._handlers = { mouseDown, mouseMove, mouseUp };
  }

  disable() {
    this.enabled = false;
    this.map.getCanvas().style.cursor = '';
    
    if (this.rectangle) {
      if (this.map.getLayer('bbox-search')) {
        this.map.removeLayer('bbox-search');
      }
      if (this.map.getSource('bbox-search')) {
        this.map.removeSource('bbox-search');
      }
      this.rectangle = null;
    }
    
    if (this._handlers) {
      this.map.off('mousedown', this._handlers.mouseDown);
      this.map.off('mousemove', this._handlers.mouseMove);
      this.map.off('mouseup', this._handlers.mouseUp);
    }
  }
}

// Initialize global instances
let featureHighlight = null;
let basemapSwitcher = null;
let keyboardShortcuts = null;
let layerReorder = null;
let progressBar = null;
let bboxSearchUI = null;

function initUIEnhancements(map) {
  featureHighlight = new FeatureHighlight(map);
  basemapSwitcher = new BasemapSwitcher(map);
  keyboardShortcuts = new KeyboardShortcuts();
  layerReorder = new LayerReorder();
  progressBar = new ProgressBar();
  bboxSearchUI = new BBoxSearchUI(map);
  
  // Register ESC key to close panels
  keyboardShortcuts.register('escape', () => {
    closeDetailPanel();
    const drawBtn = document.getElementById('draw-toggle-btn');
    if (drawBtn && drawBtn.textContent.includes('終了')) {
      toggleDrawMode();
    }
  });
}

// Export to global scope
window.FeatureHighlight = FeatureHighlight;
window.BasemapSwitcher = BasemapSwitcher;
window.KeyboardShortcuts = KeyboardShortcuts;
window.LayerReorder = LayerReorder;
window.ProgressBar = ProgressBar;
window.BBoxSearchUI = BBoxSearchUI;
window.initUIEnhancements = initUIEnhancements;
window.featureHighlight = featureHighlight;
window.basemapSwitcher = basemapSwitcher;
window.keyboardShortcuts = keyboardShortcuts;
window.layerReorder = layerReorder;
window.progressBar = progressBar;
window.bboxSearchUI = bboxSearchUI;
