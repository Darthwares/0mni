'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  className?: string
  multiline?: boolean
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function nameToColor(name: string) {
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function MentionInput({ value, onChange, onSubmit, placeholder, className, multiline = false }: MentionInputProps) {
  const [employees] = useTable(tables.employee)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (!mentionQuery) return employees.slice(0, 6)
    const q = mentionQuery.toLowerCase()
    return employees
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [employees, mentionQuery])

  const detectMention = useCallback((text: string, cursor: number) => {
    // Find the @ symbol before cursor
    const beforeCursor = text.slice(0, cursor)
    const match = beforeCursor.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setShowSuggestions(true)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
    }
  }, [])

  const insertMention = useCallback((name: string) => {
    const beforeCursor = value.slice(0, cursorPos)
    const afterCursor = value.slice(cursorPos)
    const mentionStart = beforeCursor.lastIndexOf('@')
    const newValue = beforeCursor.slice(0, mentionStart) + `@${name} ` + afterCursor
    onChange(newValue)
    setShowSuggestions(false)
    // Focus back
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [value, cursorPos, onChange])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value
    const cursor = e.target.selectionStart || 0
    setCursorPos(cursor)
    onChange(newValue)
    detectMention(newValue, cursor)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter' && !e.shiftKey && !multiline) {
        e.preventDefault()
        onSubmit?.()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          insertMention(suggestions[selectedIndex].name)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const handleClick = () => {
    const cursor = (inputRef.current as any)?.selectionStart || 0
    setCursorPos(cursor)
    detectMention(value, cursor)
  }

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const InputComponent = multiline ? 'textarea' : 'input'

  return (
    <div className="relative">
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        placeholder={placeholder}
        className={cn(
          'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          multiline && 'min-h-[80px] resize-none',
          className
        )}
        rows={multiline ? 3 : undefined}
      />

      {/* Mention suggestions popup */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border bg-popover p-1 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {suggestions.map((emp, i) => (
            <button
              key={emp.id.toHexString()}
              onClick={() => insertMention(emp.name)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              )}
            >
              <Avatar className="size-5">
                <AvatarFallback className={`${nameToColor(emp.name)} text-[8px] text-white`}>
                  {getInitials(emp.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{emp.name}</span>
              {emp.employeeType?.tag === 'Ai' && (
                <span className="ml-auto text-[10px] text-violet-400">AI</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper to render text with highlighted @mentions
export function RenderMentions({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(@\w+(?:\s\w+)?)/g)

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-violet-400 font-medium cursor-pointer hover:underline">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}
