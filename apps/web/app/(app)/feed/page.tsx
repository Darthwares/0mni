"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useTable, useSpacetimeDB, useReducer } from "spacetimedb/react"
import { tables, reducers } from "@/generated"
import { useOrg } from "@/components/org-context"
import { motion, AnimatePresence } from "motion/react"
import GradientText from "@/components/reactbits/GradientText"
import ShinyText from "@/components/reactbits/ShinyText"
import BlurText from "@/components/reactbits/BlurText"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
  Hash,
  Send,
  Image as ImageIcon,
  Smile,
  BarChart3,
  Eye,
  Trash2,
  Bot,
  Zap,
  Users,
  Search,
  X,
  BookmarkCheck,
  ArrowLeft,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { FeedPost, Employee, FeedLike, FeedBookmark, FeedFollow, FeedHashtag } from "@/generated/types"

type FeedTab = "foryou" | "following" | "trending"

// ─── Utility functions ───────────────────────────────────────────────
function getTimestampMs(timestamp: any): number {
  if (!timestamp) return 0
  const micros = timestamp.__timestamp_micros_since_unix_epoch__
  if (micros === undefined || micros === null) return 0
  return Number(micros / 1000n)
}

function formatTimeAgo(timestamp: any): string {
  const then = getTimestampMs(timestamp)
  if (!then) return ""
  const diff = Date.now() - then

  if (diff < 60_000) return "now"
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d`
  return new Date(then).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatCount(n: number | bigint): string {
  const num = Number(n)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num > 0 ? num.toString() : ""
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Relevance scoring for "For You" feed
function scorePost(
  post: FeedPost,
  myIdentity: string | undefined,
  follows: FeedFollow[],
  now: number
): number {
  let score = 0

  // Engagement signals
  score += Number(post.likesCount) * 3
  score += Number(post.repostsCount) * 5
  score += Number(post.repliesCount) * 4
  score += Number(post.quotesCount) * 4

  // Following boost
  const isFollowing = follows.some(
    (f) => f.followerId.toHexString() === myIdentity && f.followingId.toHexString() === post.author.toHexString()
  )
  if (isFollowing) score += 20

  // AI posts get a slight boost
  if (post.isAiGenerated) score += 10

  // Recency decay (half-life of 6 hours)
  const thenMs = getTimestampMs(post.createdAt)
  const ageMs = now - thenMs
  const ageHours = ageMs / (1000 * 60 * 60)
  score *= Math.pow(0.5, ageHours / 6)

  return score
}

// ─── Post Content with @mentions & #hashtags ─────────────────────────
function PostContent({ content }: { content: string }) {
  const parts = content.split(/(@\w+|#\w+)/g)
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const isOmni = part.toLowerCase() === "@omni"
          if (isOmni) {
            return (
              <ShinyText
                key={i}
                text={part}
                color="#8b5cf6"
                shineColor="#22d3ee"
                speed={3}
                className="font-bold cursor-pointer hover:underline text-base"
              />
            )
          }
          return (
            <span
              key={i}
              className="text-primary font-medium cursor-pointer hover:underline transition-colors"
            >
              {part}
            </span>
          )
        }
        if (part.startsWith("#")) {
          return (
            <span
              key={i}
              className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent font-medium cursor-pointer hover:opacity-70 transition-opacity"
            >
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

// ─── Post Composer ────────────────────────────────────────────────────
function PostComposer({
  employee,
  orgId,
  replyTo,
  onCancelReply,
}: {
  employee: Employee | undefined
  orgId: number | null
  replyTo?: { id: bigint; authorName: string } | null
  onCancelReply?: () => void
}) {
  const [content, setContent] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const createPost = useReducer(reducers.createFeedPost)
  const replyToPost = useReducer(reducers.replyToFeedPost)

  const handleSubmit = async () => {
    if (!content.trim() || !orgId) return
    try {
      if (replyTo) {
        await replyToPost({
          orgId: BigInt(orgId),
          parentPostId: replyTo.id,
          content: content.trim(),
          mediaUrls: [],
        })
        onCancelReply?.()
      } else {
        await createPost({
          orgId: BigInt(orgId),
          content: content.trim(),
          mediaUrls: [],
        })
      }
      setContent("")
      setIsFocused(false)
    } catch (err) {
      console.error("Failed to post:", err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const charPercent = content.length / 2000

  return (
    <div
      className={cn(
        "border-b transition-all duration-300",
        isFocused
          ? "bg-gradient-to-b from-primary/[0.03] to-transparent"
          : ""
      )}
    >
      {replyTo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-4 pt-3 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          <span>
            Replying to{" "}
            <span className="text-primary font-medium">{replyTo.authorName}</span>
          </span>
          <button onClick={onCancelReply} className="ml-auto hover:text-foreground transition-colors">
            <X className="size-3.5" />
          </button>
        </motion.div>
      )}
      <div className="flex gap-3 p-4">
        <Avatar className="size-10 ring-2 ring-background shrink-0">
          <AvatarImage src={employee?.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {employee ? getInitials(employee.name) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? "Post your reply..." : "What's happening in the world?"}
            className={cn(
              "resize-none border-0 p-0 shadow-none focus-visible:ring-0 text-[15px] placeholder:text-muted-foreground/60 bg-transparent min-h-[24px] transition-all duration-200",
              isFocused ? "min-h-[80px]" : ""
            )}
            rows={isFocused ? 3 : 1}
            maxLength={2000}
          />
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between mt-3 pt-3 border-t border-border/50"
              >
                <div className="flex items-center gap-0.5">
                  {[
                    { icon: ImageIcon, label: "Media" },
                    { icon: Smile, label: "Emoji" },
                    { icon: BarChart3, label: "Poll" },
                  ].map(({ icon: Icon, label }) => (
                    <Button
                      key={label}
                      variant="ghost"
                      size="icon"
                      className="size-8 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full transition-all duration-200"
                    >
                      <Icon className="size-4" />
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  {content.length > 0 && (
                    <div className="flex items-center gap-2">
                      {/* Circular progress indicator */}
                      <div className="relative size-5">
                        <svg className="size-5 -rotate-90" viewBox="0 0 20 20">
                          <circle
                            cx="10" cy="10" r="8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-muted/50"
                          />
                          <circle
                            cx="10" cy="10" r="8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${charPercent * 50.26} 50.26`}
                            className={cn(
                              "transition-all duration-300",
                              charPercent > 0.9 ? "text-destructive" : charPercent > 0.75 ? "text-amber-500" : "text-primary"
                            )}
                          />
                        </svg>
                      </div>
                      <span
                        className={cn(
                          "text-xs tabular-nums transition-colors",
                          content.length > 1800 ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {content.length}/2000
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    size="sm"
                    className="rounded-full px-5 font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:opacity-40 disabled:shadow-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Send className="size-3.5 mr-1.5" />
                    {replyTo ? "Reply" : "Post"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Single Post Card ─────────────────────────────────────────────────
function FeedPostCard({
  post,
  allPosts,
  employees,
  likes,
  bookmarks,
  myIdentity,
  onReply,
  onViewThread,
  index = 0,
}: {
  post: FeedPost
  allPosts: FeedPost[]
  employees: Employee[]
  likes: FeedLike[]
  bookmarks: FeedBookmark[]
  myIdentity: string | undefined
  onReply: (post: FeedPost) => void
  onViewThread: (postId: bigint) => void
  index?: number
}) {
  const likePost = useReducer(reducers.likeFeedPost)
  const unlikePost = useReducer(reducers.unlikeFeedPost)
  const repostPost = useReducer(reducers.repostFeedPost)
  const bookmarkPost = useReducer(reducers.bookmarkFeedPost)
  const unbookmarkPost = useReducer(reducers.unbookmarkFeedPost)
  const deletePost = useReducer(reducers.deleteFeedPost)
  const { currentOrgId } = useOrg()

  const author = employees.find((e) => e.id.toHexString() === post.author.toHexString())
  const isLiked = likes.some(
    (l) => Number(l.postId) === Number(post.id) && l.userId.toHexString() === myIdentity
  )
  const isBookmarked = bookmarks.some(
    (b) => Number(b.postId) === Number(post.id) && b.userId.toHexString() === myIdentity
  )
  const isOwn = myIdentity === post.author.toHexString()
  const [likeAnimating, setLikeAnimating] = useState(false)

  // For reposts, get the original post
  const isRepost = post.postType.tag === "Repost" && post.repostOfId !== undefined
  const originalPost = isRepost
    ? allPosts.find((p) => Number(p.id) === Number(post.repostOfId!))
    : null
  const displayPost = originalPost || post
  const displayAuthor = employees.find((e) => e.id.toHexString() === displayPost.author.toHexString())

  // For quotes, get the quoted post
  const quotedPost = post.quoteOfId !== undefined
    ? allPosts.find((p) => Number(p.id) === Number(post.quoteOfId!))
    : null
  const quotedAuthor = quotedPost
    ? employees.find((e) => e.id.toHexString() === quotedPost.author.toHexString())
    : null

  // Spotlight hover effect state
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 })
  const [spotlightOpacity, setSpotlightOpacity] = useState(0)
  const cardRef = useRef<HTMLElement>(null)

  const handleLike = async () => {
    try {
      if (isLiked) {
        await unlikePost({ postId: post.id })
      } else {
        setLikeAnimating(true)
        await likePost({ postId: post.id })
        setTimeout(() => setLikeAnimating(false), 500)
      }
    } catch {}
  }

  const handleRepost = async () => {
    try {
      await repostPost({ orgId: BigInt(currentOrgId!), originalPostId: displayPost.id })
    } catch {}
  }

  const handleBookmark = async () => {
    try {
      if (isBookmarked) {
        await unbookmarkPost({ postId: post.id })
      } else {
        await bookmarkPost({ postId: post.id })
      }
    } catch {}
  }

  const handleDelete = async () => {
    try {
      await deletePost({ postId: post.id })
    } catch {}
  }

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="relative border-b cursor-pointer group/post"
      onClick={() => onViewThread(post.id)}
      onMouseMove={(e) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        setSpotlightPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseEnter={() => setSpotlightOpacity(1)}
      onMouseLeave={() => setSpotlightOpacity(0)}
    >
      {/* Mouse-tracking spotlight overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: spotlightOpacity,
          background: `radial-gradient(500px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(139, 92, 246, 0.04), transparent 40%)`,
        }}
      />

      <div className="relative z-10 px-4 py-3">
        {/* Repost indicator */}
        {isRepost && author && (
          <div className="flex items-center gap-2 ml-12 mb-1 text-xs text-muted-foreground">
            <Repeat2 className="size-3.5" />
            <span className="font-medium">{author.name}</span> reposted
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <Link href={`/profile/${displayAuthor?.id.toHexString()}`} onClick={(e) => e.stopPropagation()}>
            <Avatar
              className={cn(
                "size-10 shrink-0 ring-2 ring-background transition-all duration-200 hover:scale-105",
                displayPost.isAiGenerated && "ring-violet-500/50 shadow-lg shadow-violet-500/20"
              )}
            >
              <AvatarImage src={displayAuthor?.avatarUrl ?? undefined} />
              <AvatarFallback
                className={cn(
                  "text-xs font-bold",
                  displayPost.isAiGenerated
                    ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white"
                    : "bg-primary/10 text-primary"
                )}
              >
                {displayPost.isAiGenerated ? (
                  <Bot className="size-5" />
                ) : (
                  displayAuthor ? getInitials(displayAuthor.name) : "?"
                )}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author line */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                href={`/profile/${displayAuthor?.id.toHexString()}`}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-[15px] truncate hover:underline"
              >
                {displayPost.isAiGenerated ? "Omni" : (displayAuthor?.name ?? "Unknown")}
              </Link>
              {displayPost.isAiGenerated && (
                <Badge className="h-4 rounded px-1.5 py-0 text-[9px] font-bold uppercase bg-gradient-to-r from-violet-500/20 to-cyan-400/20 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20 gap-0.5">
                  <Sparkles className="size-2.5" />
                  AI
                </Badge>
              )}
              {displayAuthor && (
                <span className="text-muted-foreground text-sm truncate">
                  @{displayAuthor.name.toLowerCase().replace(/\s+/g, "")}
                </span>
              )}
              <span className="text-muted-foreground text-sm shrink-0">
                &middot; {formatTimeAgo(displayPost.createdAt)}
              </span>
              {displayPost.editedAt && (
                <span className="text-muted-foreground/60 text-xs shrink-0">(edited)</span>
              )}

              {/* More menu - uses div instead of button to avoid nesting */}
              <div className="ml-auto shrink-0 opacity-0 group-hover/post:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isOwn && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDelete() }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete post
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Share className="size-4 mr-2" />
                      Copy link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Reply indicator */}
            {post.postType.tag === "Reply" && post.replyToId !== undefined && (
              <div className="text-xs text-muted-foreground mb-1">
                Replying to{" "}
                <span className="text-primary">
                  @{employees.find((e) => {
                    const parent = allPosts.find((p) => Number(p.id) === Number(post.replyToId!))
                    return parent && e.id.toHexString() === parent.author.toHexString()
                  })?.name.toLowerCase().replace(/\s+/g, "") ?? "unknown"}
                </span>
              </div>
            )}

            {/* Post text */}
            <div className="mt-0.5">
              <PostContent content={displayPost.content} />
            </div>

            {/* Quoted post embed */}
            {quotedPost && !quotedPost.deleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-2 rounded-xl border border-border/60 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar className="size-4">
                    <AvatarImage src={quotedAuthor?.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {quotedAuthor ? getInitials(quotedAuthor.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold">{quotedAuthor?.name ?? "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">
                    &middot; {formatTimeAgo(quotedPost.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{quotedPost.content}</p>
              </motion.div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between mt-2 -ml-2 max-w-md">
              {/* Reply */}
              <button
                onClick={(e) => { e.stopPropagation(); onReply(post) }}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group/action rounded-full p-1.5 hover:bg-primary/10"
              >
                <MessageCircle className="size-[18px] group-hover/action:scale-110 transition-transform" />
                <span className="text-xs tabular-nums">{formatCount(displayPost.repliesCount)}</span>
              </button>

              {/* Repost */}
              <button
                onClick={(e) => { e.stopPropagation(); handleRepost() }}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 transition-colors group/action rounded-full p-1.5 hover:bg-emerald-500/10"
              >
                <Repeat2 className="size-[18px] group-hover/action:scale-110 transition-transform" />
                <span className="text-xs tabular-nums">{formatCount(displayPost.repostsCount)}</span>
              </button>

              {/* Like */}
              <button
                onClick={(e) => { e.stopPropagation(); handleLike() }}
                className={cn(
                  "flex items-center gap-1.5 transition-colors group/action rounded-full p-1.5",
                  isLiked
                    ? "text-rose-500"
                    : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                )}
              >
                <motion.div
                  animate={likeAnimating ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Heart
                    className={cn(
                      "size-[18px] transition-all",
                      isLiked && "fill-current"
                    )}
                  />
                </motion.div>
                <span className="text-xs tabular-nums">{formatCount(displayPost.likesCount)}</span>
              </button>

              {/* Views */}
              <div className="flex items-center gap-1.5 text-muted-foreground rounded-full p-1.5">
                <Eye className="size-[18px]" />
                <span className="text-xs tabular-nums">{formatCount(displayPost.viewsCount)}</span>
              </div>

              {/* Bookmark & Share */}
              <div className="flex items-center gap-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleBookmark() }}
                  className={cn(
                    "rounded-full p-1.5 transition-all",
                    isBookmarked
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  )}
                >
                  <motion.div
                    animate={isBookmarked ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {isBookmarked ? <BookmarkCheck className="size-[18px] fill-current" /> : <Bookmark className="size-[18px]" />}
                  </motion.div>
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Share className="size-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

// ─── Trending Sidebar ─────────────────────────────────────────────────
function TrendingSidebar({
  hashtags,
  employees,
  follows,
  myIdentity,
}: {
  hashtags: FeedHashtag[]
  employees: Employee[]
  follows: FeedFollow[]
  myIdentity: string | undefined
}) {
  const followUser = useReducer(reducers.followUser)

  const trending = useMemo(
    () => [...hashtags].sort((a, b) => Number(b.postCount) - Number(a.postCount)).slice(0, 5),
    [hashtags]
  )

  const suggestedUsers = useMemo(() => {
    const followingSet = new Set(
      follows.filter((f) => f.followerId.toHexString() === myIdentity).map((f) => f.followingId.toHexString())
    )
    return employees
      .filter(
        (e) =>
          e.id.toHexString() !== myIdentity &&
          !followingSet.has(e.id.toHexString()) &&
          e.status.tag !== "Offline"
      )
      .slice(0, 3)
  }, [employees, follows, myIdentity])

  const handleFollow = async (identity: any) => {
    try {
      await followUser({ followingId: identity })
    } catch {}
  }

  return (
    <div className="w-80 shrink-0 hidden xl:block">
      <div className="sticky top-0 space-y-4 py-3 pr-4">
        {/* Search */}
        <div className="relative group/search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
          <Input
            type="text"
            placeholder="Search posts..."
            className="rounded-full bg-muted/50 border-border/50 pl-10 pr-4 focus:border-primary/50 focus:bg-background transition-all"
          />
        </div>

        {/* Trending */}
        {trending.length > 0 && (
          <Card className="overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Trending
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {trending.map((tag, i) => (
                <motion.div
                  key={tag.tag}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Hash className="size-3.5 text-muted-foreground" />
                    <span className="font-semibold text-sm">{tag.tag}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">
                    {formatCount(tag.postCount)} posts
                  </p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Who to follow */}
        {suggestedUsers.length > 0 && (
          <Card className="overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Who to follow
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {suggestedUsers.map((user, i) => (
                <motion.div
                  key={user.id.toHexString()}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <Link href={`/profile/${user.id.toHexString()}`}>
                    <Avatar className="size-9 transition-transform hover:scale-105">
                      <AvatarImage src={user.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${user.id.toHexString()}`}
                      className="font-semibold text-sm truncate block hover:underline"
                    >
                      {user.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.name.toLowerCase().replace(/\s+/g, "")}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleFollow(user.id)}
                    size="sm"
                    variant="outline"
                    className="rounded-full px-4 h-8 text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    Follow
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Omni AI Card */}
        <div className="relative rounded-2xl border border-violet-500/20 overflow-hidden group/omni">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] to-cyan-400/[0.07]" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-400/10 opacity-0 group-hover/omni:opacity-100 transition-opacity duration-500" />

          <div className="relative p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="size-4.5 text-white" />
              </div>
              <div>
                <GradientText
                  colors={["#8b5cf6", "#06b6d4", "#a78bfa", "#22d3ee"]}
                  animationSpeed={6}
                  className="text-sm font-bold"
                >
                  Omni AI
                </GradientText>
                <p className="text-[10px] text-muted-foreground leading-tight">Your intelligent assistant</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mention{" "}
              <ShinyText
                text="@omni"
                color="#8b5cf6"
                shineColor="#22d3ee"
                speed={4}
                className="font-bold text-xs"
              />{" "}
              in any post to get AI-powered insights, explanations, and help.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 text-[11px] text-muted-foreground/40 space-x-2">
          <span>Powered by SpacetimeDB</span>
          <span>&middot;</span>
          <span>Real-time collaboration</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Feed Page ───────────────────────────────────────────────────
export default function FeedPage() {
  const { identity } = useSpacetimeDB()
  const { currentOrgId } = useOrg()
  const myIdentity = identity?.toHexString()

  const [allPosts] = useTable(tables.feed_post)
  const [allEmployees] = useTable(tables.employee)
  const [allLikes] = useTable(tables.feed_like)
  const [allBookmarks] = useTable(tables.feed_bookmark)
  const [allFollows] = useTable(tables.feed_follow)
  const [allHashtags] = useTable(tables.feed_hashtag)

  const [activeTab, setActiveTab] = useState<FeedTab>("foryou")
  const [replyingTo, setReplyingTo] = useState<{ id: bigint; authorName: string } | null>(null)
  const [viewingThread, setViewingThread] = useState<bigint | null>(null)

  // Filter posts for current org
  const orgPosts = useMemo(
    () =>
      allPosts.filter(
        (p) => Number(p.orgId) === currentOrgId && !p.deleted
      ),
    [allPosts, currentOrgId]
  )

  const orgHashtags = useMemo(
    () => allHashtags.filter((h) => Number(h.orgId) === currentOrgId),
    [allHashtags, currentOrgId]
  )

  // Sort posts based on active tab
  const sortedPosts = useMemo(() => {
    const now = Date.now()
    let posts: FeedPost[]

    switch (activeTab) {
      case "foryou":
        posts = orgPosts.filter(
          (p) => p.postType.tag === "Post" || p.postType.tag === "Quote" || p.postType.tag === "Repost"
        )
        return [...posts].sort(
          (a, b) =>
            scorePost(b, myIdentity, allFollows, now) -
            scorePost(a, myIdentity, allFollows, now)
        )
      case "following":
        const followingSet = new Set(
          allFollows
            .filter((f) => f.followerId.toHexString() === myIdentity)
            .map((f) => f.followingId.toHexString())
        )
        posts = orgPosts.filter(
          (p) =>
            (p.postType.tag === "Post" || p.postType.tag === "Quote" || p.postType.tag === "Repost") &&
            followingSet.has(p.author.toHexString())
        )
        return [...posts].sort(
          (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
        )
      case "trending":
        posts = orgPosts.filter(
          (p) => p.postType.tag === "Post" || p.postType.tag === "Quote"
        )
        return [...posts].sort(
          (a, b) =>
            Number(b.likesCount) + Number(b.repostsCount) * 2 + Number(b.repliesCount) * 1.5 -
            (Number(a.likesCount) + Number(a.repostsCount) * 2 + Number(a.repliesCount) * 1.5)
        )
      default:
        return orgPosts
    }
  }, [orgPosts, activeTab, myIdentity, allFollows])

  // Thread view
  const threadPosts = useMemo(() => {
    if (!viewingThread) return []
    const root = allPosts.find((p) => Number(p.id) === Number(viewingThread))
    if (!root) return []
    const replies = orgPosts
      .filter((p) => p.threadRootId !== undefined && Number(p.threadRootId) === Number(viewingThread))
      .sort((a, b) => getTimestampMs(a.createdAt) - getTimestampMs(b.createdAt))
    return [root, ...replies]
  }, [viewingThread, allPosts, orgPosts])

  const myEmployee = allEmployees.find((e) => e.id.toHexString() === myIdentity)

  const handleReply = useCallback((post: FeedPost) => {
    const author = allEmployees.find((e) => e.id.toHexString() === post.author.toHexString())
    setReplyingTo({ id: post.id, authorName: author?.name ?? "Unknown" })
  }, [allEmployees])

  const handleViewThread = useCallback((postId: bigint) => {
    setViewingThread(postId)
  }, [])

  const tabs = [
    { key: "foryou" as const, label: "For you", icon: Sparkles },
    { key: "following" as const, label: "Following", icon: Users },
    { key: "trending" as const, label: "Trending", icon: TrendingUp },
  ]

  // Thread view
  if (viewingThread) {
    const rootPost = allPosts.find((p) => Number(p.id) === Number(viewingThread))
    return (
      <div className="flex min-h-full">
        <div className="flex-1 max-w-2xl mx-auto border-x min-h-full">
          {/* Thread header */}
          <div className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 border-b bg-background/80 backdrop-blur-xl">
            <button
              onClick={() => setViewingThread(null)}
              className="rounded-full p-1.5 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h2 className="text-lg font-bold">Post</h2>
          </div>

          {/* Thread posts */}
          {threadPosts.map((post, i) => (
            <FeedPostCard
              key={post.id.toString()}
              post={post}
              allPosts={allPosts}
              employees={allEmployees}
              likes={allLikes}
              bookmarks={allBookmarks}
              myIdentity={myIdentity}
              onReply={handleReply}
              onViewThread={handleViewThread}
              index={i}
            />
          ))}

          {/* Reply composer */}
          <PostComposer
            employee={myEmployee}
            orgId={currentOrgId}
            replyTo={
              rootPost
                ? {
                    id: rootPost.id,
                    authorName:
                      allEmployees.find(
                        (e) => e.id.toHexString() === rootPost.author.toHexString()
                      )?.name ?? "Unknown",
                  }
                : undefined
            }
            onCancelReply={() => {}}
          />
        </div>

        <TrendingSidebar
          hashtags={orgHashtags}
          employees={allEmployees}
          follows={allFollows}
          myIdentity={myIdentity}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-full">
      {/* Main feed */}
      <div className="flex-1 max-w-2xl mx-auto border-x min-h-full">
        {/* Sticky tab bar with animated indicator */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition-colors relative",
                  activeTab === tab.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/30"
                )}
              >
                <tab.icon className={cn(
                  "size-4 transition-all duration-300",
                  activeTab === tab.key && "text-primary"
                )} />
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="feedTabIndicator"
                    className="absolute bottom-0 left-[15%] right-[15%] h-[3px] rounded-full bg-gradient-to-r from-violet-500 to-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Composer */}
        <PostComposer
          employee={myEmployee}
          orgId={currentOrgId}
          replyTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />

        {/* Posts */}
        {sortedPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
          >
            <div className="size-20 rounded-full bg-gradient-to-br from-violet-500/10 to-cyan-400/10 flex items-center justify-center mb-6">
              <Zap className="size-10 text-violet-400" />
            </div>
            <BlurText
              text={
                activeTab === "following"
                  ? "Follow people to see their posts"
                  : "No posts yet"
              }
              className="text-xl font-bold mb-2 justify-center text-foreground"
              delay={80}
              animateBy="words"
            />
            <p className="text-sm text-center max-w-xs text-muted-foreground">
              {activeTab === "following"
                ? "When you follow people, their posts will show up here."
                : "Be the first to post something! Share what's on your mind."}
            </p>
          </motion.div>
        ) : (
          sortedPosts.map((post, i) => (
            <FeedPostCard
              key={post.id.toString()}
              post={post}
              allPosts={allPosts}
              employees={allEmployees}
              likes={allLikes}
              bookmarks={allBookmarks}
              myIdentity={myIdentity}
              onReply={handleReply}
              onViewThread={handleViewThread}
              index={i}
            />
          ))
        )}
      </div>

      {/* Right sidebar */}
      <TrendingSidebar
        hashtags={orgHashtags}
        employees={allEmployees}
        follows={allFollows}
        myIdentity={myIdentity}
      />
    </div>
  )
}
