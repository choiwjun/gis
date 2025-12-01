import { Hono } from 'hono';
import type { Bindings, GeoJSONFeature, GeoJSONFeatureCollection } from '../types';
import { successResponse, errorResponse, parseBBox, calculateDistance } from '../utils';
import { authMiddleware, type AppContext } from '../middleware';

const map = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
map.use('*', authMiddleware);

// GET /map/data - Get map data with BBOX
map.get('/data', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');
    const bboxStr = c.req.query('bbox');
    const zoom = parseInt(c.req.query('zoom') || '10');
    const limit = parseInt(c.req.query('limit') || '2000');
    
    // Also accept individual bbox parameters
    const minLon = c.req.query('minLon');
    const minLat = c.req.query('minLat');
    const maxLon = c.req.query('maxLon');
    const maxLat = c.req.query('maxLat');

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    let query = 'SELECT * FROM features WHERE dataset_id = ?';
    const params: any[] = [datasetId];

    // Apply BBOX filter from either bbox string or individual parameters
    let bbox = null;
    if (bboxStr) {
      bbox = parseBBox(bboxStr);
    } else if (minLon && minLat && maxLon && maxLat) {
      bbox = {
        minLon: parseFloat(minLon),
        minLat: parseFloat(minLat),
        maxLon: parseFloat(maxLon),
        maxLat: parseFloat(maxLat)
      };
    }
    
    if (bbox) {
      // Use proper overlap detection: feature overlaps with bbox if
      // feature.min_lon <= bbox.maxLon AND feature.max_lon >= bbox.minLon
      // AND feature.min_lat <= bbox.maxLat AND feature.max_lat >= bbox.minLat
      query += ` AND max_lon >= ? AND min_lon <= ? AND max_lat >= ? AND min_lat <= ?`;
      params.push(bbox.minLon, bbox.maxLon, bbox.minLat, bbox.maxLat);
    }

    query += ' LIMIT ?';
    params.push(limit);

    const results = await c.env.DB.prepare(query).bind(...params).all();

    // Convert to GeoJSON
    const features: GeoJSONFeature[] = (results.results || []).map(row => {
      const properties = JSON.parse(row.properties_json as string);
      
      // Reconstruct geometry
      let coordinates: any;
      if (row.geometry_type === 'Point') {
        coordinates = [row.min_lon, row.min_lat];
      } else {
        // For other types, we would need to store full geometry
        // For now, just use a point at the center of bbox
        coordinates = [
          ((row.min_lon as number) + (row.max_lon as number)) / 2,
          ((row.min_lat as number) + (row.max_lat as number)) / 2
        ];
      }

      return {
        type: 'Feature',
        id: row.id as string,
        geometry: {
          type: row.geometry_type as any,
          coordinates
        },
        properties
      };
    });

    const geojson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features
    };

    return c.json(successResponse(geojson));
  } catch (error) {
    console.error('Get map data error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// GET /map/nearby - Nearby search
map.get('/nearby', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');
    const lat = parseFloat(c.req.query('lat') || '');
    const lon = parseFloat(c.req.query('lon') || '');
    const radius = parseFloat(c.req.query('radius') || '1000');

    if (!datasetId || isNaN(lat) || isNaN(lon)) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId, lat, lon は必須です'), 400);
    }

    // Simple bbox approximation (1 degree ≈ 111km)
    const latDelta = (radius / 111000);
    const lonDelta = (radius / (111000 * Math.cos(lat * Math.PI / 180)));

    const results = await c.env.DB.prepare(`
      SELECT * FROM features 
      WHERE dataset_id = ? 
        AND min_lon >= ? AND max_lon <= ?
        AND min_lat >= ? AND max_lat <= ?
      LIMIT 100
    `).bind(
      datasetId,
      lon - lonDelta,
      lon + lonDelta,
      lat - latDelta,
      lat + latDelta
    ).all();

    // Filter by actual distance
    const features: GeoJSONFeature[] = [];
    
    for (const row of results.results || []) {
      const distance = calculateDistance(
        lat,
        lon,
        row.min_lat as number,
        row.min_lon as number
      );

      if (distance <= radius) {
        const properties = JSON.parse(row.properties_json as string);
        
        features.push({
          type: 'Feature',
          id: row.id as string,
          geometry: {
            type: row.geometry_type as any,
            coordinates: [row.min_lon, row.min_lat]
          },
          properties: {
            ...properties,
            _distance: Math.round(distance)
          }
        });
      }
    }

    // Sort by distance
    features.sort((a, b) => (a.properties._distance || 0) - (b.properties._distance || 0));

    const geojson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features
    };

    return c.json(successResponse(geojson));
  } catch (error) {
    console.error('Nearby search error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// GET /map/features/:id - Get feature detail
map.get('/features/:id', async (c: AppContext) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(
      'SELECT * FROM features WHERE id = ?'
    ).bind(id).first();

    if (!result) {
      return c.json(errorResponse('NOT_FOUND', 'フィーチャーが見つかりません'), 404);
    }

    const properties = JSON.parse(result.properties_json as string);

    const feature = {
      id: result.id as string,
      datasetId: result.dataset_id as string,
      geometry: {
        type: result.geometry_type as string,
        coordinates: [result.min_lon, result.min_lat]
      },
      properties
    };

    return c.json(successResponse(feature));
  } catch (error) {
    console.error('Get feature error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default map;
