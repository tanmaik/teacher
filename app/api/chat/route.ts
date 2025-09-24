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

const lessonPlannerTool = tool({
  description: 'Generate a structured lesson plan for a specific topic and grade level',
  inputSchema: z.object({
    topic: z.string().describe('The lesson topic'),
    gradeLevel: z.string().describe('Grade level (e.g., "5th grade", "high school")'),
    duration: z.string().describe('Lesson duration (e.g., "45 minutes", "1 hour")'),
    learningObjectives: z.array(z.string()).describe('List of learning objectives'),
  }),
  async execute({ topic, gradeLevel, duration, learningObjectives }) {
    return {
      title: `${topic} - ${gradeLevel}`,
      duration,
      objectives: learningObjectives,
      structure: {
        warmUp: `5-minute activity to introduce ${topic}`,
        introduction: `10-minute overview of key concepts`,
        mainActivity: `20-minute hands-on learning experience`,
        assessment: `5-minute check for understanding`,
        closure: `5-minute summary and preview of next lesson`,
      },
      materials: [
        'Whiteboard/markers',
        'Student worksheets',
        'Relevant textbooks or resources',
      ],
      differentiation: [
        'Provide visual aids for visual learners',
        'Include hands-on activities for kinesthetic learners',
        'Offer extension activities for advanced students',
        'Provide additional support for struggling learners',
      ],
    }
  },
})

const quizGeneratorTool = tool({
  description: 'Generate quiz questions for a specific topic and difficulty level',
  inputSchema: z.object({
    topic: z.string().describe('The quiz topic'),
    questionCount: z.number().describe('Number of questions (1-10)'),
    difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
    questionType: z.enum(['multiple-choice', 'true-false', 'short-answer']).describe('Type of questions'),
  }),
  async execute({ topic, questionCount, difficulty, questionType }) {
    const questions = []

    for (let i = 1; i <= Math.min(questionCount, 10); i++) {
      if (questionType === 'multiple-choice') {
        questions.push({
          id: i,
          question: `Sample ${difficulty} multiple-choice question ${i} about ${topic}`,
          type: 'multiple-choice',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A',
        })
      } else if (questionType === 'true-false') {
        questions.push({
          id: i,
          question: `Sample ${difficulty} true/false question ${i} about ${topic}`,
          type: 'true-false',
          correctAnswer: i % 2 === 0 ? 'True' : 'False',
        })
      } else {
        questions.push({
          id: i,
          question: `Sample ${difficulty} short-answer question ${i} about ${topic}`,
          type: 'short-answer',
          suggestedAnswer: `Sample answer for ${topic} question ${i}`,
        })
      }
    }

    return {
      topic,
      difficulty,
      questionType,
      totalQuestions: questionCount,
      questions,
    }
  },
})

const gradingHelperTool = tool({
  description: 'Calculate grades and provide grading statistics',
  inputSchema: z.object({
    scores: z.array(z.number()).describe('Array of student scores'),
    totalPoints: z.number().describe('Total possible points'),
    gradingScale: z.enum(['standard', 'strict', 'lenient']).describe('Grading scale to use'),
  }),
  async execute({ scores, totalPoints, gradingScale }) {
    const percentages = scores.map(score => (score / totalPoints) * 100)

    const getLetterGrade = (percentage: number) => {
      const scales = {
        standard: { A: 90, B: 80, C: 70, D: 60 },
        strict: { A: 93, B: 85, C: 77, D: 65 },
        lenient: { A: 87, B: 77, C: 65, D: 55 },
      }
      const scale = scales[gradingScale]

      if (percentage >= scale.A) return 'A'
      if (percentage >= scale.B) return 'B'
      if (percentage >= scale.C) return 'C'
      if (percentage >= scale.D) return 'D'
      return 'F'
    }

    const grades = percentages.map(getLetterGrade)
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length

    return {
      totalStudents: scores.length,
      averagePercentage: Math.round(average * 100) / 100,
      averageLetterGrade: getLetterGrade(average),
      gradeDistribution: {
        A: grades.filter(g => g === 'A').length,
        B: grades.filter(g => g === 'B').length,
        C: grades.filter(g => g === 'C').length,
        D: grades.filter(g => g === 'D').length,
        F: grades.filter(g => g === 'F').length,
      },
      highestScore: Math.max(...percentages),
      lowestScore: Math.min(...percentages),
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
      const result = await executeManimCode(pythonCode, {
        quality,
        additionalPackages,
        timeout: 10 * 60 * 1000, // 10 minutes for video rendering
      })

      if (result.success && result.videoUrl) {
        return {
          success: true,
          videoUrl: result.videoUrl,
          output: result.output,
          message: 'Video generated successfully! The video will be accessible for the duration of the sandbox session.',
        }
      } else {
        return {
          success: false,
          error: result.error || 'Unknown error occurred',
          output: result.output,
          template: createManimTemplate(),
        }
      }
    } catch (error) {
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
  generateLessonPlan: lessonPlannerTool,
  generateQuiz: quizGeneratorTool,
  calculateGrades: gradingHelperTool,
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

    You have access to several educational tools:
    - calculate: For mathematical calculations
    - generateLessonPlan: For creating structured lesson plans
    - generateQuiz: For generating quiz questions
    - calculateGrades: For grade calculations and statistics
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