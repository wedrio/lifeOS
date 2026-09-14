export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const validationError = (details: unknown) => new ApiError('VALIDATION_ERROR', '请求参数不符合要求', 400, details);
