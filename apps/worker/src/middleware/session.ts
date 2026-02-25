/**
 * Session Middleware
 * Validates session cookie and attaches user/workspace to context
 */
import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { error } from '@torium/shared';
import type { User, Workspace, Session } from '@torium/shared';
import { Env } from '../lib/env';
import { hashToken, isExpired } from '../lib/db';

// Session cookie name
export const SESSION_COOKIE_NAME = 'torium_session';

// Extended context with session data
export interface SessionContext {
  user: User;
  workspace: Workspace;
  session: Session;
}

// Declare session in Hono context
declare module 'hono' {
  interface ContextVariableMap {
    session: SessionContext;
  }
}

/**
 * Session validation middleware
 * Validates the session cookie and attaches user/workspace to request context
 * Returns 401 if session is invalid or expired
 */
export async function sessionMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionToken) {
    return c.json(error('UNAUTHORIZED', 'No session cookie provided'), 401);
  }

  try {
    // Hash the token to lookup in database
    const tokenHash = await hashToken(sessionToken);

    // Query session with user and workspace data
    const result = await c.env.DB.prepare(`
      SELECT 
        s.id as session_id,
        s.user_id,
        s.workspace_id,
        s.session_token_hash,
        s.expires_at as session_expires_at,
        s.created_at as session_created_at,
        u.id as user_id,
        u.email,
        u.created_at as user_created_at,
        w.id as workspace_id,
        w.name as workspace_name,
        w.plan_type,
        w.created_at as workspace_created_at
      FROM sessions s
      INNER JOIN users u ON s.user_id = u.id
      INNER JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.session_token_hash = ?
    `)
      .bind(tokenHash)
      .first<{
        session_id: string;
        user_id: string;
        workspace_id: string;
        session_token_hash: string;
        session_expires_at: string;
        session_created_at: string;
        email: string;
        user_created_at: string;
        workspace_name: string;
        plan_type: string;
        workspace_created_at: string;
      }>();

    if (!result) {
      return c.json(error('UNAUTHORIZED', 'Invalid session'), 401);
    }

    // Check if session is expired
    if (isExpired(result.session_expires_at)) {
      // Clean up expired session
      await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?')
        .bind(result.session_id)
        .run();

      return c.json(error('UNAUTHORIZED', 'Session expired'), 401);
    }

    // Attach session context
    const sessionContext: SessionContext = {
      user: {
        id: result.user_id,
        email: result.email,
        created_at: result.user_created_at,
      },
      workspace: {
        id: result.workspace_id,
        name: result.workspace_name,
        plan_type: result.plan_type as 'free' | 'pro',
        created_at: result.workspace_created_at,
      },
      session: {
        id: result.session_id,
        user_id: result.user_id,
        workspace_id: result.workspace_id,
        session_token_hash: result.session_token_hash,
        expires_at: result.session_expires_at,
        created_at: result.session_created_at,
      },
    };

    c.set('session', sessionContext);

    await next();
  } catch (err) {
    console.error('Session middleware error:', err);
    return c.json(error('INTERNAL_ERROR', 'Session validation failed'), 500);
  }
}

/**
 * Optional session middleware - doesn't fail if no session
 * Useful for routes that work both authenticated and unauthenticated
 */
export async function optionalSessionMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionToken) {
    await next();
    return;
  }

  // If token exists, validate it (but still continue if invalid)
  try {
    const tokenHash = await hashToken(sessionToken);

    const result = await c.env.DB.prepare(`
      SELECT 
        s.id as session_id,
        s.user_id,
        s.workspace_id,
        s.session_token_hash,
        s.expires_at as session_expires_at,
        s.created_at as session_created_at,
        u.id as user_id,
        u.email,
        u.created_at as user_created_at,
        w.id as workspace_id,
        w.name as workspace_name,
        w.plan_type,
        w.created_at as workspace_created_at
      FROM sessions s
      INNER JOIN users u ON s.user_id = u.id
      INNER JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.session_token_hash = ?
    `)
      .bind(tokenHash)
      .first<{
        session_id: string;
        user_id: string;
        workspace_id: string;
        session_token_hash: string;
        session_expires_at: string;
        session_created_at: string;
        email: string;
        user_created_at: string;
        workspace_name: string;
        plan_type: string;
        workspace_created_at: string;
      }>();

    if (result && !isExpired(result.session_expires_at)) {
      const sessionContext: SessionContext = {
        user: {
          id: result.user_id,
          email: result.email,
          created_at: result.user_created_at,
        },
        workspace: {
          id: result.workspace_id,
          name: result.workspace_name,
          plan_type: result.plan_type as 'free' | 'pro',
          created_at: result.workspace_created_at,
        },
        session: {
          id: result.session_id,
          user_id: result.user_id,
          workspace_id: result.workspace_id,
          session_token_hash: result.session_token_hash,
          expires_at: result.session_expires_at,
          created_at: result.session_created_at,
        },
      };

      c.set('session', sessionContext);
    }
  } catch (err) {
    console.error('Optional session middleware error:', err);
    // Continue without session
  }

  await next();
}
