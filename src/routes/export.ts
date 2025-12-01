import { Hono } from 'hono';
import type { Bindings, GeoJSONFeatureCollection } from '../types';
import { successResponse, errorResponse } from '../utils';
import { authMiddleware, type AppContext } from '../middleware';

const exportRoute = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
exportRoute.use('*', authMiddleware);

// GET /export/geojson - Export dataset as GeoJSON
exportRoute.get('/geojson', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    // Get dataset info
    const dataset = await c.env.DB.prepare(
      'SELECT name FROM datasets WHERE id = ?'
    ).bind(datasetId).first();

    if (!dataset) {
      return c.json(errorResponse('NOT_FOUND', 'データセットが見つかりません'), 404);
    }

    // Get all features
    const results = await c.env.DB.prepare(
      'SELECT * FROM features WHERE dataset_id = ?'
    ).bind(datasetId).all();

    const features = (results.results || []).map(row => ({
      type: 'Feature' as const,
      id: row.id,
      geometry: {
        type: row.geometry_type,
        coordinates: [row.min_lon, row.min_lat]
      },
      properties: JSON.parse(row.properties_json as string)
    }));

    const geojson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features
    };

    // Set download headers
    c.header('Content-Type', 'application/geo+json');
    c.header('Content-Disposition', `attachment; filename="${dataset.name}.geojson"`);

    return c.json(geojson);
  } catch (error) {
    console.error('Export GeoJSON error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// GET /export/csv - Export dataset as CSV
exportRoute.get('/csv', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    // Get dataset info
    const dataset = await c.env.DB.prepare(
      'SELECT name FROM datasets WHERE id = ?'
    ).bind(datasetId).first();

    if (!dataset) {
      return c.json(errorResponse('NOT_FOUND', 'データセットが見つかりません'), 404);
    }

    // Get all features
    const results = await c.env.DB.prepare(
      'SELECT * FROM features WHERE dataset_id = ?'
    ).bind(datasetId).all();

    if (!results.results || results.results.length === 0) {
      return c.text('No data to export', 404);
    }

    // Extract all unique property keys
    const allProperties = new Set<string>();
    results.results.forEach(row => {
      const props = JSON.parse(row.properties_json as string);
      Object.keys(props).forEach(key => allProperties.add(key));
    });

    // Build CSV header
    const headers = ['id', 'longitude', 'latitude', 'geometry_type', ...Array.from(allProperties)];
    let csv = headers.join(',') + '\n';

    // Build CSV rows
    results.results.forEach(row => {
      const props = JSON.parse(row.properties_json as string);
      const values = [
        row.id,
        row.min_lon || '',
        row.min_lat || '',
        row.geometry_type,
        ...Array.from(allProperties).map(key => {
          const value = props[key];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value !== undefined && value !== null ? value : '';
        })
      ];
      csv += values.join(',') + '\n';
    });

    // Set download headers
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="${dataset.name}.csv"`);

    return c.text(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// GET /export/summary - Export dataset summary statistics
exportRoute.get('/summary', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    // Get dataset info
    const dataset = await c.env.DB.prepare(`
      SELECT d.*, u.name as creator_name
      FROM datasets d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).bind(datasetId).first();

    if (!dataset) {
      return c.json(errorResponse('NOT_FOUND', 'データセットが見つかりません'), 404);
    }

    // Get geometry type distribution
    const geometryStats = await c.env.DB.prepare(`
      SELECT geometry_type, COUNT(*) as count
      FROM features
      WHERE dataset_id = ?
      GROUP BY geometry_type
    `).bind(datasetId).all();

    // Get bounding box
    const bbox = await c.env.DB.prepare(`
      SELECT 
        MIN(min_lon) as min_lon,
        MIN(min_lat) as min_lat,
        MAX(max_lon) as max_lon,
        MAX(max_lat) as max_lat
      FROM features
      WHERE dataset_id = ?
    `).bind(datasetId).first();

    const summary = {
      dataset: {
        id: dataset.id,
        name: dataset.name,
        type: dataset.type,
        recordCount: dataset.record_count,
        status: dataset.status,
        createdBy: dataset.creator_name,
        createdAt: dataset.created_at
      },
      statistics: {
        geometryTypes: geometryStats.results?.map(row => ({
          type: row.geometry_type,
          count: row.count
        })) || [],
        boundingBox: bbox ? {
          minLon: bbox.min_lon,
          minLat: bbox.min_lat,
          maxLon: bbox.max_lon,
          maxLat: bbox.max_lat
        } : null
      }
    };

    return c.json(successResponse(summary));
  } catch (error) {
    console.error('Export summary error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default exportRoute;
