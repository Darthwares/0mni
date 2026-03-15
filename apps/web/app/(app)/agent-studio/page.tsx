'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'
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
  Activity,
  CheckCircle2,
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
  },
]

export default function AgentStudioPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<typeof agentTemplates[0] | null>(null)
  const [customName, setCustomName] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [customThreshold, setCustomThreshold] = useState(85)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
          <Bot className="size-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText
              colors={['#a855f7', '#8b5cf6', '#6366f1']}
              animationSpeed={6}
            >
              Agent Studio
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design, configure, and deploy AI employees for your organization
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(168, 85, 247, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
              <Bot className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deployed</span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            <CountUp to={agentTemplates.length} duration={1.5} />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(139, 92, 246, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Activity className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Runs</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
            <CountUp to={1284} duration={1.5} separator="," />
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
              <CheckCircle2 className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Success Rate</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CountUp to={94.7} duration={1.5} />
            <span className="text-base font-medium text-muted-foreground ml-0.5">%</span>
          </p>
        </SpotlightCard>

        <SpotlightCard className="!p-4 !rounded-xl !border-neutral-200 dark:!border-neutral-800 !bg-white dark:!bg-neutral-900/80" spotlightColor="rgba(99, 102, 241, 0.15)">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600">
              <Zap className="size-3.5 text-white" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Hours Saved</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            <CountUp to={312} duration={1.5} />
          </p>
        </SpotlightCard>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Agent</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentTemplates.map((template) => (
              <Card
                key={template.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate?.name === template.name ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  setSelectedTemplate(template)
                  setCustomName(template.name)
                  setCustomModel(template.model)
                  setCustomThreshold(template.threshold * 100)
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 bg-gradient-to-br ${template.color} text-white`}>
                      <template.icon className="size-5" />
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
                    {template.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                        {cap.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Model: {template.model.split('-').slice(-2).join('-')}</span>
                    <span>Threshold: {(template.threshold * 100).toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Deploy {selectedTemplate.name}</CardTitle>
                <CardDescription>Configure and deploy this AI employee</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Agent Name</Label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Select value={customModel} onValueChange={setCustomModel}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-opus-4.6">Claude Opus 4.6 (Most capable)</SelectItem>
                        <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6 (Balanced)</SelectItem>
                        <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5 (Fast & efficient)</SelectItem>
                        <SelectItem value="gemini-3.1-pro">Gemini 3.1 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Self-Verification Threshold: {customThreshold}%</Label>
                  <Progress value={customThreshold} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tasks completed below this confidence will be flagged for human review
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button>
                    <Play className="mr-2 size-4" />
                    Deploy Agent
                  </Button>
                  <Button variant="outline">
                    <Settings className="mr-2 size-4" />
                    Advanced Config
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

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
                  <Label>Name</Label>
                  <Input placeholder="e.g., Finance Assistant" className="mt-1" />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select>
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
                <Input placeholder="e.g., Senior Support Agent" className="mt-1" />
              </div>
              <div>
                <Label>System Prompt / Instructions</Label>
                <Textarea
                  placeholder="Describe the agent's behavior, goals, and constraints..."
                  className="mt-1 min-h-[120px]"
                />
              </div>
              <div>
                <Label>Model</Label>
                <Select>
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
              <Button>
                <Plus className="mr-2 size-4" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Workflows</CardTitle>
              <CardDescription>
                Chain multiple agents together for complex multi-step processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Sparkles className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Workflow Builder Coming Soon</p>
                <p className="text-xs mt-1">
                  Design agent pipelines where one agent's output feeds into another's input
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
