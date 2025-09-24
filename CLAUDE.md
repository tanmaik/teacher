# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Management
- Use pnpm instead of npm for all package management operations
- The latest Claude model is claude-sonnet-4-20250514

## Development Commands
- `pnpm dev` - Start development server with Turbo (Next.js with turbopack)
- `pnpm build` - Build the production application with Turbo
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint for code linting

## Architecture Overview

This is an AI Teacher Assistant application built with:
- **Framework**: Next.js 15.5.4 with App Router
- **Runtime**: React 19.1.0
- **Styling**: TailwindCSS with Radix UI components
- **AI Integration**: Vercel AI SDK with Anthropic (Claude) and OpenAI support
- **Video Generation**: Manim integration using Vercel Sandbox for mathematical animations

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components including chat interface
- `lib/` - Utility functions and core business logic

### Core Components
1. **Chat Interface** (`components/chat-interface.tsx`): Main chat UI with real-time tool execution visualization
2. **API Route** (`app/api/chat/route.ts`): Streaming chat endpoint with educational tools
3. **Manim Integration** (`lib/manim-sandbox.ts`): Python/Manim video generation using Vercel Sandbox

### Educational Tools Available
- Mathematical calculations
- Lesson plan generation
- Quiz creation
- Grade calculation and statistics
- Mathematical video generation via Manim

### Important Notes
- Uses Turbopack for faster builds in development and production
- Manim tool creates educational videos with 10-minute timeout
- Chat interface displays real-time tool execution states
- TypeScript paths configured with `@/*` alias pointing to root