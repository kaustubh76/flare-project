'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
      <p className="text-gray-800 mb-6 max-w-md text-center">
        We encountered an unexpected error. This could be due to network issues or contract interactions.
      </p>
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 max-w-lg">
        <p className="text-red-800 text-sm font-mono overflow-auto">
          {error.message}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}