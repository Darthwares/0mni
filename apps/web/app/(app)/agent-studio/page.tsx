'use client'

import { useState, useMemo } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import {
  Sparkles,
  Plus,
  Bot,
  Brain,
  Zap,
  Shield,
  Code2,
  Headphones,
  TrendingUp,
  Users,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  GitBranch,
  FileText,
  Mail,
  BarChart3,
  Workflow,
  CircleDot,
  ChevronRight,
  Cpu,
  Activity,
  Search,
} from 'lucide-react'

const agentTemplates = [
  {
    name: 'Support Agent',
    description: 'Handles customer tickets, auto-resolves common issues, escalates complex ones',
    icon: Headphones,
    department: 'Support',
    capabilities: ['customer_support', 'ticket_resolution', 'sentiment_analysis'],
    model: 'claude-opus-4.6',
    threshold: 0.85,
    color: 'from-blue-500 to-cyan-500',
    spotColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    name: 'Sales Assistant',
    description: 'Qualifies leads, enriches data, generates proposals, follows up automatically',
    icon: TrendingUp,
    department: 'Sales',
    capabilities: ['lead_qualification', 'data_enrichment', 'proposal_generation', 'follow_up'],
    model: 'claude-sonnet-4.6',
    threshold: 0.80,
    color: 'from-green-500 to-emerald-500',
    spotColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    name: 'Recruiter',
    description: 'Sources candidates, screens resumes, schedules interviews, generates offers',
    icon: Users,
    department: 'Recruitment',
    capabilities: ['candidate_sourcing', 'resume_screening', 'interview_scheduling'],
    model: 'claude-sonnet-4.6',
    threshold: 0.75,
    color: 'from-purple-500 to-violet-500',
    spotColor: 'rgba(139, 92, 246, 0.15)',
  },
  {
    name: 'Code Reviewer',
    description: 'Reviews PRs for security, performance, and quality. Suggests improvements.',
    icon: Code2,
    department: 'Engineering',
    capabilities: ['code_review', 'security_analysis', 'performance_analysis', 'test_generation'],
    model: 'claude-opus-4.6',
    threshold: 0.90,
    color: 'from-orange-500 to-red-500',
    spotColor: 'rgba(249, 115, 22, 0.15)',
  },
  {
    name: 'Documentation Writer',
    description: 'Maintains wikis, generates runbooks, keeps docs in sync with codebase',
    icon: Brain,
    department: 'Engineering',
    capabilities: ['documentation', 'codebase_sync', 'runbook_generation'],
    model: 'claude-sonnet-4.6',
    threshold: 0.85,
    color: 'from-pink-500 to-rose-500',
    spotColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    name: 'Operations Agent',
    description: 'Handles data entry, report generation, and approval workflows',
    icon: Zap,
    department: 'Operations',
    capabilities: ['data_entry', 'report_generation', 'approval_workflow'],
    model: 'claude-haiku-4.5',
    threshold: 0.90,
    color: 'from-amber-500 to-yellow-500',
    spotColor: 'rgba(245, 158, 11, 0.15)',
  },
]

const workflowTemplates = [
  {
    name: 'Ticket Triage Pipeline',
    description: 'Auto-classify, prioritize, assign, and respond to incoming support tickets',
    steps: ['Classify ticket type', 'Assign priority', 'Route to team', 'Generate initial response'],
    agents: ['Support Agent', 'Operations Agent'],
    icon: GitBranch,
    color: 'text-blue-500',
  },
  {
    name: 'Lead-to-Close Pipeline',
    description: 'Qualify leads, enrich data, create proposals, and schedule follow-ups',
    steps: ['Score lead', 'Enrich company data', 'Draft proposal', 'Schedule follow-up'],
    agents: ['Sales Assistant', 'Operations Agent'],
    icon: Target,
    color: 'text-emerald-500',
  },
  {
    name: 'Code Ship Pipeline',
    description: 'Review PRs, generate tests, update docs, then deploy',
    steps: ['Review code changes', 'Generate test coverage', 'Update documentation', 'Validate deployment'],
    agents: ['Code Reviewer', 'Documentation Writer'],
    icon: Workflow,
    color: 'text-orange-500',
  },
  {
    name: 'Hire-to-Onboard Pipeline',
    description: 'Source candidates, screen resumes, schedule interviews, prepare onboarding',
    steps: ['Source candidates', 'Screen resumes', 'Schedule interviews', 'Generate onboarding pack'],
    agents: ['Recruiter', 'Documentation Writer'],
    icon: Users,
    color: 'text-violet-500',
  },
]

const statusColors: Record<string, string> = {
  Draft: 'bg-neutral-500',
  Deploying: 'bg-amber-500',
  Active: 'bg-emerald-500',
  Paused: 'bg-yellow-500',
  Failed: 'bg-red-500',
}

export default function AgentStudioPage() {
  const { currentOrgId } = useOrg()
  const [allDeployments] = useTable(tables.ai_agent_deployment)
  const createAgent = useSpacetimeReducer(reducers.createAgentDeployment)
  const deployAgent = useSpacetimeReducer(reducers.deployAgent)
  const pauseAgentReducer = useSpacetimeReducer(reducers.pauseAgent)
  const deleteAgentReducer = useSpacetimeReducer(reducers.deleteAgentDeployment)

  const [selectedTemplate, setSelectedTemplate] = useState<typeof agentTemplates[0] | null>(null)
  const [customName, setCustomName] = useState('')
  const [customDepartment, setCustomDepartment] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [customModel, setCustomModel] = useState('claude-sonnet-4.6')
  const [customThreshold, setCustomThreshold] = useState(85)
  const [deploying, setDeploying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const orgDeployments = useMemo(
    () => [...allDeployments]
      .filter(d => Number(d.orgId) === currentOrgId)
      .sort((a, b) => {
        try { return Number(b.createdAt.toMillis()) - Number(a.createdAt.toMillis()) } catch { return 0 }
      }),
    [allDeployments, currentOrgId]
  )

  const activeCount = orgDeployments.filter(d => d.status.tag === 'Active').length
  const totalTasks = orgDeployments.reduce((sum, d) => sum + Number(d.tasksCompleted), 0)

  const handleDeployTemplate = async () => {
    if (!selectedTemplate || !customName.trim()) return
    setDeploying(true)
    try {
      await createAgent({
        orgId: BigInt(currentOrgId),
        name: customName.trim(),
        department: selectedTemplate.department,
        roleDescription: selectedTemplate.description,
        systemPrompt: `You are a ${selectedTemplate.name}. ${selectedTemplate.description}`,
        model: customModel,
        capabilities: selectedTemplate.capabilities,
        selfVerificationThreshold: customThreshold / 100,
        maxTaskDurationMinutes: 30,
      })
      setSelectedTemplate(null)
      setCustomName('')
    } catch (err) {
      console.error('Failed to deploy:', err)
    } finally {
      setDeploying(false)
    }
  }

  const handleCreateCustom = async () => {
    if (!customName.trim() || !customDepartment) return
    setDeploying(true)
    try {
      await createAgent({
        orgId: BigInt(currentOrgId),
        name: customName.trim(),
        department: customDepartment,
        roleDescription: customRole.trim() || customName.trim(),
        systemPrompt: customPrompt.trim() || `You are a ${customName.trim()} agent.`,
        model: customModel,
        capabilities: [],
        selfVerificationThreshold: customThreshold / 100,
        maxTaskDurationMinutes: 30,
      })
      setCustomName('')
      setCustomDepartment('')
      setCustomRole('')
      setCustomPrompt('')
    } catch (err) {
      console.error('Failed to create:', err)
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#8B5CF6', '#EC4899', '#F59E0B']} animationSpeed={4} className="text-2xl font-bold">
              Agent Studio
            </GradientText>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Design, configure, and deploy AI employees for your organization
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {activeCount} active
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Agents', value: orgDeployments.length, icon: Bot, color: 'text-violet-500', bg: 'bg-violet-500/10', spot: 'rgba(139, 92, 246, 0.15)' },
          { label: 'Active', value: activeCount, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', spot: 'rgba(16, 185, 129, 0.15)' },
          { label: 'Tasks Completed', value: totalTasks, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10', spot: 'rgba(59, 130, 246, 0.15)' },
          { label: 'Templates', value: agentTemplates.length, icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10', spot: 'rgba(245, 158, 11, 0.15)' },
        ].map((card) => (
          <SpotlightCard
            key={card.label}
            className="rounded-xl border bg-card text-card-foreground shadow-sm"
            spotlightColor={card.spot}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`size-4 ${card.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                <CountUp to={card.value} duration={1.2} separator="," />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <Tabs defaultValue="deployed">
        <TabsList>
          <TabsTrigger value="deployed">
            <Cpu className="size-3.5 mr-1.5" />
            Deployed ({orgDeployments.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="size-3.5 mr-1.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Plus className="size-3.5 mr-1.5" />
            Custom
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <Workflow className="size-3.5 mr-1.5" />
            Workflows
          </TabsTrigger>
        </TabsList>

        {/* Deployed Agents */}
        <TabsContent value="deployed" className="mt-4">
          {orgDeployments.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Bot className="size-12 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">No agents deployed yet</p>
                <p className="text-xs text-muted-foreground mt-1">Pick a template or create a custom agent to get started</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgDeployments
                  .filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((agent) => {
                    const statusTag = agent.status.tag
                    return (
                      <SpotlightCard
                        key={String(agent.id)}
                        className="rounded-xl border bg-card text-card-foreground shadow-sm"
                        spotlightColor={statusTag === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(100,100,100,0.08)'}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-violet-500/10">
                                <Bot className="size-4 text-violet-500" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{agent.name}</p>
                                <Badge variant="outline" className="text-[10px] mt-0.5">
                                  {agent.department.tag}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`size-2 rounded-full ${statusColors[statusTag] ?? 'bg-neutral-500'}`} />
                              <span className="text-[10px] text-muted-foreground">{statusTag}</span>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {agent.roleDescription}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Cpu className="size-3" />
                              {agent.model}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="size-3" />
                              {(agent.selfVerificationThreshold * 100).toFixed(0)}% threshold
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs mb-3">
                            <span className="text-muted-foreground">
                              {Number(agent.tasksCompleted)} tasks completed
                            </span>
                            {agent.avgConfidence != null && (
                              <span className="text-muted-foreground">
                                {(agent.avgConfidence * 100).toFixed(0)}% avg confidence
                              </span>
                            )}
                          </div>

                          <Separator className="mb-3" />

                          <div className="flex items-center gap-1.5">
                            {statusTag === 'Active' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs flex-1"
                                onClick={() => pauseAgentReducer({ agentId: agent.id })}
                              >
                                <Pause className="size-3 mr-1" />
                                Pause
                              </Button>
                            ) : statusTag !== 'Failed' ? (
                              <Button
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => deployAgent({ agentId: agent.id })}
                              >
                                <Play className="size-3 mr-1" />
                                Activate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs flex-1"
                                onClick={() => deployAgent({ agentId: agent.id })}
                              >
                                <RotateCcw className="size-3 mr-1" />
                                Retry
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => {
                                if (statusTag === 'Active') return
                                deleteAgentReducer({ agentId: agent.id })
                              }}
                              disabled={statusTag === 'Active'}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </SpotlightCard>
                    )
                  })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentTemplates.map((template) => (
              <SpotlightCard
                key={template.name}
                className={`rounded-xl border bg-card text-card-foreground shadow-sm cursor-pointer transition-all ${
                  selectedTemplate?.name === template.name ? 'ring-2 ring-primary' : ''
                }`}
                spotlightColor={template.spotColor}
              >
                <div
                  className="p-4"
                  onClick={() => {
                    setSelectedTemplate(template)
                    setCustomName(template.name)
                    setCustomModel(template.model)
                    setCustomThreshold(template.threshold * 100)
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`rounded-lg p-2.5 bg-gradient-to-br ${template.color} text-white shadow-sm`}>
                      <template.icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{template.name}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {template.department}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-[10px]">
                        {cap.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Cpu className="size-3" />
                      {template.model.split('-').slice(-2).join('-')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="size-3" />
                      {(template.threshold * 100).toFixed(0)}% threshold
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {selectedTemplate && (
            <Card className="mt-6 border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="size-4 text-emerald-500" />
                  Deploy {selectedTemplate.name}
                </CardTitle>
                <CardDescription>Configure and deploy this AI employee to your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Agent Name</Label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Model</Label>
                    <Select value={customModel} onValueChange={setCustomModel}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-opus-4.6">Claude Opus 4.6 (Most capable)</SelectItem>
                        <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6 (Balanced)</SelectItem>
                        <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5 (Fast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Self-Verification Threshold: {customThreshold}%</Label>
                  <div className="mt-2 space-y-1">
                    <Progress value={customThreshold} className="h-2" />
                    <input
                      type="range"
                      min={50}
                      max={99}
                      value={customThreshold}
                      onChange={(e) => setCustomThreshold(Number(e.target.value))}
                      className="w-full h-1 accent-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Tasks below this confidence level are flagged for human review
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDeployTemplate} disabled={deploying || !customName.trim()}>
                    <Play className="mr-2 size-4" />
                    {deploying ? 'Deploying...' : 'Deploy Agent'}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Custom Agent */}
        <TabsContent value="custom" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="size-4 text-violet-500" />
                Create Custom AI Employee
              </CardTitle>
              <CardDescription>
                Build a specialized agent with custom capabilities and behaviors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="e.g., Finance Assistant"
                    className="mt-1"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Department</Label>
                  <Select value={customDepartment} onValueChange={setCustomDepartment}>
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
                <Label className="text-xs">Role Description</Label>
                <Input
                  placeholder="e.g., Senior Support Agent"
                  className="mt-1"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">System Prompt / Instructions</Label>
                <Textarea
                  placeholder="Describe the agent's behavior, goals, and constraints..."
                  className="mt-1 min-h-[120px]"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Model</Label>
                  <Select value={customModel} onValueChange={setCustomModel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-opus-4.6">Claude Opus 4.6</SelectItem>
                      <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6</SelectItem>
                      <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Confidence Threshold: {customThreshold}%</Label>
                  <div className="mt-1">
                    <input
                      type="range"
                      min={50}
                      max={99}
                      value={customThreshold}
                      onChange={(e) => setCustomThreshold(Number(e.target.value))}
                      className="w-full h-1 accent-primary"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleCreateCustom} disabled={deploying || !customName.trim() || !customDepartment}>
                <Plus className="mr-2 size-4" />
                {deploying ? 'Creating...' : 'Create Agent'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows */}
        <TabsContent value="workflows" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflowTemplates.map((workflow) => (
              <SpotlightCard
                key={workflow.name}
                className="rounded-xl border bg-card text-card-foreground shadow-sm"
                spotlightColor="rgba(139, 92, 246, 0.1)"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <workflow.icon className={`size-5 ${workflow.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{workflow.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{workflow.description}</p>
                    </div>
                  </div>

                  {/* Pipeline visualization */}
                  <div className="space-y-0 mb-3">
                    {workflow.steps.map((step, i) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <div className={`size-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                            i === 0 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-muted-foreground/30 text-muted-foreground'
                          }`}>
                            {i + 1}
                          </div>
                          {i < workflow.steps.length - 1 && (
                            <div className="w-0.5 h-3 bg-muted-foreground/20" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{step}</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="mb-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {workflow.agents.map((a) => (
                        <Badge key={a} variant="secondary" className="text-[10px]">
                          <Bot className="size-2.5 mr-0.5" />
                          {a}
                        </Badge>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                      <Play className="size-3 mr-1" />
                      Soon
                    </Button>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>

          <Card className="mt-4 border-dashed">
            <CardContent className="py-8 text-center">
              <Sparkles className="size-8 mx-auto mb-2 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">Custom Workflow Builder</p>
              <p className="text-xs text-muted-foreground mt-1">
                Visually chain agents together for complex multi-step processes — coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
