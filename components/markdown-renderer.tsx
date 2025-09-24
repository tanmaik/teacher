'use client'

import { marked } from 'marked'
import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const htmlContent = useMemo(() => {
    // Configure marked to handle markdown with headings but same font size
    const renderer = new marked.Renderer()

    // Override heading rendering to keep same font size but bold
    renderer.heading = ({ tokens }: { tokens: Array<{ raw?: string; text?: string }> }) => {
      const text = tokens.map(token => token.raw || token.text || '').join('')
      return `<div class="font-bold">${text}</div>`
    }

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true,
    })

    return marked(content)
  }, [content])

  return (
    <div
      className="prose prose-sm max-w-none [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:my-2 [&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:my-2 [&>li]:mb-1"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        // Custom styles for markdown elements
        '--tw-prose-body': 'inherit',
        '--tw-prose-headings': 'inherit',
        '--tw-prose-bold': 'inherit',
        '--tw-prose-counters': 'inherit',
        '--tw-prose-hr': 'inherit',
        '--tw-prose-quotes': 'inherit',
        '--tw-prose-quote-borders': 'inherit',
        '--tw-prose-captions': 'inherit',
        '--tw-prose-code': 'inherit',
        '--tw-prose-pre-code': 'inherit',
        '--tw-prose-pre-bg': 'inherit',
        '--tw-prose-th-borders': 'inherit',
        '--tw-prose-td-borders': 'inherit',
      } as React.CSSProperties}
    />
  )
}