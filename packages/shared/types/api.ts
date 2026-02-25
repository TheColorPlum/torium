/**
 * API response envelope types per API_CONTRACT
 * All responses use this envelope format
 */

/**
 * Successful response envelope
 */
export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

/**
 * Response metadata (pagination, etc.)
 */
export interface ApiMeta {
  next_cursor?: string;
  has_more?: boolean;
}

/**
 * Error response envelope
 */
export interface ApiErrorResponse {
  error: ApiError;
}

/**
 * Error detail
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

/**
 * Standard error codes per API_CONTRACT
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_CONSUMED'
  | 'EMAIL_SEND_FAILED';

/**
 * Type guard for error responses
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'object'
  );
}

/**
 * Helper to create success response
 */
export function success<T>(data: T, meta?: ApiMeta): ApiResponse<T> {
  return meta ? { data, meta } : { data };
}

/**
 * Helper to create error response
 */
export function error(code: ApiErrorCode, message: string): ApiErrorResponse {
  return { error: { code, message } };
}
