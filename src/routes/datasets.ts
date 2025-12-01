import { Hono } from 'hono';
import type { Bindings, Dataset, DatasetListQuery, DatasetListResponse } from '../types';
import { successResponse, errorResponse, generateId } from '../utils';
import { authMiddleware, requireRole, type AppContext } from '../middleware';

const datasets = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
datasets.use('*', authMiddleware);

// GET /datasets - List datasets
datasets.get('/', async (c: AppContext) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || '20');
    const type = c.req.query('type');

    let query = 'SELECT * FROM datasets WHERE 1=1';
    const params: string[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    // Get total count
    const countResult = await c.env.DB.prepare(
      query.replace('SELECT *', 'SELECT COUNT(*) as count')
    ).bind(...params).first();

    const total = (countResult?.count as number) || 0;

    // Get paginated results
    query += ' LIMIT ? OFFSET ?';
    params.push(pageSize.toString(), ((page - 1) * pageSize).toString());

    const results = await c.env.DB.prepare(query).bind(...params).all();

    const items: Dataset[] = (results.results || []).map(row => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as any,
      record_count: row.record_count as number,
      r2_key: row.r2_key as string | null,
      schema_json: row.schema_json as string | null,
      status: row.status as any,
      created_by: row.created_by as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    }));

    const response: DatasetListResponse = {
      items,
      page,
      pageSize,
      total
    };

    return c.json(successResponse(response));
  } catch (error) {
    console.error('List datasets error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// GET /datasets/:id - Get dataset detail
datasets.get('/:id', async (c: AppContext) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(
      'SELECT * FROM datasets WHERE id = ?'
    ).bind(id).first();

    if (!result) {
      return c.json(errorResponse('NOT_FOUND', 'データセットが見つかりません'), 404);
    }

    const dataset: Dataset = {
      id: result.id as string,
      name: result.name as string,
      type: result.type as any,
      record_count: result.record_count as number,
      r2_key: result.r2_key as string | null,
      schema_json: result.schema_json as string | null,
      status: result.status as any,
      created_by: result.created_by as string,
      created_at: result.created_at as string,
      updated_at: result.updated_at as string
    };

    return c.json(successResponse(dataset));
  } catch (error) {
    console.error('Get dataset error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// POST /datasets/upload - Upload dataset
datasets.post('/upload', requireRole('admin', 'editor'), async (c: AppContext) => {
  try {
    const user = c.get('user');
    const formData = await c.req.formData();
    
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const overwrite = formData.get('overwrite') === 'true';

    if (!file || !name || !type) {
      return c.json(errorResponse('VALIDATION_ERROR', 'file, name, type は必須です'), 400);
    }

    if (!['geojson', 'csv', 'shp'].includes(type)) {
      return c.json(errorResponse('VALIDATION_ERROR', 'type は geojson, csv, shp のいずれかである必要があります'), 400);
    }

    // Generate dataset ID
    const datasetId = generateId('dataset');
    const r2Key = `datasets/${datasetId}/${file.name}`;

    // Upload file to R2
    const fileBuffer = await file.arrayBuffer();
    await c.env.R2.put(r2Key, fileBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    });

    // Parse GeoJSON if type is geojson
    let recordCount = 0;
    let schemaJson = null;

    if (type === 'geojson') {
      try {
        const text = new TextDecoder().decode(fileBuffer);
        const geojson = JSON.parse(text);
        
        if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
          recordCount = geojson.features.length;
          
          // Extract schema from first feature
          if (geojson.features.length > 0) {
            const properties = geojson.features[0].properties || {};
            const schema: Record<string, string> = {};
            Object.keys(properties).forEach(key => {
              schema[key] = typeof properties[key];
            });
            schemaJson = JSON.stringify({ properties: schema });
          }

          // Store features in database for search
          for (const feature of geojson.features.slice(0, 1000)) { // Limit to 1000 features
            const featureId = generateId('feature');
            const geometry = feature.geometry;
            
            // Calculate simple bbox
            let minLon = null, minLat = null, maxLon = null, maxLat = null;
            
            if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
              minLon = maxLon = geometry.coordinates[0];
              minLat = maxLat = geometry.coordinates[1];
            }

            await c.env.DB.prepare(`
              INSERT INTO features (id, dataset_id, geometry_type, min_lon, min_lat, max_lon, max_lat, properties_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              featureId,
              datasetId,
              geometry.type,
              minLon,
              minLat,
              maxLon,
              maxLat,
              JSON.stringify(feature.properties || {})
            ).run();
          }
        }
      } catch (parseError) {
        console.error('GeoJSON parse error:', parseError);
        // Continue anyway - file is uploaded to R2
      }
    }

    // Insert dataset metadata
    await c.env.DB.prepare(`
      INSERT INTO datasets (id, name, type, record_count, r2_key, schema_json, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(datasetId, name, type, recordCount, r2Key, schemaJson, user.userId).run();

    const dataset = {
      datasetId,
      name,
      type,
      recordCount,
      createdAt: new Date().toISOString()
    };

    return c.json(successResponse(dataset), 201);
  } catch (error) {
    console.error('Upload dataset error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// DELETE /datasets/:id - Delete dataset
datasets.delete('/:id', requireRole('admin'), async (c: AppContext) => {
  try {
    const id = c.req.param('id');

    // Get dataset info
    const dataset = await c.env.DB.prepare(
      'SELECT r2_key FROM datasets WHERE id = ?'
    ).bind(id).first();

    if (!dataset) {
      return c.json(errorResponse('NOT_FOUND', 'データセットが見つかりません'), 404);
    }

    // Delete from R2 if exists
    if (dataset.r2_key) {
      await c.env.R2.delete(dataset.r2_key as string);
    }

    // Delete features (cascade will handle this, but explicit is better)
    await c.env.DB.prepare('DELETE FROM features WHERE dataset_id = ?').bind(id).run();

    // Delete dataset
    await c.env.DB.prepare('DELETE FROM datasets WHERE id = ?').bind(id).run();

    return c.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete dataset error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default datasets;
