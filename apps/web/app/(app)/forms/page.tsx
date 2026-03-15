'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Search,
  Plus,
  ClipboardList,
  BarChart3,
  Users,
  Percent,
  Star,
  Type,
  ListChecks,
  CheckSquare,
  ChevronDown,
  Calendar,
  Hash,
  GripVertical,
  Trash2,
  Eye,
  ArrowLeft,
  X,
  EyeOff,
  Copy,
  Send,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- Config maps ------------------------------------------------------------

type QuestionTypeKey = 'Text' | 'MultipleChoice' | 'Checkbox' | 'Rating' | 'Scale' | 'Dropdown' | 'Date'

const STATUS_CONFIG: Record<string, string> = {
  Draft: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Closed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

const QUESTION_TYPE_CONFIG: Record<QuestionTypeKey, { icon: typeof Type; label: string }> = {
  Text: { icon: Type, label: 'Text' },
  MultipleChoice: { icon: ListChecks, label: 'Multiple Choice' },
  Checkbox: { icon: CheckSquare, label: 'Checkbox' },
  Rating: { icon: Star, label: 'Rating' },
  Scale: { icon: Hash, label: 'Scale (1-10)' },
  Dropdown: { icon: ChevronDown, label: 'Dropdown' },
  Date: { icon: Calendar, label: 'Date' },
}

const FILTER_TABS = ['all', 'Draft', 'Active', 'Closed'] as const
type FilterTab = (typeof FILTER_TABS)[number]

type ViewMode = 'list' | 'builder' | 'preview'

function formatDate(ts: { seconds: number } | bigint | number | Date | undefined): string {
  if (!ts) return ''
  let ms: number
  if (typeof ts === 'bigint') ms = Number(ts / 1000n)
  else if (typeof ts === 'number') ms = ts
  else if (ts instanceof Date) ms = ts.getTime()
  else ms = ts.seconds * 1000
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// =============================================================================
// Page component
// =============================================================================

export default function FormsPage() {
  const { currentOrgId } = useOrg()
  const { identity } = useSpacetimeDB()

  // SpacetimeDB data
  const allFormDefs = useTable(tables.formDef) ?? []
  const allQuestions = useTable(tables.formQuestion) ?? []
  const allResponses = useTable(tables.formResponse) ?? []

  // Reducers
  const createForm = useReducer(reducers.createForm)
  const updateForm = useReducer(reducers.updateForm)
  const updateFormStatus = useReducer(reducers.updateFormStatus)
  const deleteForm = useReducer(reducers.deleteForm)
  const duplicateForm = useReducer(reducers.duplicateForm)
  const addFormQuestion = useReducer(reducers.addFormQuestion)
  const updateFormQuestion = useReducer(reducers.updateFormQuestion)
  const removeFormQuestion = useReducer(reducers.removeFormQuestion)
  const submitFormResponse = useReducer(reducers.submitFormResponse)

  // Org-scoped forms
  const forms = useMemo(() => {
    if (currentOrgId === null) return []
    return allFormDefs.filter(f => f.orgId === BigInt(currentOrgId))
  }, [allFormDefs, currentOrgId])

  // Questions grouped by form
  const questionsByForm = useMemo(() => {
    const map = new Map<bigint, typeof allQuestions>()
    for (const q of allQuestions) {
      const list = map.get(q.formId) ?? []
      list.push(q)
      map.set(q.formId, list)
    }
    // Sort by sortOrder within each form
    for (const [, list] of map) {
      list.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [allQuestions])

  // Response counts by form
  const responseCountByForm = useMemo(() => {
    const map = new Map<bigint, number>()
    for (const r of allResponses) {
      map.set(r.formId, (map.get(r.formId) ?? 0) + 1)
    }
    return map
  }, [allResponses])

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeFormId, setActiveFormId] = useState<bigint | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({})

  // Stats
  const totalForms = forms.length
  const activeForms = forms.filter(f => f.status.tag === 'Active').length
  const totalResponses = forms.reduce((sum, f) => sum + (responseCountByForm.get(f.id) ?? 0), 0)
  const avgResponseRate = activeForms > 0
    ? Math.round(
        (forms
          .filter(f => f.status.tag === 'Active')
          .reduce((s, f) => s + (responseCountByForm.get(f.id) ?? 0), 0) /
          activeForms /
          50) *
          100
      )
    : 0

  // Filtered list
  const filtered = useMemo(() => {
    return forms.filter(f => {
      const matchesTab = activeTab === 'all' || f.status.tag === activeTab
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [forms, activeTab, searchQuery])

  // Tab counts
  const tabCounts = useMemo(
    () => ({
      all: forms.filter(f => { const q = searchQuery.toLowerCase(); return !q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) }).length,
      Draft: forms.filter(f => { const q = searchQuery.toLowerCase(); return f.status.tag === 'Draft' && (!q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) }).length,
      Active: forms.filter(f => { const q = searchQuery.toLowerCase(); return f.status.tag === 'Active' && (!q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) }).length,
      Closed: forms.filter(f => { const q = searchQuery.toLowerCase(); return f.status.tag === 'Closed' && (!q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) }).length,
    }),
    [forms, searchQuery]
  )

  const activeForm = forms.find(f => f.id === activeFormId) ?? null
  const activeFormQuestions = activeFormId !== null ? (questionsByForm.get(activeFormId) ?? []) : []

  // ---- Actions ----------------------------------------------------------------

  const handleCreateForm = useCallback(() => {
    if (currentOrgId === null) return
    createForm({ orgId: BigInt(currentOrgId), title: 'Untitled Form', description: '', anonymous: false })
  }, [currentOrgId, createForm])

  const handleOpenForm = useCallback((id: bigint) => {
    setActiveFormId(id)
    setViewMode('builder')
  }, [])

  const handleBackToList = useCallback(() => {
    setActiveFormId(null)
    setViewMode('list')
    setPreviewAnswers({})
  }, [])

  const handleUpdateForm = useCallback(
    (title: string, description: string, anonymous: boolean) => {
      if (activeFormId === null) return
      updateForm({ formId: activeFormId, title, description, anonymous })
    },
    [activeFormId, updateForm]
  )

  const handleUpdateStatus = useCallback(
    (statusTag: string) => {
      if (activeFormId === null) return
      updateFormStatus({ formId: activeFormId, statusTag })
    },
    [activeFormId, updateFormStatus]
  )

  const handleAddQuestion = useCallback(
    (type: QuestionTypeKey) => {
      if (activeFormId === null) return
      const sortOrder = activeFormQuestions.length
      const defaultOptions = ['MultipleChoice', 'Checkbox', 'Dropdown'].includes(type) ? 'Option 1' : ''
      const defaultMaxRating = type === 'Rating' ? 5 : 0
      addFormQuestion({
        formId: activeFormId,
        questionTypeTag: type,
        label: '',
        required: false,
        options: defaultOptions,
        maxRating: defaultMaxRating,
        sortOrder,
      })
      setShowTypePicker(false)
    },
    [activeFormId, activeFormQuestions.length, addFormQuestion]
  )

  const handleUpdateQuestion = useCallback(
    (questionId: bigint, label: string, required: boolean, options: string, maxRating: number) => {
      updateFormQuestion({ questionId, label, required, options, maxRating })
    },
    [updateFormQuestion]
  )

  const handleRemoveQuestion = useCallback(
    (questionId: bigint) => {
      removeFormQuestion({ questionId })
    },
    [removeFormQuestion]
  )

  const handleDuplicateForm = useCallback(
    (id: bigint) => {
      duplicateForm({ formId: id })
    },
    [duplicateForm]
  )

  const handleDeleteForm = useCallback(
    (id: bigint) => {
      deleteForm({ formId: id })
      if (activeFormId === id) {
        setActiveFormId(null)
        setViewMode('list')
      }
    },
    [deleteForm, activeFormId]
  )

  const handleSubmitResponse = useCallback(() => {
    if (activeFormId === null) return
    // Build answers_json: "qid:value\nqid:value\n..."
    const lines: string[] = []
    for (const q of activeFormQuestions) {
      const val = previewAnswers[q.id.toString()]
      if (val !== undefined && val !== '' && val !== null) {
        const strVal = Array.isArray(val) ? val.join(',') : String(val)
        lines.push(`${q.id}:${strVal}`)
      }
    }
    submitFormResponse({ formId: activeFormId, answersJson: lines.join('\n') })
    setPreviewAnswers({})
  }, [activeFormId, activeFormQuestions, previewAnswers, submitFormResponse])

  // Auto-open newest form (when creating, the newest form appears and we open it)
  const newestForm = forms.length > 0 ? forms.reduce((a, b) => (a.id > b.id ? a : b)) : null

  // ---- Render: List View ------------------------------------------------------

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col h-full">
        {/* Sidebar header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <div className="flex items-center gap-2 flex-1">
            <ClipboardList className="size-4 text-pink-500" />
            <span className="text-sm font-medium">Forms & Surveys</span>
          </div>
          <PresenceBar />
        </header>

        <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 shadow-lg shadow-pink-500/20">
                <ClipboardList className="size-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  <GradientText colors={['#ec4899', '#f43f5e', '#ef4444']} animationSpeed={6}>
                    Forms & Surveys
                  </GradientText>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">Create and manage internal forms, surveys, and polls</p>
              </div>
            </div>
            <Button onClick={handleCreateForm}>
              <Plus className="size-4" />
              New Form
            </Button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SpotlightCard spotlightColor="rgba(236, 72, 153, 0.15)">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Total Forms</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-pink-500"><CountUp to={totalForms} /></span>
                <FileText className="size-5 text-pink-400/60 mb-1" />
              </div>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Active Forms</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-emerald-500"><CountUp to={activeForms} /></span>
                <BarChart3 className="size-5 text-emerald-400/60 mb-1" />
              </div>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.15)">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Total Responses</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-indigo-400"><CountUp to={totalResponses} /></span>
                <Users className="size-5 text-indigo-400/60 mb-1" />
              </div>
            </SpotlightCard>
            <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Avg Response Rate</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-amber-500"><CountUp to={avgResponseRate} />%</span>
                <Percent className="size-5 text-amber-400/60 mb-1" />
              </div>
            </SpotlightCard>
          </div>

          {/* Search + Filter tabs */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                  <span className="ml-1.5 text-xs opacity-60">{tabCounts[tab]}</span>
                </button>
              ))}
            </div>
            <div className="relative max-w-sm w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search forms..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Form cards */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="size-10 mb-3 opacity-30" />
              <p className="text-sm">{searchQuery ? 'No forms match your search.' : 'No forms yet. Create your first one!'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(form => {
                const responses = responseCountByForm.get(form.id) ?? 0
                const questions = questionsByForm.get(form.id) ?? []
                const maxResponses = Math.max(...forms.map(f => responseCountByForm.get(f.id) ?? 0), 1)
                const barWidth = (responses / maxResponses) * 100
                return (
                  <button
                    key={form.id.toString()}
                    onClick={() => handleOpenForm(form.id)}
                    className="text-left rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 transition-all hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1">{form.title}</h3>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${STATUS_CONFIG[form.status.tag] ?? ''}`}>
                        {form.status.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{form.description || 'No description'}</p>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{responses} responses</span>
                        <span className="text-muted-foreground">{questions.length} questions</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {form.anonymous && (
                          <span className="inline-flex items-center gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                            <EyeOff className="size-2.5" />
                            Anonymous
                          </span>
                        )}
                      </div>
                      <span>{formatDate(form.createdAt)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- Render: Builder / Preview Views ----------------------------------------

  if (!activeForm) return null

  const isPreview = viewMode === 'preview'

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <div className="flex items-center gap-2 flex-1">
          <ClipboardList className="size-4 text-pink-500" />
          <span className="text-sm font-medium">{isPreview ? 'Preview' : 'Form Builder'}</span>
        </div>
        <PresenceBar />
      </header>

      <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
        {/* Builder header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handleBackToList}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                {isPreview ? 'Preview' : 'Form Builder'}
              </h1>
              <p className="text-xs text-muted-foreground">Form #{activeForm.id.toString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDuplicateForm(activeForm.id)}>
              <Copy className="size-3.5" />
              Duplicate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteForm(activeForm.id)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button
              variant={isPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode(isPreview ? 'builder' : 'preview')
                setPreviewAnswers({})
              }}
            >
              {isPreview ? (
                <>
                  <ArrowLeft className="size-3.5" /> Edit
                </>
              ) : (
                <>
                  <Eye className="size-3.5" /> Preview
                </>
              )}
            </Button>
            {!isPreview && (
              <Select value={activeForm.status.tag} onValueChange={handleUpdateStatus}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* ---- Preview Mode ---- */}
        {isPreview ? (
          <div className="max-w-2xl mx-auto w-full">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                {activeForm.title || 'Untitled Form'}
              </h2>
              {activeForm.description && (
                <p className="text-sm text-muted-foreground mb-6">{activeForm.description}</p>
              )}
              {activeForm.anonymous && (
                <div className="flex items-center gap-2 mb-6 text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                  <EyeOff className="size-3.5" />
                  Responses are anonymous
                </div>
              )}

              {activeFormQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No questions added yet. Switch to edit mode to add questions.
                </p>
              ) : (
                <div className="flex flex-col gap-5">
                  {activeFormQuestions.map((q, idx) => {
                    const qType = q.questionType.tag as QuestionTypeKey
                    const opts = q.options ? q.options.split(',').filter(Boolean) : []
                    return (
                      <div key={q.id.toString()} className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {idx + 1}. {q.label || 'Untitled question'}
                          {q.required && <span className="text-red-500 ml-1">*</span>}
                        </label>

                        {qType === 'Text' && (
                          <Textarea
                            placeholder="Your answer..."
                            value={(previewAnswers[q.id.toString()] as string) ?? ''}
                            onChange={e =>
                              setPreviewAnswers(p => ({ ...p, [q.id.toString()]: e.target.value }))
                            }
                            className="resize-none"
                          />
                        )}

                        {qType === 'MultipleChoice' && opts.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {opts.map((opt, i) => (
                              <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                                <div
                                  className={`size-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    previewAnswers[q.id.toString()] === opt
                                      ? 'border-pink-500 bg-pink-500'
                                      : 'border-neutral-300 dark:border-neutral-600 group-hover:border-neutral-400'
                                  }`}
                                >
                                  {previewAnswers[q.id.toString()] === opt && (
                                    <div className="size-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">{opt}</span>
                                <input
                                  type="radio"
                                  name={q.id.toString()}
                                  className="sr-only"
                                  onChange={() =>
                                    setPreviewAnswers(p => ({ ...p, [q.id.toString()]: opt }))
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        )}

                        {qType === 'Checkbox' && opts.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {opts.map((opt, i) => {
                              const selected = (
                                (previewAnswers[q.id.toString()] as string[]) ?? []
                              ).includes(opt)
                              return (
                                <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                                  <div
                                    className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                                      selected
                                        ? 'border-pink-500 bg-pink-500'
                                        : 'border-neutral-300 dark:border-neutral-600 group-hover:border-neutral-400'
                                    }`}
                                  >
                                    {selected && (
                                      <svg
                                        className="size-2.5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{opt}</span>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={selected}
                                    onChange={() => {
                                      const current = (previewAnswers[q.id.toString()] as string[]) ?? []
                                      setPreviewAnswers(p => ({
                                        ...p,
                                        [q.id.toString()]: selected
                                          ? current.filter(v => v !== opt)
                                          : [...current, opt],
                                      }))
                                    }}
                                  />
                                </label>
                              )
                            })}
                          </div>
                        )}

                        {qType === 'Rating' && (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: q.maxRating || 5 }, (_, i) => i + 1).map(star => (
                              <button
                                key={star}
                                onClick={() =>
                                  setPreviewAnswers(p => ({ ...p, [q.id.toString()]: star }))
                                }
                                className="transition-colors"
                              >
                                <Star
                                  className={`size-7 ${
                                    (previewAnswers[q.id.toString()] as number) >= star
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-neutral-300 dark:text-neutral-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        )}

                        {qType === 'Scale' && (
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                              <button
                                key={n}
                                onClick={() =>
                                  setPreviewAnswers(p => ({ ...p, [q.id.toString()]: n }))
                                }
                                className={`size-9 rounded-lg text-sm font-medium border transition-all ${
                                  (previewAnswers[q.id.toString()] as number) === n
                                    ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-pink-300 dark:hover:border-pink-700'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        )}

                        {qType === 'Dropdown' && opts.length > 0 && (
                          <Select
                            value={(previewAnswers[q.id.toString()] as string) ?? ''}
                            onValueChange={v =>
                              setPreviewAnswers(p => ({ ...p, [q.id.toString()]: v }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option..." />
                            </SelectTrigger>
                            <SelectContent>
                              {opts.map((opt, i) => (
                                <SelectItem key={i} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {qType === 'Date' && (
                          <Input
                            type="date"
                            value={(previewAnswers[q.id.toString()] as string) ?? ''}
                            onChange={e =>
                              setPreviewAnswers(p => ({ ...p, [q.id.toString()]: e.target.value }))
                            }
                            className="w-48"
                          />
                        )}
                      </div>
                    )
                  })}

                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <Button
                      onClick={handleSubmitResponse}
                      className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                    >
                      <Send className="size-4" />
                      Submit Response
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ---- Builder Mode ---- */
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-5">
            {/* Form title & description */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <Input
                placeholder="Form title"
                value={activeForm.title}
                onChange={e => handleUpdateForm(e.target.value, activeForm.description, activeForm.anonymous)}
                className="text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
              />
              <Textarea
                placeholder="Form description (optional)"
                value={activeForm.description}
                onChange={e => handleUpdateForm(activeForm.title, e.target.value, activeForm.anonymous)}
                className="mt-2 border-none shadow-none px-0 focus-visible:ring-0 resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-sm"
              />
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={activeForm.anonymous}
                    onCheckedChange={checked =>
                      handleUpdateForm(activeForm.title, activeForm.description, checked as boolean)
                    }
                    size="sm"
                  />
                  <Label className="text-xs text-muted-foreground cursor-pointer">Anonymous responses</Label>
                </div>
              </div>
            </div>

            {/* Questions */}
            {activeFormQuestions.map((q, idx) => {
              const qType = q.questionType.tag as QuestionTypeKey
              const TypeIcon = QUESTION_TYPE_CONFIG[qType]?.icon ?? Type
              const typeLabel = QUESTION_TYPE_CONFIG[qType]?.label ?? qType
              const opts = q.options ? q.options.split(',').filter(Boolean) : []

              return (
                <div
                  key={q.id.toString()}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-2.5 text-neutral-300 dark:text-neutral-600 cursor-grab">
                      <GripVertical className="size-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5">
                            <TypeIcon className="size-3" />
                            {typeLabel}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={q.required}
                              onCheckedChange={checked =>
                                handleUpdateQuestion(q.id, q.label, checked as boolean, q.options, q.maxRating)
                              }
                              size="sm"
                            />
                            <span className="text-[10px] text-muted-foreground">Required</span>
                          </div>
                          <button
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <Input
                        placeholder="Question label..."
                        value={q.label}
                        onChange={e =>
                          handleUpdateQuestion(q.id, e.target.value, q.required, q.options, q.maxRating)
                        }
                        className="mb-3 font-medium"
                      />

                      {/* Options for multipleChoice, checkbox, dropdown */}
                      {['MultipleChoice', 'Checkbox', 'Dropdown'].includes(qType) && (
                        <div className="flex flex-col gap-2 mb-2">
                          {opts.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="size-4 shrink-0 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                              <Input
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...opts]
                                  newOpts[i] = e.target.value
                                  handleUpdateQuestion(q.id, q.label, q.required, newOpts.join(','), q.maxRating)
                                }}
                                className="flex-1 h-8 text-sm"
                                placeholder={`Option ${i + 1}`}
                              />
                              {opts.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newOpts = opts.filter((_, j) => j !== i)
                                    handleUpdateQuestion(q.id, q.label, q.required, newOpts.join(','), q.maxRating)
                                  }}
                                  className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newOpts = [...opts, `Option ${opts.length + 1}`]
                              handleUpdateQuestion(q.id, q.label, q.required, newOpts.join(','), q.maxRating)
                            }}
                            className="flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 mt-1"
                          >
                            <Plus className="size-3" />
                            Add option
                          </button>
                        </div>
                      )}

                      {/* Rating star count selector */}
                      {qType === 'Rating' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-xs text-muted-foreground">Max stars:</Label>
                          <Select
                            value={String(q.maxRating || 5)}
                            onValueChange={v =>
                              handleUpdateQuestion(q.id, q.label, q.required, q.options, parseInt(v))
                            }
                          >
                            <SelectTrigger className="w-20 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[3, 4, 5, 7, 10].map(n => (
                                <SelectItem key={n} value={String(n)}>
                                  {n} stars
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-0.5 ml-2">
                            {Array.from({ length: q.maxRating || 5 }, (_, i) => (
                              <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                      )}

                      {qType === 'Scale' && (
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div
                              key={i}
                              className="size-6 rounded border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-[10px] text-muted-foreground"
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      )}

                      {qType === 'Date' && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="size-3.5" />
                          Date picker will appear in preview
                        </div>
                      )}

                      {qType === 'Text' && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Text area will appear in preview
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add Question */}
            <div className="relative">
              <button
                onClick={() => setShowTypePicker(!showTypePicker)}
                className="w-full rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 py-4 text-sm font-medium text-muted-foreground hover:border-pink-300 dark:hover:border-pink-800 hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="size-4" />
                Add Question
              </button>

              {showTypePicker && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl z-10 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Choose question type</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(Object.entries(QUESTION_TYPE_CONFIG) as [QuestionTypeKey, { icon: typeof Type; label: string }][]).map(
                      ([type, config]) => {
                        const Icon = config.icon
                        return (
                          <button
                            key={type}
                            onClick={() => handleAddQuestion(type)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-pink-950/30 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                          >
                            <Icon className="size-4 shrink-0" />
                            {config.label}
                          </button>
                        )
                      }
                    )}
                  </div>
                  <button
                    onClick={() => setShowTypePicker(false)}
                    className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Quick stats */}
            {activeFormQuestions.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  {activeFormQuestions.length} question{activeFormQuestions.length !== 1 ? 's' : ''}
                </span>
                <span>{activeFormQuestions.filter(q => q.required).length} required</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
