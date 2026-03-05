import { CodecovError } from './errors.js'

export function toolResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

export function toolError(error: unknown) {
  const message = error instanceof CodecovError
    ? error.message
    : error instanceof Error
      ? error.message
      : String(error)

  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  }
}

export function withErrorHandling<T>(
  fn: (args: T) => Promise<ReturnType<typeof toolResult>>,
): (args: T) => Promise<ReturnType<typeof toolResult> | ReturnType<typeof toolError>> {
  return async (args: T) => {
    try {
      return await fn(args)
    } catch (error) {
      return toolError(error)
    }
  }
}
