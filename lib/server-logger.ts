export function logServerError(error: any, context: string) {
  console.error(`Error in ${context}:`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : 'No stack trace available',
    details: error
  })
}

