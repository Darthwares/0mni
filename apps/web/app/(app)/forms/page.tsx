'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ---- Types ------------------------------------------------------------------

type QuestionType = 'text' | 'multipleChoice' | 'checkbox' | 'rating' | 'scale' | 'dropdown' | 'date'
type Question = {
  id: string
  type: QuestionType
  label: string
  required: boolean
  options?: string[]
  maxRating?: number
}
type FormStatus = 'draft' | 'active' | 'closed'
type Form = {
  id: string
  title: string
  description: string
  status: FormStatus
  questions: Question[]
  responses: number
  createdAt: Date
  createdBy: string
  deadline?: Date
  anonymous: boolean
}

// ---- Config maps ------------------------------------------------------------

const STATUS_CONFIG: Record<FormStatus, string> = {
  draft: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  closed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

const QUESTION_TYPE_CONFIG: Record<QuestionType, { icon: typeof Type; label: string }> = {
  text: { icon: Type, label: 'Text' },
  multipleChoice: { icon: ListChecks, label: 'Multiple Choice' },
  checkbox: { icon: CheckSquare, label: 'Checkbox' },
  rating: { icon: Star, label: 'Rating' },
  scale: { icon: Hash, label: 'Scale (1-10)' },
  dropdown: { icon: ChevronDown, label: 'Dropdown' },
  date: { icon: Calendar, label: 'Date' },
}

// ---- Helpers ----------------------------------------------------------------

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---- Sample data ------------------------------------------------------------

const now = Date.now()
const d = (days: number) => new Date(now - days * 86_400_000)

const SAMPLE_FORMS: Form[] = [
  {
    id: 'FORM-001',
    title: 'Employee Satisfaction Survey',
    description: 'Annual survey to measure employee satisfaction, engagement, and areas for improvement across departments.',
    status: 'active',
    questions: [
      { id: 'q1', type: 'rating', label: 'How satisfied are you with your role?', required: true, maxRating: 5 },
      { id: 'q2', type: 'multipleChoice', label: 'Which department do you belong to?', required: true, options: ['Engineering', 'Design', 'Marketing', 'Sales', 'Operations'] },
      { id: 'q3', type: 'scale', label: 'How likely are you to recommend this company to a friend?', required: true },
      { id: 'q4', type: 'checkbox', label: 'What benefits matter most to you?', required: false, options: ['Health Insurance', 'Remote Work', 'Learning Budget', 'Stock Options', 'Flexible Hours'] },
      { id: 'q5', type: 'text', label: 'Any additional comments or suggestions?', required: false },
    ],
    responses: 47,
    createdAt: d(14),
    createdBy: 'HR Team',
    deadline: new Date(now + 7 * 86_400_000),
    anonymous: true,
  },
  {
    id: 'FORM-002',
    title: 'Onboarding Feedback',
    description: 'Collect feedback from new hires about their onboarding experience within the first 30 days.',
    status: 'active',
    questions: [
      { id: 'q1', type: 'rating', label: 'How would you rate the onboarding process?', required: true, maxRating: 5 },
      { id: 'q2', type: 'text', label: 'What was the most helpful part of onboarding?', required: true },
      { id: 'q3', type: 'text', label: 'What could be improved?', required: true },
      { id: 'q4', type: 'multipleChoice', label: 'Did you receive all necessary equipment on time?', required: true, options: ['Yes', 'No', 'Partially'] },
      { id: 'q5', type: 'scale', label: 'How confident do you feel in your role now?', required: true },
      { id: 'q6', type: 'dropdown', label: 'Who was your onboarding buddy?', required: false, options: ['Sarah Chen', 'David Park', 'Mike Torres', 'Emily Zhang', 'Other'] },
    ],
    responses: 12,
    createdAt: d(30),
    createdBy: 'People Ops',
    anonymous: false,
  },
  {
    id: 'FORM-003',
    title: 'Sprint Retrospective',
    description: 'Bi-weekly sprint retro to capture what went well, what didn\'t, and action items for the next sprint.',
    status: 'closed',
    questions: [
      { id: 'q1', type: 'text', label: 'What went well this sprint?', required: true },
      { id: 'q2', type: 'text', label: 'What didn\'t go well?', required: true },
      { id: 'q3', type: 'text', label: 'What should we start doing?', required: false },
      { id: 'q4', type: 'rating', label: 'Rate the overall sprint execution', required: true, maxRating: 5 },
    ],
    responses: 8,
    createdAt: d(7),
    createdBy: 'Engineering',
    anonymous: false,
  },
  {
    id: 'FORM-004',
    title: 'Company Event Registration',
    description: 'Register for the upcoming annual team offsite event. Please confirm your attendance and dietary preferences.',
    status: 'active',
    questions: [
      { id: 'q1', type: 'multipleChoice', label: 'Will you attend the offsite?', required: true, options: ['Yes', 'No', 'Maybe'] },
      { id: 'q2', type: 'dropdown', label: 'Dietary preference', required: true, options: ['No restrictions', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher'] },
      { id: 'q3', type: 'checkbox', label: 'Which activities interest you?', required: false, options: ['Team Building', 'Workshops', 'Hackathon', 'Outdoor Activities', 'Networking Dinner'] },
      { id: 'q4', type: 'date', label: 'Preferred arrival date', required: true },
      { id: 'q5', type: 'text', label: 'Any special requirements?', required: false },
    ],
    responses: 34,
    createdAt: d(5),
    createdBy: 'Office Manager',
    deadline: new Date(now + 3 * 86_400_000),
    anonymous: false,
  },
  {
    id: 'FORM-005',
    title: 'Feature Request Collection',
    description: 'Submit and prioritize feature requests for the next product roadmap planning cycle.',
    status: 'draft',
    questions: [
      { id: 'q1', type: 'text', label: 'Feature title', required: true },
      { id: 'q2', type: 'text', label: 'Describe the feature and its value', required: true },
      { id: 'q3', type: 'multipleChoice', label: 'Priority level', required: true, options: ['Critical', 'High', 'Medium', 'Low', 'Nice-to-have'] },
      { id: 'q4', type: 'scale', label: 'How much would this feature impact your workflow?', required: true },
      { id: 'q5', type: 'dropdown', label: 'Target product area', required: true, options: ['Dashboard', 'Messaging', 'Calendar', 'Analytics', 'Integrations', 'Other'] },
    ],
    responses: 0,
    createdAt: d(1),
    createdBy: 'Product Team',
    anonymous: false,
  },
]

// ---- Filter tabs ------------------------------------------------------------

const FILTER_TABS = ['all', 'draft', 'active', 'closed'] as const
type FilterTab = (typeof FILTER_TABS)[number]

// ---- Views ------------------------------------------------------------------

type ViewMode = 'list' | 'builder' | 'preview'

// =============================================================================
// Page component
// =============================================================================

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>(SAMPLE_FORMS)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeFormId, setActiveFormId] = useState<string | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({})

  // Stats
  const totalForms = forms.length
  const activeForms = forms.filter((f) => f.status === 'active').length
  const totalResponses = forms.reduce((sum, f) => sum + f.responses, 0)
  const avgResponseRate = activeForms > 0 ? Math.round((forms.filter((f) => f.status === 'active').reduce((s, f) => s + f.responses, 0) / activeForms / 50) * 100) : 0

  // Filtered list
  const filtered = useMemo(() => {
    return forms.filter((f) => {
      const matchesTab = activeTab === 'all' || f.status === activeTab
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.createdBy.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [forms, activeTab, searchQuery])

  // Tab counts
  const tabCounts: Record<FilterTab, number> = useMemo(() => ({
    all: forms.filter((f) => { const q = searchQuery.toLowerCase(); return !q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) }).length,
    draft: forms.filter((f) => { const q = searchQuery.toLowerCase(); return f.status === 'draft' && (!q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) }).length,
    active: forms.filter((f) => { const q = searchQuery.toLowerCase(); return f.status === 'active' && (!q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) }).length,
    closed: forms.filter((f) => { const q = searchQuery.toLowerCase(); return f.status === 'closed' && (!q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) }).length,
  }), [forms, searchQuery])

  const activeForm = forms.find((f) => f.id === activeFormId) ?? null

  // ---- Actions --------------------------------------------------------------

  function handleCreateForm() {
    const id = `FORM-${String(forms.length + 1).padStart(3, '0')}`
    const newForm: Form = {
      id,
      title: 'Untitled Form',
      description: '',
      status: 'draft',
      questions: [],
      responses: 0,
      createdAt: new Date(),
      createdBy: 'You',
      anonymous: false,
    }
    setForms((prev) => [newForm, ...prev])
    setActiveFormId(id)
    setViewMode('builder')
  }

  function handleOpenForm(id: string) {
    setActiveFormId(id)
    setViewMode('builder')
  }

  function handleBackToList() {
    setActiveFormId(null)
    setViewMode('list')
    setPreviewAnswers({})
  }

  function updateForm(updates: Partial<Form>) {
    if (!activeFormId) return
    setForms((prev) => prev.map((f) => f.id === activeFormId ? { ...f, ...updates } : f))
  }

  function addQuestion(type: QuestionType) {
    if (!activeForm) return
    const newQ: Question = {
      id: generateId(),
      type,
      label: '',
      required: false,
      ...(type === 'multipleChoice' || type === 'checkbox' || type === 'dropdown' ? { options: ['Option 1'] } : {}),
      ...(type === 'rating' ? { maxRating: 5 } : {}),
    }
    updateForm({ questions: [...activeForm.questions, newQ] })
    setShowTypePicker(false)
  }

  function updateQuestion(qId: string, updates: Partial<Question>) {
    if (!activeForm) return
    updateForm({
      questions: activeForm.questions.map((q) => q.id === qId ? { ...q, ...updates } : q),
    })
  }

  function removeQuestion(qId: string) {
    if (!activeForm) return
    updateForm({ questions: activeForm.questions.filter((q) => q.id !== qId) })
  }

  function addOption(qId: string) {
    if (!activeForm) return
    const q = activeForm.questions.find((q) => q.id === qId)
    if (!q || !q.options) return
    updateQuestion(qId, { options: [...q.options, `Option ${q.options.length + 1}`] })
  }

  function updateOption(qId: string, index: number, value: string) {
    if (!activeForm) return
    const q = activeForm.questions.find((q) => q.id === qId)
    if (!q || !q.options) return
    const newOpts = [...q.options]
    newOpts[index] = value
    updateQuestion(qId, { options: newOpts })
  }

  function removeOption(qId: string, index: number) {
    if (!activeForm) return
    const q = activeForm.questions.find((q) => q.id === qId)
    if (!q || !q.options || q.options.length <= 1) return
    updateQuestion(qId, { options: q.options.filter((_, i) => i !== index) })
  }

  function duplicateForm(id: string) {
    const original = forms.find((f) => f.id === id)
    if (!original) return
    const newId = `FORM-${String(forms.length + 1).padStart(3, '0')}`
    const copy: Form = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      status: 'draft',
      responses: 0,
      createdAt: new Date(),
      createdBy: 'You',
    }
    setForms((prev) => [copy, ...prev])
  }

  // ---- Render: List View ----------------------------------------------------

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-6 p-6">
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
              <p className="text-sm text-muted-foreground mt-0.5">
                Create and manage internal forms, surveys, and polls
              </p>
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
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="ml-1.5 text-xs opacity-60">{tabCounts[tab]}</span>
              </button>
            ))}
          </div>
          <div className="relative max-w-sm w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search forms..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
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
            {filtered.map((form) => {
              const maxResponses = Math.max(...forms.map((f) => f.responses), 1)
              const barWidth = (form.responses / maxResponses) * 100
              return (
                <button
                  key={form.id}
                  onClick={() => handleOpenForm(form.id)}
                  className="text-left rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 transition-all hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5"
                >
                  {/* Top: title + status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1">{form.title}</h3>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${STATUS_CONFIG[form.status]}`}>
                      {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{form.description || 'No description'}</p>

                  {/* Response bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{form.responses} responses</span>
                      <span className="text-muted-foreground">{form.questions.length} questions</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom: meta */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{form.createdBy}</span>
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
    )
  }

  // ---- Render: Builder / Preview Views --------------------------------------

  if (!activeForm) return null

  const isPreview = viewMode === 'preview'

  return (
    <div className="flex flex-col gap-6 p-6">
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
            <p className="text-xs text-muted-foreground">{activeForm.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateForm(activeForm.id)}
          >
            <Copy className="size-3.5" />
            Duplicate
          </Button>
          <Button
            variant={isPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode(isPreview ? 'builder' : 'preview')
              setPreviewAnswers({})
            }}
          >
            {isPreview ? <><ArrowLeft className="size-3.5" /> Edit</> : <><Eye className="size-3.5" /> Preview</>}
          </Button>
          {!isPreview && (
            <Select
              value={activeForm.status}
              onValueChange={(v) => updateForm({ status: v as FormStatus })}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ---- Preview Mode ---- */}
      {isPreview ? (
        <div className="max-w-2xl mx-auto w-full">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{activeForm.title || 'Untitled Form'}</h2>
            {activeForm.description && (
              <p className="text-sm text-muted-foreground mb-6">{activeForm.description}</p>
            )}
            {activeForm.anonymous && (
              <div className="flex items-center gap-2 mb-6 text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                <EyeOff className="size-3.5" />
                Responses are anonymous
              </div>
            )}

            {activeForm.questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No questions added yet. Switch to edit mode to add questions.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {activeForm.questions.map((q, idx) => (
                  <div key={q.id} className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {idx + 1}. {q.label || 'Untitled question'}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {/* Text */}
                    {q.type === 'text' && (
                      <Textarea
                        placeholder="Your answer..."
                        value={(previewAnswers[q.id] as string) ?? ''}
                        onChange={(e) => setPreviewAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        className="resize-none"
                      />
                    )}

                    {/* Multiple Choice */}
                    {q.type === 'multipleChoice' && q.options && (
                      <div className="flex flex-col gap-2">
                        {q.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                            <div className={`size-4 rounded-full border-2 flex items-center justify-center transition-colors ${previewAnswers[q.id] === opt ? 'border-pink-500 bg-pink-500' : 'border-neutral-300 dark:border-neutral-600 group-hover:border-neutral-400'}`}>
                              {previewAnswers[q.id] === opt && <div className="size-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">{opt}</span>
                            <input type="radio" name={q.id} className="sr-only" onChange={() => setPreviewAnswers((p) => ({ ...p, [q.id]: opt }))} />
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Checkbox */}
                    {q.type === 'checkbox' && q.options && (
                      <div className="flex flex-col gap-2">
                        {q.options.map((opt, i) => {
                          const selected = ((previewAnswers[q.id] as string[]) ?? []).includes(opt)
                          return (
                            <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                              <div className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${selected ? 'border-pink-500 bg-pink-500' : 'border-neutral-300 dark:border-neutral-600 group-hover:border-neutral-400'}`}>
                                {selected && <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">{opt}</span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={selected}
                                onChange={() => {
                                  const current = (previewAnswers[q.id] as string[]) ?? []
                                  setPreviewAnswers((p) => ({
                                    ...p,
                                    [q.id]: selected ? current.filter((v) => v !== opt) : [...current, opt],
                                  }))
                                }}
                              />
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {/* Rating */}
                    {q.type === 'rating' && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: q.maxRating ?? 5 }, (_, i) => i + 1).map((star) => (
                          <button
                            key={star}
                            onClick={() => setPreviewAnswers((p) => ({ ...p, [q.id]: star }))}
                            className="transition-colors"
                          >
                            <Star
                              className={`size-7 ${(previewAnswers[q.id] as number) >= star ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Scale */}
                    {q.type === 'scale' && (
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            onClick={() => setPreviewAnswers((p) => ({ ...p, [q.id]: n }))}
                            className={`size-9 rounded-lg text-sm font-medium border transition-all ${
                              (previewAnswers[q.id] as number) === n
                                ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-pink-300 dark:hover:border-pink-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Dropdown */}
                    {q.type === 'dropdown' && q.options && (
                      <Select
                        value={(previewAnswers[q.id] as string) ?? ''}
                        onValueChange={(v) => setPreviewAnswers((p) => ({ ...p, [q.id]: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {q.options.map((opt, i) => (
                            <SelectItem key={i} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Date */}
                    {q.type === 'date' && (
                      <Input
                        type="date"
                        value={(previewAnswers[q.id] as string) ?? ''}
                        onChange={(e) => setPreviewAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        className="w-48"
                      />
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
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
              onChange={(e) => updateForm({ title: e.target.value })}
              className="text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
            />
            <Textarea
              placeholder="Form description (optional)"
              value={activeForm.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              className="mt-2 border-none shadow-none px-0 focus-visible:ring-0 resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-sm"
            />
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Switch
                  checked={activeForm.anonymous}
                  onCheckedChange={(checked) => updateForm({ anonymous: checked as boolean })}
                  size="sm"
                />
                <Label className="text-xs text-muted-foreground cursor-pointer">Anonymous responses</Label>
              </div>
            </div>
          </div>

          {/* Questions */}
          {activeForm.questions.map((q, idx) => {
            const TypeIcon = QUESTION_TYPE_CONFIG[q.type].icon
            return (
              <div key={q.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 group">
                <div className="flex items-start gap-3">
                  {/* Drag handle (visual only) */}
                  <div className="mt-2.5 text-neutral-300 dark:text-neutral-600 cursor-grab">
                    <GripVertical className="size-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Type badge + required toggle + delete */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5">
                          <TypeIcon className="size-3" />
                          {QUESTION_TYPE_CONFIG[q.type].label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={q.required}
                            onCheckedChange={(checked) => updateQuestion(q.id, { required: checked as boolean })}
                            size="sm"
                          />
                          <span className="text-[10px] text-muted-foreground">Required</span>
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question label */}
                    <Input
                      placeholder="Question label..."
                      value={q.label}
                      onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                      className="mb-3 font-medium"
                    />

                    {/* Options for multipleChoice, checkbox, dropdown */}
                    {(q.type === 'multipleChoice' || q.type === 'checkbox' || q.type === 'dropdown') && q.options && (
                      <div className="flex flex-col gap-2 mb-2">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="size-4 shrink-0 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(q.id, i, e.target.value)}
                              className="flex-1 h-8 text-sm"
                              placeholder={`Option ${i + 1}`}
                            />
                            {q.options!.length > 1 && (
                              <button
                                onClick={() => removeOption(q.id, i)}
                                className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(q.id)}
                          className="flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 mt-1"
                        >
                          <Plus className="size-3" />
                          Add option
                        </button>
                      </div>
                    )}

                    {/* Rating star count selector */}
                    {q.type === 'rating' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-xs text-muted-foreground">Max stars:</Label>
                        <Select
                          value={String(q.maxRating ?? 5)}
                          onValueChange={(v) => updateQuestion(q.id, { maxRating: parseInt(v) })}
                        >
                          <SelectTrigger className="w-20 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[3, 4, 5, 7, 10].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-0.5 ml-2">
                          {Array.from({ length: q.maxRating ?? 5 }, (_, i) => (
                            <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scale preview */}
                    {q.type === 'scale' && (
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i} className="size-6 rounded border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-[10px] text-muted-foreground">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Date preview */}
                    {q.type === 'date' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Calendar className="size-3.5" />
                        Date picker will appear in preview
                      </div>
                    )}

                    {/* Text preview */}
                    {q.type === 'text' && (
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
                  {(Object.entries(QUESTION_TYPE_CONFIG) as [QuestionType, { icon: typeof Type; label: string }][]).map(([type, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={type}
                        onClick={() => addQuestion(type)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-pink-50 dark:hover:bg-pink-950/30 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                      >
                        <Icon className="size-4 shrink-0" />
                        {config.label}
                      </button>
                    )
                  })}
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
          {activeForm.questions.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{activeForm.questions.length} question{activeForm.questions.length !== 1 ? 's' : ''}</span>
              <span>{activeForm.questions.filter((q) => q.required).length} required</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
