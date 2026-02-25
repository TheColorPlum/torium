/**
 * @torium/shared - Shared types for Torium
 */

// User types
export type { User, UserRow } from './user';

// Workspace types
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceRow,
  WorkspaceMemberRow,
  PlanType,
  MemberRole,
} from './workspace';

// Session types
export type {
  Session,
  SessionRow,
  MagicLink,
  MagicLinkRow,
} from './session';

// Domain types
export type { Domain, DomainRow, DomainStatus } from './domain';

// Link types
export type {
  Link,
  LinkRow,
  LinkStatus,
  CreateLinkInput,
  UpdateLinkInput,
} from './link';
export { toLinkEntity } from './link';

// API types
export type {
  ApiResponse,
  ApiMeta,
  ApiErrorResponse,
  ApiError,
  ApiErrorCode,
} from './api';

export { isApiError, success, error } from './api';
