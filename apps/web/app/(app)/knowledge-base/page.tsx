'use client'

import { useMemo, useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  BookOpen,
  Search,
  FileText,
  BookMarked,
  Compass,
  Shield,
  Wrench,
  FileCode,
  Calendar,
  ChevronRight,
  Bot,
  Eye,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- types ------------------------------------------------------------------

type DocTypeTag = 'Wiki' | 'Runbook' | 'OnboardingGuide' | 'PolicyDocument' | 'MeetingNotes' | 'TechnicalSpec' | 'Canvas' | 'Whiteboard' | 'Folder'

const CATEGORIES = ['All', 'Wiki', 'Runbook', 'OnboardingGuide', 'PolicyDocument', 'TechnicalSpec'] as const
type CategoryFilter = (typeof CATEGORIES)[number]

const docTypeConfig: Record<DocTypeTag, { icon: typeof FileText; label: string; cls: string; dot: string }> = {
  Wiki: { icon: BookOpen, label: 'Wiki', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  Runbook: { icon: Wrench, label: 'Runbook', cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
  OnboardingGuide: { icon: Compass, label: 'Onboarding', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  PolicyDocument: { icon: Shield, label: 'Policy', cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  MeetingNotes: { icon: Calendar, label: 'Meeting Notes', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  TechnicalSpec: { icon: FileCode, label: 'Tech Spec', cls: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', dot: 'bg-pink-500' },
  Canvas: { icon: FileText, label: 'Canvas', cls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', dot: 'bg-teal-500' },
  Whiteboard: { icon: FileText, label: 'Whiteboard', cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', dot: 'bg-sky-500' },
  Folder: { icon: FileText, label: 'Folder', cls: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20', dot: 'bg-neutral-400' },
}

function timeAgo(ts: any): string {
  try {
    const diff = Date.now() - ts.toDate().getTime()
    if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
    return ts.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function getPreview(content: string, maxLen = 150): string {
  // Strip markdown headers and formatting
  const stripped = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*] /gm, '')
    .trim()
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + '...' : stripped
}

// =============================================================================

export default function KnowledgeBasePage() {
  const [allDocuments] = useTable(tables.document)
  const [allEmployees] = useTable(tables.employee)

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All')
  const [selectedDocId, setSelectedDocId] = useState<bigint | null>(null)

  const employeeMap = useMemo(
    () => new Map(allEmployees.map((e) => [e.id.toHexString(), e])),
    [allEmployees]
  )

  // Knowledge base articles — all non-Folder, non-Canvas, non-Whiteboard documents
  const articles = useMemo(() => {
    const kbTypes: DocTypeTag[] = ['Wiki', 'Runbook', 'OnboardingGuide', 'PolicyDocument', 'MeetingNotes', 'TechnicalSpec']
    return [...allDocuments]
      .filter((d) => kbTypes.includes(d.docType.tag as DocTypeTag))
      .sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis()))
  }, [allDocuments])

  // Filtered
  const filtered = useMemo(() => {
    return articles.filter((d) => {
      const matchesCategory = categoryFilter === 'All' || d.docType.tag === categoryFilter
      const matchesSearch = !searchQuery ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [articles, categoryFilter, searchQuery])

  const selectedDoc = articles.find((d) => d.id === selectedDocId) ?? null

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    articles.forEach((d) => { counts[d.docType.tag] = (counts[d.docType.tag] || 0) + 1 })
    return counts
  }, [articles])

  // Stats
  const totalArticles = articles.length
  const aiGeneratedCount = articles.filter((d) => d.aiGenerated).length
  const uniqueAuthors = new Set(articles.map((d) => d.createdBy.toHexString())).size

  const getAuthorName = (id: { toHexString: () => string }) => {
    return employeeMap.get(id.toHexString())?.name ?? 'Unknown'
  }

  const getAuthorInitials = (id: { toHexString: () => string }) => {
    const name = getAuthorName(id)
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20">
              <BookOpen className="size-5 text-white" />
            </div>
            <div>
              <GradientText
                colors={['#14b8a6', '#06b6d4', '#0891b2', '#14b8a6']}
                animationSpeed={6}
                className="text-2xl font-bold"
              >
                Knowledge Base
              </GradientText>
              <p className="text-xs text-muted-foreground">Company wiki, runbooks, and documentation</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <SpotlightCard spotlightColor="rgba(20, 184, 166, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Articles</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={totalArticles} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <FileText className="size-4 text-teal-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">AI Generated</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={aiGeneratedCount} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Bot className="size-4 text-violet-500" />
              </div>
            </div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contributors</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  <CountUp to={uniqueAuthors} />
                </p>
              </div>
              <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="size-4 text-blue-500" />
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Search + category filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => {
              const cfg = c !== 'All' ? docTypeConfig[c] : null
              const count = c === 'All' ? totalArticles : (categoryCounts[c] ?? 0)
              return (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    categoryFilter === c
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cfg && <span className={`size-1.5 rounded-full ${cfg.dot}`} />}
                  {c === 'All' ? 'All' : cfg?.label ?? c}
                  {count > 0 && <span className="opacity-60 tabular-nums">{count}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content: Article list + reader */}
      <div className="flex-1 flex min-h-0">
        {/* Article list */}
        <div className={`${selectedDoc ? 'w-96' : 'flex-1'} border-r flex flex-col transition-all`}>
          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center mb-3">
                  <BookOpen className="size-7 opacity-40" />
                </div>
                <p className="text-sm font-medium">No articles found</p>
                <p className="text-xs mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className={selectedDoc ? 'divide-y' : 'p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}>
                {filtered.map((doc) => {
                  const cfg = docTypeConfig[doc.docType.tag as DocTypeTag]
                  const Icon = cfg?.icon ?? FileText
                  const isSelected = doc.id === selectedDocId

                  if (selectedDoc) {
                    // Compact list mode when reading
                    return (
                      <button
                        key={String(doc.id)}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                          isSelected ? 'bg-teal-500/5 border-l-2 border-teal-500' : 'border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`size-5 rounded flex items-center justify-center shrink-0 ${cfg?.cls ?? 'bg-muted'}`}>
                            <Icon className="size-3" />
                          </div>
                          <span className="text-sm font-medium truncate">{doc.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate pl-7">{getPreview(doc.content, 60)}</p>
                      </button>
                    )
                  }

                  // Card mode when browsing
                  return (
                    <button
                      key={String(doc.id)}
                      onClick={() => setSelectedDocId(doc.id)}
                      className="text-left"
                    >
                      <SpotlightCard
                        spotlightColor="rgba(20, 184, 166, 0.08)"
                        className="rounded-xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all h-full"
                      >
                        {/* Type + time */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg?.cls ?? ''}`}>
                            <Icon className="size-2.5" />
                            {cfg?.label ?? doc.docType.tag}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(doc.createdAt)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold mb-1 line-clamp-2">{doc.title}</h3>

                        {/* Preview */}
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                          {getPreview(doc.content)}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Avatar className="size-5">
                            <AvatarFallback className="text-[8px] bg-muted">
                              {getAuthorInitials(doc.createdBy)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {getAuthorName(doc.createdBy)}
                          </span>
                          {doc.aiGenerated && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 ml-auto">
                              <Bot className="size-2" />
                              AI
                            </span>
                          )}
                          {doc.editors.length > 1 && (
                            <span className="text-[10px] text-muted-foreground">{doc.editors.length} editors</span>
                          )}
                        </div>
                      </SpotlightCard>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Article reader */}
        {selectedDoc && (
          <div className="flex-1 flex flex-col">
            <div className="flex-shrink-0 border-b px-6 py-3 flex items-center gap-3">
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setSelectedDocId(null)}>
                <ArrowLeft className="size-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">{selectedDoc.title}</h2>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{getAuthorName(selectedDoc.createdBy)}</span>
                  <span>·</span>
                  <span>{timeAgo(selectedDoc.createdAt)}</span>
                  {selectedDoc.aiGenerated && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400">
                        <Bot className="size-2.5" /> AI Generated
                      </span>
                    </>
                  )}
                </div>
              </div>
              {(() => {
                const cfg = docTypeConfig[selectedDoc.docType.tag as DocTypeTag]
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg?.cls ?? ''}`}>
                    {cfg?.label ?? selectedDoc.docType.tag}
                  </span>
                )
              })()}
            </div>
            <ScrollArea className="flex-1 px-8 py-6">
              <div className="prose prose-sm dark:prose-invert max-w-3xl mx-auto">
                <div className="whitespace-pre-wrap">{selectedDoc.content}</div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
