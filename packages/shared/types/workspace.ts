/**
 * Workspace entity type
 * Source of truth: D1 `workspaces` table
 */
export interface Workspace {
  id: string;
  name: string;
  plan_type: PlanType;
  created_at: string; // ISO 8601 timestamp
}

/**
 * Plan types per SYSTEM_CONTRACT
 * Only two plans: Free and Pro
 */
export type PlanType = 'free' | 'pro';

/**
 * Workspace member role
 */
export type MemberRole = 'owner' | 'admin' | 'member';

/**
 * Workspace membership
 * Source of truth: D1 `workspace_members` table
 */
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

/**
 * Workspace row from D1
 */
export interface WorkspaceRow {
  id: string;
  name: string;
  plan_type: string;
  created_at: string;
}

/**
 * Workspace member row from D1
 */
export interface WorkspaceMemberRow {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
}
