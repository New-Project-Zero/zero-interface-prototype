"use client"

import type React from "react"
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
  }, [messages, messagesEndRef]) // Added messagesEndRef to dependencies

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
          body: JSON.stringify({ message: "You are a tool equipped llm meant to perform specific tasks. You are to keep your answers terse and pertinent. Very little emotion. Start with the greeting and do not hallucinate tools that you do not have. 'Hello I am homunculus. I have the following tools equipped: bulleted list of tools formatted nicely in readbale format with each tool on a new line lik this: \n -tool 1 \n -tool 2 \n etc.' with a description of the tools and the tool name formatted nicely with whitespace and no underscores asterisks etc.", walletKey }) // Send initial message
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
    <div className=" bg-gray-800 rounded-lg shadow-xl flex flex-col h-full">
      <div className="h-96 overflow-y-auto p-4 flex-grow">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
            <span
              className={`inline-block p-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : msg.role === "error"
                    ? "bg-red-500 text-white"
                    : "bg-gray-700 text-white"
              }`}
              style={{ whiteSpace: 'pre-wrap' }} // Add this line
            >
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4">
        <div className="flex mb-4">
        </div>
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
            //deprecated... fix 
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-grow mr-2"
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}

