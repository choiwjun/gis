import { Hono } from 'hono';
import type { Bindings, GeoJSONFeature, GeoJSONFeatureCollection } from '../types';
import { successResponse, errorResponse } from '../utils';
import { authMiddleware, type AppContext } from '../middleware';

const search = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
search.use('*', authMiddleware);

// GET /search - Attribute search
search.get('/', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');
    const q = c.req.query('q'); // keyword search
    const category = c.req.query('category');
    const minScore = c.req.query('minScore');
    const maxScore = c.req.query('maxScore');

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    let query = 'SELECT * FROM features WHERE dataset_id = ?';
    const params: any[] = [datasetId];

    // Apply filters
    // Note: SQLite full-text search would be better, but for simplicity we use LIKE
    if (q) {
      query += ' AND properties_json LIKE ?';
      params.push(`%${q}%`);
    }

    if (category) {
      query += ' AND properties_json LIKE ?';
      params.push(`%"category":"${category}"%`);
    }

    // For numeric filters, we need to parse JSON (SQLite JSON functions)
    // Simplified version - in production, use json_extract
    if (minScore) {
      query += ' AND properties_json LIKE ?';
      params.push(`%"score":${minScore}%`);
    }

    if (maxScore) {
      query += ' AND properties_json LIKE ?';
      params.push(`%"score":${maxScore}%`);
    }

    query += ' LIMIT 100';

    const results = await c.env.DB.prepare(query).bind(...params).all();

    // Convert to GeoJSON
    const features: GeoJSONFeature[] = (results.results || []).map(row => {
      const properties = JSON.parse(row.properties_json as string);
      
      return {
        type: 'Feature',
        id: row.id as string,
        geometry: {
          type: row.geometry_type as any,
          coordinates: [row.min_lon, row.min_lat]
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
    console.error('Search error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default search;
