export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001')

export async function getChatResponse(
  messages: ChatMessage[]
): Promise<string> {
  try {
    const apiUrl = `${API_URL}/api/chat`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.response || 'Sorry, I could not generate a response.'
  } catch (error: any) {
    console.error('Error getting response from API:', error)
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      throw new Error('Request timed out. Please check your internet connection and try again.')
    }
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Unable to connect to the server. Please check your internet connection and that the backend is running.')
    }
    
    throw new Error(error.message || 'Error communicating with the API. Please try again later.')
  }
}
