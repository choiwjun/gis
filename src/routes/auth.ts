import { Hono } from 'hono';
import type { Bindings, User, LoginRequest, JWTPayload } from '../types';
import { successResponse, errorResponse, verifyPassword, signJWT } from '../utils';
import { authMiddleware, type AppContext } from '../middleware';

const auth = new Hono<{ Bindings: Bindings }>();

// POST /auth/login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();
    const { email, password } = body;

    if (!email || !password) {
      return c.json(errorResponse('VALIDATION_ERROR', 'メールアドレスとパスワードが必要です'), 400);
    }

    // Get user from database
    const result = await c.env.DB.prepare(
      'SELECT id, email, password, name, role, created_at FROM users WHERE email = ?'
    ).bind(email).first();

    if (!result) {
      return c.json(errorResponse('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません'), 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, result.password as string);
    if (!isValid) {
      return c.json(errorResponse('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません'), 401);
    }

    // Generate JWT
    const jwtPayload: JWTPayload = {
      userId: result.id as string,
      email: result.email as string,
      role: result.role as any
    };

    const accessToken = await signJWT(jwtPayload, c.env.JWT_SECRET);

    // Return user info (without password)
    const user: User = {
      id: result.id as string,
      email: result.email as string,
      name: result.name as string,
      role: result.role as any,
      created_at: result.created_at as string
    };

    return c.json(successResponse({
      accessToken,
      user
    }));
  } catch (error) {
    console.error('Login error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

// GET /auth/me
auth.get('/me', authMiddleware, async (c: AppContext) => {
  try {
    const user = c.get('user');

    // Get fresh user data from database
    const result = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
    ).bind(user.userId).first();

    if (!result) {
      return c.json(errorResponse('USER_NOT_FOUND', 'ユーザーが見つかりません'), 404);
    }

    const userData: User = {
      id: result.id as string,
      email: result.email as string,
      name: result.name as string,
      role: result.role as any,
      created_at: result.created_at as string
    };

    return c.json(successResponse(userData));
  } catch (error) {
    console.error('Get user error:', error);
    return c.json(errorResponse('SERVER_ERROR', 'サーバーエラーが発生しました'), 500);
  }
});

export default auth;
