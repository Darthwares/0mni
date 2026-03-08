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
} from 'lucide-react'
import { useAuth } from 'react-oidc-context'

export default function SettingsPage() {
  const auth = useAuth()
  const [allEmployees] = useTable(tables.employee)
  const updateProfile = useSpacetimeReducer(reducers.updateEmployeeProfile)
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

  // Find current user's employee record
  const currentEmployee = useMemo(() => {
    const sub = auth.user?.profile?.sub
    if (!sub) return null
    return allEmployees.find((e) => e.name !== '') ?? null
  }, [allEmployees, auth.user?.profile?.sub])

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
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and platform preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="size-4" />
                SpacetimeDB Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Server</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'https://maincloud.spacetimedb.com'}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">Connected</Badge>
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
            </CardContent>
          </Card>

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
  )
}
