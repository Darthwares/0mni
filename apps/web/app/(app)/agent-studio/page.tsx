'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Plus,
  Bot,
  Brain,
  Zap,
  Code2,
  Headphones,
  TrendingUp,
  Users,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  ChevronRight,
} from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

// ─── Templates ─────────────────────────────────────────────────────────────

const agentTemplates = [
  {
    name: 'Support Agent',
    description: 'Handles customer tickets, auto-resolves common issues, escalates complex ones',
    icon: Headphones,
    department: 'Support',
    capabilities: ['customer_support', 'ticket_resolution', 'sentiment_analysis'],
    model: 'claude-opus-4.6',
    threshold: 0.85,
    systemPrompt: 'You are a customer support agent. Resolve tickets efficiently, use a warm and professional tone. Escalate to humans when confidence is low or the customer is upset.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Sales Assistant',
    description: 'Qualifies leads, enriches data, generates proposals, follows up automatically',
    icon: TrendingUp,
    department: 'Sales',
    capabilities: ['lead_qualification', 'data_enrichment', 'proposal_generation', 'follow_up'],
    model: 'claude-sonnet-4.6',
    threshold: 0.80,
    systemPrompt: 'You are a sales assistant. Qualify inbound leads, enrich contact data, draft proposals, and schedule follow-ups. Prioritize high-value opportunities.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Recruiter',
    description: 'Sources candidates, screens resumes, schedules interviews, generates offers',
    icon: Users,
    department: 'Recruitment',
    capabilities: ['candidate_sourcing', 'resume_screening', 'interview_scheduling'],
    model: 'claude-sonnet-4.6',
    threshold: 0.75,
    systemPrompt: 'You are a recruitment agent. Screen candidate applications against job requirements, schedule interviews, and maintain a positive candidate experience throughout.',
    color: 'from-purple-500 to-violet-500',
  },
  {
    name: 'Code Reviewer',
    description: 'Reviews PRs for security, performance, and quality. Suggests improvements.',
    icon: Code2,
    department: 'Engineering',
    capabilities: ['code_review', 'security_analysis', 'performance_analysis', 'test_generation'],
    model: 'claude-opus-4.6',
    threshold: 0.90,
    systemPrompt: 'You are a senior code reviewer. Analyze pull requests for security vulnerabilities, performance issues, and code quality. Provide actionable suggestions with code examples.',
    color: 'from-orange-500 to-red-500',
  },
  {
    name: 'Documentation Writer',
    description: 'Maintains wikis, generates runbooks, keeps docs in sync with codebase',
    icon: Brain,
    department: 'Engineering',
    capabilities: ['documentation', 'codebase_sync', 'runbook_generation'],
    model: 'claude-sonnet-4.6',
    threshold: 0.85,
    systemPrompt: 'You are a documentation specialist. Write clear, concise technical documentation. Keep wikis up to date with code changes. Generate runbooks for operational procedures.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Operations Agent',
    description: 'Handles data entry, report generation, and approval workflows',
    icon: Zap,
    department: 'Operations',
    capabilities: ['data_entry', 'report_generation', 'approval_workflow'],
    model: 'claude-haiku-4.5',
    threshold: 0.90,
    systemPrompt: 'You are an operations assistant. Process data entry requests accurately, generate reports from available data, and route approval workflows to the right people.',
    color: 'from-amber-500 to-yellow-500',
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Deploying: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const statusIcons: Record<string, typeof Activity> = {
  Draft: Clock,
  Deploying: Activity,
  Active: CheckCircle2,
  Paused: Pause,
  Failed: AlertTriangle,
}

function formatTime(ts: any): string {
  try {
    return ts.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AgentStudioPage() {
  const { orgId } = useOrg()
  const [allDeployments] = useTable(tables.ai_agent_deployment)

  const createAgent = useSpacetimeReducer(reducers.createAgentDeployment)
  const deployAgentReducer = useSpacetimeReducer(reducers.deployAgent)
  const pauseAgentReducer = useSpacetimeReducer(reducers.pauseAgent)
  const deleteAgentReducer = useSpacetimeReducer(reducers.deleteAgentDeployment)

  // Filter by org
  const deployments = useMemo(
    () => [...allDeployments]
      .filter(d => Number(d.orgId) === Number(orgId))
      .sort((a, b) => Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis())),
    [allDeployments, orgId]
  )

  const activeCount = deployments.filter(d => d.status.tag === 'Active').length
  const totalTasks = deployments.reduce((sum, d) => sum + Number(d.tasksCompleted), 0)

  // Template deploy state
  const [selectedTemplate, setSelectedTemplate] = useState<typeof agentTemplates[0] | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateModel, setTemplateModel] = useState('')
  const [templateThreshold, setTemplateThreshold] = useState(85)
  const [deploying, setDeploying] = useState(false)

  // Custom agent state
  const [customName, setCustomName] = useState('')
  const [customDept, setCustomDept] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [customCaps, setCustomCaps] = useState('')
  const [customThreshold, setCustomThreshold] = useState(85)
  const [creating, setCreating] = useState(false)

  // Detail dialog
  const [selectedAgent, setSelectedAgent] = useState<(typeof deployments)[0] | null>(null)

  const handleTemplateDeploy = useCallback(() => {
    if (!selectedTemplate || !orgId) return
    setDeploying(true)
    createAgent(
      BigInt(orgId),
      templateName || selectedTemplate.name,
      selectedTemplate.department,
      selectedTemplate.description,
      selectedTemplate.systemPrompt,
      templateModel || selectedTemplate.model,
      selectedTemplate.capabilities,
      templateThreshold / 100,
      60,
    )
    setDeploying(false)
    setSelectedTemplate(null)
    setTemplateName('')
  }, [selectedTemplate, orgId, templateName, templateModel, templateThreshold, createAgent])

  const handleCustomCreate = useCallback(() => {
    if (!customName.trim() || !customDept || !orgId) return
    setCreating(true)
    createAgent(
      BigInt(orgId),
      customName,
      customDept,
      customRole,
      customPrompt,
      customModel || 'claude-sonnet-4.6',
      customCaps.split(',').map(s => s.trim()).filter(Boolean),
      customThreshold / 100,
      60,
    )
    setCreating(false)
    setCustomName('')
    setCustomDept('')
    setCustomRole('')
    setCustomPrompt('')
    setCustomModel('')
    setCustomCaps('')
  }, [customName, customDept, customRole, customPrompt, customModel, customCaps, customThreshold, orgId, createAgent])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#8B5CF6', '#D946EF', '#F43F5E']} animationSpeed={5} className="text-2xl font-bold tracking-tight">
              Agent Studio
            </GradientText>
          </h1>
          <p className="text-muted-foreground text-sm">
            Design, configure, and deploy AI employees for your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SpotlightCard className="px-4 py-2" spotlightColor="rgba(34, 197, 94, 0.15)">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium"><CountUp to={activeCount} duration={0.8} /> active</span>
            </div>
          </SpotlightCard>
          <SpotlightCard className="px-4 py-2" spotlightColor="rgba(139, 92, 246, 0.15)">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-violet-500" />
              <span className="text-sm font-medium"><CountUp to={deployments.length} duration={0.8} /> agents</span>
            </div>
          </SpotlightCard>
          <SpotlightCard className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <span className="text-sm font-medium"><CountUp to={totalTasks} duration={1} /> tasks</span>
            </div>
          </SpotlightCard>
        </div>
      </div>

      <Tabs defaultValue="deployed">
        <TabsList>
          <TabsTrigger value="deployed" className="flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Deployed ({deployments.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-1.5">
            <Plus className="size-3.5" />
            Custom Agent
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Deployed Agents ────────────────────────────────────────── */}
        <TabsContent value="deployed" className="mt-4">
          {deployments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bot className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No agents deployed yet</p>
                <p className="text-xs mt-1">Use a template or create a custom agent to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deployments.map(agent => {
                const StatusIcon = statusIcons[agent.status.tag] ?? Clock
                const statusClass = statusColors[agent.status.tag] ?? statusColors.Draft
                return (
                  <SpotlightCard
                    key={Number(agent.id)}
                    className="cursor-pointer transition-all hover:scale-[1.01]"
                    spotlightColor={agent.status.tag === 'Active' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.08)'}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg p-1.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                          <Bot className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{agent.name}</p>
                          <p className="text-[10px] text-muted-foreground">{agent.department.tag}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${statusClass}`}>
                        <StatusIcon className="size-3 mr-1" />
                        {agent.status.tag}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{agent.roleDescription}</p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {agent.capabilities.slice(0, 3).map(cap => (
                        <Badge key={cap} variant="secondary" className="text-[10px]">
                          {cap.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{agent.capabilities.length - 3}
                        </Badge>
                      )}
                    </div>

                    <Separator className="mb-3" />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{agent.model.split('-').slice(-2).join('-')}</span>
                      <span>{Number(agent.tasksCompleted)} tasks</span>
                    </div>

                    <div className="flex gap-1.5 mt-3">
                      {agent.status.tag === 'Active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); pauseAgentReducer(agent.id) }}
                        >
                          <Pause className="size-3 mr-1" />
                          Pause
                        </Button>
                      ) : agent.status.tag !== 'Deploying' ? (
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); deployAgentReducer(agent.id) }}
                        >
                          <Play className="size-3 mr-1" />
                          {agent.status.tag === 'Draft' ? 'Deploy' : 'Resume'}
                        </Button>
                      ) : null}
                      {agent.status.tag !== 'Active' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-500 hover:text-red-700"
                          onClick={(e) => { e.stopPropagation(); deleteAgentReducer(agent.id) }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </SpotlightCard>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Templates ──────────────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentTemplates.map((template) => (
              <SpotlightCard
                key={template.name}
                className={`cursor-pointer transition-all ${
                  selectedTemplate?.name === template.name ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  setSelectedTemplate(template)
                  setTemplateName(template.name)
                  setTemplateModel(template.model)
                  setTemplateThreshold(template.threshold * 100)
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`rounded-lg p-2 bg-gradient-to-br ${template.color} text-white`}>
                    <template.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">{template.name}</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {template.department}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-[10px]">
                      {cap.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
                <Separator className="mb-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Model: {template.model.split('-').slice(-2).join('-')}</span>
                  <span>Threshold: {(template.threshold * 100).toFixed(0)}%</span>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {selectedTemplate && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Deploy {selectedTemplate.name}</CardTitle>
                <CardDescription>Configure and deploy this AI employee to your org</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Agent Name</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Select value={templateModel} onValueChange={setTemplateModel}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-opus-4.6">Claude Opus 4.6 (Most capable)</SelectItem>
                        <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6 (Balanced)</SelectItem>
                        <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5 (Fast)</SelectItem>
                        <SelectItem value="gemini-3.1-pro">Gemini 3.1 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Self-Verification Threshold: {templateThreshold}%</Label>
                  <input
                    type="range"
                    min={50}
                    max={99}
                    value={templateThreshold}
                    onChange={e => setTemplateThreshold(Number(e.target.value))}
                    className="w-full mt-2 accent-violet-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tasks below this confidence are flagged for human review
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleTemplateDeploy} disabled={deploying}>
                    <Play className="mr-2 size-4" />
                    Deploy Agent
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Custom Agent ───────────────────────────────────────────── */}
        <TabsContent value="custom" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Custom AI Employee</CardTitle>
              <CardDescription>
                Build a specialized agent with custom capabilities and behaviors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g., Finance Assistant"
                    className="mt-1"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Department *</Label>
                  <Select value={customDept} onValueChange={setCustomDept}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Recruitment">Recruitment</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Role Description</Label>
                <Input
                  placeholder="e.g., Senior Support Agent"
                  className="mt-1"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              </div>
              <div>
                <Label>System Prompt / Instructions</Label>
                <Textarea
                  placeholder="Describe the agent's behavior, goals, and constraints..."
                  className="mt-1 min-h-[120px]"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Model</Label>
                  <Select value={customModel} onValueChange={setCustomModel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-opus-4.6">Claude Opus 4.6</SelectItem>
                      <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6</SelectItem>
                      <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5</SelectItem>
                      <SelectItem value="gemini-3.1-pro">Gemini 3.1 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Capabilities (comma-separated)</Label>
                  <Input
                    placeholder="e.g., data_entry, report_gen"
                    className="mt-1"
                    value={customCaps}
                    onChange={(e) => setCustomCaps(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Self-Verification Threshold: {customThreshold}%</Label>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={customThreshold}
                  onChange={e => setCustomThreshold(Number(e.target.value))}
                  className="w-full mt-2 accent-violet-500"
                />
              </div>
              <Button onClick={handleCustomCreate} disabled={creating || !customName.trim() || !customDept}>
                <Plus className="mr-2 size-4" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Agent Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <DialogContent className="max-w-lg">
          {selectedAgent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <DialogTitle>{selectedAgent.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{selectedAgent.department.tag}</Badge>
                      <Badge className={`text-[10px] ${statusColors[selectedAgent.status.tag] ?? ''}`}>
                        {selectedAgent.status.tag}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Role Description</p>
                  <p className="text-sm">{selectedAgent.roleDescription || '—'}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">System Prompt</p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 font-mono text-xs max-h-32 overflow-auto">
                    {selectedAgent.systemPrompt || '—'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Model</p>
                    <p className="text-sm font-mono">{selectedAgent.model}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Threshold</p>
                    <p className="text-sm">{Math.round(selectedAgent.selfVerificationThreshold * 100)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{Number(selectedAgent.tasksCompleted)}</p>
                    <p className="text-[10px] text-muted-foreground">Tasks Done</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">
                      {selectedAgent.avgConfidence != null
                        ? `${Math.round(selectedAgent.avgConfidence * 100)}%`
                        : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Avg Confidence</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{selectedAgent.capabilities.length}</p>
                    <p className="text-[10px] text-muted-foreground">Capabilities</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedAgent.capabilities.map(cap => (
                      <Badge key={cap} variant="secondary" className="text-[10px]">
                        {cap.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created {formatTime(selectedAgent.createdAt)}
                  {selectedAgent.lastActive && <> · Last active {formatTime(selectedAgent.lastActive)}</>}
                </div>
              </div>

              <DialogFooter className="mt-4">
                {selectedAgent.status.tag === 'Active' ? (
                  <Button variant="outline" onClick={() => { pauseAgentReducer(selectedAgent.id); setSelectedAgent(null) }}>
                    <Pause className="size-4 mr-1.5" />
                    Pause Agent
                  </Button>
                ) : (
                  <Button onClick={() => { deployAgentReducer(selectedAgent.id); setSelectedAgent(null) }}>
                    <Play className="size-4 mr-1.5" />
                    {selectedAgent.status.tag === 'Draft' ? 'Deploy Agent' : 'Resume Agent'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
