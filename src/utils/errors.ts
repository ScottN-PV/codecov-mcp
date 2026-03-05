export class CodecovError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
  ) {
    super(message)
    this.name = 'CodecovError'
  }
}

export function formatApiError(status: number, endpoint: string, body?: string): CodecovError {
  const messages: Record<number, string> = {
    401: 'Authentication failed. Verify your CODECOV_TOKEN is valid. If using an upload token, switch to an API access token.',
    403: `Access denied. Your token may not have permission to access this resource.`,
    404: `Resource not found at ${endpoint}. Verify the owner, repo, and parameters are correct.`,
    429: 'Rate limit reached. The request will be retried automatically.',
  }

  const message = messages[status]
    || (status >= 500 ? `Codecov server error (${status}). Try again shortly.` : `API request failed with status ${status}.`)

  return new CodecovError(
    body ? `${message} Details: ${body}` : message,
    status,
    endpoint,
  )
}

export function requireToken(token?: string): string {
  if (!token) {
    throw new CodecovError(
      'CODECOV_TOKEN is not set. Generate an API token at: Codecov Settings > Access > Generate Token',
    )
  }
  return token
}
