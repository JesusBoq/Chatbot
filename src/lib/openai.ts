export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// In production, if VITE_API_URL is not set, use relative URL (same domain)
// This works when frontend and backend are served from the same server
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001')

export async function getChatResponse(
  messages: ChatMessage[]
): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.response || 'Sorry, I could not generate a response.'
  } catch (error: any) {
    console.error('Error getting response from API:', error)
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Unable to connect to the server. Please make sure the backend server is running on port 3001.')
    }
    
    throw new Error(error.message || 'Error communicating with the API. Please try again later.')
  }
}
