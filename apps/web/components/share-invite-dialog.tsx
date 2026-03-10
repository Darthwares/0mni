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
  MessageCircle,
} from "lucide-react"
import { useOrg } from "@/components/org-context"
import { useTable, useReducer } from "spacetimedb/react"
import { tables, reducers } from "@/generated"

interface ShareInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function ShareInviteDialog({ open, onOpenChange }: ShareInviteDialogProps) {
  const { currentOrg, currentOrgId, isGlobalOrg, isAdminOrOwner, orgMembers } = useOrg()
  const [allInviteLinks] = useTable(tables.org_invite_link)
  const generateInviteLink = useReducer(reducers.generateInviteLink)
  const inviteByEmail = useReducer(reducers.inviteByEmail)

  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [generating, setGenerating] = useState(false)

  const appUrl = typeof window !== "undefined" ? window.location.origin : ""

  const orgInviteLinks = allInviteLinks.filter(
    (l) => Number(l.orgId) === currentOrgId && l.active
  )
  const latestLink = orgInviteLinks.length > 0 ? orgInviteLinks[orgInviteLinks.length - 1] : null

  const inviteUrl = latestLink ? `${appUrl}/invite/${latestLink.code}` : null
  const shareUrl = isGlobalOrg ? appUrl : inviteUrl

  const shareText = isGlobalOrg
    ? "Join Za Warudo on Omni — the global workspace where everyone can collaborate, chat, and build together."
    : `Join ${currentOrg?.name || "our team"} on Omni — the AI operating platform.`

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
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join Omni", text: shareText, url })
      } catch { /* cancelled */ }
    } else {
      handleCopy(url)
    }
  }, [shareUrl, appUrl, shareText, handleCopy])

  const openSocialShare = useCallback((platform: "twitter" | "linkedin" | "whatsapp") => {
    const url = encodeURIComponent(shareUrl || appUrl)
    const text = encodeURIComponent(shareText)
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    }
    window.open(urls[platform], "_blank", "noopener,noreferrer,width=600,height=500")
  }, [shareUrl, appUrl, shareText])

  useEffect(() => {
    if (!open) {
      setCopied(false)
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
          {/* Link copy section */}
          {isGlobalOrg && (
            <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                <Sparkles className="size-4" />
                Share the platform link
              </div>
              <div className="flex gap-2">
                <Input readOnly value={appUrl} className="bg-background font-mono text-sm" />
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
          )}

          {/* Social share buttons */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Share on</span>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2.5 hover:bg-neutral-800 hover:text-white"
                onClick={() => openSocialShare("twitter")}
              >
                <TwitterIcon className="size-4" />
                <span className="text-[10px]">X / Twitter</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2.5 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]"
                onClick={() => openSocialShare("linkedin")}
              >
                <LinkedInIcon className="size-4" />
                <span className="text-[10px]">LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2.5 hover:bg-[#25D366] hover:text-white hover:border-[#25D366]"
                onClick={() => openSocialShare("whatsapp")}
              >
                <WhatsAppIcon className="size-4" />
                <span className="text-[10px]">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2.5"
                onClick={handleNativeShare}
              >
                <Share2 className="size-4" />
                <span className="text-[10px]">More</span>
              </Button>
            </div>
          </div>

          {/* Regular org: Invite link + email */}
          {!isGlobalOrg && (
            <>
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
                    <Input readOnly value={inviteUrl} className="bg-muted font-mono text-xs" />
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
                  <Button variant="outline" className="w-full" onClick={handleGenerateLink} disabled={generating}>
                    <Link2 className="size-4 mr-2" />
                    {generating ? "Generating..." : "Generate invite link"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Ask an admin to generate an invite link.</p>
                )}
              </div>

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
                    <Button size="sm" type="submit" disabled={!email.trim()} variant={emailSent ? "default" : "outline"} className="shrink-0">
                      {emailSent ? <Check className="size-4" /> : <Mail className="size-4" />}
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            <span>{orgMembers.length} {isGlobalOrg ? "people are already here" : `member${orgMembers.length !== 1 ? "s" : ""}`}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
