'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { tables } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Mail,
  Globe,
  Clock,
  Briefcase,
  GraduationCap,
  Award,
  Activity,
  ExternalLink,
  Github,
  Linkedin,
  MapPin,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

export default function PublicProfilePage() {
  const params = useParams()
  const profileId = params.id as string
  const { identity } = useSpacetimeDB()
  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)

  const employee = useMemo(() => {
    return allEmployees.find((e) => e.id.toHexString() === profileId) ?? null
  }, [allEmployees, profileId])

  const isOwnProfile = useMemo(() => {
    if (!identity || !employee) return false
    return employee.id.toHexString() === identity.toHexString()
  }, [identity, employee])

  const employeeTasks = useMemo(() => {
    if (!employee) return []
    return allTasks.filter(
      (t) => t.assignee && t.assignee.toHexString() === employee.id.toHexString()
    )
  }, [allTasks, employee])

  const currentTask = useMemo(() => {
    if (!employee?.currentTaskId) return null
    return allTasks.find((t) => t.id === employee.currentTaskId) ?? null
  }, [employee, allTasks])

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Employee not found.</p>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Back to Dashboard
        </Link>
      </div>
    )
  }

  // If viewing own profile, redirect hint
  if (isOwnProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">This is your profile.</p>
        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Go to My Profile
        </Link>
      </div>
    )
  }

  const initials = (employee.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const statusColor = {
    Online: 'bg-green-500',
    Busy: 'bg-amber-500',
    Offline: 'bg-neutral-400',
    InCall: 'bg-blue-500',
  }[employee.status.tag] ?? 'bg-neutral-400'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2')}
      >
        <ArrowLeft className="size-3.5 mr-1.5" />
        Back
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="size-24 text-2xl">
                <AvatarImage src={employee.avatarUrl ?? undefined} alt={employee.name} />
                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-1 right-1 size-4 rounded-full border-2 border-card ${statusColor}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
                <p className="text-muted-foreground">{employee.role || 'Team Member'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{employee.department.tag}</Badge>
                  <Badge
                    variant="outline"
                    className={
                      employee.status.tag === 'Online'
                        ? 'border-green-500/50 text-green-500'
                        : employee.status.tag === 'Busy'
                        ? 'border-amber-500/50 text-amber-500'
                        : employee.status.tag === 'InCall'
                        ? 'border-blue-500/50 text-blue-500'
                        : ''
                    }
                  >
                    {employee.status.tag}
                  </Badge>
                  {employee.employeeType.tag === 'AiAgent' && (
                    <Badge variant="outline" className="border-purple-500/50 text-purple-500">
                      AI Agent
                    </Badge>
                  )}
                </div>
              </div>

              {/* Contact bar */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                {employee.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {employee.email}
                  </span>
                )}
                {employee.linkedinUrl && (
                  <a
                    href={employee.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Linkedin className="size-3.5" />
                    LinkedIn
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {employee.githubUrl && (
                  <a
                    href={employee.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Github className="size-3.5" />
                    GitHub
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {employee.timezone && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {employee.timezone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      {employee.bio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{employee.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {employee.skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4" />
              Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {employee.skills.map((skill, i) => (
                <Badge key={i} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employment History */}
      {employee.employmentHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="size-4" />
              Employment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employee.employmentHistory.map((entry, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 flex flex-col items-center">
                    <div className="size-2.5 rounded-full bg-primary" />
                    {i < employee.employmentHistory.length - 1 && (
                      <div className="w-px h-8 bg-border mt-1" />
                    )}
                  </div>
                  <p className="text-sm pt-0.5">{entry}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {employee.education.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="size-4" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {employee.education.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <GraduationCap className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{entry}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {employee.certifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="size-4" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {employee.certifications.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Award className="size-4 text-amber-500 shrink-0" />
                  <span className="text-sm">{entry}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4" />
            Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold">{Number(employee.tasksCompleted)}</p>
              <p className="text-xs text-muted-foreground mt-1">Tasks Completed</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold">
                {employee.avgConfidenceScore != null
                  ? `${Math.round(employee.avgConfidenceScore * 100)}%`
                  : '--'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Confidence</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold">
                {employeeTasks.filter(
                  (t) => t.status.tag === 'InProgress' || t.status.tag === 'Claimed'
                ).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Active Tasks</p>
            </div>
          </div>
          {currentTask && (
            <div className="mt-4 p-3 rounded-lg border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current Task</p>
                <p className="text-sm font-medium">{currentTask.title}</p>
              </div>
              <Badge variant="outline">{currentTask.status.tag}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
