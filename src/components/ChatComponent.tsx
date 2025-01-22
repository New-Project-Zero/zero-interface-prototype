'use client'

import React, { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'bot' | 'error'
  content: string
}

interface ChatComponentProps {
  walletKey: string
  //agentSpawned: boolean
}

export function ChatComponent({ walletKey }: ChatComponentProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, walletKey})
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || 'Failed to get response')
      }

      const botMessage: Message = { role: 'bot', content: data.response }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'error',
        content: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  useEffect(() => {
    //cleanup
    let isComponentMounted = true;

    const fetchInitialMessage = async () => {
      if (!isComponentMounted) return;

      setIsLoading(true);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "You are a tool equipped llm meant to perform specific tasks. You are to keep your answers terse and pertinent. Very little emotion. Start with the greeting  do not hallucinate tools that you do not have. 'Hello I am homunculus. I have the following tools equipped: \n -tool 1 \n -tool 2 \n etc.' with a description of the tools and the tool name formatted nicely with whitespace and no underscores.", walletKey }) // Send initial message
        });

        if (!isComponentMounted) return;

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || 'Failed to get response');
        }

        if (isComponentMounted){
        const botMessage: Message = { role: 'bot', content: data.response };
        setMessages([botMessage]);
        } 
      } catch (error) {
        console.error('Error fetching initial message:', error);
      } finally {
        if (isComponentMounted){
        setIsLoading(false);
        }
      }
    };

    fetchInitialMessage();

    return () => {
      isComponentMounted = false;
    };
  }, [walletKey]); 

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white text-center">🌱Chat with the Homunculus🌱 </h2>
      </div>
      <div className="p-4">
        <div className="h-[60vh] overflow-y-auto mb-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : msg.role === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-white p-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-grow px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-12"
            rows={1}
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md transition-colors ${
              isLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-700'
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

