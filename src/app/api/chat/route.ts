import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Make sure we're using the correct environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
if (!apiKey) {
  throw new Error('VITE_GEMINI_API_KEY is not set in environment variables')
}

const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(request: Request) {
  try {
    const { message, walletKey } = await request.json()
    console.log('Processing message with API key:', apiKey.substring(0, 5) + '...')

    // Initialize the model
    const model: GenerativeModel = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Start a chat
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    })

    try {
      // Send message and get response
      const result = await chat.sendMessage(message)
      const response = await result.response
      const text = response.text()

      return new Response(JSON.stringify({ response: text }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (genaiError) {
      console.error('Gemini API Error:', genaiError)
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API Error', 
          details: genaiError instanceof Error ? genaiError.message : String(genaiError)
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }
  } catch (error) {
    console.error('Chat API Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}

