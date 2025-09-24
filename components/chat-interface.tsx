'use client'

import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState, useEffect, useRef } from 'react'

export function ChatInterface() {
  const { error, status, sendMessage, messages, stop } = useChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === '') return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Welcome to AI Teacher Assistant</h3>
            <p className="text-muted-foreground max-w-md">
              I&apos;m here to help you with lesson planning, student questions, curriculum guidance, and more.
              How can I assist you today?
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start justify-start ml-4"
              >
                <div
                  className={`max-w-[80%] px-4 py-2 ${
                    message.role === 'user'
                      ? 'text-gray-600'
                      : 'text-black'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    <span className="mr-2">
                      {message.role === 'user' ? '>' : '●'}
                    </span>
                    {message.parts?.map((part, index) => (
                      <span key={index}>
                        {part.type === 'text' ? part.text : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {(status === 'submitted' || status === 'streaming') && (
              <div className="flex items-start justify-start ml-4">
                <div className="px-4 py-2 text-black">
                  <div className="text-sm flex items-center">
                    <span className="mr-2">●</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start justify-start">
                <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2">
                  <p className="text-sm">Sorry, an error occurred. Please try again.</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 p-4">
        <form onSubmit={handleSubmit}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about teaching..."
            className="w-full focus:ring-0 focus:ring-offset-0 focus:border-input focus:outline-none border-input focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={status !== 'ready'}
          />
        </form>
      </div>
    </div>
  )
}