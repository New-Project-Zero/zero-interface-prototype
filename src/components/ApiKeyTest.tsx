import React, { useEffect, useState } from 'react'

export function ApiKeyTest() {
  const [status, setStatus] = useState<string>('Checking API key...')

  useEffect(() => {
    const testApiKey = async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Hello, this is a test message.',
            walletKey: 'test'
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.details || 'API request failed')
        }

        setStatus('API key is working correctly!')
      } catch (error) {
        console.error('API Test Error:', error)
        setStatus(`API Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    testApiKey()
  }, [])

  return (
    <div className="p-4 bg-gray-800 rounded-lg mb-4">
      <p className="text-white">{status}</p>
    </div>
  )
}

