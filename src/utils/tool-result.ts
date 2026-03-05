import { CodecovError } from './errors.js'

export function toolResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

export function toolError(error: unknown) {
  let message: string
  if (error instanceof CodecovError) {
    message = error.message
  } else if (error instanceof Error) {
    message = error.message
  } else {
    message = String(error)
  }

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
