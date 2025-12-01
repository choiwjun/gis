import { Hono } from 'hono';
import type { Bindings, User } from '../types';
import { successResponse, errorResponse, hashPassword, generateId } from '../utils';
import { authMiddleware, requireRole, type AppContext } from '../middleware';

const users = new Hono<{ Bindings: Bindings }>();

// Public route - User registration
users.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
      name: string;
    }>();

    const { email, password, name } = body;

    if (!email || !password || !name) {
      return c.json(errorResponse('VALIDATION_ERROR', 'email, password, name は必須です'), 400);
    }

    // Check if email already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      return c.json(errorResponse('CONFLICT', 'このメールアドレスは既に使用されています'), 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = generateId('user');

    // Create user with 'viewer' role by default
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, 'viewer')
    `).bind(userId, email, passwordHash, name).run();

    const user: User = {
      id: userId,
      email,
      name,
      role: 'viewer',
      created_at: new Date().toISOString()
    };

    return c.json(successResponse({ user }), 201);
  } catch (error) {
    console.error('Register user error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// All routes below require authentication
users.use('*', authMiddleware);

// GET /users - List all users (admin only)
users.get('/', requireRole('admin'), async (c: AppContext) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || '20');

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).first();

    const total = (countResult?.count as number) || 0;

    const results = await c.env.DB.prepare(`
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(pageSize, (page - 1) * pageSize).all();

    const usersList: User[] = (results.results || []).map(row => ({
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      role: row.role as any,
      created_at: row.created_at as string
    }));

    return c.json(successResponse({
      items: usersList,
      page,
      pageSize,
      total
    }));
  } catch (error) {
    console.error('List users error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// GET /users/:id - Get user profile
users.get('/:id', async (c: AppContext) => {
  try {
    const currentUser = c.get('user');
    const userId = c.req.param('id');

    // Users can only view their own profile unless they're admin
    if (currentUser.userId !== userId && currentUser.role !== 'admin') {
      return c.json(errorResponse('FORBIDDEN', 'アクセス権限がありません'), 403);
    }

    const result = await c.env.DB.prepare(`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    if (!result) {
      return c.json(errorResponse('NOT_FOUND', 'ユーザーが見つかりません'), 404);
    }

    const user: User = {
      id: result.id as string,
      email: result.email as string,
      name: result.name as string,
      role: result.role as any,
      created_at: result.created_at as string
    };

    // Get user preferences
    const prefs = await c.env.DB.prepare(
      'SELECT preferences_json FROM user_preferences WHERE user_id = ?'
    ).bind(userId).first();

    return c.json(successResponse({
      user,
      preferences: prefs ? JSON.parse(prefs.preferences_json as string) : {}
    }));
  } catch (error) {
    console.error('Get user error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// PUT /users/:id - Update user profile
users.put('/:id', async (c: AppContext) => {
  try {
    const currentUser = c.get('user');
    const userId = c.req.param('id');

    // Users can only update their own profile unless they're admin
    if (currentUser.userId !== userId && currentUser.role !== 'admin') {
      return c.json(errorResponse('FORBIDDEN', 'アクセス権限がありません'), 403);
    }

    const body = await c.req.json<{
      name?: string;
      password?: string;
      role?: string;
    }>();

    let updateFields = [];
    let params: any[] = [];

    if (body.name) {
      updateFields.push('name = ?');
      params.push(body.name);
    }

    if (body.password) {
      const passwordHash = await hashPassword(body.password);
      updateFields.push('password = ?');
      params.push(passwordHash);
    }

    // Only admin can change roles
    if (body.role && currentUser.role === 'admin') {
      updateFields.push('role = ?');
      params.push(body.role);
    }

    if (updateFields.length === 0) {
      return c.json(errorResponse('VALIDATION_ERROR', '更新する内容がありません'), 400);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await c.env.DB.prepare(`
      UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return c.json(successResponse({ id: userId, updated: true }));
  } catch (error) {
    console.error('Update user error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// PUT /users/:id/preferences - Update user preferences
users.put('/:id/preferences', async (c: AppContext) => {
  try {
    const currentUser = c.get('user');
    const userId = c.req.param('id');

    if (currentUser.userId !== userId) {
      return c.json(errorResponse('FORBIDDEN', 'アクセス権限がありません'), 403);
    }

    const preferences = await c.req.json();

    // Upsert preferences
    await c.env.DB.prepare(`
      INSERT INTO user_preferences (user_id, preferences_json)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        preferences_json = ?,
        updated_at = CURRENT_TIMESTAMP
    `).bind(userId, JSON.stringify(preferences), JSON.stringify(preferences)).run();

    return c.json(successResponse({ updated: true }));
  } catch (error) {
    console.error('Update preferences error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// DELETE /users/:id - Delete user (admin only)
users.delete('/:id', requireRole('admin'), async (c: AppContext) => {
  try {
    const userId = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!existing) {
      return c.json(errorResponse('NOT_FOUND', 'ユーザーが見つかりません'), 404);
    }

    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    return c.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default users;
