/**
 * Auth routes
 * POST /api/v1/auth/request - Request magic link
 * POST /api/v1/auth/verify - Verify magic link and create session
 * POST /api/v1/auth/logout - Logout and clear session
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { success, error } from '@torium/shared';
import type { User, Workspace } from '@torium/shared';
import {
  generateId,
  generateToken,
  hashToken,
  now,
  futureTimestamp,
  isExpired,
} from '../lib/db';
import { sendEmail, generateMagicLinkEmail } from '../lib/resend';
import { getMagicLinkExpiry, getSessionExpiry, type Env } from '../lib/env';
import { sessionMiddleware, SESSION_COOKIE_NAME } from '../middleware/session';

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /api/v1/auth/request
 * Request a magic link email
 */
auth.post('/request', async (c) => {
  let body: { email?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(error('VALIDATION_ERROR', 'Invalid JSON body'), 400);
  }

  const { email } = body;

  if (!email || typeof email !== 'string') {
    return c.json(error('VALIDATION_ERROR', 'Email is required'), 400);
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json(error('VALIDATION_ERROR', 'Invalid email format'), 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Generate token and hash
  const token = generateToken();
  const tokenHash = await hashToken(token);

  // Calculate expiry (15 minutes)
  const expiresAt = futureTimestamp(getMagicLinkExpiry(c.env));

  // Store magic link
  const magicLinkId = generateId('ml');
  await c.env.DB.prepare(
    `INSERT INTO magic_links (id, email, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(magicLinkId, normalizedEmail, tokenHash, expiresAt, now())
    .run();

  // Build verify URL - use API_URL (worker) for the verification endpoint
  const verifyUrl = `${c.env.API_URL}/api/v1/auth/verify?token=${encodeURIComponent(token)}`;

  // Send email
  const { html, text } = generateMagicLinkEmail(verifyUrl);
  const emailResult = await sendEmail(c.env.RESEND_API_KEY, {
    to: normalizedEmail,
    subject: 'Sign in to Torium',
    html,
    text,
  });

  if (!emailResult.success) {
    // Clean up the magic link since email failed
    await c.env.DB.prepare('DELETE FROM magic_links WHERE id = ?')
      .bind(magicLinkId)
      .run();
    return c.json(error('EMAIL_SEND_FAILED', 'Failed to send magic link email'), 500);
  }

  return c.json(success({ sent: true }));
});

/**
 * Shared verify handler for both GET and POST
 */
async function handleVerify(c: Context<{ Bindings: Env }>) {
  // Get token from query or body
  let token: string | undefined;

  if (c.req.method === 'GET') {
    token = c.req.query('token');
  } else {
    try {
      const body = await c.req.json() as { token?: string };
      token = body.token;
    } catch {
      // Try query param as fallback
      token = c.req.query('token');
    }
  }

  if (!token || typeof token !== 'string') {
    return c.json(error('VALIDATION_ERROR', 'Token is required'), 400);
  }

  const tokenHash = await hashToken(token);

  // Find magic link
  const magicLink = await c.env.DB.prepare(
    `SELECT id, email, expires_at, consumed_at
     FROM magic_links
     WHERE token_hash = ?`
  )
    .bind(tokenHash)
    .first<{
      id: string;
      email: string;
      expires_at: string;
      consumed_at: string | null;
    }>();

  if (!magicLink) {
    return c.json(error('TOKEN_INVALID', 'Invalid or unknown token'), 400);
  }

  if (magicLink.consumed_at) {
    return c.json(error('TOKEN_CONSUMED', 'Token has already been used'), 400);
  }

  if (isExpired(magicLink.expires_at)) {
    return c.json(error('TOKEN_EXPIRED', 'Token has expired'), 400);
  }

  // Mark token as consumed
  await c.env.DB.prepare(
    `UPDATE magic_links SET consumed_at = ? WHERE id = ?`
  )
    .bind(now(), magicLink.id)
    .run();

  // Upsert user by email
  let user = await c.env.DB.prepare(
    `SELECT id, email, created_at FROM users WHERE email = ?`
  )
    .bind(magicLink.email)
    .first<{ id: string; email: string; created_at: string }>();

  let workspace: { id: string; name: string; plan_type: string; created_at: string };
  let isNewUser = false;

  if (!user) {
    // Create new user
    isNewUser = true;
    const userId = generateId('usr');
    const userCreatedAt = now();

    await c.env.DB.prepare(
      `INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)`
    )
      .bind(userId, magicLink.email, userCreatedAt)
      .run();

    user = { id: userId, email: magicLink.email, created_at: userCreatedAt };

    // Create default workspace for new user
    const workspaceId = generateId('ws');
    const workspaceName = magicLink.email.split('@')[0] + "'s Workspace";
    const workspaceCreatedAt = now();

    await c.env.DB.prepare(
      `INSERT INTO workspaces (id, name, plan_type, created_at) VALUES (?, ?, 'free', ?)`
    )
      .bind(workspaceId, workspaceName, workspaceCreatedAt)
      .run();

    workspace = {
      id: workspaceId,
      name: workspaceName,
      plan_type: 'free',
      created_at: workspaceCreatedAt,
    };

    // Create owner membership
    const memberId = generateId('mem');
    await c.env.DB.prepare(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
       VALUES (?, ?, ?, 'owner', ?)`
    )
      .bind(memberId, workspaceId, userId, now())
      .run();
  } else {
    // Get user's workspace (first one they own)
    const membership = await c.env.DB.prepare(
      `SELECT w.id, w.name, w.plan_type, w.created_at
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = ? AND wm.role = 'owner'
       LIMIT 1`
    )
      .bind(user.id)
      .first<{ id: string; name: string; plan_type: string; created_at: string }>();

    if (!membership) {
      // Edge case: user exists but has no workspace (shouldn't happen)
      return c.json(error('INTERNAL_ERROR', 'User has no workspace'), 500);
    }

    workspace = membership;
  }

  // Create session
  const sessionToken = generateToken();
  const sessionTokenHash = await hashToken(sessionToken);
  const sessionId = generateId('sess');
  const sessionExpiresAt = futureTimestamp(getSessionExpiry(c.env));

  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, workspace_id, session_token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(sessionId, user.id, workspace.id, sessionTokenHash, sessionExpiresAt, now())
    .run();

  // Set session cookie (domain includes subdomain for app.torium.app)
  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    domain: '.torium.app', // Share across subdomains
  });

  // For GET requests (direct link clicks), redirect to dashboard
  if (c.req.method === 'GET') {
    return c.redirect(`${c.env.APP_URL}/dashboard`);
  }

  return c.json(
    success({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      } as User,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan_type: workspace.plan_type as 'free' | 'pro',
        created_at: workspace.created_at,
      } as Workspace,
      is_new_user: isNewUser,
    })
  );
}

/**
 * POST /api/v1/auth/verify
 * Verify magic link token and create session
 */
auth.post('/verify', handleVerify);

/**
 * GET /api/v1/auth/verify
 * Verify via direct link click
 */
auth.get('/verify', handleVerify);

/**
 * POST /api/v1/auth/logout
 * Logout and clear session
 */
auth.post('/logout', sessionMiddleware, async (c) => {
  const session = c.get('session');

  // Delete session from database
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?')
    .bind(session.session.id)
    .run();

  // Clear cookie
  setCookie(c, SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
    domain: '.torium.app',
  });

  return c.json(success({ logged_out: true }));
});

/**
 * GET /api/v1/auth/me
 * Get current user (requires auth)
 */
auth.get('/me', sessionMiddleware, async (c) => {
  const session = c.get('session');

  return c.json(
    success({
      user: session.user,
      workspace: session.workspace,
    })
  );
});

export { auth };

/**
 * GET /api/v1/auth/debug-cookie
 * Debug endpoint to test cookie setting
 */
auth.get('/debug-cookie', async (c) => {
  setCookie(c, 'torium_debug', 'test_value_123', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 300, // 5 minutes
    domain: '.torium.app',
  });
  
  return c.json({
    message: 'Debug cookie set',
    expectedDomain: '.torium.app',
    redirectUrl: c.env.APP_URL + '/debug',
  });
});

/**
 * GET /api/v1/auth/debug-check
 * Debug endpoint to check if cookies are being received
 */
auth.get('/debug-check', async (c) => {
  const sessionCookie = getCookie(c, SESSION_COOKIE_NAME);
  const debugCookie = getCookie(c, 'torium_debug');
  const allCookies = c.req.header('cookie');
  
  return c.json({
    sessionCookiePresent: !!sessionCookie,
    sessionCookieValue: sessionCookie ? sessionCookie.substring(0, 10) + '...' : null,
    debugCookiePresent: !!debugCookie,
    debugCookieValue: debugCookie,
    rawCookieHeader: allCookies || '(no cookie header)',
    origin: c.req.header('origin') || '(no origin)',
    referer: c.req.header('referer') || '(no referer)',
  });
});

/**
 * GET /api/v1/auth/debug-redirect
 * Debug endpoint to test cookie + redirect
 */
auth.get('/debug-redirect', async (c) => {
  setCookie(c, 'torium_debug', 'test_value_redirect', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 300,
    domain: '.torium.app',
  });
  
  return c.redirect(c.env.APP_URL + '/debug');
});
