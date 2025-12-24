import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Send, Loader2, Plus, X } from 'lucide-react'
import { getChatResponse, type ChatMessage } from '@/lib/openai'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  isWelcome?: boolean
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  lastActivity: Date
  isActive: boolean
}

const STORAGE_KEY = 'airline-chatbot-conversations'
const ACTIVE_TAB_KEY = 'airline-chatbot-active-tab'
const SESSION_TIMEOUT = 30 * 60 * 1000
const LAST_SESSION_KEY = 'airline-chatbot-last-session'

const saveConversationsToStorage = (conversations: Conversation[]) => {
  try {
    const conversationsToSave = conversations
      .filter(conv => {
        const userMessageCount = getUserMessageCount(conv)
        return userMessageCount >= 2
      })
      .map((conv) => ({
        ...conv,
        messages: conv.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        lastActivity: conv.lastActivity.toISOString(),
      }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationsToSave))
  } catch (error) {
    console.error('Error saving conversations to localStorage:', error)
  }
}

const loadConversationsFromStorage = (): Conversation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    const loaded = parsed.map((conv: any) => ({
      ...conv,
      messages: conv.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      lastActivity: conv.lastActivity ? new Date(conv.lastActivity) : new Date(conv.updatedAt),
      isActive: conv.isActive !== undefined ? conv.isActive : true,
    }))
    
    return loaded.filter((conv: Conversation) => {
      const userMessageCount = getUserMessageCount(conv)
      return userMessageCount >= 2
    })
  } catch (error) {
    console.error('Error loading conversations from localStorage:', error)
    return []
  }
}

const saveLastSessionTime = () => {
  try {
    localStorage.setItem(LAST_SESSION_KEY, Date.now().toString())
  } catch (error) {
    console.error('Error saving last session time:', error)
  }
}

const getLastSessionTime = (): number | null => {
  try {
    const stored = localStorage.getItem(LAST_SESSION_KEY)
    return stored ? parseInt(stored, 10) : null
  } catch (error) {
    console.error('Error loading last session time:', error)
    return null
  }
}

const shouldCreateNewConversation = (): boolean => {
  const lastSession = getLastSessionTime()
  if (!lastSession) return true
  
  const timeSinceLastSession = Date.now() - lastSession
  return timeSinceLastSession > SESSION_TIMEOUT
}

const saveActiveTabId = (tabId: string) => {
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, tabId)
  } catch (error) {
    console.error('Error saving active tab ID:', error)
  }
}

const loadActiveTabId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_TAB_KEY)
  } catch (error) {
    console.error('Error loading active tab ID:', error)
    return null
  }
}

const generateConversationTitle = (firstUserMessage: string): string => {
  const title = firstUserMessage.trim().slice(0, 30)
  return title || 'New Conversation'
}

const getUserMessageCount = (conversation: Conversation): number => {
  return conversation.messages.filter(msg => msg.sender === 'user').length
}

const shouldArchiveConversation = (conversation: Conversation): boolean => {
  const userMessageCount = getUserMessageCount(conversation)
  return userMessageCount >= 2
}

const initialMessage: Message = {
  id: '1',
  text: 'Hello! I\'m your Air India Maharaja Assistant. How can I help you today? I can assist you with information about flights, baggage, check-in, reservation changes, frequent flyer programs, and much more.\n\nनमस्ते! मैं आपका एयर इंडिया महाराजा असिस्टेंट हूं। मैं आपकी कैसे मदद कर सकता हूं? मैं उड़ानों, सामान, चेक-इन, आरक्षण परिवर्तन, फ्रीक्वेंट फ्लायर प्रोग्राम और बहुत कुछ के बारे में जानकारी प्रदान कर सकता हूं।',
  sender: 'bot',
  timestamp: new Date(),
  isWelcome: true,
}

const quickActionButtons = [
  { 
    label: 'Baggage Allowance', 
    query: 'Please provide detailed information about baggage allowance including carry-on and checked baggage limits, weight restrictions, and size requirements for Air India flights.' 
  },
  { 
    label: 'Check-in', 
    query: 'Please provide comprehensive information about check-in procedures including online check-in timing, airport check-in procedures, and check-in deadlines for Air India flights.' 
  },
  { 
    label: 'Booking', 
    query: 'Please provide information about how to book a flight with Air India, including booking methods, payment options, and booking requirements.' 
  },
  { 
    label: 'Flight Status', 
    query: 'Please provide information about how to check flight status with Air India, including online methods and what information is needed to check flight status.' 
  },
  { 
    label: 'Cancellation Policy', 
    query: 'Please provide detailed information about Air India cancellation policies including refund policies, cancellation fees, and how to cancel a booking.' 
  },
  { 
    label: 'Maharaja Club', 
    query: 'Please provide information about the Air India Maharaja Club frequent flyer program including membership benefits, miles earning, tier levels, and how to redeem miles.' 
  },
]

function Chatbot() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const loaded = loadConversationsFromStorage()
    const shouldCreateNew = shouldCreateNewConversation()
    
    if (shouldCreateNew && loaded.length > 0) {
      const activeConversation = loaded.find(c => c.isActive)
      
      if (activeConversation && shouldArchiveConversation(activeConversation)) {
        const updatedConversations = loaded.map(conv => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              isActive: false,
            }
          }
          return { ...conv, isActive: false }
        })
        
        const newConv: Conversation = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [initialMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
          isActive: true,
        }
        
        saveLastSessionTime()
        return [...updatedConversations, newConv]
      } else if (activeConversation && !shouldArchiveConversation(activeConversation)) {
        const updatedConversations = loaded.filter(c => c.id !== activeConversation.id)
        const newConv: Conversation = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [initialMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
          isActive: true,
        }
        saveLastSessionTime()
        return [...updatedConversations, newConv]
      } else {
        const updatedConversations = loaded.map(conv => ({
          ...conv,
          isActive: false,
        }))
        
        const newConv: Conversation = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [initialMessage],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
          isActive: true,
        }
        
        saveLastSessionTime()
        return [...updatedConversations, newConv]
      }
    }
    
    if (loaded.length === 0) {
      const initialConv: Conversation = {
        id: Date.now().toString(),
        title: 'New Conversation',
        messages: [initialMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
      }
      saveLastSessionTime()
      return [initialConv]
    }
    
    const activeConversations = loaded.filter(c => c.isActive)
    if (activeConversations.length === 0) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: 'New Conversation',
        messages: [initialMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
      }
      saveLastSessionTime()
      return [...loaded, newConv]
    }
    
    saveLastSessionTime()
    return loaded
  })
  
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const activeConversations = conversations.filter(c => c.isActive)
    if (activeConversations.length > 0) {
      return activeConversations[activeConversations.length - 1].id
    }
    
    const savedActiveId = loadActiveTabId()
    const found = conversations.find(c => c.id === savedActiveId)
    if (found) {
      return found.id
    }
    
    return conversations.length > 0 ? conversations[conversations.length - 1].id : Date.now().toString()
  })
  
  const activeConversation = conversations.find(c => c.id === activeTabId) || conversations[0]
  const messages = activeConversation?.messages || [initialMessage]
  
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationsRef = useRef(conversations)
  
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (conversations.length > 0) {
      const conversationsToSave = conversations.filter(conv => {
        const userMessageCount = getUserMessageCount(conv)
        return userMessageCount >= 2
      })
      if (conversationsToSave.length > 0) {
        saveConversationsToStorage(conversationsToSave)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [conversations])

  useEffect(() => {
    if (activeTabId) {
      saveActiveTabId(activeTabId)
    }
  }, [activeTabId])

  useEffect(() => {
    const updateLastActivity = () => {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === activeTabId) {
            return {
              ...conv,
              lastActivity: new Date(),
              isActive: true,
            }
          }
          return conv
        })
      })
      saveLastSessionTime()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setConversations((prev) => {
          const activeConv = prev.find(c => c.id === activeTabId)
          if (activeConv && shouldArchiveConversation(activeConv)) {
            return prev.map((conv) => {
              if (conv.id === activeTabId) {
                return {
                  ...conv,
                  isActive: false,
                }
              }
              return conv
            })
          } else if (activeConv && !shouldArchiveConversation(activeConv)) {
            return prev.filter(c => c.id !== activeTabId)
          }
          return prev
        })
      } else {
        const timeSinceLastSession = getLastSessionTime()
        if (timeSinceLastSession && Date.now() - timeSinceLastSession > SESSION_TIMEOUT) {
          setConversations((prev) => {
            const activeConv = prev.find(c => c.id === activeTabId)
            
            if (activeConv && shouldArchiveConversation(activeConv)) {
              const updated = prev.map(conv => {
                if (conv.id === activeTabId) {
                  return { ...conv, isActive: false }
                }
                return { ...conv, isActive: false }
              })
              
              const newConv: Conversation = {
                id: Date.now().toString(),
                title: 'New Conversation',
                messages: [initialMessage],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivity: new Date(),
                isActive: true,
              }
              
              setActiveTabId(newConv.id)
              saveLastSessionTime()
              return [...updated, newConv]
            } else if (activeConv && !shouldArchiveConversation(activeConv)) {
              const filtered = prev.filter(c => c.id !== activeTabId)
              const newConv: Conversation = {
                id: Date.now().toString(),
                title: 'New Conversation',
                messages: [initialMessage],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivity: new Date(),
                isActive: true,
              }
              setActiveTabId(newConv.id)
              saveLastSessionTime()
              return [...filtered, newConv]
            } else {
              const updated = prev.map(conv => ({ ...conv, isActive: false }))
              const newConv: Conversation = {
                id: Date.now().toString(),
                title: 'New Conversation',
                messages: [initialMessage],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivity: new Date(),
                isActive: true,
              }
              setActiveTabId(newConv.id)
              saveLastSessionTime()
              return [...updated, newConv]
            }
          })
        } else {
          updateLastActivity()
        }
      }
    }

    const handleBeforeUnload = () => {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === activeTabId) {
            return {
              ...conv,
              isActive: false,
            }
          }
          return conv
        })
      })
    }

    const activityInterval = setInterval(updateLastActivity, 60000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(activityInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [activeTabId])

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || inputValue
    if (!messageToSend.trim() || isLoading) {
      console.log('handleSend blocked:', { messageToSend, isLoading })
      return
    }
    
    console.log('handleSend called with:', messageToSend)

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageToSend,
      sender: 'user',
      timestamp: new Date(),
    }

    const userInput = messageToSend
    setInputValue('')
    setIsLoading(true)

    const currentConversation = conversations.find(c => c.id === activeTabId)
    const currentMessages = currentConversation?.messages || []
    const messagesWithNewUserMessage = [...currentMessages, userMessage]
    
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.id === activeTabId) {
          const title = conv.messages.length === 1 
            ? generateConversationTitle(userInput)
            : conv.title
          return {
            ...conv,
            messages: messagesWithNewUserMessage,
            title,
            updatedAt: new Date(),
            lastActivity: new Date(),
            isActive: true,
          }
        }
        return conv
      })
      return updated
    })
    saveLastSessionTime()

    try {
      const chatMessages: ChatMessage[] = messagesWithNewUserMessage
        .filter((msg) => msg.sender !== 'bot' || msg.id !== '1')
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        }))

      console.log('Sending to API:', {
        messageCount: chatMessages.length,
        lastMessage: chatMessages[chatMessages.length - 1],
        allMessages: chatMessages
      })

      const response = await getChatResponse(chatMessages)
      
      console.log('Received response:', response)

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      }

      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === activeTabId) {
            return {
              ...conv,
              messages: [...conv.messages, botMessage],
              updatedAt: new Date(),
              lastActivity: new Date(),
              isActive: true,
            }
          }
          return conv
        })
      })
      saveLastSessionTime()
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : 'An error occurred while processing your message.',
        sender: 'bot',
        timestamp: new Date(),
      }
      
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === activeTabId) {
            return {
              ...conv,
              messages: [...conv.messages, errorMessage],
              updatedAt: new Date(),
              lastActivity: new Date(),
              isActive: true,
            }
          }
          return conv
        })
      })
      saveLastSessionTime()
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewTab = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [initialMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    }
    setConversations((prev) => {
      const updated = prev.map(conv => ({ ...conv, isActive: false }))
      return [...updated, newConversation]
    })
    setActiveTabId(newConversation.id)
    saveLastSessionTime()
  }

  const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (conversations.length === 1) {
      setConversations([{
        id: tabId,
        title: 'New Conversation',
        messages: [initialMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
      }])
      return
    }
    
    const newConversations = conversations.filter(c => c.id !== tabId)
    setConversations(newConversations)
    
    if (activeTabId === tabId) {
      setActiveTabId(newConversations[0].id)
    }
  }

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId)
    setConversations((prev) => {
      return prev.map((conv) => {
        if (conv.id === tabId) {
          return {
            ...conv,
            isActive: true,
            lastActivity: new Date(),
          }
        }
        return conv
      })
    })
    saveLastSessionTime()
  }

  const handleQuickAction = (query: string) => {
    console.log('handleQuickAction called with:', query)
    if (isLoading) {
      console.log('handleQuickAction blocked: isLoading is true')
      return
    }
    handleSend(query)
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Card className="h-[650px] flex flex-col shadow-2xl" style={{ 
        backgroundColor: 'white', 
        width: '100%',
        borderRadius: '16px',
        border: 'none',
        overflow: 'hidden',
      }}>
        <CardHeader className="border-b p-0" style={{ 
          borderBottom: '2px solid #f0f0f0',
          background: 'linear-gradient(135deg, #E4002B 0%, #8B1538 100%)',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
        }}>
          <div className="flex items-center gap-1 px-4 pt-4 overflow-x-auto" style={{ 
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleTabClick(conv.id)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b-2 transition-all ${
                  activeTabId === conv.id
                    ? 'text-white font-semibold'
                    : 'text-white/80 hover:text-white'
                }`}
                style={{
                  borderBottomColor: activeTabId === conv.id ? '#D4AF37' : 'transparent',
                  borderBottomWidth: activeTabId === conv.id ? '3px' : '2px',
                  minWidth: '120px',
                  borderRadius: activeTabId === conv.id ? '8px 8px 0 0' : '0',
                  background: activeTabId === conv.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                }}
              >
                <span className="text-sm truncate flex-1" style={{ maxWidth: '100px' }}>
                  {conv.title}
                </span>
                <button
                  onClick={(e) => handleDeleteTab(conv.id, e)}
                  className="hover:bg-white/20 rounded p-1 transition-colors"
                  style={{ flexShrink: 0 }}
                >
                  <X className="h-3 w-3" style={{ color: 'white' }} />
                </button>
              </div>
            ))}
            <Button
              onClick={handleNewTab}
              variant="ghost"
              size="sm"
              className="ml-2 h-8 px-2 hover:bg-white/20"
              title="New conversation"
              style={{ color: 'white' }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between px-4 py-4" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #E4002B 0%, #8B1538 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(228,0,43,0.3)',
              }}>
                <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>✈</span>
              </div>
              <div>
                <CardTitle className="text-xl font-bold" style={{ 
                  color: '#E4002B',
                  margin: 0,
                  background: 'linear-gradient(135deg, #E4002B 0%, #8B1538 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>Maharaja Assistant</CardTitle>
                <p className="text-xs" style={{ color: '#666', marginTop: '2px' }}>Air India Virtual Assistant</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-0" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          background: 'linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)',
        }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: '#fafafa' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-[#E4002B] to-[#8B1538] text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                  style={{
                    boxShadow: message.sender === 'user' 
                      ? '0 2px 8px rgba(228,0,43,0.2)' 
                      : '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  {message.isWelcome && message.sender === 'bot' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quickActionButtons.map((button, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickAction(button.query)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-medium rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: 'linear-gradient(135deg, #E4002B 0%, #8B1538 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 4px rgba(228,0,43,0.3)',
                          }}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p
                    className={`text-xs mt-2 ${
                      message.sender === 'user'
                        ? 'text-white/70'
                        : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#E4002B' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4" style={{ 
            background: 'white',
            borderTop: '2px solid #f0f0f0',
          }}>
            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isLoading}
                style={{
                  borderRadius: '24px',
                  border: '2px solid #e5e7eb',
                  padding: '12px 20px',
                  fontSize: '14px',
                }}
              />
              <Button
                onClick={handleSend}
                size="icon"
                className="shrink-0"
                disabled={isLoading || !inputValue.trim()}
                style={{
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #E4002B 0%, #8B1538 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(228,0,43,0.3)',
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'white' }} />
                ) : (
                  <Send className="h-5 w-5" style={{ color: 'white' }} />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Chatbot
