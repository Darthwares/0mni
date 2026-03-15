'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTable, useReducer } from 'spacetimedb/react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
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
  Settings,
  Play,
  Pause,
  Trash2,
  Activity,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────
function getTag(enumVal: unknown): string {
  if (!enumVal || typeof enumVal !== 'object') return 'Draft'
  const obj = enumVal as Record<string, unknown>
  if ('tag' in obj) return obj.tag as string
  for (const k of Object.keys(obj)) {
    if (k !== 'value') return k.charAt(0).toUpperCase() + k.slice(1)
  }
  return 'Draft'
}

// ── Templates (for quick deploy) ───────────────
const ICON_MAP: Record<string, LucideIcon> = {
  Headphones, TrendingUp, Users, Code2, Brain, Zap, Bot, Sparkles,
}

const TEMPLATES = [
  { name: 'Support Agent', description: 'Handles customer tickets, auto-resolves common issues, escalates complex ones', icon: 'Headphones', department: 'Support', capabilities: 'customer_support,ticket_resolution,sentiment_analysis', model: 'claude-opus-4.6', threshold: 85, color: 'from-blue-500 to-cyan-500' },
  { name: 'Sales Assistant', description: 'Qualifies leads, enriches data, generates proposals, follows up automatically', icon: 'TrendingUp', department: 'Sales', capabilities: 'lead_qualification,data_enrichment,proposal_generation,follow_up', model: 'claude-sonnet-4.6', threshold: 80, color: 'from-green-500 to-emerald-500' },
  { name: 'Recruiter', description: 'Sources candidates, screens resumes, schedules interviews, generates offers', icon: 'Users', department: 'Recruitment', capabilities: 'candidate_sourcing,resume_screening,interview_scheduling', model: 'claude-sonnet-4.6', threshold: 75, color: 'from-purple-500 to-violet-500' },
  { name: 'Code Reviewer', description: 'Reviews PRs for security, performance, and quality. Suggests improvements.', icon: 'Code2', department: 'Engineering', capabilities: 'code_review,security_analysis,performance_analysis,test_generation', model: 'claude-opus-4.6', threshold: 90, color: 'from-orange-500 to-red-500' },
  { name: 'Documentation Writer', description: 'Maintains wikis, generates runbooks, keeps docs in sync with codebase', icon: 'Brain', department: 'Engineering', capabilities: 'documentation,codebase_sync,runbook_generation', model: 'claude-sonnet-4.6', threshold: 85, color: 'from-pink-500 to-rose-500' },
  { name: 'Operations Agent', description: 'Handles data entry, report generation, and approval workflows', icon: 'Zap', department: 'Operations', capabilities: 'data_entry,report_generation,approval_workflow', model: 'claude-haiku-4.5', threshold: 90, color: 'from-amber-500 to-yellow-500' },
]

export default function AgentStudioPage() {
  const { currentOrgId } = useOrg()
  const allAgents = useTable(tables.agentConfig)
  const createAgentConfig = useReducer(reducers.createAgentConfig)
  const toggleAgentStatus = useReducer(reducers.toggleAgentStatus)
  const deleteAgentConfig = useReducer(reducers.deleteAgentConfig)

  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null)
  const [deployName, setDeployName] = useState('')
  const [deployModel, setDeployModel] = useState('')
  const [deployThreshold, setDeployThreshold] = useState(85)

  // Custom agent form
  const [customName, setCustomName] = useState('')
  const [customDept, setCustomDept] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [customModel, setCustomModel] = useState('claude-sonnet-4.6')
  const [customThreshold, setCustomThreshold] = useState(85)

  const [showDetail, setShowDetail] = useState<number | null>(null)

  // Org-scoped agents
  const agents = useMemo(() => {
    if (currentOrgId === null) return []
    return allAgents.filter(a => a.orgId === BigInt(currentOrgId))
  }, [allAgents, currentOrgId])

  const activeCount = agents.filter(a => getTag(a.status) === 'Active').length
  const totalRuns = agents.reduce((acc, a) => acc + Number(a.runsTotal), 0)
  const totalSuccess = agents.reduce((acc, a) => acc + Number(a.runsSuccess), 0)
  const successRate = totalRuns > 0 ? (totalSuccess / totalRuns * 100) : 0

  // Deploy from template
  const handleDeploy = useCallback(() => {
    if (!selectedTemplate || !deployName.trim() || currentOrgId === null) return
    createAgentConfig({
      orgId: BigInt(currentOrgId),
      name: deployName.trim(),
      description: selectedTemplate.description,
      department: selectedTemplate.department,
      model: deployModel || selectedTemplate.model,
      systemPrompt: '',
      capabilities: selectedTemplate.capabilities,
      threshold: deployThreshold,
      gradientColor: selectedTemplate.color,
    })
    setSelectedTemplate(null)
    setDeployName('')
  }, [selectedTemplate, deployName, deployModel, deployThreshold, currentOrgId, createAgentConfig])

  // Create custom agent
  const handleCreateCustom = useCallback(() => {
    if (!customName.trim() || currentOrgId === null) return
    createAgentConfig({
      orgId: BigInt(currentOrgId),
      name: customName.trim(),
      description: customDesc,
      department: customDept,
      model: customModel,
      systemPrompt: customPrompt,
      capabilities: '',
      threshold: customThreshold,
      gradientColor: 'from-indigo-500 to-purple-500',
    })
    setCustomName(''); setCustomDept(''); setCustomDesc(''); setCustomPrompt('')
  }, [customName, customDept, customDesc, customPrompt, customModel, customThreshold, currentOrgId, createAgentConfig])

  const detailAgent = agents.find(a => Number(a.id) === showDetail) || null

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
            <Bot className="size-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#a855f7', '#8b5cf6', '#6366f1']} animationSpeed={6}>Agent Studio</GradientText>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Design, configure, and deploy AI employees for your organization</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(168, 85, 247, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600"><Bot className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deployed</span>
            </div>
            <p className="text-2xl font-bold tabular-nums"><CountUp to={agents.length} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600"><Activity className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400"><CountUp to={activeCount} duration={1.5} /></p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600"><CheckCircle2 className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              <CountUp to={successRate || 0} duration={1.5} /><span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
            </p>
          </SpotlightCard>
          <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(99, 102, 241, 0.15)">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600"><Zap className="size-3.5 text-white" /></div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Runs</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400"><CountUp to={totalRuns} duration={1.5} separator="," /></p>
          </SpotlightCard>
        </div>

        <Tabs defaultValue="deployed">
          <TabsList>
            <TabsTrigger value="deployed">Deployed ({agents.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom Agent</TabsTrigger>
          </TabsList>

          {/* Deployed Agents */}
          <TabsContent value="deployed" className="mt-4">
            {agents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Bot className="size-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No agents deployed yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Deploy from templates or create a custom agent</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => {
                  const status = getTag(agent.status)
                  const caps = agent.capabilities ? agent.capabilities.split(',').filter(Boolean) : []
                  const Icon = ICON_MAP[agent.gradientColor?.split(' ')[0] || ''] || Bot
                  return (
                    <Card key={Number(agent.id)} className="group cursor-pointer transition-all hover:shadow-md" onClick={() => setShowDetail(Number(agent.id))}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`rounded-lg p-2 bg-gradient-to-br ${agent.gradientColor || 'from-purple-500 to-indigo-500'} text-white`}>
                              <Bot className="size-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{agent.name}</CardTitle>
                              <Badge variant="outline" className="mt-1 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                {agent.department}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant={status === 'Active' ? 'default' : 'secondary'} className={`text-[10px] ${status === 'Active' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-neutral-500/10'}`}>
                            {status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>
                        {caps.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {caps.slice(0, 3).map(c => (
                              <Badge key={c} variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                                {c.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                            {caps.length > 3 && <Badge variant="secondary" className="text-[10px]">+{caps.length - 3}</Badge>}
                          </div>
                        )}
                        <Separator className="my-3" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Model: {agent.model.split('-').slice(-2).join('-')}</span>
                          <span>Threshold: {agent.threshold}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map(template => {
                const Icon = ICON_MAP[template.icon] || Bot
                return (
                  <Card
                    key={template.name}
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setDeployName(template.name)
                      setDeployModel(template.model)
                      setDeployThreshold(template.threshold)
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 bg-gradient-to-br ${template.color} text-white`}>
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="outline" className="mt-1 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                            {template.department}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.capabilities.split(',').map(cap => (
                          <Badge key={cap} variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                            {cap.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Model: {template.model.split('-').slice(-2).join('-')}</span>
                        <span>Threshold: {template.threshold}%</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Deploy dialog */}
            <Dialog open={selectedTemplate !== null} onOpenChange={open => { if (!open) setSelectedTemplate(null) }}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Deploy {selectedTemplate?.name}</DialogTitle>
                  <DialogDescription>Configure and deploy this AI employee</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Agent Name</Label>
                      <Input value={deployName} onChange={e => setDeployName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Select value={deployModel} onValueChange={setDeployModel}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-opus-4.6">Claude Opus 4.6</SelectItem>
                          <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6</SelectItem>
                          <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Confidence Threshold: {deployThreshold}%</Label>
                    <input type="range" min={50} max={100} value={deployThreshold} onChange={e => setDeployThreshold(Number(e.target.value))} className="w-full mt-2 accent-purple-500" />
                    <p className="text-xs text-muted-foreground mt-1">Tasks below this confidence get flagged for human review</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>Cancel</Button>
                  <Button onClick={handleDeploy} disabled={!deployName.trim()}>
                    <Play className="mr-2 size-4" />Deploy Agent
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Custom Agent */}
          <TabsContent value="custom" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Custom AI Employee</CardTitle>
                <CardDescription>Build a specialized agent with custom capabilities and behaviors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g., Finance Assistant" className="mt-1" />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={customDept} onValueChange={setCustomDept}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {['Support', 'Sales', 'Recruitment', 'Engineering', 'Operations', 'Marketing', 'Finance'].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="e.g., Senior Support Agent" className="mt-1" />
                </div>
                <div>
                  <Label>System Prompt / Instructions</Label>
                  <Textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Describe the agent's behavior, goals, and constraints..." className="mt-1 min-h-[120px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Model</Label>
                    <Select value={customModel} onValueChange={setCustomModel}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-opus-4.6">Claude Opus 4.6</SelectItem>
                        <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6</SelectItem>
                        <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Threshold: {customThreshold}%</Label>
                    <input type="range" min={50} max={100} value={customThreshold} onChange={e => setCustomThreshold(Number(e.target.value))} className="w-full mt-3 accent-purple-500" />
                  </div>
                </div>
                <Button onClick={handleCreateCustom} disabled={!customName.trim()}>
                  <Plus className="mr-2 size-4" />Create Agent
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Agent Detail Dialog */}
        <Dialog open={showDetail !== null} onOpenChange={open => { if (!open) setShowDetail(null) }}>
          <DialogContent className="sm:max-w-lg">
            {detailAgent && (
              <>
                <DialogHeader>
                  <DialogTitle>{detailAgent.name}</DialogTitle>
                  <DialogDescription>{detailAgent.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{detailAgent.department}</span></div>
                    <div><span className="text-muted-foreground">Model:</span> <span className="font-medium">{detailAgent.model}</span></div>
                    <div><span className="text-muted-foreground">Threshold:</span> <span className="font-medium">{detailAgent.threshold}%</span></div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge variant={getTag(detailAgent.status) === 'Active' ? 'default' : 'secondary'} className="ml-1 text-[10px]">{getTag(detailAgent.status)}</Badge></div>
                  </div>
                  {detailAgent.systemPrompt && (
                    <div>
                      <Label className="text-muted-foreground">System Prompt</Label>
                      <p className="text-sm mt-1 bg-muted/50 rounded-md p-3">{detailAgent.systemPrompt}</p>
                    </div>
                  )}
                  {detailAgent.capabilities && (
                    <div className="flex flex-wrap gap-1">
                      {detailAgent.capabilities.split(',').filter(Boolean).map(c => (
                        <Badge key={c} variant="secondary" className="text-[10px]">{c.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="destructive" size="sm" onClick={() => { deleteAgentConfig({ agentId: BigInt(showDetail!) }); setShowDetail(null) }}>
                    <Trash2 className="mr-1.5 size-3.5" />Delete
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { toggleAgentStatus({ agentId: BigInt(showDetail!) }); setShowDetail(null) }}>
                    {getTag(detailAgent.status) === 'Active' ? <><Pause className="mr-1.5 size-3.5" />Pause</> : <><Play className="mr-1.5 size-3.5" />Activate</>}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
