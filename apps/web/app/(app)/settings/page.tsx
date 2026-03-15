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
import { SidebarTrigger } from '@/components/ui/sidebar'
import { PresenceBar } from '@/components/presence-bar'
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
} from 'lucide-react'
import { useAuth } from 'react-oidc-context'
import { useOrg, displayOrgName } from '@/components/org-context'
import { useSpacetimeDB } from 'spacetimedb/react'
import GradientText from '@/components/reactbits/GradientText'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import CountUp from '@/components/reactbits/CountUp'

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

      // Send invite email via Resend
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

  // Find current user's employee record — must match by SpacetimeDB identity
  const currentEmployee = useMemo(() => {
    if (!identity) return null
    const myHex = identity.toHexString()
    return allEmployees.find((e) => e.id.toHexString() === myHex) ?? null
  }, [allEmployees, identity])

  // Populate form from employee data
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
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 shadow-lg shadow-slate-500/20">
          <Settings className="size-5.5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <GradientText
              colors={['#64748b', '#6b7280', '#71717a', '#64748b']}
              animationSpeed={6}
            >
              Settings
            </GradientText>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and platform preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Input value={profileRole} onChange={(e) => setProfileRole(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={profileDepartment} onValueChange={setProfileDepartment}>
                    <SelectTrigger className="mt-1">
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
              <Button onClick={handleSaveProfile} disabled={saving || !profileName.trim()}>
                {saved ? <><Check className="mr-2 size-4" />Saved</> : saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="mt-4 space-y-4">
          {currentOrg && (
            <SpotlightCard
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              spotlightColor="rgba(100, 116, 139, 0.12)"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-slate-500/10">
                  <Building2 className="size-4.5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold">{displayOrgName(currentOrg.name)}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentOrg.domain && <>Domain: {currentOrg.domain} &middot; </>}
                    <CountUp to={activeMembers.length} duration={1} /> member{activeMembers.length !== 1 ? 's' : ''}
                    {currentOrg.autoApproveDomain && currentOrg.domain && (
                      <> &middot; Auto-approve @{currentOrg.domain}</>
                    )}
                  </p>
                </div>
              </div>
            </SpotlightCard>
          )}

          {/* Invite Members */}
          {isAdminOrOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Invite Members
                </CardTitle>
                <CardDescription>Invite people by email or share an invite link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInviteByEmail()}
                  />
                  <Button onClick={handleInviteByEmail} disabled={inviteSending || !inviteEmail.trim()}>
                    {inviteSent ? <><Check className="mr-1 size-4" />Sent</> : inviteSending ? 'Sending...' : 'Invite'}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="size-4" />
                      Invite Links
                    </p>
                    <Button variant="outline" size="sm" onClick={handleGenerateLink}>
                      Generate Link
                    </Button>
                  </div>

                  {orgInviteLinks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active invite links</p>
                  ) : (
                    orgInviteLinks.map((link) => (
                      <div key={link.id.toString()} className="text-sm bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-xs">{link.code}</code>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {link.useCount} use{Number(link.useCount) !== 1 ? 's' : ''}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleCopyInviteLink(link.code)}
                            >
                              {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
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
                              className="h-7 text-xs"
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
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Requests */}
          {isAdminOrOwner && pendingMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Pending Requests
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10">{pendingMembers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingMembers.map((m) => (
                  <div key={m.id.toString()} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                    <div>
                      <p className="text-sm font-medium">{m.email}</p>
                      <p className="text-xs text-muted-foreground">Requested access</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" className="h-7" onClick={() => handleApprove(m.id)}>
                        <CheckCircle className="size-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => handleReject(m.id)}>
                        <XCircle className="size-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Member List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UsersIcon className="size-4" />
                Members ({activeMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {activeMembers.map((m) => {
                const employee = allEmployees.find(
                  (e) => m.identity && e.id.toHexString() === m.identity.toHexString()
                )
                return (
                  <div key={m.id.toString()} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-medium">
                        {(employee?.name || m.email)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{employee?.name || m.email}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {roleIcon(m.role.tag)}
                      <Badge className="text-xs bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/10">
                        {m.role.tag}
                      </Badge>
                    </div>
                  </div>
                )
              })}

              {invitedMembers.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <p className="text-xs font-medium text-muted-foreground pt-2">Invited</p>
                  {invitedMembers.map((m) => (
                    <div key={m.id.toString()} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm">
                          <UserPlus className="size-3.5 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                      <Badge className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10">Invited</Badge>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="size-4" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'email' as const, label: 'Email Notifications', desc: 'Receive email for important updates' },
                { key: 'desktop' as const, label: 'Desktop Notifications', desc: 'Browser push notifications' },
                { key: 'ticketUpdates' as const, label: 'Ticket Updates', desc: 'When tickets are assigned or escalated' },
                { key: 'aiAlerts' as const, label: 'AI Agent Alerts', desc: 'When AI agents need human review' },
                { key: 'dealChanges' as const, label: 'Deal Stage Changes', desc: 'When deals move through the pipeline' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
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
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Authentication</p>
                  <p className="text-xs text-muted-foreground">Signed in via OIDC</p>
                </div>
                <Badge variant="secondary">Connected</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Identity</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {auth.user?.profile?.sub?.slice(0, 20)}...
                  </p>
                </div>
                <Badge variant="outline">OIDC</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium">Active Sessions</p>
                <p className="text-xs text-muted-foreground">Current session from this browser</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="mt-4 space-y-4">
          <SpotlightCard
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            spotlightColor="rgba(34, 197, 94, 0.10)"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
                  <Database className="size-4 text-green-600 dark:text-green-400" />
                </div>
                SpacetimeDB Connection
              </div>
              <div className="space-y-3 pl-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Server</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'https://maincloud.spacetimedb.com'}
                    </p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10">Connected</Badge>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {process.env.NEXT_PUBLIC_SPACETIMEDB_NAME || 'omni-platform'}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Real-time Sync</p>
                  <p className="text-xs text-muted-foreground">
                    All data is synced in real-time via SpacetimeDB subscriptions
                  </p>
                </div>
              </div>
            </div>
          </SpotlightCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="size-4" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Theme can be toggled using the sun/moon icon in the sidebar footer.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>
    </div>
  )
}
