/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useChat } from '@ai-sdk/react'
import { Input } from '@/components/ui/input'
import { Bot } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { VideoPlayer } from '@/components/video-player'
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

  // Handle ESC key to interrupt generation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (status === 'submitted' || status === 'streaming')) {
        stop()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [status, stop])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === '') return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide flex flex-col justify-end">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Welcome to AI Teacher Assistant</h3>
            <p className="text-muted-foreground max-w-md">
              I&apos;m here to help you with lesson planning, student questions, curriculum guidance, and more.
              How can I assist you today?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start justify-start"
              >
                <div
                  className={`max-w-[80%] pl-3 pr-1 py-2 pt-3 ${
                    message.role === 'user'
                      ? 'text-gray-600'
                      : 'text-black'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="text-sm">
                      <span className="mr-2">{'>'}</span>
                      <span className="whitespace-pre-wrap">
                        {message.parts?.map((part, index) => (
                          <span key={index}>
                            {part.type === 'text' ? part.text : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm space-y-4">
                      {message.parts?.map((part, index) => {
                        // First determine what content to render
                        const content = (() => {
                          if (part.type === 'text') {
                            return (
                              <MarkdownRenderer
                                key={index}
                                content={part.text || ''}
                              />
                            )
                          }

                          // Handle streaming tool calls with different states
                          if (part.type === 'tool-calculate') {
                            switch (part.state) {
                              case 'input-streaming':
                              case 'input-available':
                                return (
                                  <MarkdownRenderer
                                    content={`calculate(${(part.input as any)?.expression || '...'})`}
                                  />
                                )
                              case 'output-available':
                                return (
                                  <div>
                                    <MarkdownRenderer
                                      content={`calculate(${(part.input as any).expression})`}
                                    />
                                    <div className="ml-2 text-gray-600">
                                      ╰─ {(part.output as any).result}
                                    </div>
                                  </div>
                                )
                              case 'output-error':
                                return (
                                  <div>
                                    <MarkdownRenderer
                                      content={`calculate(${(part.input as any)?.expression || '...'})`}
                                    />
                                    <div className="ml-2 text-red-600">
                                      ╰─ error
                                    </div>
                                  </div>
                                )
                            }
                          }

                          if (part.type === 'tool-generateLessonPlan') {
                            switch (part.state) {
                              case 'input-streaming':
                              case 'input-available':
                                return (
                                  <MarkdownRenderer
                                    content={`generateLessonPlan("${(part.input as any)?.topic || '...'}", ${(part.input as any)?.gradeLevel || '...'}, ${(part.input as any)?.duration || '...'})`}
                                  />
                                )
                              case 'output-available':
                                return (
                                  <div>
                                    <MarkdownRenderer
                                      content={`generateLessonPlan("${(part.input as any).topic}", ${(part.input as any).gradeLevel}, ${(part.input as any).duration})`}
                                    />
                                    <div className="ml-2 text-gray-600">
                                      ╰─ success
                                    </div>
                                  </div>
                                )
                            }
                          }

                          if (part.type === 'tool-generateQuiz') {
                            switch (part.state) {
                              case 'input-streaming':
                              case 'input-available':
                                return (
                                  <MarkdownRenderer
                                    content={`generateQuiz("${(part.input as any)?.topic || '...'}", ${(part.input as any)?.questionCount || '...'}, "${(part.input as any)?.questionType || '...'}")`}
                                  />
                                )
                              case 'output-available':
                                return (
                                  <div>
                                    <MarkdownRenderer
                                      content={`generateQuiz("${(part.input as any).topic}", ${(part.input as any).questionCount}, "${(part.input as any).questionType}")`}
                                    />
                                    <div className="ml-2 text-gray-600">
                                      ╰─ success
                                    </div>
                                  </div>
                                )
                            }
                          }

                          if (part.type === 'tool-calculateGrades') {
                            switch (part.state) {
                              case 'input-streaming':
                              case 'input-available':
                                return (
                                  <MarkdownRenderer
                                    content={`calculateGrades([${(part.input as any)?.scores?.length || '...'} scores], "${(part.input as any)?.gradingScale || '...'}", ${(part.input as any)?.totalPoints || '...'})`}
                                  />
                                )
                              case 'output-available':
                                return (
                                  <div>
                                    <MarkdownRenderer
                                      content={`calculateGrades([${(part.input as any).scores.length} scores], "${(part.input as any).gradingScale}", ${(part.input as any).totalPoints})`}
                                    />
                                    <div className="ml-2 text-gray-600">
                                      ╰─ average: {(part.output as any).averagePercentage}%
                                    </div>
                                  </div>
                                )
                            }
                          }

                          if (part.type === 'tool-generateManimVideo') {
                            switch (part.state) {
                              case 'input-streaming':
                              case 'input-available':
                                return (
                                  <MarkdownRenderer
                                    content={`generateManimVideo("${(part.input as any)?.quality || 'medium'}")`}
                                  />
                                )
                              case 'output-available':
                                if ((part.output as any).success && (part.output as any).videoUrl) {
                                  return (
                                    <div>
                                      <MarkdownRenderer
                                        content={`generateManimVideo("${(part.input as any).quality}")`}
                                      />
                                      <div className="ml-2 text-gray-600">
                                        ╰─ success
                                      </div>
                                      <VideoPlayer
                                        videoUrl={(part.output as any).videoUrl as string}
                                        title="Generated Manim Animation"
                                      />
                                      {typeof (part.output as any).message === 'string' && (
                                        <p className="text-sm text-gray-600 mt-2">{(part.output as any).message}</p>
                                      )}
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div>
                                      <MarkdownRenderer
                                        content={`generateManimVideo("${(part.input as any)?.quality || 'medium'}")`}
                                      />
                                      <div className="ml-2 text-red-600">
                                        ╰─ error
                                      </div>
                                    </div>
                                  )
                                }
                              case 'output-error':
                                return (
                                  <div>
                                    <MarkdownRenderer
                                      content={`generateManimVideo("${(part.input as any)?.quality || 'medium'}")`}
                                    />
                                    <div className="ml-2 text-red-600">
                                      ╰─ error
                                    </div>
                                  </div>
                                )
                            }
                          }

                          // Fallback for legacy tool-result format
                          if (part.type === 'tool-result' && 'result' in part) {
                            const result = part.result as Record<string, unknown>

                            // Handle Manim video tool results (legacy)
                            if ('toolName' in part && part.toolName === 'generateManimVideo' && result.success && result.videoUrl) {
                              return (
                                <div key={index}>
                                  <VideoPlayer
                                    videoUrl={result.videoUrl as string}
                                    title="Generated Manim Animation"
                                  />
                                  {typeof result.message === 'string' && (
                                    <p className="text-sm text-gray-600 mt-2">{result.message}</p>
                                  )}
                                </div>
                              )
                            }

                            // Handle other tool results generically
                            return (
                              <div key={index} className="bg-gray-50 rounded-lg p-3 mt-2">
                                <div className="text-xs text-gray-500 mb-2">
                                  Tool: {'toolName' in part ? part.toolName as string : 'Unknown'}
                                </div>
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(result, null, 2)}
                                </pre>
                              </div>
                            )
                          }
                          return null
                        })()

                        // Only render if we have content
                        if (!content) return null

                        // Determine dot style based on tool state
                        const getDotClass = () => {
                          if (part.type.startsWith('tool-')) {
                            switch ((part as any).state) {
                              case 'input-streaming':
                              case 'input-available':
                                return 'mr-2 mt-0.5 text-gray-400 animate-pulse'
                              case 'output-available':
                                return 'mr-2 mt-0.5 text-green-500'
                              case 'output-error':
                                return 'mr-2 mt-0.5 text-red-500'
                              default:
                                return 'mr-2 mt-0.5'
                            }
                          }
                          return 'mr-2 mt-0.5'
                        }

                        return (
                          <div key={index} className="flex">
                            <span className={getDotClass()}>●</span>
                            <div className="flex-1">{content}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(status === 'submitted' || status === 'streaming') && (
              <div className="flex items-start justify-start">
                <div className="pl-3 pr-1 py-2 text-black">
                  <div className="text-sm">
                    <span className="mr-2 text-orange-500">●</span>
                    <span className="text-orange-500">Loading...</span>
                    <span className="text-gray-500 ml-1">(esc to interrupt)</span>
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
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">{'>'}</span>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about teaching..."
              className="w-full pl-8 focus:ring-0 focus:ring-offset-0 focus:border-input focus:outline-none border-input focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
              disabled={status !== 'ready'}
            />
          </div>
        </form>
      </div>
    </div>
  )
}