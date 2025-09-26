import { anthropic } from '@ai-sdk/anthropic'
import { streamText, convertToModelMessages, UIMessage, tool, stepCountIs, validateUIMessages, InferUITools, UIDataTypes } from 'ai'
import { z } from 'zod'
import { executeManimCode, createManimTemplate, validateManimCode } from '@/lib/manim-sandbox'

export const maxDuration = 600 // 10 minutes to allow for video rendering

// Educational tools for teachers
const calculateTool = tool({
  description: 'Perform mathematical calculations for educational purposes',
  inputSchema: z.object({
    expression: z.string().describe('Mathematical expression to calculate (e.g., "2 + 3 * 4")'),
  }),
  async execute({ expression }) {
    try {
      // Simple safe evaluation for basic math
      const result = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/().\s]/g, '')})`)()
      return {
        expression,
        result: typeof result === 'number' ? result : 'Invalid calculation',
      }
    } catch {
      return {
        expression,
        result: 'Error: Invalid mathematical expression',
      }
    }
  },
})




const manimVideoTool = tool({
  description: 'Generate educational videos using Manim (Mathematical Animation Engine) from Python code',
  inputSchema: z.object({
    pythonCode: z.string().describe('Python code using Manim to create mathematical animations'),
    quality: z.enum(['low', 'medium', 'high']).default('medium').describe('Video quality - affects render time'),
    additionalPackages: z.array(z.string()).default([]).describe('Additional Python packages to install'),
  }),
  async execute({ pythonCode, quality, additionalPackages }) {
    // Validate the code first
    const validation = validateManimCode(pythonCode)
    if (!validation.valid) {
      return {
        success: false,
        error: 'Code validation failed',
        issues: validation.issues,
        template: createManimTemplate(),
      }
    }

    try {
      console.log('Executing Manim code with quality:', quality)
      console.log('Python code length:', pythonCode.length, 'characters')

      const result = await executeManimCode(pythonCode, {
        quality,
        additionalPackages,
        timeout: 10 * 60 * 1000, // 10 minutes for video rendering
      })

      console.log('Manim execution result:', {
        success: result.success,
        hasVideoUrl: !!result.videoUrl,
        error: result.error,
        outputLength: result.output?.length
      })

      if (result.success && result.videoUrl) {
        console.log('Video generated successfully:', result.videoUrl)
        return {
          success: true,
          videoUrl: result.videoUrl,
          output: result.output,
          message: 'Video generated successfully! The video will be accessible for the duration of the sandbox session.',
        }
      } else {
        console.error('Manim execution failed:', {
          error: result.error,
          output: result.output
        })
        return {
          success: false,
          error: result.error || 'Unknown error occurred',
          output: result.output,
          template: createManimTemplate(),
        }
      }
    } catch (error) {
      console.error('Exception in Manim tool:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        template: createManimTemplate(),
      }
    }
  },
})

const tools = {
  calculate: calculateTool,
  generateManimVideo: manimVideoTool,
} as const

export type TeacherChatMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<typeof tools>
>

export async function POST(req: Request) {
  const body = await req.json()

  const messages = await validateUIMessages<TeacherChatMessage>({
    messages: body.messages,
    tools,
  })

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages: convertToModelMessages(messages),
    system: `You are an AI Teacher Assistant. You help educators with:

    - Lesson planning and curriculum development
    - Student assessment and grading strategies
    - Classroom management techniques
    - Educational technology recommendations
    - Answering subject-specific questions
    - Creating engaging learning activities
    - Parent communication strategies
    - Professional development guidance

    You have access to two educational tools:
    - calculate: For mathematical calculations
    - generateManimVideo: For creating educational mathematics videos using Python and Manim

    Always provide practical, evidence-based advice that considers different learning styles and educational contexts. Be encouraging and supportive while maintaining professionalism.

    When appropriate, use the available tools to provide more comprehensive assistance.

    For the Manim video tool:
    - Keep animations SHORT (10-30 seconds max) for better attention and loading
    - Break complex concepts into SMALL, focused clips rather than long videos
    - Each scene should demonstrate ONE key concept or step
    - Use simple, clear animations that students can easily follow
    - Ensure Python code follows proper Manim structure with Scene classes and construct methods
    - Consider creating multiple short clips for multi-step explanations rather than one long video`,
    tools,
    stopWhen: stepCountIs(10), // Allow up to 10 steps for complex multi-tool workflows
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    onFinish: (options) => {
      console.log('Chat finished:', options)
    },
  })
}