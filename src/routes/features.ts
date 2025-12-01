import { Hono } from 'hono';
import type { Bindings, GeoJSONFeature } from '../types';
import { successResponse, errorResponse, generateId } from '../utils';
import { authMiddleware, requireRole, type AppContext } from '../middleware';

const features = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
features.use('*', authMiddleware);

// POST /features - Create new feature
features.post('/', requireRole('admin', 'editor'), async (c: AppContext) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      datasetId: string;
      geometry: any;
      properties: Record<string, any>;
    }>();

    const { datasetId, geometry, properties } = body;

    if (!datasetId || !geometry || !properties) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId, geometry, properties は必須です'), 400);
    }

    // Calculate bbox
    let minLon = null, minLat = null, maxLon = null, maxLat = null;
    
    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
      minLon = maxLon = geometry.coordinates[0];
      minLat = maxLat = geometry.coordinates[1];
    } else if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
      const coords = geometry.coordinates;
      minLon = Math.min(...coords.map((c: number[]) => c[0]));
      maxLon = Math.max(...coords.map((c: number[]) => c[0]));
      minLat = Math.min(...coords.map((c: number[]) => c[1]));
      maxLat = Math.max(...coords.map((c: number[]) => c[1]));
    }

    const featureId = generateId('feature');

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
      JSON.stringify(properties)
    ).run();

    // Update dataset record count
    await c.env.DB.prepare(`
      UPDATE datasets SET record_count = record_count + 1 WHERE id = ?
    `).bind(datasetId).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details_json)
      VALUES (?, ?, 'create', 'feature', ?, ?)
    `).bind(
      generateId('log'),
      user.userId,
      featureId,
      JSON.stringify({ datasetId, geometry: geometry.type })
    ).run();

    return c.json(successResponse({
      id: featureId,
      datasetId,
      geometry,
      properties
    }), 201);
  } catch (error) {
    console.error('Create feature error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// PUT /features/:id - Update feature
features.put('/:id', requireRole('admin', 'editor'), async (c: AppContext) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json<{
      geometry?: any;
      properties?: Record<string, any>;
    }>();

    // Check if feature exists
    const existing = await c.env.DB.prepare(
      'SELECT * FROM features WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json(errorResponse('NOT_FOUND', 'フィーチャーが見つかりません'), 404);
    }

    let updateFields = [];
    let params: any[] = [];

    if (body.geometry) {
      const { geometry } = body;
      
      // Calculate new bbox
      let minLon = null, minLat = null, maxLon = null, maxLat = null;
      
      if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        minLon = maxLon = geometry.coordinates[0];
        minLat = maxLat = geometry.coordinates[1];
      }

      updateFields.push('geometry_type = ?', 'min_lon = ?', 'min_lat = ?', 'max_lon = ?', 'max_lat = ?');
      params.push(geometry.type, minLon, minLat, maxLon, maxLat);
    }

    if (body.properties) {
      updateFields.push('properties_json = ?');
      params.push(JSON.stringify(body.properties));
    }

    if (updateFields.length === 0) {
      return c.json(errorResponse('VALIDATION_ERROR', '更新する内容がありません'), 400);
    }

    params.push(id);

    await c.env.DB.prepare(`
      UPDATE features SET ${updateFields.join(', ')} WHERE id = ?
    `).bind(...params).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details_json)
      VALUES (?, ?, 'update', 'feature', ?, ?)
    `).bind(
      generateId('log'),
      user.userId,
      id,
      JSON.stringify({ updated: updateFields.length })
    ).run();

    return c.json(successResponse({ id, updated: true }));
  } catch (error) {
    console.error('Update feature error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// DELETE /features/:id - Delete feature
features.delete('/:id', requireRole('admin', 'editor'), async (c: AppContext) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    // Get feature info before deletion
    const feature = await c.env.DB.prepare(
      'SELECT dataset_id FROM features WHERE id = ?'
    ).bind(id).first();

    if (!feature) {
      return c.json(errorResponse('NOT_FOUND', 'フィーチャーが見つかりません'), 404);
    }

    // Delete feature
    await c.env.DB.prepare('DELETE FROM features WHERE id = ?').bind(id).run();

    // Update dataset record count
    await c.env.DB.prepare(`
      UPDATE datasets SET record_count = record_count - 1 WHERE id = ?
    `).bind(feature.dataset_id).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details_json)
      VALUES (?, ?, 'delete', 'feature', ?, ?)
    `).bind(
      generateId('log'),
      user.userId,
      id,
      JSON.stringify({ datasetId: feature.dataset_id })
    ).run();

    return c.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete feature error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default features;
