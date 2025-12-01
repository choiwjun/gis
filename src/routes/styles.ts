import { Hono } from 'hono';
import type { Bindings } from '../types';
import { successResponse, errorResponse, generateId } from '../utils';
import { authMiddleware, requireRole, type AppContext } from '../middleware';

const styles = new Hono<{ Bindings: Bindings }>();

// All routes require authentication
styles.use('*', authMiddleware);

// GET /styles - List all styles for a dataset
styles.get('/', async (c: AppContext) => {
  try {
    const datasetId = c.req.query('datasetId');

    if (!datasetId) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId は必須です'), 400);
    }

    const results = await c.env.DB.prepare(`
      SELECT * FROM layer_styles WHERE dataset_id = ? ORDER BY is_default DESC, created_at DESC
    `).bind(datasetId).all();

    const styles = (results.results || []).map(row => ({
      id: row.id,
      datasetId: row.dataset_id,
      name: row.name,
      style: JSON.parse(row.style_json as string),
      isDefault: row.is_default === 1,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return c.json(successResponse(styles));
  } catch (error) {
    console.error('List styles error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// POST /styles - Create new style
styles.post('/', requireRole('admin', 'editor'), async (c: AppContext) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      datasetId: string;
      name: string;
      style: any;
      isDefault?: boolean;
    }>();

    const { datasetId, name, style, isDefault } = body;

    if (!datasetId || !name || !style) {
      return c.json(errorResponse('VALIDATION_ERROR', 'datasetId, name, style は必須です'), 400);
    }

    const styleId = generateId('style');

    // If setting as default, unset other defaults
    if (isDefault) {
      await c.env.DB.prepare(`
        UPDATE layer_styles SET is_default = 0 WHERE dataset_id = ?
      `).bind(datasetId).run();
    }

    await c.env.DB.prepare(`
      INSERT INTO layer_styles (id, dataset_id, name, style_json, is_default, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      styleId,
      datasetId,
      name,
      JSON.stringify(style),
      isDefault ? 1 : 0,
      user.userId
    ).run();

    return c.json(successResponse({
      id: styleId,
      datasetId,
      name,
      style,
      isDefault: isDefault || false
    }), 201);
  } catch (error) {
    console.error('Create style error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// PUT /styles/:id - Update style
styles.put('/:id', requireRole('admin', 'editor'), async (c: AppContext) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<{
      name?: string;
      style?: any;
      isDefault?: boolean;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT dataset_id FROM layer_styles WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json(errorResponse('NOT_FOUND', 'スタイルが見つかりません'), 404);
    }

    let updateFields = [];
    let params: any[] = [];

    if (body.name) {
      updateFields.push('name = ?');
      params.push(body.name);
    }

    if (body.style) {
      updateFields.push('style_json = ?');
      params.push(JSON.stringify(body.style));
    }

    if (body.isDefault !== undefined) {
      if (body.isDefault) {
        // Unset other defaults
        await c.env.DB.prepare(`
          UPDATE layer_styles SET is_default = 0 WHERE dataset_id = ?
        `).bind(existing.dataset_id).run();
      }
      updateFields.push('is_default = ?');
      params.push(body.isDefault ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return c.json(errorResponse('VALIDATION_ERROR', '更新する内容がありません'), 400);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await c.env.DB.prepare(`
      UPDATE layer_styles SET ${updateFields.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return c.json(successResponse({ id, updated: true }));
  } catch (error) {
    console.error('Update style error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// DELETE /styles/:id - Delete style
styles.delete('/:id', requireRole('admin', 'editor'), async (c: AppContext) => {
  try {
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id FROM layer_styles WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json(errorResponse('NOT_FOUND', 'スタイルが見つかりません'), 404);
    }

    await c.env.DB.prepare('DELETE FROM layer_styles WHERE id = ?').bind(id).run();

    return c.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete style error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default styles;
