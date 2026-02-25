/**
 * Links API Routes
 * CRUD operations for links
 * All routes require session authentication
 */

import { Hono } from 'hono';
import { success, error, toLinkEntity } from '@torium/shared';
import type { Link, LinkRow, CreateLinkInput, UpdateLinkInput } from '@torium/shared';
import { sessionMiddleware } from '../middleware/session';
import { generateId, now } from '../lib/db';
import type { Env } from '../lib/env';

// Platform domain ID (seeded in 0001_foundation.sql)
const PLATFORM_DOMAIN_ID = 'dom_platform_torium';

// Default pagination limit
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const links = new Hono<{ Bindings: Env }>();

// Apply session middleware to all routes
links.use('*', sessionMiddleware);

/**
 * Generate a random slug (6 characters, alphanumeric)
 */
function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    slug += chars[bytes[i] % chars.length];
  }
  return slug;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate slug format (alphanumeric, hyphens, underscores)
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9_-]+$/i.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * POST /api/v1/links - Create a new link
 */
links.post('/', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;

  // Parse body
  let body: CreateLinkInput;
  try {
    body = await c.req.json<CreateLinkInput>();
  } catch {
    return c.json(error('VALIDATION_ERROR', 'Invalid JSON body'), 400);
  }

  // Validate destination_url
  if (!body.destination_url) {
    return c.json(error('VALIDATION_ERROR', 'destination_url is required'), 400);
  }
  if (!isValidUrl(body.destination_url)) {
    return c.json(error('VALIDATION_ERROR', 'Invalid destination_url format'), 400);
  }

  // Generate or validate slug
  let slug = body.slug?.toLowerCase() || generateSlug();
  if (body.slug && !isValidSlug(body.slug)) {
    return c.json(error('VALIDATION_ERROR', 'Invalid slug format'), 400);
  }
  slug = slug.toLowerCase();

  // Use provided domain_id or default to platform domain
  const domainId = body.domain_id || PLATFORM_DOMAIN_ID;

  // Verify domain exists and user has access (if custom domain)
  if (domainId !== PLATFORM_DOMAIN_ID) {
    const domain = await c.env.DB.prepare(`
      SELECT id FROM domains 
      WHERE id = ? AND (workspace_id = ? OR workspace_id IS NULL)
    `)
      .bind(domainId, workspaceId)
      .first<{ id: string }>();

    if (!domain) {
      return c.json(error('NOT_FOUND', 'Domain not found or not accessible'), 404);
    }
  }

  // Handle idempotency
  const idempotencyKey = c.req.header('Idempotency-Key');
  if (idempotencyKey) {
    // Check if link already exists with same idempotency characteristics
    const existing = await c.env.DB.prepare(`
      SELECT * FROM links 
      WHERE workspace_id = ? AND domain_id = ? AND slug = ?
    `)
      .bind(workspaceId, domainId, slug)
      .first<LinkRow>();

    if (existing) {
      // Return existing link (idempotent response)
      return c.json(success(toLinkEntity(existing)), 200);
    }
  }

  // Check unique constraint (domain_id, slug)
  const existingSlug = await c.env.DB.prepare(`
    SELECT id FROM links WHERE domain_id = ? AND slug = ?
  `)
    .bind(domainId, slug)
    .first<{ id: string }>();

  if (existingSlug) {
    return c.json(error('CONFLICT', 'Slug already exists for this domain'), 409);
  }

  // Create link
  const linkId = generateId('lnk');
  const timestamp = now();

  await c.env.DB.prepare(`
    INSERT INTO links (id, workspace_id, domain_id, slug, destination_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `)
    .bind(linkId, workspaceId, domainId, slug, body.destination_url, timestamp, timestamp)
    .run();

  const newLink: Link = {
    id: linkId,
    workspace_id: workspaceId,
    domain_id: domainId,
    slug,
    destination_url: body.destination_url,
    status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
  };

  return c.json(success(newLink), 201);
});

/**
 * GET /api/v1/links - List links for workspace
 */
links.get('/', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;

  // Parse pagination params
  const cursor = c.req.query('cursor');
  const limitParam = c.req.query('limit');
  let limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  // Build query
  let query: string;
  let params: unknown[];

  if (cursor) {
    // Cursor is the last link's created_at timestamp
    query = `
      SELECT * FROM links 
      WHERE workspace_id = ? AND created_at < ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    params = [workspaceId, cursor, limit + 1];
  } else {
    query = `
      SELECT * FROM links 
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    params = [workspaceId, limit + 1];
  }

  const result = await c.env.DB.prepare(query)
    .bind(...params)
    .all<LinkRow>();

  const rows = result.results || [];
  const hasMore = rows.length > limit;
  const links = rows.slice(0, limit).map(toLinkEntity);

  const meta: { next_cursor?: string; has_more: boolean } = {
    has_more: hasMore,
  };

  if (hasMore && links.length > 0) {
    meta.next_cursor = links[links.length - 1].created_at;
  }

  return c.json(success(links, meta));
});

/**
 * GET /api/v1/links/:id - Get a single link
 */
links.get('/:id', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const linkId = c.req.param('id');

  const link = await c.env.DB.prepare(`
    SELECT * FROM links WHERE id = ? AND workspace_id = ?
  `)
    .bind(linkId, workspaceId)
    .first<LinkRow>();

  if (!link) {
    return c.json(error('NOT_FOUND', 'Link not found'), 404);
  }

  return c.json(success(toLinkEntity(link)));
});

/**
 * PATCH /api/v1/links/:id - Update a link
 */
links.patch('/:id', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const linkId = c.req.param('id');

  // Verify ownership
  const existing = await c.env.DB.prepare(`
    SELECT * FROM links WHERE id = ? AND workspace_id = ?
  `)
    .bind(linkId, workspaceId)
    .first<LinkRow>();

  if (!existing) {
    return c.json(error('NOT_FOUND', 'Link not found'), 404);
  }

  // Parse body
  let body: UpdateLinkInput;
  try {
    body = await c.req.json<UpdateLinkInput>();
  } catch {
    return c.json(error('VALIDATION_ERROR', 'Invalid JSON body'), 400);
  }

  // Validate updates
  if (body.destination_url !== undefined && !isValidUrl(body.destination_url)) {
    return c.json(error('VALIDATION_ERROR', 'Invalid destination_url format'), 400);
  }
  if (body.slug !== undefined && !isValidSlug(body.slug)) {
    return c.json(error('VALIDATION_ERROR', 'Invalid slug format'), 400);
  }
  if (body.status !== undefined && !['active', 'paused'].includes(body.status)) {
    return c.json(error('VALIDATION_ERROR', 'Invalid status'), 400);
  }

  // If slug is changing, check uniqueness
  if (body.slug !== undefined && body.slug.toLowerCase() !== existing.slug) {
    const slugExists = await c.env.DB.prepare(`
      SELECT id FROM links WHERE domain_id = ? AND slug = ? AND id != ?
    `)
      .bind(existing.domain_id, body.slug.toLowerCase(), linkId)
      .first<{ id: string }>();

    if (slugExists) {
      return c.json(error('CONFLICT', 'Slug already exists for this domain'), 409);
    }
  }

  // Build update
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.destination_url !== undefined) {
    updates.push('destination_url = ?');
    values.push(body.destination_url);
  }
  if (body.slug !== undefined) {
    updates.push('slug = ?');
    values.push(body.slug.toLowerCase());
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);
  }

  if (updates.length === 0) {
    // Nothing to update, return current
    return c.json(success(toLinkEntity(existing)));
  }

  // Always update updated_at
  const timestamp = now();
  updates.push('updated_at = ?');
  values.push(timestamp);

  // Add WHERE clause params
  values.push(linkId);

  await c.env.DB.prepare(`
    UPDATE links SET ${updates.join(', ')} WHERE id = ?
  `)
    .bind(...values)
    .run();

  // Fetch updated link
  const updated = await c.env.DB.prepare(`
    SELECT * FROM links WHERE id = ?
  `)
    .bind(linkId)
    .first<LinkRow>();

  return c.json(success(toLinkEntity(updated!)));
});

/**
 * DELETE /api/v1/links/:id - Delete a link
 */
links.delete('/:id', async (c) => {
  const session = c.get('session');
  const workspaceId = session.workspace.id;
  const linkId = c.req.param('id');

  // Verify ownership
  const existing = await c.env.DB.prepare(`
    SELECT id FROM links WHERE id = ? AND workspace_id = ?
  `)
    .bind(linkId, workspaceId)
    .first<{ id: string }>();

  if (!existing) {
    return c.json(error('NOT_FOUND', 'Link not found'), 404);
  }

  // Delete
  await c.env.DB.prepare(`DELETE FROM links WHERE id = ?`)
    .bind(linkId)
    .run();

  return c.json(success({ deleted: true }));
});
