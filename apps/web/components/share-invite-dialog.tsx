"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Share2,
  Copy,
  Check,
  Globe,
  Link2,
  Users,
  Mail,
  Sparkles,
} from "lucide-react"
import { useOrg } from "@/components/org-context"
import { useTable, useReducer } from "spacetimedb/react"
import { tables, reducers } from "@/generated"

interface ShareInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareInviteDialog({ open, onOpenChange }: ShareInviteDialogProps) {
  const { currentOrg, currentOrgId, isGlobalOrg, isAdminOrOwner, orgMembers } = useOrg()
  const [allInviteLinks] = useTable(tables.org_invite_link)
  const generateInviteLink = useReducer(reducers.generateInviteLink)
  const inviteByEmail = useReducer(reducers.inviteByEmail)

  const [copied, setCopied] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [generating, setGenerating] = useState(false)

  const appUrl = typeof window !== "undefined" ? window.location.origin : ""

  // Get active invite links for current org
  const orgInviteLinks = allInviteLinks.filter(
    (l) => Number(l.orgId) === currentOrgId && l.active
  )
  const latestLink = orgInviteLinks.length > 0 ? orgInviteLinks[orgInviteLinks.length - 1] : null

  const inviteUrl = latestLink ? `${appUrl}/invite/${latestLink.code}` : null
  const shareUrl = isGlobalOrg ? appUrl : inviteUrl

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleGenerateLink = useCallback(async () => {
    if (!currentOrgId) return
    setGenerating(true)
    try {
      await generateInviteLink({ orgId: BigInt(currentOrgId), maxUses: undefined })
    } catch (e) {
      console.error("Failed to generate invite link:", e)
    } finally {
      setGenerating(false)
    }
  }, [currentOrgId, generateInviteLink])

  const handleEmailInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !currentOrgId) return
    try {
      await inviteByEmail({ orgId: BigInt(currentOrgId), email: email.trim() })
      setEmailSent(true)
      setEmail("")
      setTimeout(() => setEmailSent(false), 3000)
    } catch (err) {
      console.error("Failed to send invite:", err)
    }
  }, [email, currentOrgId, inviteByEmail])

  const handleNativeShare = useCallback(async () => {
    const url = shareUrl || appUrl
    const title = isGlobalOrg
      ? "Join Za Warudo on Omni"
      : `Join ${currentOrg?.name || "our team"} on Omni`
    const text = isGlobalOrg
      ? "Join Za Warudo — the global workspace where everyone can collaborate, chat, and build together."
      : `You're invited to join ${currentOrg?.name || "our team"} on Omni — the AI operating platform.`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // User cancelled
      }
    } else {
      handleCopy(url)
    }
  }, [shareUrl, appUrl, isGlobalOrg, currentOrg, handleCopy])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCopied(false)
      setEmailCopied(false)
      setEmailSent(false)
      setEmail("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {isGlobalOrg ? (
            <>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Globe className="size-5" />
                Share Za Warudo
              </DialogTitle>
              <DialogDescription>
                Invite anyone to join the global workspace. Everyone who signs up automatically joins Za Warudo.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Invite to {currentOrg?.name || "Organization"}
              </DialogTitle>
              <DialogDescription>
                Share an invite link or send email invitations to grow your team.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Za Warudo: Simple share the app URL */}
          {isGlobalOrg && (
            <>
              <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                  <Sparkles className="size-4" />
                  Share the platform link
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={appUrl}
                    className="bg-background font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    onClick={() => handleCopy(appUrl)}
                    className="shrink-0"
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Anyone with this link can sign up and join Za Warudo instantly.
                </p>
              </div>

              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleNativeShare}
              >
                <Share2 className="size-4 mr-2" />
                Share Za Warudo with the world
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                <span>{orgMembers.length} people are already here</span>
              </div>
            </>
          )}

          {/* Regular org: Invite link + email */}
          {!isGlobalOrg && (
            <>
              {/* Invite link section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Link2 className="size-3.5" />
                    Invite link
                  </span>
                  {!isAdminOrOwner && (
                    <Badge variant="outline" className="text-[10px]">Admin only</Badge>
                  )}
                </div>

                {inviteUrl ? (
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={inviteUrl}
                      className="bg-muted font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant={copied ? "default" : "outline"}
                      onClick={() => handleCopy(inviteUrl)}
                      className="shrink-0"
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                ) : isAdminOrOwner ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGenerateLink}
                    disabled={generating}
                  >
                    <Link2 className="size-4 mr-2" />
                    {generating ? "Generating..." : "Generate invite link"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ask an admin to generate an invite link.
                  </p>
                )}
              </div>

              {/* Email invite */}
              {isAdminOrOwner && (
                <div className="space-y-2">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    Invite by email
                  </span>
                  <form onSubmit={handleEmailInvite} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      type="submit"
                      disabled={!email.trim()}
                      variant={emailSent ? "default" : "outline"}
                      className="shrink-0"
                    >
                      {emailSent ? <Check className="size-4" /> : <Mail className="size-4" />}
                    </Button>
                  </form>
                </div>
              )}

              {/* Native share */}
              {inviteUrl && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleNativeShare}
                >
                  <Share2 className="size-4 mr-2" />
                  Share invite
                </Button>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                <span>{orgMembers.length} member{orgMembers.length !== 1 ? "s" : ""}</span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
