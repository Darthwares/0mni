'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles,
  Wand2,
  FileText,
  ArrowRight,
  Loader2,
  Copy,
  Check,
  X,
  ChevronDown,
  Zap,
  Type,
  Minimize2,
  Maximize2,
  MessageSquare,
  Scissors,
  Plus,
  SpellCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import ShinyText from '@/components/reactbits/ShinyText'

type AIAction =
  | 'generate'
  | 'improve'
  | 'summarize'
  | 'continue'
  | 'fix-grammar'
  | 'make-shorter'
  | 'make-longer'
  | 'change-tone'

interface QuickAction {
  action: AIAction
  label: string
  icon: React.ReactNode
  description: string
  needsSelection?: boolean
  toneOption?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { action: 'improve', label: 'Improve writing', icon: <Wand2 className="size-3.5" />, description: 'Make it clearer and more polished', needsSelection: true },
  { action: 'fix-grammar', label: 'Fix grammar', icon: <SpellCheck className="size-3.5" />, description: 'Fix spelling & grammar errors', needsSelection: true },
  { action: 'make-shorter', label: 'Make shorter', icon: <Scissors className="size-3.5" />, description: 'Condense while keeping key points', needsSelection: true },
  { action: 'make-longer', label: 'Make longer', icon: <Plus className="size-3.5" />, description: 'Expand with more detail', needsSelection: true },
  { action: 'summarize', label: 'Summarize', icon: <FileText className="size-3.5" />, description: 'Extract key bullet points', needsSelection: true },
  { action: 'continue', label: 'Continue writing', icon: <ArrowRight className="size-3.5" />, description: 'Keep writing from where you left off', needsSelection: true },
  { action: 'change-tone', label: 'Professional tone', icon: <MessageSquare className="size-3.5" />, description: 'Rewrite in a professional tone', needsSelection: true, toneOption: 'professional' },
  { action: 'change-tone', label: 'Casual tone', icon: <MessageSquare className="size-3.5" />, description: 'Rewrite in a friendly, casual tone', needsSelection: true, toneOption: 'casual and friendly' },
]

interface AIWritingPanelProps {
  onInsert: (text: string) => void
  onReplace: (text: string) => void
  selectedText: string
  documentContext: string
  onClose: () => void
}

export function AIWritingPanel({
  onInsert,
  onReplace,
  selectedText,
  documentContext,
  onClose,
}: AIWritingPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showActions, setShowActions] = useState(true)
  const resultRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight
    }
  }, [result])

  const streamGenerate = useCallback(
    async (action: AIAction, toneOption?: string) => {
      setIsStreaming(true)
      setResult('')
      setShowActions(false)

      abortRef.current = new AbortController()

      try {
        const body: any = { action }
        if (action === 'generate') {
          body.prompt = prompt
          if (documentContext) body.context = documentContext.slice(0, 2000)
        } else if (action === 'change-tone') {
          body.context = selectedText || documentContext.slice(0, 4000)
          body.prompt = toneOption || 'professional'
        } else {
          body.context = selectedText || documentContext.slice(0, 4000)
        }

        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          setResult(`Error: ${errData.error || res.statusText}`)
          setIsStreaming(false)
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          setResult('Error: No response stream')
          setIsStreaming(false)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.error) {
                setResult((prev) => prev + `\n\nError: ${parsed.error}`)
              } else if (parsed.text) {
                setResult((prev) => prev + parsed.text)
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setResult((prev) => prev + `\n\nError: ${err.message}`)
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [prompt, selectedText, documentContext]
  )

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return
    streamGenerate('generate')
  }, [prompt, streamGenerate])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  const handleInsert = useCallback(() => {
    onInsert(result)
    setResult('')
    setPrompt('')
    setShowActions(true)
  }, [result, onInsert])

  const handleReplace = useCallback(() => {
    onReplace(result)
    setResult('')
    setPrompt('')
    setShowActions(true)
  }, [result, onReplace])

  const handleReset = useCallback(() => {
    setResult('')
    setPrompt('')
    setShowActions(true)
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
            <Sparkles className="size-4 text-violet-500" />
          </div>
          <ShinyText
            text="AI Writer"
            speed={4}
            color="#a78bfa"
            shineColor="#c084fc"
            className="text-sm font-semibold"
          />
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Selected text indicator */}
      {selectedText && (
        <div className="px-4 py-2 border-b bg-violet-500/5">
          <p className="text-[10px] font-medium text-violet-500 uppercase tracking-wider mb-1">
            Selected text
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">{selectedText}</p>
        </div>
      )}

      {/* Quick actions */}
      {showActions && (
        <div className="px-4 py-3 border-b space-y-1.5 overflow-y-auto max-h-60">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {selectedText ? 'Transform selection' : 'Quick actions'}
          </p>
          {QUICK_ACTIONS.filter(
            (a) => !a.needsSelection || selectedText || documentContext
          ).map((qa, i) => (
            <button
              key={`${qa.action}-${i}`}
              onClick={() => streamGenerate(qa.action, qa.toneOption)}
              disabled={isStreaming}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-muted/80 transition-colors group disabled:opacity-50"
            >
              <div className="p-1 rounded-md bg-muted group-hover:bg-violet-500/10 transition-colors">
                {qa.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{qa.label}</p>
                <p className="text-[10px] text-muted-foreground">{qa.description}</p>
              </div>
              <Zap className="size-3 text-muted-foreground/40 group-hover:text-violet-500 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Prompt input */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleGenerate()
              }
            }}
            placeholder="Ask AI to write anything..."
            className="w-full text-sm bg-muted/50 border border-border/50 rounded-lg px-3 py-2.5 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-muted-foreground/50"
            rows={2}
          />
          <button
            onClick={isStreaming ? handleStop : handleGenerate}
            disabled={!isStreaming && !prompt.trim()}
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-md bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-30 disabled:hover:bg-violet-500 transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ArrowRight className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {(result || isStreaming) && (
        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={resultRef}
            className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          >
            {result}
            {isStreaming && !result && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span className="text-xs">Generating...</span>
              </div>
            )}
            {isStreaming && result && (
              <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 rounded-sm" />
            )}
          </div>

          {/* Actions on result */}
          {!isStreaming && result && !result.startsWith('Error:') && (
            <div className="px-4 py-3 border-t flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-violet-500 hover:bg-violet-600"
                onClick={selectedText ? handleReplace : handleInsert}
              >
                <Type className="size-3" />
                {selectedText ? 'Replace selection' : 'Insert'}
              </Button>
              {selectedText && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleInsert}
                >
                  <Plus className="size-3" />
                  Insert below
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5 ml-auto"
                onClick={handleReset}
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
