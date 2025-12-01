// Advanced Features for GIS Web App

// Feature Editor
class FeatureEditor {
  constructor(map, apiBase, accessToken) {
    this.map = map;
    this.apiBase = apiBase;
    this.accessToken = accessToken;
    this.drawMode = false;
    this.tempMarker = null;
  }

  enableDrawMode(datasetId) {
    this.drawMode = true;
    this.datasetId = datasetId;
    this.map.getCanvas().style.cursor = 'crosshair';
    
    // Add click handler for drawing
    this.clickHandler = (e) => {
      if (this.drawMode) {
        this.createFeature(e.lngLat);
      }
    };
    this.map.on('click', this.clickHandler);
  }

  disableDrawMode() {
    this.drawMode = false;
    this.map.getCanvas().style.cursor = '';
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
    }
    if (this.tempMarker) {
      this.tempMarker.remove();
      this.tempMarker = null;
    }
  }

  async createFeature(lngLat) {
    const properties = await this.showPropertyDialog();
    if (!properties) {
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          datasetId: this.datasetId,
          geometry: {
            type: 'Point',
            coordinates: [lngLat.lng, lngLat.lat]
          },
          properties
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('フィーチャーが作成されました');
        this.disableDrawMode();
        // Reload map data
        if (window.loadAndDisplayDataset) {
          window.loadAndDisplayDataset(this.datasetId);
        }
      } else {
        alert('エラー: ' + result.error.message);
      }
    } catch (error) {
      alert('作成に失敗しました: ' + error.message);
    }
  }

  async updateFeature(featureId, updates) {
    try {
      const response = await fetch(`${this.apiBase}/features/${featureId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      if (result.success) {
        return true;
      } else {
        alert('エラー: ' + result.error.message);
        return false;
      }
    } catch (error) {
      alert('更新に失敗しました: ' + error.message);
      return false;
    }
  }

  async deleteFeature(featureId) {
    if (!confirm('このフィーチャーを削除しますか?')) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiBase}/features/${featureId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const result = await response.json();
      if (result.success) {
        return true;
      } else {
        alert('エラー: ' + result.error.message);
        return false;
      }
    } catch (error) {
      alert('削除に失敗しました: ' + error.message);
      return false;
    }
  }

  showPropertyDialog() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-96">
          <h2 class="text-xl font-bold mb-4">フィーチャー属性</h2>
          <form id="property-form">
            <div class="mb-4">
              <label class="block text-sm font-semibold mb-2">名前</label>
              <input type="text" id="prop-name" required class="w-full px-3 py-2 border rounded">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-semibold mb-2">カテゴリ</label>
              <input type="text" id="prop-category" class="w-full px-3 py-2 border rounded">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-semibold mb-2">スコア</label>
              <input type="number" id="prop-score" class="w-full px-3 py-2 border rounded">
            </div>
            <div class="flex gap-2">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                作成
              </button>
              <button type="button" onclick="this.closest('.fixed').remove(); resolve(null);"
                class="px-4 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      document.getElementById('property-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const properties = {
          name: document.getElementById('prop-name').value,
          category: document.getElementById('prop-category').value || undefined,
          score: document.getElementById('prop-score').value ? parseInt(document.getElementById('prop-score').value) : undefined
        };
        modal.remove();
        resolve(properties);
      });
    });
  }
}

// Data Exporter
class DataExporter {
  constructor(apiBase, accessToken) {
    this.apiBase = apiBase;
    this.accessToken = accessToken;
  }

  async exportGeoJSON(datasetId, datasetName) {
    try {
      const response = await fetch(
        `${this.apiBase}/export/geojson?datasetId=${datasetId}`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      this.downloadBlob(blob, `${datasetName}.geojson`);
    } catch (error) {
      alert('エクスポートに失敗しました: ' + error.message);
    }
  }

  async exportCSV(datasetId, datasetName) {
    try {
      const response = await fetch(
        `${this.apiBase}/export/csv?datasetId=${datasetId}`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      this.downloadBlob(blob, `${datasetName}.csv`);
    } catch (error) {
      alert('エクスポートに失敗しました: ' + error.message);
    }
  }

  async getSummary(datasetId) {
    try {
      const response = await fetch(
        `${this.apiBase}/export/summary?datasetId=${datasetId}`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );

      const result = await response.json();
      if (result.success) {
        this.showSummaryModal(result.data);
      }
    } catch (error) {
      alert('サマリー取得に失敗しました: ' + error.message);
    }
  }

  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  showSummaryModal(summary) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">データセット統計</h2>
        <div class="space-y-3">
          <div>
            <div class="text-sm font-semibold">名前</div>
            <div>${summary.dataset.name}</div>
          </div>
          <div>
            <div class="text-sm font-semibold">レコード数</div>
            <div>${summary.dataset.recordCount}</div>
          </div>
          <div>
            <div class="text-sm font-semibold">ジオメトリタイプ</div>
            ${summary.statistics.geometryTypes.map(gt => 
              `<div class="text-sm">${gt.type}: ${gt.count}</div>`
            ).join('')}
          </div>
          ${summary.statistics.boundingBox ? `
          <div>
            <div class="text-sm font-semibold">範囲</div>
            <div class="text-xs">
              経度: ${summary.statistics.boundingBox.minLon.toFixed(4)} ~ ${summary.statistics.boundingBox.maxLon.toFixed(4)}<br>
              緯度: ${summary.statistics.boundingBox.minLat.toFixed(4)} ~ ${summary.statistics.boundingBox.maxLat.toFixed(4)}
            </div>
          </div>
          ` : ''}
        </div>
        <button onclick="this.closest('.fixed').remove()"
          class="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          閉じる
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Advanced Search
class AdvancedSearch {
  constructor(apiBase, accessToken) {
    this.apiBase = apiBase;
    this.accessToken = accessToken;
  }

  showSearchDialog(datasetId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-96">
        <h2 class="text-xl font-bold mb-4">高度な検索</h2>
        <form id="advanced-search-form">
          <div class="mb-4">
            <label class="block text-sm font-semibold mb-2">
              <input type="checkbox" id="use-fts"> フルテキスト検索を使用
            </label>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-semibold mb-2">キーワード</label>
            <input type="text" id="search-keyword" class="w-full px-3 py-2 border rounded">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-semibold mb-2">カテゴリ</label>
            <input type="text" id="search-category" class="w-full px-3 py-2 border rounded">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-semibold mb-2">スコア範囲</label>
            <div class="flex gap-2">
              <input type="number" id="search-min-score" placeholder="最小" class="flex-1 px-3 py-2 border rounded">
              <input type="number" id="search-max-score" placeholder="最大" class="flex-1 px-3 py-2 border rounded">
            </div>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              検索
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
    
    document.getElementById('advanced-search-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const useFTS = document.getElementById('use-fts').checked;
      const keyword = document.getElementById('search-keyword').value;
      const category = document.getElementById('search-category').value;
      const minScore = document.getElementById('search-min-score').value;
      const maxScore = document.getElementById('search-max-score').value;
      
      const params = new URLSearchParams({
        datasetId,
        ...(useFTS && { fts: 'true' }),
        ...(keyword && { q: keyword }),
        ...(category && { category }),
        ...(minScore && { minScore }),
        ...(maxScore && { maxScore })
      });
      
      try {
        const response = await fetch(`${this.apiBase}/search?${params}`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        
        const result = await response.json();
        if (result.success && result.data.features.length > 0) {
          modal.remove();
          
          // Update map with search results
          if (window.map && window.map.getSource('dataset')) {
            window.map.getSource('dataset').setData(result.data);
            
            // Fit to bounds
            const coordinates = result.data.features.map(f => f.geometry.coordinates);
            const bounds = coordinates.reduce((bounds, coord) => {
              return bounds.extend(coord);
            }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
            
            window.map.fitBounds(bounds, { padding: 50 });
          }
        } else {
          alert('検索結果がありません');
        }
      } catch (error) {
        alert('検索に失敗しました: ' + error.message);
      }
    });
  }
}

// Map Screenshot
function captureMapScreenshot(map, filename = 'map.png') {
  map.once('idle', () => {
    const canvas = map.getCanvas();
    canvas.toBlob((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  });
  map.triggerRepaint();
}

// Initialize advanced features
let featureEditor = null;
let dataExporter = null;
let advancedSearch = null;

function initAdvancedFeatures(map, apiBase, accessToken) {
  featureEditor = new FeatureEditor(map, apiBase, accessToken);
  dataExporter = new DataExporter(apiBase, accessToken);
  advancedSearch = new AdvancedSearch(apiBase, accessToken);
}

// Export to global scope
window.FeatureEditor = FeatureEditor;
window.DataExporter = DataExporter;
window.AdvancedSearch = AdvancedSearch;
window.captureMapScreenshot = captureMapScreenshot;
window.initAdvancedFeatures = initAdvancedFeatures;
window.featureEditor = featureEditor;
window.dataExporter = dataExporter;
window.advancedSearch = advancedSearch;
