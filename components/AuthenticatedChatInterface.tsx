import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { GeminiAuthService } from '../services/geminiAuthService'
import type { ChatMessage } from '../types'

interface AuthenticatedChatInterfaceProps {
  onSearch: (query: string) => void
  error?: string | null
  onEscapeToTraditional?: () => void
}

export const AuthenticatedChatInterface: React.FC<AuthenticatedChatInterfaceProps> = ({
  onSearch,
  error,
  onEscapeToTraditional
}) => {
  const { user } = useAuth()
  const [conversation, setConversation] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authService] = useState(() => new GeminiAuthService())

  useEffect(() => {
    // Initialize conversation based on auth state
    if (user) {
      setConversation([{
        author: 'ai',
        text: `Welcome back, ${user.full_name || 'there'}! You have ${user.credits} search credits remaining. What medication or prescriber information can I help you find today?`
      }])
    } else {
      setConversation([{
        author: 'ai', 
        text: "Hi! I can help you find prescribers for any medication. To get started, I'll need you to sign in. What's your email address?"
      }])
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to conversation
    const newConversation = [...conversation, { author: 'user' as const, text: userMessage }]
    setConversation(newConversation)

    try {
      if (!user) {
        // Handle authentication flow
        const result = await authService.processAuthRequest(
          userMessage,
          newConversation,
          async (authCall) => {
            return await authService.executeAuthFunction(authCall)
          }
        )

        setConversation(prev => [...prev, { author: 'ai', text: result.response }])
      } else {
        // User is authenticated - check if they have credits
        if (user.credits <= 0) {
          setConversation(prev => [...prev, { 
            author: 'ai', 
            text: "You've used all your search credits. Please upgrade your plan to continue searching for prescribers."
          }])
          return
        }

        // Check if this looks like a search query
        const searchKeywords = ['find', 'search', 'prescriber', 'doctor', 'medication', 'drug', 'near', 'location']
        const isSearchQuery = searchKeywords.some(keyword => 
          userMessage.toLowerCase().includes(keyword)
        ) || userMessage.includes('?')

        if (isSearchQuery) {
          // This is a prescriber search
          onSearch(userMessage)
        } else {
          // Handle other auth-related queries
          const result = await authService.processAuthRequest(
            userMessage,
            newConversation,
            async (authCall) => {
              return await authService.executeAuthFunction(authCall)
            }
          )

          setConversation(prev => [...prev, { author: 'ai', text: result.response }])
        }
      }
    } catch (error) {
      console.error('Error processing message:', error)
      setConversation(prev => [...prev, { 
        author: 'ai', 
        text: "I'm sorry, I encountered an error. Please try again."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with escape option */}
      {onEscapeToTraditional && conversation.length > 0 && (
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
          <p className="text-sm text-gray-400">Chat with AI Assistant</p>
          <button
            onClick={onEscapeToTraditional}
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
          >
            ← Back to traditional search
          </button>
        </div>
      )}
      
      {/* Conversation Display */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {conversation.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.author === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* User Status */}
      {user && (
        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
          <span className="text-sm text-gray-300">
            Signed in as {user.email}
          </span>
          <span className="text-sm text-cyan-400">
            {user.credits} credits remaining
          </span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              user 
                ? "Ask me about prescribers, medications, or your account..." 
                : "Enter your email to get started..."
            }
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
