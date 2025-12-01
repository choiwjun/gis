import { Context, Next } from 'hono';
import type { Bindings, JWTPayload } from './types';
import { verifyJWT } from './utils';
import { errorResponse } from './utils';

// Extend Hono context with user
export type AppContext = Context<{ Bindings: Bindings; Variables: { user: JWTPayload } }>;

// JWT authentication middleware
export async function authMiddleware(c: AppContext, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(errorResponse('UNAUTHORIZED', '認証が必要です'), 401);
  }

  const token = authHeader.substring(7);
  
  try {
    const jwtSecret = c.env.JWT_SECRET;
    const payload = await verifyJWT(token, jwtSecret);
    
    // Set user in context
    c.set('user', payload as JWTPayload);
    
    await next();
  } catch (error) {
    return c.json(errorResponse('INVALID_TOKEN', 'トークンが無効です'), 401);
  }
}

// Role-based authorization middleware
export function requireRole(...allowedRoles: string[]) {
  return async (c: AppContext, next: Next) => {
    const user = c.get('user');
    
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json(errorResponse('FORBIDDEN', 'アクセス権限がありません'), 403);
    }
    
    await next();
  };
}

// CORS middleware
export async function corsMiddleware(c: Context, next: Next) {
  await next();
  
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
}
