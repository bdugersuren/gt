'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import Checkpoint from './Checkpoint';
import Flashcard from './Flashcard';
import Blueprint from './Blueprint';
import Mermaid from './Mermaid';

// Import KaTeX stylesheet for mathematical equation rendering
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Define custom renderers for react-markdown AST nodes
  const customRenderers = {
    // Render custom HTML tags dynamically via rehype-raw
    checkpoint: (props: any) => <Checkpoint {...props} />,
    flashcard: (props: any) => <Flashcard {...props} />,
    blueprint: (props: any) => <Blueprint {...props} />,

    // Custom renderer for code blocks (supports Mermaid diagram rendering)
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeValue = String(children).replace(/\n$/, '');

      if (!inline && match && match[1] === 'mermaid') {
        return <Mermaid chart={codeValue} />;
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert text-slate-800 dark:text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={customRenderers as any}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
