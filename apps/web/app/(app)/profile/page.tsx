'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pencil,
  X,
  Check,
  Plus,
  Trash2,
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
} from 'lucide-react'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
]

export default function ProfilePage() {
  const { identity } = useSpacetimeDB()
  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const updateResume = useSpacetimeReducer(reducers.updateEmployeeResume)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [education, setEducation] = useState<string[]>([])
  const [eduInput, setEduInput] = useState('')
  const [certifications, setCertifications] = useState<string[]>([])
  const [certInput, setCertInput] = useState('')
  const [employmentHistory, setEmploymentHistory] = useState<string[]>([])
  const [empInput, setEmpInput] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [timezone, setTimezone] = useState('')

  const me = useMemo(() => {
    if (!identity) return null
    return allEmployees.find((e) => e.id.toHexString() === identity.toHexString()) ?? null
  }, [allEmployees, identity])

  const myTasks = useMemo(() => {
    if (!identity) return []
    return allTasks.filter(
      (t) => t.assignee && t.assignee.toHexString() === identity.toHexString()
    )
  }, [allTasks, identity])

  const currentTask = useMemo(() => {
    if (!me?.currentTaskId) return null
    return allTasks.find((t) => t.id === me.currentTaskId) ?? null
  }, [me, allTasks])

  // Populate edit form when entering edit mode
  useEffect(() => {
    if (me && editing) {
      setBio(me.bio ?? '')
      setSkills([...me.skills])
      setEducation([...me.education])
      setCertifications([...me.certifications])
      setEmploymentHistory([...me.employmentHistory])
      setLinkedinUrl(me.linkedinUrl ?? '')
      setGithubUrl(me.githubUrl ?? '')
      setTimezone(me.timezone ?? '')
    }
  }, [me, editing])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateResume({
        bio: bio.trim() || undefined,
        skills,
        education,
        certifications,
        employmentHistory,
        linkedinUrl: linkedinUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        timezone: timezone || undefined,
      })
      setEditing(false)
    } catch (err) {
      console.error('Failed to update resume:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setSkillInput('')
    setEduInput('')
    setCertInput('')
    setEmpInput('')
  }

  const addToList = (
    list: string[],
    setList: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void
  ) => {
    const val = input.trim()
    if (val && !list.includes(val)) {
      setList([...list, val])
    }
    setInput('')
  }

  const removeFromList = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  const initials = (me.name || 'U')
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
  }[me.status.tag] ?? 'bg-neutral-400'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="size-24 text-2xl">
                <AvatarImage src={me.avatarUrl ?? undefined} alt={me.name} />
                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-1 right-1 size-4 rounded-full border-2 border-card ${statusColor}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{me.name}</h1>
                  <p className="text-muted-foreground">{me.role || 'Team Member'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{me.department.tag}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        me.status.tag === 'Online'
                          ? 'border-green-500/50 text-green-500'
                          : me.status.tag === 'Busy'
                          ? 'border-amber-500/50 text-amber-500'
                          : me.status.tag === 'InCall'
                          ? 'border-blue-500/50 text-blue-500'
                          : ''
                      }
                    >
                      {me.status.tag}
                    </Badge>
                    {me.employeeType.tag === 'AiAgent' && (
                      <Badge variant="outline" className="border-purple-500/50 text-purple-500">
                        AI Agent
                      </Badge>
                    )}
                  </div>
                </div>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                )}
                {editing && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                      <X className="size-3.5 mr-1.5" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Check className="size-3.5 mr-1.5" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Contact bar */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                {me.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {me.email}
                  </span>
                )}
                {(editing ? linkedinUrl : me.linkedinUrl) && (
                  <a
                    href={editing ? linkedinUrl : me.linkedinUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Linkedin className="size-3.5" />
                    LinkedIn
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {(editing ? githubUrl : me.githubUrl) && (
                  <a
                    href={editing ? githubUrl : me.githubUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Github className="size-3.5" />
                    GitHub
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {(editing ? timezone : me.timezone) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {editing ? timezone : me.timezone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="size-4" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio about yourself..."
              className="min-h-24"
            />
          ) : me.bio ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{me.bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No bio added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Edit-mode fields for LinkedIn, GitHub, Timezone */}
      {editing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4" />
              Links & Timezone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">LinkedIn URL</label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">GitHub URL</label>
                <Input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Timezone</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Type a skill and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToList(skills, setSkills, skillInput, setSkillInput)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => addToList(skills, setSkills, skillInput, setSkillInput)}
                  disabled={!skillInput.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <button
                      onClick={() => removeFromList(skills, setSkills, i)}
                      className="ml-0.5 hover:bg-muted rounded-sm p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ) : me.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {me.skills.map((skill, i) => (
                <Badge key={i} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No skills added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Employment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="size-4" />
            Employment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={empInput}
                  onChange={(e) => setEmpInput(e.target.value)}
                  placeholder="e.g. Senior Engineer at Acme Corp (2020-2023)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToList(employmentHistory, setEmploymentHistory, empInput, setEmpInput)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    addToList(employmentHistory, setEmploymentHistory, empInput, setEmpInput)
                  }
                  disabled={!empInput.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {employmentHistory.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <Briefcase className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{entry}</span>
                    <button
                      onClick={() =>
                        removeFromList(employmentHistory, setEmploymentHistory, i)
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : me.employmentHistory.length > 0 ? (
            <div className="space-y-3">
              {me.employmentHistory.map((entry, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 flex flex-col items-center">
                    <div className="size-2.5 rounded-full bg-primary" />
                    {i < me.employmentHistory.length - 1 && (
                      <div className="w-px h-8 bg-border mt-1" />
                    )}
                  </div>
                  <p className="text-sm pt-0.5">{entry}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No employment history added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="size-4" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={eduInput}
                  onChange={(e) => setEduInput(e.target.value)}
                  placeholder="e.g. B.S. Computer Science, MIT (2018)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToList(education, setEducation, eduInput, setEduInput)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => addToList(education, setEducation, eduInput, setEduInput)}
                  disabled={!eduInput.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {education.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <GraduationCap className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{entry}</span>
                    <button
                      onClick={() => removeFromList(education, setEducation, i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : me.education.length > 0 ? (
            <div className="space-y-2">
              {me.education.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <GraduationCap className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{entry}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No education added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="size-4" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  placeholder="e.g. AWS Solutions Architect Professional"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToList(certifications, setCertifications, certInput, setCertInput)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    addToList(certifications, setCertifications, certInput, setCertInput)
                  }
                  disabled={!certInput.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {certifications.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <Award className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{entry}</span>
                    <button
                      onClick={() => removeFromList(certifications, setCertifications, i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : me.certifications.length > 0 ? (
            <div className="space-y-2">
              {me.certifications.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Award className="size-4 text-amber-500 shrink-0" />
                  <span className="text-sm">{entry}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No certifications added yet.</p>
          )}
        </CardContent>
      </Card>

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
              <p className="text-3xl font-bold">{Number(me.tasksCompleted)}</p>
              <p className="text-xs text-muted-foreground mt-1">Tasks Completed</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold">
                {me.avgConfidenceScore != null
                  ? `${Math.round(me.avgConfidenceScore * 100)}%`
                  : '--'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Confidence</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold">
                {myTasks.filter((t) => t.status.tag === 'InProgress' || t.status.tag === 'Claimed').length}
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
