'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTable, useReducer as useSpacetimeReducer, useSpacetimeDB } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
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
  CalendarDays,
  Heart,
  Repeat2,
  MessageCircle,
  Eye,
  Bookmark,
  Share,
  MoreHorizontal,
  Sparkles,
  Bot,
  Users,
  Zap,
  ArrowLeft,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { FeedPost } from '@/generated/types'

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
  'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Moscow', 'Europe/Istanbul',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
]

type ProfileTab = 'posts' | 'replies' | 'likes' | 'about'

function getTimestampMs(timestamp: any): number {
  if (!timestamp) return 0
  const micros = timestamp.__timestamp_micros_since_unix_epoch__
  if (micros === undefined || micros === null) return 0
  return Number(micros / 1000n)
}

function formatTimeAgo(timestamp: any): string {
  const then = getTimestampMs(timestamp)
  if (!then) return ''
  const diff = Date.now() - then
  if (diff < 60_000) return 'now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d`
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatCount(n: number | bigint): string {
  const num = Number(n)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ProfilePage() {
  const { identity } = useSpacetimeDB()
  const [allEmployees] = useTable(tables.employee)
  const [allTasks] = useTable(tables.task)
  const [allPosts] = useTable(tables.feed_post)
  const [allLikes] = useTable(tables.feed_like)
  const [allFollows] = useTable(tables.feed_follow)
  const updateResume = useSpacetimeReducer(reducers.updateEmployeeResume)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')

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

  const myHex = identity?.toHexString()

  const me = useMemo(() => {
    if (!identity) return null
    return allEmployees.find((e) => e.id.toHexString() === myHex) ?? null
  }, [allEmployees, identity, myHex])

  const followerCount = useMemo(
    () => allFollows.filter((f) => f.followingId.toHexString() === myHex).length,
    [allFollows, myHex]
  )
  const followingCount = useMemo(
    () => allFollows.filter((f) => f.followerId.toHexString() === myHex).length,
    [allFollows, myHex]
  )

  const myPosts = useMemo(
    () =>
      allPosts
        .filter((p) => p.author.toHexString() === myHex && !p.deleted && p.postType.tag !== 'Reply')
        .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)),
    [allPosts, myHex]
  )

  const myReplies = useMemo(
    () =>
      allPosts
        .filter((p) => p.author.toHexString() === myHex && !p.deleted && p.postType.tag === 'Reply')
        .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)),
    [allPosts, myHex]
  )

  const myLikedPosts = useMemo(() => {
    const likedIds = new Set(
      allLikes.filter((l) => l.userId.toHexString() === myHex).map((l) => Number(l.postId))
    )
    return allPosts
      .filter((p) => likedIds.has(Number(p.id)) && !p.deleted)
      .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt))
  }, [allPosts, allLikes, myHex])

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
    list: string[], setList: (v: string[]) => void,
    input: string, setInput: (v: string) => void
  ) => {
    const val = input.trim()
    if (val && !list.includes(val)) setList([...list, val])
    setInput('')
  }

  const removeFromList = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="size-16 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    )
  }

  const initials = getInitials(me.name || 'U')
  const statusColor = {
    Online: 'bg-green-500', Busy: 'bg-amber-500', Offline: 'bg-neutral-400', InCall: 'bg-blue-500',
  }[me.status.tag] ?? 'bg-neutral-400'

  const tabPosts = activeTab === 'posts' ? myPosts : activeTab === 'replies' ? myReplies : activeTab === 'likes' ? myLikedPosts : []

  return (
    <div className="max-w-2xl mx-auto border-x min-h-full">
      {/* Header / Banner */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-primary/20 via-violet-500/15 to-cyan-400/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.1),transparent_50%)]" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Avatar - overlapping banner */}
        <div className="absolute -bottom-16 left-4">
          <div className="relative">
            <Avatar className="size-32 border-4 border-background shadow-xl">
              <AvatarImage src={me.avatarUrl ?? undefined} alt={me.name} />
              <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              'absolute bottom-2 right-2 size-5 rounded-full border-[3px] border-background',
              statusColor
            )} />
          </div>
        </div>

        {/* Edit button top-right */}
        <div className="absolute top-4 right-4">
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="rounded-full bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background"
            >
              <Pencil className="size-3.5 mr-1.5" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving} className="rounded-full bg-background/80 backdrop-blur-sm">
                <X className="size-3.5 mr-1.5" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-full">
                <Check className="size-3.5 mr-1.5" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profile info */}
      <div className="pt-20 px-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{me.name}</h1>
            <p className="text-muted-foreground text-sm">@{me.name.toLowerCase().replace(/\s+/g, '')}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">{me.department.tag}</Badge>
            <Badge
              variant="outline"
              className={cn('text-xs', {
                'border-green-500/50 text-green-600 dark:text-green-400': me.status.tag === 'Online',
                'border-amber-500/50 text-amber-600 dark:text-amber-400': me.status.tag === 'Busy',
                'border-blue-500/50 text-blue-600 dark:text-blue-400': me.status.tag === 'InCall',
              })}
            >
              {me.status.tag}
            </Badge>
            {me.employeeType.tag === 'AiAgent' && (
              <Badge variant="outline" className="border-violet-500/50 text-violet-600 dark:text-violet-400 gap-0.5 text-xs">
                <Sparkles className="size-2.5" /> AI
              </Badge>
            )}
          </div>
        </div>

        {/* Bio */}
        {editing ? (
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short bio..."
            className="mt-3 min-h-20 text-sm"
          />
        ) : me.bio ? (
          <p className="mt-2 text-sm leading-relaxed">{me.bio}</p>
        ) : null}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
          {me.role && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="size-3.5" /> {me.role}
            </span>
          )}
          {me.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" /> {me.email}
            </span>
          )}
          {(editing ? timezone : me.timezone) && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {editing ? timezone : me.timezone}
            </span>
          )}
          {(editing ? linkedinUrl : me.linkedinUrl) && (
            <a href={editing ? linkedinUrl : me.linkedinUrl!} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Linkedin className="size-3.5" /> LinkedIn
            </a>
          )}
          {(editing ? githubUrl : me.githubUrl) && (
            <a href={editing ? githubUrl : me.githubUrl!} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Github className="size-3.5" /> GitHub
            </a>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> Joined {new Date(getTimestampMs(me.createdAt)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Follow counts */}
        <div className="flex items-center gap-4 mt-3">
          <span className="text-sm">
            <span className="font-bold">{formatCount(followingCount)}</span>{' '}
            <span className="text-muted-foreground">Following</span>
          </span>
          <span className="text-sm">
            <span className="font-bold">{formatCount(followerCount)}</span>{' '}
            <span className="text-muted-foreground">Followers</span>
          </span>
          <span className="text-sm">
            <span className="font-bold">{formatCount(myPosts.length)}</span>{' '}
            <span className="text-muted-foreground">Posts</span>
          </span>
        </div>

        {/* Skills */}
        {editing ? (
          <div className="mt-3 space-y-2">
            <label className="text-sm font-medium">Skills</label>
            <div className="flex gap-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add skill..." className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList(skills, setSkills, skillInput, setSkillInput) } }}
              />
              <Button variant="outline" size="icon" className="size-8" onClick={() => addToList(skills, setSkills, skillInput, setSkillInput)} disabled={!skillInput.trim()}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1 text-xs">
                  {s}
                  <button onClick={() => removeFromList(skills, setSkills, i)} className="hover:bg-muted rounded-sm p-0.5"><X className="size-2.5" /></button>
                </Badge>
              ))}
            </div>
          </div>
        ) : me.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {me.skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </div>
        ) : null}
      </div>

      {/* Edit-only sections */}
      {editing && (
        <div className="px-4 pb-4 space-y-4 border-b">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">LinkedIn URL</label>
              <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">GitHub URL</label>
              <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Timezone</label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full sm:w-72 h-8 text-sm"><SelectValue placeholder="Select timezone" /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (<SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Employment */}
          <div>
            <label className="text-sm font-medium mb-1 block">Employment History</label>
            <div className="flex gap-2 mb-2">
              <Input value={empInput} onChange={(e) => setEmpInput(e.target.value)} placeholder="Senior Engineer at Acme (2020-2023)" className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList(employmentHistory, setEmploymentHistory, empInput, setEmpInput) } }}
              />
              <Button variant="outline" size="icon" className="size-8" onClick={() => addToList(employmentHistory, setEmploymentHistory, empInput, setEmpInput)} disabled={!empInput.trim()}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {employmentHistory.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm mb-1">
                <Briefcase className="size-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">{entry}</span>
                <button onClick={() => removeFromList(employmentHistory, setEmploymentHistory, i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
              </div>
            ))}
          </div>

          {/* Education */}
          <div>
            <label className="text-sm font-medium mb-1 block">Education</label>
            <div className="flex gap-2 mb-2">
              <Input value={eduInput} onChange={(e) => setEduInput(e.target.value)} placeholder="B.S. Computer Science, MIT (2018)" className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList(education, setEducation, eduInput, setEduInput) } }}
              />
              <Button variant="outline" size="icon" className="size-8" onClick={() => addToList(education, setEducation, eduInput, setEduInput)} disabled={!eduInput.trim()}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {education.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm mb-1">
                <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">{entry}</span>
                <button onClick={() => removeFromList(education, setEducation, i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
              </div>
            ))}
          </div>

          {/* Certifications */}
          <div>
            <label className="text-sm font-medium mb-1 block">Certifications</label>
            <div className="flex gap-2 mb-2">
              <Input value={certInput} onChange={(e) => setCertInput(e.target.value)} placeholder="AWS Solutions Architect" className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList(certifications, setCertifications, certInput, setCertInput) } }}
              />
              <Button variant="outline" size="icon" className="size-8" onClick={() => addToList(certifications, setCertifications, certInput, setCertInput)} disabled={!certInput.trim()}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {certifications.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm mb-1">
                <Award className="size-3.5 text-amber-500 shrink-0" />
                <span className="flex-1">{entry}</span>
                <button onClick={() => removeFromList(certifications, setCertifications, i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
        {([
          { key: 'posts' as const, label: 'Posts', count: myPosts.length },
          { key: 'replies' as const, label: 'Replies', count: myReplies.length },
          { key: 'likes' as const, label: 'Likes', count: myLikedPosts.length },
          { key: 'about' as const, label: 'About' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80 hover:bg-muted/30'
            )}
          >
            {tab.label}
            {'count' in tab && tab.count > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">({tab.count})</span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'about' ? (
        <div className="p-4 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-2xl font-bold tabular-nums">{Number(me.tasksCompleted)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tasks Done</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {me.avgConfidenceScore != null ? `${Math.round(me.avgConfidenceScore * 100)}%` : '--'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Avg Confidence</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {allTasks.filter((t) =>
                  t.assignee?.toHexString() === myHex &&
                  (t.status.tag === 'InProgress' || t.status.tag === 'Claimed')
                ).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Active Tasks</p>
            </div>
          </div>

          {/* Employment */}
          {me.employmentHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Briefcase className="size-4" /> Employment
              </h3>
              <div className="space-y-2">
                {me.employmentHistory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 flex flex-col items-center">
                      <div className="size-2 rounded-full bg-primary" />
                      {i < me.employmentHistory.length - 1 && <div className="w-px h-6 bg-border mt-0.5" />}
                    </div>
                    <p className="text-sm">{entry}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {me.education.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <GraduationCap className="size-4" /> Education
              </h3>
              {me.education.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm mb-1.5">
                  <GraduationCap className="size-3.5 text-muted-foreground" />
                  {entry}
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {me.certifications.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Award className="size-4" /> Certifications
              </h3>
              {me.certifications.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm mb-1.5">
                  <Award className="size-3.5 text-amber-500" />
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tabPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Zap className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm">
            {activeTab === 'posts' ? 'No posts yet.' : activeTab === 'replies' ? 'No replies yet.' : 'No liked posts yet.'}
          </p>
        </div>
      ) : (
        tabPosts.map((post) => {
          const author = allEmployees.find((e) => e.id.toHexString() === post.author.toHexString())
          return (
            <article key={post.id.toString()} className="border-b px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex gap-3">
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={author?.avatarUrl ?? undefined} />
                  <AvatarFallback className={cn(
                    'text-xs font-bold',
                    post.isAiGenerated ? 'bg-gradient-to-br from-violet-500 to-cyan-400 text-white' : 'bg-primary/10 text-primary'
                  )}>
                    {post.isAiGenerated ? <Bot className="size-5" /> : (author ? getInitials(author.name) : '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[15px] truncate">{author?.name ?? 'Unknown'}</span>
                    <span className="text-muted-foreground text-sm">&middot; {formatTimeAgo(post.createdAt)}</span>
                  </div>
                  <p className="text-[15px] leading-relaxed mt-0.5 whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-6 mt-2 text-muted-foreground text-xs">
                    <span className="flex items-center gap-1"><MessageCircle className="size-3.5" /> {formatCount(post.repliesCount)}</span>
                    <span className="flex items-center gap-1"><Repeat2 className="size-3.5" /> {formatCount(post.repostsCount)}</span>
                    <span className="flex items-center gap-1"><Heart className="size-3.5" /> {formatCount(post.likesCount)}</span>
                    <span className="flex items-center gap-1"><Eye className="size-3.5" /> {formatCount(post.viewsCount)}</span>
                  </div>
                </div>
              </div>
            </article>
          )
        })
      )}
    </div>
  )
}
