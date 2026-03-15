'use client'

import { useState, useMemo } from 'react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Users2,
  Search,
  Grid3X3,
  List,
  Bot,
  User,
  Mail,
  MapPin,
  Briefcase,
  Clock,
  ExternalLink,
  Github,
  Linkedin,
  ChevronRight,
  Building2,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { GradientText } from '@/components/reactbits/GradientText'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { CountUp } from '@/components/reactbits/CountUp'
import Link from 'next/link'
import { useOrg } from '@/components/org-context'

type ViewMode = 'grid' | 'list'
type FilterTab = 'all' | 'humans' | 'ai' | string // string for department names

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Support: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  Sales: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  Recruitment: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
  Engineering: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  Operations: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  Marketing: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', dot: 'bg-pink-500' },
  Finance: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  Online: { color: 'bg-green-500', label: 'Online' },
  Busy: { color: 'bg-amber-500', label: 'Busy' },
  Offline: { color: 'bg-neutral-400', label: 'Offline' },
  InCall: { color: 'bg-blue-500', label: 'In Call' },
}

export default function PeoplePage() {
  const { identity } = useSpacetimeDB()
  const [allEmployees] = useTable(tables.employee)
  const [allMemberships] = useTable(tables.org_membership)
  const { currentOrg } = useOrg()

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)

  // Filter employees to current org
  const orgEmployees = useMemo(() => {
    if (!currentOrg) return allEmployees
    const orgId = Number(currentOrg.id)
    const memberIdentities = new Set(
      allMemberships
        .filter((m) => Number(m.orgId) === orgId && m.status.tag === 'Active')
        .map((m) => m.userId.toHexString())
    )
    return allEmployees.filter((e) => memberIdentities.has(e.id.toHexString()))
  }, [allEmployees, allMemberships, currentOrg])

  // Departments with counts
  const departments = useMemo(() => {
    const deptMap = new Map<string, number>()
    orgEmployees.forEach((e) => {
      const dept = e.department.tag
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1)
    })
    return Array.from(deptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [orgEmployees])

  // Stats
  const stats = useMemo(() => {
    const total = orgEmployees.length
    const humans = orgEmployees.filter((e) => e.employeeType.tag === 'Human').length
    const ai = orgEmployees.filter((e) => e.employeeType.tag === 'AIAgent').length
    const online = orgEmployees.filter((e) => e.status.tag === 'Online' || e.status.tag === 'Busy' || e.status.tag === 'InCall').length
    return { total, humans, ai, online }
  }, [orgEmployees])

  // Filtered and searched employees
  const filteredEmployees = useMemo(() => {
    let list = orgEmployees

    // Filter by tab
    if (activeFilter === 'humans') {
      list = list.filter((e) => e.employeeType.tag === 'Human')
    } else if (activeFilter === 'ai') {
      list = list.filter((e) => e.employeeType.tag === 'AIAgent')
    } else if (activeFilter !== 'all') {
      list = list.filter((e) => e.department.tag === activeFilter)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.department.tag.toLowerCase().includes(q) ||
          (e.email && e.email.toLowerCase().includes(q)) ||
          e.skills.some((s) => s.toLowerCase().includes(q))
      )
    }

    // Sort: online first, then by name
    return list.sort((a, b) => {
      const aOnline = a.status.tag !== 'Offline' ? 0 : 1
      const bOnline = b.status.tag !== 'Offline' ? 0 : 1
      if (aOnline !== bOnline) return aOnline - bOnline
      return a.name.localeCompare(b.name)
    })
  }, [orgEmployees, activeFilter, search])

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-lg shadow-teal-500/25">
            <Users2 className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <GradientText colors={['#14b8a6', '#10b981', '#059669']} animationSpeed={6}>
                People
              </GradientText>
            </h1>
            <p className="text-muted-foreground text-sm">
              Your team directory — humans and AI employees
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total People', value: stats.total, color: '#14b8a6' },
          { label: 'Humans', value: stats.humans, color: '#3b82f6' },
          { label: 'AI Agents', value: stats.ai, color: '#a855f7' },
          { label: 'Currently Active', value: stats.online, color: '#22c55e' },
        ].map((stat) => (
          <SpotlightCard key={stat.label} spotlightColor={stat.color} className="p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">
              <CountUp to={stat.value} />
            </p>
          </SpotlightCard>
        ))}
      </div>

      {/* Department Breakdown */}
      {departments.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Building2 className="size-3.5" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => {
                const colors = DEPARTMENT_COLORS[dept.name] || DEPARTMENT_COLORS.Operations
                return (
                  <button
                    key={dept.name}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs border transition-all ${
                      activeFilter === dept.name
                        ? `${colors.bg} ${colors.text} border-current/20 ring-1 ring-current/20`
                        : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => setActiveFilter(activeFilter === dept.name ? 'all' : dept.name)}
                  >
                    <div className={`size-2 rounded-full ${colors.dot}`} />
                    {dept.name}
                    <span className="font-semibold tabular-nums">{dept.count}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people, roles, skills..."
            className="pl-10"
          />
        </div>
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="humans" className="gap-1.5">
              <User className="size-3" />
              Humans
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Bot className="size-3" />
              AI
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-xs text-muted-foreground">
        {filteredEmployees.length} {filteredEmployees.length === 1 ? 'person' : 'people'}
        {search && ` matching "${search}"`}
        {activeFilter !== 'all' && ` in ${activeFilter}`}
      </p>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((person) => {
            const deptColors = DEPARTMENT_COLORS[person.department.tag] || DEPARTMENT_COLORS.Operations
            const statusCfg = STATUS_CONFIG[person.status.tag] || STATUS_CONFIG.Offline
            const isMe = identity && person.id.toHexString() === identity.toHexString()

            return (
              <Link key={person.id.toHexString()} href={`/profile/${person.id.toHexString()}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 h-full">
                  <CardContent className="pt-5 pb-4 px-4">
                    <div className="flex flex-col items-center text-center">
                      {/* Avatar with status */}
                      <div className="relative mb-3">
                        <Avatar className="size-16 ring-2 ring-background shadow-md">
                          <AvatarImage src={person.avatarUrl ?? undefined} alt={person.name} />
                          <AvatarFallback className={`text-sm font-semibold ${
                            person.employeeType.tag === 'AIAgent'
                              ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white'
                              : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                          }`}>
                            {person.employeeType.tag === 'AIAgent' ? (
                              <Bot className="size-6" />
                            ) : (
                              getInitials(person.name)
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 size-4 rounded-full border-2 border-card ${statusCfg.color}`}
                          title={statusCfg.label}
                        />
                      </div>

                      {/* Name & Role */}
                      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {person.name}
                        {isMe && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0">you</Badge>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{person.role || 'Team Member'}</p>

                      {/* Department badge */}
                      <Badge
                        variant="outline"
                        className={`mt-2 text-[10px] ${deptColors.bg} ${deptColors.text} border-current/20`}
                      >
                        {person.department.tag}
                      </Badge>

                      {/* AI badge */}
                      {person.employeeType.tag === 'AIAgent' && (
                        <Badge variant="outline" className="mt-1.5 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                          <Bot className="size-2.5 mr-1" />
                          AI Agent
                        </Badge>
                      )}

                      {/* Skills preview */}
                      {person.skills.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-3">
                          {person.skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                              {skill}
                            </Badge>
                          ))}
                          {person.skills.length > 3 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              +{person.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Shield className="size-3" />
                          {Number(person.tasksCompleted)} tasks
                        </span>
                        {person.avgConfidenceScore != null && (
                          <span>{Math.round(person.avgConfidenceScore * 100)}% conf.</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredEmployees.map((person) => {
                const deptColors = DEPARTMENT_COLORS[person.department.tag] || DEPARTMENT_COLORS.Operations
                const statusCfg = STATUS_CONFIG[person.status.tag] || STATUS_CONFIG.Offline
                const isMe = identity && person.id.toHexString() === identity.toHexString()

                return (
                  <Link
                    key={person.id.toHexString()}
                    href={`/profile/${person.id.toHexString()}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarImage src={person.avatarUrl ?? undefined} alt={person.name} />
                        <AvatarFallback className={`text-xs font-semibold ${
                          person.employeeType.tag === 'AIAgent'
                            ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white'
                            : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                        }`}>
                          {person.employeeType.tag === 'AIAgent' ? (
                            <Bot className="size-4" />
                          ) : (
                            getInitials(person.name)
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${statusCfg.color}`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {person.name}
                        </p>
                        {isMe && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">you</Badge>
                        )}
                        {person.employeeType.tag === 'AIAgent' && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {person.role || 'Team Member'}
                      </p>
                    </div>

                    {/* Department */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${deptColors.bg} ${deptColors.text} border-current/20`}
                    >
                      {person.department.tag}
                    </Badge>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`size-2 rounded-full ${statusCfg.color}`} />
                      <span className="text-xs text-muted-foreground">{statusCfg.label}</span>
                    </div>

                    {/* Tasks completed */}
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">
                      {Number(person.tasksCompleted)} tasks
                    </span>

                    <ChevronRight className="size-4 text-muted-foreground/50 shrink-0 group-hover:text-primary transition-colors" />
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users2 className="size-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No people found</p>
          <p className="text-xs mt-1">
            {search ? 'Try adjusting your search terms' : 'No team members in this organization yet'}
          </p>
        </div>
      )}
    </div>
  )
}
