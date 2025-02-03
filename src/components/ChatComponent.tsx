"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  role: "user" | "bot" | "error"
  content: string
}

interface ChatComponentProps {
  walletKey: string
}

export function ChatComponent({ walletKey }: ChatComponentProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const saveChat = async () => {
    try{
      setIsLoading(true);
      const response = await fetch("/api/save-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletKey }),
      })

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || "Failed to get response")
      }

      const botMessage: Message = { role: "bot", content: data.response }
      setMessages((prev) => [...prev, botMessage])

    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        role: "error",
        content: error instanceof Error ? error.message : "An unexpected error occurred saving chat",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false);
    }
  }

  const loadChat = async () => {
    try{
      setIsLoading(true);
      const response = await fetch("/api/load-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletKey }),
      })

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || "Failed to get response")
      }

      //console.log("frontend data: ", data.conversation[1].input);
      //this is an array. there is a better way to do this...
      for (let i = 1; i < data.conversation.length; i++) {
        const chat = data.conversation[i];
      
        if (chat && chat.input && chat.response) { // Check for undefined/null values
          const userMessage: Message = { role: "user", content: chat.input };
          setMessages((prev) => [...prev, userMessage]);
          const botMessage: Message = { role: "bot", content: chat.response };
          setMessages((prev) => [...prev, botMessage]);
        } else {
          console.error("Invalid chat object:", chat);
          // Optionally, handle the invalid chat object (e.g., log it, skip it, or set a default message).
          // Consider logging the index or key for better debugging.
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        role: "error",
        content: error instanceof Error ? error.message : "An unexpected error occurred saving chat",
      }
      //setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false);
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, walletKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || "Failed to get response")
      }

      const botMessage: Message = { role: "bot", content: data.response }
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        role: "error",
        content: error instanceof Error ? error.message : "An unexpected error occurred",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const hasInitialFetchBeenMade = React.useRef(false)
const mountedRef = React.useRef(true)  // New ref for tracking mount state

useEffect(() => {
  // Reset mounted ref on mount
  mountedRef.current = true
  
  const fetchInitialMessage = async () => {
    if (!mountedRef.current) return
    console.log('Fetching initial message...')

    setIsLoading(true)
    try {
      console.log('Making fetch request...')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: "You are a tool equipped llm meant to perform specific tasks. As the conversation carries on the you will adapt to the user's wishes and develope a personality unique to that user. Start with the greeting and do not hallucinate tools that you do not have. 'Hello I am homunculus. I have the following tools equipped: bulleted list of tools formatted nicely in readbale format with each tool on a new line lik this: \n -tool 1 \n -tool 2 \n etc.' with a description of the tools and the tool name formatted nicely with whitespace and no underscores asterisks etc.",
          walletKey 
        })
      })

      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        throw new Error(data.details || 'Failed to get response')
      }

      // Only update state if still mounted
      if (mountedRef.current) {
        console.log('Setting message with data:', data.response)
        const botMessage: Message = { role: 'bot', content: data.response }
        setMessages([botMessage])
      }
    } catch (error) {
      console.error('Error in fetchInitialMessage:', error)
      if (mountedRef.current) {
        const errorMessage: Message = {
          role: 'error',
          content: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
        setMessages([errorMessage])
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  // Only fetch if we haven't already
  if (!hasInitialFetchBeenMade.current) {
    console.log('Making initial fetch...')
    hasInitialFetchBeenMade.current = true
    fetchInitialMessage()
  }

  // Cleanup function
  return () => {
    mountedRef.current = false
  }
}, [walletKey]) 

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl flex flex-col h-full min-h-[400px]">
      <div className="flex-grow overflow-y-auto p-4">      
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            <span
              className={`inline-block p-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : msg.role === "error"
                  ? "bg-red-500 text-white"
                  : "bg-gray-700 text-white"
              }`}
              style={{ whiteSpace: 'pre-wrap', maxWidth: '80%', overflowWrap: 'break-word' }}
            >
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2 border-t border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-grow mr-2"
          />
          <Button type="submit" disabled={isLoading} className="mr-2">
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}