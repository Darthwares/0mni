'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Key,
  Check,
  Building2,
  UserPlus,
  Link2,
  Copy,
  CheckCircle,
  XCircle,
  Crown,
  ShieldCheck,
  Users as UsersIcon,
  Mail,
  Send,
  Zap,
  Activity,
  Lock,
  Eye,
  Monitor,
  Smartphone,
  Laptop,
} from 'lucide-react'
import { useAuth } from 'react-oidc-context'
import { useOrg, displayOrgName } from '@/components/org-context'
import { useSpacetimeDB } from 'spacetimedb/react'
import { GradientText } from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'

export default function SettingsPage() {
  const auth = useAuth()
  const { identity } = useSpacetimeDB()
  const { currentOrgId: orgId, currentOrg, orgMembers: allOrgMembers, isAdminOrOwner, myRole } = useOrg()
  const [allEmployees] = useTable(tables.employee)
  const [allInviteLinks] = useTable(tables.org_invite_link)
  const updateProfile = useSpacetimeReducer(reducers.updateEmployeeProfile)
  const inviteByEmail = useSpacetimeReducer(reducers.inviteByEmail)
  const generateInviteLink = useSpacetimeReducer(reducers.generateInviteLink)
  const approveMembership = useSpacetimeReducer(reducers.approveMembership)
  const rejectMembership = useSpacetimeReducer(reducers.rejectMembership)
  const revokeInviteLink = useSpacetimeReducer(reducers.revokeInviteLink)
  const updateMemberRole = useSpacetimeReducer(reducers.updateMemberRole)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileRole, setProfileRole] = useState('')
  const [profileDepartment, setProfileDepartment] = useState('Operations')
  const [notifications, setNotifications] = useState({
    email: true,
    desktop: true,
    ticketUpdates: true,
    aiAlerts: true,
    dealChanges: false,
  })

  // Org management state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [linkEmailTarget, setLinkEmailTarget] = useState<string | null>(null)
  const [linkEmailAddress, setLinkEmailAddress] = useState('')
  const [linkEmailSending, setLinkEmailSending] = useState(false)

  const activeMembers = useMemo(() => allOrgMembers.filter((m) => m.status.tag === 'Active'), [allOrgMembers])
  const pendingMembers = useMemo(() => allOrgMembers.filter((m) => m.status.tag === 'Pending'), [allOrgMembers])
  const invitedMembers = useMemo(() => allOrgMembers.filter((m) => m.status.tag === 'Invited'), [allOrgMembers])

  const orgInviteLinks = useMemo(() => {
    if (orgId === null) return []
    return allInviteLinks.filter((l) => Number(l.orgId) === orgId && l.active)
  }, [allInviteLinks, orgId])

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteSent(false)
    try {
      if (!orgId) return
      await inviteByEmail({ orgId: BigInt(orgId), email: inviteEmail.trim() })

      const currentEmployee = allEmployees.find(
        (e) => identity && e.id.toHexString() === identity.toHexString()
      )
      await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.user?.id_token ? { Authorization: `Bearer ${auth.user.id_token}` } : {}),
        },
        body: JSON.stringify({
          type: 'invite-email',
          email: inviteEmail.trim(),
          orgName: displayOrgName(currentOrg?.name) || 'Omni',
          inviterName: currentEmployee?.name || undefined,
        }),
      })

      setInviteSent(true)
      setInviteEmail('')
      setTimeout(() => setInviteSent(false), 3000)
    } catch (err) {
      console.error('Failed to invite:', err)
    } finally {
      setInviteSending(false)
    }
  }

  const handleGenerateLink = async () => {
    try {
      if (!orgId) return
      await generateInviteLink({ orgId: BigInt(orgId), maxUses: undefined })
    } catch (err) {
      console.error('Failed to generate invite link:', err)
    }
  }

  const handleSendLinkEmail = async (code: string) => {
    if (!linkEmailAddress.trim()) return
    setLinkEmailSending(true)
    try {
      const currentEmployee = allEmployees.find(
        (e) => identity && e.id.toHexString() === identity.toHexString()
      )
      await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.user?.id_token ? { Authorization: `Bearer ${auth.user.id_token}` } : {}),
        },
        body: JSON.stringify({
          type: 'invite-link',
          email: linkEmailAddress.trim(),
          orgName: displayOrgName(currentOrg?.name) || 'Omni',
          inviteCode: code,
          inviterName: currentEmployee?.name || undefined,
        }),
      })
      setLinkEmailTarget(null)
      setLinkEmailAddress('')
    } catch (err) {
      console.error('Failed to send invite link email:', err)
    } finally {
      setLinkEmailSending(false)
    }
  }

  const handleCopyInviteLink = (code: string) => {
    const url = `${window.location.origin}/invite/${code}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleApprove = async (membershipId: bigint) => {
    try {
      await approveMembership({ membershipId })
    } catch (err) {
      console.error('Failed to approve:', err)
    }
  }

  const handleReject = async (membershipId: bigint) => {
    try {
      await rejectMembership({ membershipId })
    } catch (err) {
      console.error('Failed to reject:', err)
    }
  }

  const handleRevokeLink = async (linkId: bigint) => {
    try {
      await revokeInviteLink({ linkId })
    } catch (err) {
      console.error('Failed to revoke link:', err)
    }
  }

  const roleIcon = (tag: string) => {
    if (tag === 'Owner') return <Crown className="size-3.5 text-amber-500" />
    if (tag === 'Admin') return <ShieldCheck className="size-3.5 text-blue-500" />
    return <UsersIcon className="size-3.5 text-neutral-400" />
  }

  const currentEmployee = useMemo(() => {
    if (!identity) return null
    const myHex = identity.toHexString()
    return allEmployees.find((e) => e.id.toHexString() === myHex) ?? null
  }, [allEmployees, identity])

  useEffect(() => {
    if (currentEmployee) {
      setProfileName(currentEmployee.name || '')
      setProfileEmail(currentEmployee.email || '')
      setProfileRole(currentEmployee.role || '')
      setProfileDepartment(currentEmployee.department?.tag || 'Operations')
    } else {
      setProfileName(auth.user?.profile?.name ?? '')
      setProfileEmail(auth.user?.profile?.email ?? '')
    }
  }, [currentEmployee, auth.user?.profile])

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile({
        name: profileName.trim(),
        email: profileEmail.trim() || undefined,
        role: profileRole.trim() || 'Team Member',
        department: { tag: profileDepartment } as any,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText colors={['#6366f1', '#8b5cf6', '#a78bfa', '#818cf8']} animationSpeed={6}>
              Settings
            </GradientText>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage your account, organization, and platform preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {myRole && (
            <Badge variant="outline" className="text-xs gap-1.5">
              {roleIcon(myRole)}
              {myRole}
            </Badge>
          )}
          {currentOrg && (
            <Badge className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
              {displayOrgName(currentOrg.name)}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-neutral-100/80 dark:bg-neutral-800/80">
          <TabsTrigger value="profile" className="gap-1.5 text-xs">
            <User className="size-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-1.5 text-xs">
            <Building2 className="size-3.5" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs">
            <Bell className="size-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs">
            <Shield className="size-3.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="platform" className="gap-1.5 text-xs">
            <Database className="size-3.5" />
            Platform
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ────────────────────── */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.15)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                  <User className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile Information</CardTitle>
                  <CardDescription className="text-xs">Update your personal details and role</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="mt-1.5 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="mt-1.5 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Role</Label>
                  <Input
                    value={profileRole}
                    onChange={(e) => setProfileRole(e.target.value)}
                    className="mt-1.5 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Department</Label>
                  <Select value={profileDepartment} onValueChange={setProfileDepartment}>
                    <SelectTrigger className="mt-1.5 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700">
                      <SelectValue />
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
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || !profileName.trim()}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm"
                >
                  {saved ? <><Check className="mr-2 size-4" />Saved</> : saving ? 'Saving...' : 'Save Changes'}
                </Button>
                {saved && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="size-3.5" />
                    Profile updated successfully
                  </span>
                )}
              </div>
            </CardContent>
          </SpotlightCard>

          {/* Avatar/Identity card */}
          <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.1)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardContent className="pt-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-semibold">
                  {(profileName || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{profileName || 'Not set'}</p>
                  <p className="text-sm text-muted-foreground">{profileEmail || 'No email'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {profileRole && <Badge variant="secondary" className="text-[10px]">{profileRole}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{profileDepartment}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">SpacetimeDB Identity</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {identity?.toHexString()?.slice(0, 16)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </SpotlightCard>
        </TabsContent>

        {/* ── Organization Tab ────────────────────── */}
        <TabsContent value="organization" className="mt-4 space-y-4">
          {currentOrg && (
            <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                    <Building2 className="size-4" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{displayOrgName(currentOrg.name)}</CardTitle>
                    <CardDescription className="text-xs">
                      {currentOrg.domain && <>Domain: {currentOrg.domain} · </>}
                      {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}
                      {currentOrg.autoApproveDomain && currentOrg.domain && (
                        <> · Auto-approve @{currentOrg.domain}</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold">{activeMembers.length}</p>
                      <p className="text-[10px] text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-500">{pendingMembers.length}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-500">{invitedMembers.length}</p>
                      <p className="text-[10px] text-muted-foreground">Invited</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </SpotlightCard>
          )}

          {/* Invite Members */}
          {isAdminOrOwner && (
            <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.12)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                    <UserPlus className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Invite Members</CardTitle>
                    <CardDescription className="text-xs">Invite people by email or share an invite link</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInviteByEmail()}
                    className="bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                  />
                  <Button
                    onClick={handleInviteByEmail}
                    disabled={inviteSending || !inviteEmail.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    {inviteSent ? <><Check className="mr-1 size-4" />Sent</> : inviteSending ? 'Sending...' : <><Send className="mr-1.5 size-3.5" />Invite</>}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="size-4 text-blue-500" />
                      Invite Links
                    </p>
                    <Button variant="outline" size="sm" onClick={handleGenerateLink} className="text-xs">
                      Generate Link
                    </Button>
                  </div>

                  {orgInviteLinks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">No active invite links</p>
                  ) : (
                    <div className="space-y-2">
                      {orgInviteLinks.map((link) => (
                        <div key={link.id.toString()} className="text-sm bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 space-y-2 border border-neutral-100 dark:border-neutral-700/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link2 className="size-3.5 text-blue-500" />
                              <code className="font-mono text-xs bg-neutral-200/50 dark:bg-neutral-700/50 px-1.5 py-0.5 rounded">{link.code}</code>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-[10px]">
                                {link.useCount} use{Number(link.useCount) !== 1 ? 's' : ''}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleCopyInviteLink(link.code)}
                              >
                                {copiedLink ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => setLinkEmailTarget(linkEmailTarget === link.code ? null : link.code)}
                              >
                                <Mail className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-red-500 hover:text-red-600"
                                onClick={() => handleRevokeLink(link.id)}
                              >
                                <XCircle className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          {linkEmailTarget === link.code && (
                            <div className="flex gap-2">
                              <Input
                                type="email"
                                placeholder="Send link to email..."
                                value={linkEmailAddress}
                                onChange={(e) => setLinkEmailAddress(e.target.value)}
                                className="h-7 text-xs bg-white dark:bg-neutral-900"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendLinkEmail(link.code)}
                              />
                              <Button
                                size="sm"
                                className="h-7 px-2"
                                disabled={linkEmailSending || !linkEmailAddress.trim()}
                                onClick={() => handleSendLinkEmail(link.code)}
                              >
                                <Send className="size-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </SpotlightCard>
          )}

          {/* Pending Requests */}
          {isAdminOrOwner && pendingMembers.length > 0 && (
            <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)" className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="rounded-md p-1 bg-amber-500/10">
                    <Activity className="size-3.5 text-amber-500" />
                  </div>
                  Pending Requests
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                    {pendingMembers.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingMembers.map((m) => (
                  <div key={m.id.toString()} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div>
                      <p className="text-sm font-medium">{m.email}</p>
                      <p className="text-xs text-muted-foreground">Requested access</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleApprove(m.id)}>
                        <CheckCircle className="size-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleReject(m.id)}>
                        <XCircle className="size-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </SpotlightCard>
          )}

          {/* Member List */}
          <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.1)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                  <UsersIcon className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Members ({activeMembers.length})</CardTitle>
                  <CardDescription className="text-xs">People in your organization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {activeMembers.map((m) => {
                const employee = allEmployees.find(
                  (e) => m.identity && e.id.toHexString() === m.identity.toHexString()
                )
                return (
                  <div key={m.id.toString()} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                        {(employee?.name || m.email)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{employee?.name || m.email}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {roleIcon(m.role.tag)}
                      <Badge variant="outline" className="text-[10px]">
                        {m.role.tag}
                      </Badge>
                    </div>
                  </div>
                )
              })}

              {invitedMembers.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-xs font-medium text-muted-foreground pt-1 pb-1 flex items-center gap-1.5">
                    <Mail className="size-3" />
                    Invited ({invitedMembers.length})
                  </p>
                  {invitedMembers.map((m) => (
                    <div key={m.id.toString()} className="flex items-center justify-between py-2.5 px-2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                          <UserPlus className="size-3.5 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Invited</Badge>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </SpotlightCard>
        </TabsContent>

        {/* ── Notifications Tab ────────────────────── */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.12)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <Bell className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Notification Preferences</CardTitle>
                  <CardDescription className="text-xs">Control how and when you receive notifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { key: 'email' as const, label: 'Email Notifications', desc: 'Receive email for important updates', icon: Mail },
                { key: 'desktop' as const, label: 'Desktop Notifications', desc: 'Browser push notifications', icon: Monitor },
                { key: 'ticketUpdates' as const, label: 'Ticket Updates', desc: 'When tickets are assigned or escalated', icon: Activity },
                { key: 'aiAlerts' as const, label: 'AI Agent Alerts', desc: 'When AI agents need human review', icon: Zap },
                { key: 'dealChanges' as const, label: 'Deal Stage Changes', desc: 'When deals move through the pipeline', icon: Globe },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md p-1.5 bg-neutral-100 dark:bg-neutral-800">
                      <item.icon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </SpotlightCard>
        </TabsContent>

        {/* ── Security Tab ────────────────────── */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.1)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-red-500 to-rose-500 text-white">
                  <Shield className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Security & Authentication</CardTitle>
                  <CardDescription className="text-xs">Manage your security settings and sessions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-1.5 bg-emerald-500/10">
                    <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Authentication</p>
                    <p className="text-xs text-muted-foreground">Signed in via OIDC provider</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <CheckCircle className="size-3 mr-1" />
                  Connected
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/50 dark:border-neutral-700/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-1.5 bg-neutral-200 dark:bg-neutral-700">
                    <Key className="size-3.5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Identity</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {auth.user?.profile?.sub?.slice(0, 24)}...
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">OIDC</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/50 dark:border-neutral-700/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-1.5 bg-neutral-200 dark:bg-neutral-700">
                    <Laptop className="size-3.5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Sessions</p>
                    <p className="text-xs text-muted-foreground">Current session from this browser</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Active</span>
                </div>
              </div>
            </CardContent>
          </SpotlightCard>
        </TabsContent>

        {/* ── Platform Tab ────────────────────── */}
        <TabsContent value="platform" className="mt-4 space-y-4">
          <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.12)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                  <Database className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">SpacetimeDB Connection</CardTitle>
                  <CardDescription className="text-xs">Real-time database and sync status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-1.5 bg-emerald-500/10">
                    <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Server</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'maincloud.spacetimedb.com'}
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Connected
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/50 dark:border-neutral-700/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-1.5 bg-neutral-200 dark:bg-neutral-700">
                    <Database className="size-3.5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Database</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {process.env.NEXT_PUBLIC_SPACETIMEDB_NAME || 'omni-platform'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/50 dark:border-neutral-700/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-1.5 bg-neutral-200 dark:bg-neutral-700">
                    <Activity className="size-3.5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Real-time Sync</p>
                    <p className="text-xs text-muted-foreground">
                      All data synced via SpacetimeDB subscriptions
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">WebSocket</Badge>
              </div>
            </CardContent>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.1)" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  <Palette className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Appearance</CardTitle>
                  <CardDescription className="text-xs">Customize your visual experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/50 dark:border-neutral-700/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-1.5 bg-neutral-200 dark:bg-neutral-700">
                    <Eye className="size-3.5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">
                      Toggle using the sun/moon icon in the sidebar footer
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </SpotlightCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
