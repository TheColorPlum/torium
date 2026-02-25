/**
 * User entity type
 * Source of truth: D1 `users` table
 */
export interface User {
  id: string;
  email: string;
  created_at: string; // ISO 8601 timestamp
}

/**
 * User row from D1 (matches database schema)
 */
export interface UserRow {
  id: string;
  email: string;
  created_at: string;
}
