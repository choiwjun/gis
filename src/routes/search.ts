import { Hono } from 'hono';
import type { Bindings, GeoJSONFeature, GeoJSONFeatureCollection } from '../types';
import { successResponse, errorResponse } from '../utils';
import { authMiddleware, type AppContext } from '../middleware';

const search = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
search.use('*', authMiddleware);

// GET /search - Advanced search with FTS
search.get('/', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');
    const q = c.req.query('q'); // keyword search
    const category = c.req.query('category');
    const minScore = c.req.query('minScore');
    const maxScore = c.req.query('maxScore');
    const useFTS = c.req.query('fts') === 'true'; // Use full-text search

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    let query: string;
    let params: any[] = [];
    let results;

    // Use FTS for keyword search if enabled
    if (useFTS && q) {
      query = `
        SELECT f.* FROM features f
        INNER JOIN features_fts fts ON f.id = fts.feature_id
        WHERE fts.dataset_id = ? AND features_fts MATCH ?
        LIMIT 100
      `;
      params = [datasetId, q];
      results = await c.env.DB.prepare(query).bind(...params).all();
    } else {
      // Traditional search
      query = 'SELECT * FROM features WHERE dataset_id = ?';
      params = [datasetId];

      if (q) {
        query += ' AND properties_json LIKE ?';
        params.push(`%${q}%`);
      }

      if (category) {
        query += ' AND properties_json LIKE ?';
        params.push(`%"category":"${category}"%`);
      }

      if (minScore) {
        query += ' AND CAST(json_extract(properties_json, "$.score") AS INTEGER) >= ?';
        params.push(parseInt(minScore));
      }

      if (maxScore) {
        query += ' AND CAST(json_extract(properties_json, "$.score") AS INTEGER) <= ?';
        params.push(parseInt(maxScore));
      }

      query += ' LIMIT 100';
      results = await c.env.DB.prepare(query).bind(...params).all();
    }

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

// GET /search/advanced - Advanced multi-criteria search
search.get('/advanced', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');
    const filters = c.req.query('filters'); // JSON string of filters

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    let query = 'SELECT * FROM features WHERE dataset_id = ?';
    const params: any[] = [datasetId];

    if (filters) {
      try {
        const filterObj = JSON.parse(filters);
        
        // Build dynamic query based on filters
        Object.entries(filterObj).forEach(([key, value]: [string, any]) => {
          if (value.operator === 'eq') {
            query += ` AND json_extract(properties_json, '$.${key}') = ?`;
            params.push(value.value);
          } else if (value.operator === 'gt') {
            query += ` AND CAST(json_extract(properties_json, '$.${key}') AS REAL) > ?`;
            params.push(value.value);
          } else if (value.operator === 'lt') {
            query += ` AND CAST(json_extract(properties_json, '$.${key}') AS REAL) < ?`;
            params.push(value.value);
          } else if (value.operator === 'like') {
            query += ` AND json_extract(properties_json, '$.${key}') LIKE ?`;
            params.push(`%${value.value}%`);
          } else if (value.operator === 'in' && Array.isArray(value.value)) {
            const placeholders = value.value.map(() => '?').join(',');
            query += ` AND json_extract(properties_json, '$.${key}') IN (${placeholders})`;
            params.push(...value.value);
          }
        });
      } catch (parseError) {
        return c.json(errorResponse('VALIDATION_ERROR', 'filters の形式が正しくありません'), 400);
      }
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
    console.error('Advanced search error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default search;
