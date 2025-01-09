'use client'

import React from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1>
      <p className="text-red-500 mb-4">{error.message}</p>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={resetErrorBoundary}
      >
        Try again
      </button>
    </div>
  )
}

export default function ErrorBoundary({ children }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  )
}

