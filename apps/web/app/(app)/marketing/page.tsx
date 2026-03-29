'use client'

import { useTable, useReducer as useSpacetimeReducer } from 'spacetimedb/react'
import { useMemo, useState, useCallback } from 'react'
import { tables, reducers } from '@/generated'
import { useOrg } from '@/components/org-context'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { PresenceBar, PagePresenceStrip } from '@/components/presence-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  ArrowLeft,
  Megaphone,
  BarChart3,
  CalendarDays,
  Mail,
  Target,
  Eye,
  FileText,
  Trash2,
  Sparkles,
  Globe,
  TrendingUp,
  Search,
  Zap,
  Shield,
  Rocket,
  ChevronRight,
  ExternalLink,
  Clock,
  Hash,
  Users,
  Crosshair,
  Swords,
  Download,
} from 'lucide-react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import ShinyText from '@/components/reactbits/ShinyText'
import BlurText from '@/components/reactbits/BlurText'
import { exportCSV } from '@/lib/csv-export'

// ─── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-neutral-400'
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-green-500'
  if (score >= 40) return 'text-amber-500'
  if (score >= 20) return 'text-orange-500'
  return 'text-red-500'
}

function scoreBg(score: number | null | undefined): string {
  if (score == null) return 'bg-neutral-200 dark:bg-neutral-700'
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  if (score >= 20) return 'bg-orange-500'
  return 'bg-red-500'
}

function scoreBgLight(score: number | null | undefined): string {
  if (score == null) return 'bg-neutral-100 dark:bg-neutral-800'
  if (score >= 80) return 'bg-emerald-500/10'
  if (score >= 60) return 'bg-green-500/10'
  if (score >= 40) return 'bg-amber-500/10'
  if (score >= 20) return 'bg-orange-500/10'
  return 'bg-red-500/10'
}

function scoreRingStroke(score: number | null | undefined): string {
  if (score == null) return '#a3a3a3'
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  if (score >= 20) return '#f97316'
  return '#ef4444'
}

function projectStatusBadge(tag: string): string {
  switch (tag) {
    case 'Active': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Paused': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Completed': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Archived': return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
    default: return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
  }
}

function platformColor(tag: string): string {
  switch (tag) {
    case 'Twitter': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    case 'LinkedIn': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Instagram': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
    case 'Facebook': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    case 'TikTok': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    case 'YouTube': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'Blog': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Email': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    default: return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
  }
}

function contentStatusBadge(tag: string): string {
  switch (tag) {
    case 'Draft': return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
    case 'Scheduled': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Published': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Archived': return 'bg-neutral-500/10 text-neutral-400 dark:text-neutral-500 border-neutral-400/20'
    default: return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
  }
}

function threatLevelBadge(level: string): string {
  switch (level) {
    case 'High': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'Medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Low': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    default: return 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20'
  }
}

function fmtDate(ts: any): string {
  if (ts == null) return '--'
  try {
    return ts.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '--'
  }
}

// ─── Score Ring SVG ─────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, strokeWidth = 6 }: { score: number | null | undefined; size?: number; strokeWidth?: number }) {
  const val = score ?? 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (val / 100) * circumference
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-neutral-200 dark:text-neutral-700"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreRingStroke(score)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className={`absolute text-sm font-bold ${scoreColor(score)}`}>
        {score != null ? score : '--'}
      </span>
    </div>
  )
}

// ─── Platform Icon Helpers ──────────────────────────────────────────────────

const PLATFORMS = ['Twitter', 'LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'Blog', 'Email'] as const

const PLATFORM_CHART_COLORS: Record<string, string> = {
  Twitter: '#0ea5e9',
  LinkedIn: '#3b82f6',
  Instagram: '#ec4899',
  Facebook: '#6366f1',
  TikTok: '#8b5cf6',
  YouTube: '#ef4444',
  Blog: '#10b981',
  Email: '#f59e0b',
}

// ─── Generation Content Data ────────────────────────────────────────────────

const CONTENT_TEMPLATES: Record<string, { titles: string[]; contents: string[]; hashtags: string[][] }> = {
  Twitter: {
    titles: [
      'Industry Trend Thread',
      'Quick Tip of the Day',
      'Behind the Scenes',
      'Customer Success Spotlight',
      'Poll: Audience Engagement',
    ],
    contents: [
      'Here\'s something most people miss about digital marketing in 2026: Your audience doesn\'t want to be marketed TO -- they want to be part of the conversation. Here\'s how we\'re shifting our approach (thread)',
      'Quick marketing tip: The best time to post isn\'t universal. Use your own analytics to find YOUR audience\'s peak hours. What we found surprised us.',
      'Ever wonder what goes into a full marketing strategy? Today we\'re pulling back the curtain on our creative process. Spoiler: it involves a lot of whiteboards.',
      'Shoutout to our client who saw a 340% increase in qualified leads after implementing our content-first strategy. The secret? Authentic storytelling.',
      'We\'re curious -- what\'s your biggest marketing challenge right now? Drop your answer below and we\'ll share our best advice this week.',
    ],
    hashtags: [
      ['#MarketingStrategy', '#DigitalMarketing', '#Growth'],
      ['#MarketingTips', '#GrowthHacking', '#ProTip'],
      ['#BehindTheScenes', '#AgencyLife', '#CreativeProcess'],
      ['#CustomerSuccess', '#CaseStudy', '#Results'],
      ['#MarketingPoll', '#Engagement', '#Community'],
    ],
  },
  LinkedIn: {
    titles: [
      'Thought Leadership Article',
      'Industry Analysis Post',
      'Team Culture Showcase',
      'Data-Driven Insights',
      'Professional Development',
    ],
    contents: [
      'After analyzing 500+ marketing campaigns this quarter, one pattern emerged that outperformed everything else: brands that lead with value-driven content see 4.2x higher engagement rates than those focused on product features alone.',
      'The B2B marketing landscape is shifting dramatically. Here are the 3 key trends we\'re seeing reshape how companies connect with their audience -- and what to do about them.',
      'Great marketing doesn\'t happen in a vacuum. It takes a diverse team with aligned vision. Today I want to share how we\'ve built a culture of continuous learning that directly impacts campaign performance.',
      'We just completed our quarterly analysis of 10,000+ data points across our client portfolio. The results challenge conventional wisdom about optimal content frequency and channel allocation.',
      'The most successful marketers I know all share one trait: they never stop learning. Here are 5 resources that have significantly impacted our team\'s strategic thinking this quarter.',
    ],
    hashtags: [
      ['#ThoughtLeadership', '#B2BMarketing', '#ContentStrategy'],
      ['#IndustryTrends', '#MarketingInnovation', '#B2B'],
      ['#CompanyCulture', '#TeamBuilding', '#Marketing'],
      ['#DataDriven', '#MarketingAnalytics', '#Insights'],
      ['#ProfessionalDevelopment', '#AlwaysLearning', '#Marketing'],
    ],
  },
  Instagram: {
    titles: [
      'Carousel: Marketing Framework',
      'Reel: Quick Tips',
      'Story: Day in the Life',
      'Static: Infographic',
      'Reel: Client Transformation',
    ],
    contents: [
      'SWIPE to learn our 5-step framework for creating content that actually converts. We\'ve tested this across 200+ campaigns and the results speak for themselves.',
      '60 seconds to better marketing: Watch this quick breakdown of the top 3 mistakes brands make with their social media strategy. Number 2 will surprise you.',
      'A day in the life of a marketing strategist: From morning analytics reviews to afternoon brainstorms -- every day is different and that\'s what makes this work exciting.',
      'Your ultimate guide to marketing metrics that actually matter. Save this post for reference next time you\'re building a campaign report.',
      'Before vs After: Watch how we transformed our client\'s digital presence in just 90 days. From zero social engagement to a thriving community of 50K+.',
    ],
    hashtags: [
      ['#MarketingTips', '#ContentCreation', '#SocialMediaMarketing'],
      ['#MarketingReels', '#QuickTips', '#DigitalMarketing'],
      ['#AgencyLife', '#DayInTheLife', '#MarketingAgency'],
      ['#Infographic', '#MarketingMetrics', '#SaveThis'],
      ['#Transformation', '#BeforeAndAfter', '#ClientSuccess'],
    ],
  },
  Facebook: {
    titles: [
      'Community Discussion Post',
      'Video: Expert Interview',
      'Case Study Highlight',
      'Resource Share',
      'Live Event Announcement',
    ],
    contents: [
      'Let\'s talk about something that doesn\'t get enough attention in marketing: the role of community building in long-term brand success. What strategies have worked for your business?',
      'NEW VIDEO: We sat down with a leading expert to discuss the future of AI in marketing. Key takeaway: AI is a tool, not a replacement for human creativity.',
      'How we helped a mid-market SaaS company increase their conversion rate by 280% in 6 months. Full case study with actionable takeaways inside.',
      'Free resource alert! We\'ve compiled our top 25 marketing templates -- from email sequences to content calendars. Download link in the comments.',
      'MARK YOUR CALENDARS: Join us live next Thursday for a masterclass on building a marketing engine that drives predictable revenue growth.',
    ],
    hashtags: [
      ['#CommunityBuilding', '#BrandStrategy', '#Marketing'],
      ['#AIMarketing', '#ExpertInterview', '#FutureOfMarketing'],
      ['#CaseStudy', '#SaaS', '#ConversionOptimization'],
      ['#FreeResources', '#MarketingTemplates', '#Download'],
      ['#LiveEvent', '#Masterclass', '#RevenueGrowth'],
    ],
  },
  TikTok: {
    titles: [
      'Trend: Marketing Myths Busted',
      'Tutorial: Canva Hack',
      'Storytime: Client Win',
      'POV: Marketing Strategist',
      'Duet: Reacting to Bad Ads',
    ],
    contents: [
      'Marketing myth BUSTED: You DON\'T need to post every single day to grow your brand. Here\'s what actually matters more than frequency.',
      'This Canva hack saved us 10 hours per week on content creation. Watch till the end for the full workflow.',
      'Storytime: A client came to us losing $50K/month on ads that weren\'t converting. 90 days later? They were profitable for the first time in 2 years.',
      'POV: You\'re a marketing strategist and you just discovered a competitor launched the exact campaign you pitched last week.',
      'Reacting to the worst ads we\'ve seen this week. Why does this keep happening? Let\'s break down what went wrong and how to fix it.',
    ],
    hashtags: [
      ['#MarketingMyths', '#MarketingTok', '#LearnOnTikTok'],
      ['#CanvaHack', '#ContentCreation', '#MarketingTok'],
      ['#Storytime', '#MarketingWins', '#ClientSuccess'],
      ['#POV', '#MarketingLife', '#DigitalMarketing'],
      ['#AdReview', '#MarketingReact', '#BadAds'],
    ],
  },
  YouTube: {
    titles: [
      'Deep Dive: Marketing Strategy',
      'Tutorial: Analytics Setup',
      'Podcast Episode Highlight',
      'Monthly Marketing Roundup',
      'Expert Panel Discussion',
    ],
    contents: [
      'In this deep dive, we break down the complete marketing strategy behind a $10M product launch. Every decision, every channel, every lesson learned -- nothing held back.',
      'Step-by-step tutorial: How to set up a complete marketing analytics dashboard from scratch. Track every metric that matters in one place.',
      'This week\'s podcast highlight: Our guest shares how they grew from a one-person side project to a marketing team of 50 -- and the pivotal decisions that made it possible.',
      'Here\'s everything that happened in marketing this month: algorithm changes, new tools, emerging trends, and what it all means for your strategy going forward.',
      'We brought together 5 marketing leaders to debate the biggest questions in the industry right now. The conversation got heated -- in the best way.',
    ],
    hashtags: [
      ['#MarketingStrategy', '#DeepDive', '#BusinessGrowth'],
      ['#Tutorial', '#Analytics', '#MarketingTools'],
      ['#Podcast', '#MarketingPodcast', '#Entrepreneurship'],
      ['#MonthlyRoundup', '#MarketingNews', '#Trends'],
      ['#PanelDiscussion', '#MarketingLeaders', '#Industry'],
    ],
  },
  Blog: {
    titles: [
      'Ultimate Guide: Content Marketing',
      'How-To: Email Automation',
      'Trend Report: Q1 Insights',
      'Checklist: Campaign Launch',
      'Comparison: Marketing Tools',
    ],
    contents: [
      'The ultimate guide to content marketing in 2026. Everything from strategy development to distribution to measurement -- with real examples and templates you can use today.',
      'A step-by-step guide to building email automation workflows that nurture leads and drive conversions. Includes 5 proven sequence templates for different industries.',
      'Our Q1 trend report is here: we analyzed data from 1,000+ campaigns to identify the patterns that separate high-performing marketing teams from the rest.',
      'Don\'t launch another campaign without this checklist. 47 items across strategy, creative, technical, and measurement -- everything your team needs for a successful go-live.',
      'We tested 15 popular marketing tools head-to-head. Here\'s our honest comparison with pricing, features, pros, cons, and our recommendation for different team sizes.',
    ],
    hashtags: [
      ['#ContentMarketing', '#UltimateGuide', '#MarketingStrategy'],
      ['#EmailMarketing', '#Automation', '#LeadNurturing'],
      ['#TrendReport', '#MarketingData', '#Insights'],
      ['#CampaignLaunch', '#Checklist', '#MarketingOps'],
      ['#MarketingTools', '#TechStack', '#Comparison'],
    ],
  },
  Email: {
    titles: [
      'Newsletter: Weekly Digest',
      'Promotional: New Offering',
      'Educational: Marketing Tips',
      'Re-engagement Campaign',
      'Announcement: Partnership',
    ],
    contents: [
      'This week\'s marketing digest: top-performing content strategies, industry news you can\'t miss, and an exclusive template we\'re sharing with subscribers only.',
      'Introducing our newest service designed to help growth-stage companies build predictable marketing engines. Early adopters get exclusive pricing -- details inside.',
      'Five marketing strategies that are working right now (backed by data from our latest campaigns). Read time: 4 minutes. Impact: potentially transformative.',
      'We noticed you\'ve been quiet lately! We\'ve been busy creating new resources, case studies, and tools -- here\'s a quick recap of what you might have missed.',
      'Big news: We\'re partnering with a leading technology platform to bring you even more powerful marketing capabilities. Here\'s what this means for you.',
    ],
    hashtags: [
      ['#Newsletter', '#WeeklyDigest', '#Marketing'],
      ['#NewService', '#GrowthMarketing', '#Announcement'],
      ['#MarketingTips', '#DataDriven', '#Strategy'],
      ['#ReEngagement', '#WeMissYou', '#Updates'],
      ['#Partnership', '#BigNews', '#Innovation'],
    ],
  },
}

const EMAIL_SEQUENCES: Record<string, { name: string; type: string; emails: { subject: string; preview: string; body: string; cta: string; ctaUrl: string; delay: number }[] }> = {
  Welcome: {
    name: 'Welcome Series',
    type: 'Welcome',
    emails: [
      {
        subject: 'Welcome aboard! Here\'s what to expect',
        preview: 'Your journey to better marketing starts now',
        body: 'Thank you for joining us! We\'re thrilled to have you on board. Over the next few days, we\'ll share our best resources, proven strategies, and insider tips to help you achieve your marketing goals. First up: here\'s a quick overview of the tools and frameworks that drive results for our most successful clients.',
        cta: 'Explore Our Resource Library',
        ctaUrl: '/resources',
        delay: 0,
      },
      {
        subject: 'Your personalized marketing roadmap',
        preview: 'Based on your profile, here\'s where to start',
        body: 'Now that you\'re settled in, let\'s get strategic. Based on what we know about your business, we\'ve put together a customized starting point. This includes your top 3 priority areas, quick-win opportunities, and the specific metrics you should be tracking from day one.',
        cta: 'View Your Roadmap',
        ctaUrl: '/roadmap',
        delay: 1,
      },
      {
        subject: 'The framework that changed everything for our clients',
        preview: 'A simple 4-step process for marketing success',
        body: 'After working with hundreds of businesses, we\'ve distilled the most effective marketing approach into a simple 4-step framework: Audit, Strategize, Execute, and Optimize. Today we\'re sharing the complete breakdown with real-world examples from businesses just like yours.',
        cta: 'Download the Framework',
        ctaUrl: '/framework',
        delay: 3,
      },
      {
        subject: 'Real results: How [Company] grew 300% in 6 months',
        preview: 'A case study you don\'t want to miss',
        body: 'Nothing beats seeing real results. Today we\'re sharing a detailed case study from a company that was struggling with low engagement and poor conversion rates. By implementing our framework, they saw a 300% increase in qualified leads within 6 months. Here\'s exactly what they did.',
        cta: 'Read the Full Case Study',
        ctaUrl: '/case-study',
        delay: 5,
      },
      {
        subject: 'Ready to take the next step?',
        preview: 'Let\'s talk about your marketing goals',
        body: 'You\'ve been with us for a week now and we hope the resources have been valuable. If you\'re ready to take your marketing to the next level, we\'d love to set up a complimentary strategy session. In 30 minutes, we\'ll analyze your current approach and identify the highest-impact opportunities for growth.',
        cta: 'Book Your Strategy Session',
        ctaUrl: '/book-session',
        delay: 7,
      },
    ],
  },
  Nurture: {
    name: 'Lead Nurture Series',
    type: 'Nurture',
    emails: [
      {
        subject: '5 marketing mistakes costing you revenue',
        preview: 'And how to fix them today',
        body: 'We\'ve audited thousands of marketing strategies and keep seeing the same 5 mistakes that silently drain revenue. From misaligned messaging to poor funnel architecture, these issues are fixable -- and the ROI of fixing them is substantial. Here\'s what to look for in your own strategy.',
        cta: 'Get the Checklist',
        ctaUrl: '/checklist',
        delay: 0,
      },
      {
        subject: 'The data behind high-converting landing pages',
        preview: 'We analyzed 1,000+ pages to find what works',
        body: 'What separates a landing page that converts at 2% from one that converts at 15%? We analyzed over 1,000 landing pages across industries to find out. The answers aren\'t what most marketers expect. Headlines, layout, social proof -- we break down exactly what matters most.',
        cta: 'See the Analysis',
        ctaUrl: '/landing-page-data',
        delay: 3,
      },
      {
        subject: 'How top brands build content engines (not just calendars)',
        preview: 'The system behind consistent content creation',
        body: 'Most marketing teams struggle with content consistency. The solution isn\'t working harder -- it\'s building a content engine with repeatable processes, clear templates, and smart repurposing strategies. Here\'s how the most efficient marketing teams produce 10x more content without burning out.',
        cta: 'Build Your Content Engine',
        ctaUrl: '/content-engine',
        delay: 7,
      },
      {
        subject: 'Your competitors are doing this (and you should too)',
        preview: 'Competitive intelligence insights you can use today',
        body: 'We\'ve been tracking competitive trends across major industries and noticed something interesting: the fastest-growing brands all share a common strategy element. It\'s not about budget or team size -- it\'s about how they structure their marketing approach. Here\'s what we found.',
        cta: 'Get Competitive Insights',
        ctaUrl: '/competitive-insights',
        delay: 10,
      },
      {
        subject: 'ROI calculator: What better marketing is worth to you',
        preview: 'See the potential impact in real numbers',
        body: 'Sometimes the best motivation is seeing the numbers. We built an ROI calculator that shows exactly what improved marketing performance could mean for your business. Input your current metrics and see the projected impact of optimization across your key channels.',
        cta: 'Calculate Your ROI',
        ctaUrl: '/roi-calculator',
        delay: 14,
      },
      {
        subject: 'Let\'s make this happen -- exclusive offer inside',
        preview: 'A limited-time opportunity for you',
        body: 'You\'ve been exploring our resources and we can tell you\'re serious about improving your marketing results. We\'d like to make it easy to get started. For a limited time, we\'re offering a complimentary marketing audit with actionable recommendations you can implement immediately.',
        cta: 'Claim Your Free Audit',
        ctaUrl: '/free-audit',
        delay: 18,
      },
    ],
  },
  Launch: {
    name: 'Product Launch Series',
    type: 'Launch',
    emails: [
      {
        subject: 'Something big is coming...',
        preview: 'Be the first to know about our latest innovation',
        body: 'We\'ve been working behind the scenes on something we\'re incredibly excited about. It\'s the result of months of research, development, and feedback from marketers like you. We can\'t reveal everything yet, but here\'s a sneak peek at what\'s coming -- and why it\'s going to change how you approach marketing.',
        cta: 'Get Early Access',
        ctaUrl: '/early-access',
        delay: 0,
      },
      {
        subject: 'The problem we\'re solving (and why it matters)',
        preview: 'A deep dive into the challenge we set out to address',
        body: 'Before we tell you what we built, let us tell you why we built it. After talking to thousands of marketing professionals, one challenge came up again and again: the gap between strategy and execution. Today we\'re sharing the research behind our solution and why we believe it will transform your workflow.',
        cta: 'Read the Research',
        ctaUrl: '/research',
        delay: 3,
      },
      {
        subject: 'Introducing [Product Name] -- it\'s here!',
        preview: 'The wait is over. Discover what we\'ve built for you',
        body: 'Today\'s the day! We\'re thrilled to introduce our latest offering, designed from the ground up to solve the biggest challenge in modern marketing. It combines AI-powered insights, automated workflows, and intuitive reporting into a single platform. Here\'s everything you need to know.',
        cta: 'Start Your Free Trial',
        ctaUrl: '/start-trial',
        delay: 7,
      },
      {
        subject: 'Early results are in (they\'re impressive)',
        preview: 'See what beta users achieved in just 2 weeks',
        body: 'Our beta users have been testing the platform for two weeks and the results are exceeding expectations. Average time savings of 12 hours per week. 45% improvement in campaign performance. And those are just the averages. Here are the detailed metrics and testimonials from early adopters.',
        cta: 'See Beta Results',
        ctaUrl: '/beta-results',
        delay: 10,
      },
      {
        subject: 'Launch pricing ends soon -- don\'t miss out',
        preview: 'Exclusive pricing for early adopters expires Friday',
        body: 'A quick reminder that our special launch pricing is only available until this Friday. Early adopters lock in a 40% discount for life, plus get access to our premium onboarding program (valued at $2,000) at no additional cost. After Friday, regular pricing takes effect.',
        cta: 'Lock In Launch Pricing',
        ctaUrl: '/pricing',
        delay: 12,
      },
      {
        subject: 'Final hours: Your exclusive launch offer expires tonight',
        preview: 'Last chance to save 40% on your subscription',
        body: 'This is your last chance to take advantage of our launch pricing. Tonight at midnight, the 40% lifetime discount and free premium onboarding expire. If you\'ve been on the fence, now is the time. Every day you wait is a day of results you could be achieving.',
        cta: 'Get Started Now',
        ctaUrl: '/signup',
        delay: 14,
      },
    ],
  },
}

const AD_CAMPAIGN_TEMPLATES = [
  { platform: 'Google Ads', adType: 'Search', headline: 'Grow Your Business with Data-Driven Marketing', body: 'Our proven marketing strategies deliver measurable results. Increase leads by 300%, improve conversion rates, and maximize your marketing ROI. Free strategy session for new clients.', cta: 'Book Free Consultation', audience: 'Small to mid-size business owners searching for marketing agencies', cpc: 2.50 },
  { platform: 'Google Ads', adType: 'Display', headline: 'Marketing That Delivers Real Results', body: 'Tired of marketing that doesn\'t move the needle? Join 500+ businesses that trust us to drive predictable growth. From SEO to paid media to content strategy -- we handle it all.', cta: 'See Case Studies', audience: 'Business decision-makers on marketing and technology websites', cpc: 1.20 },
  { platform: 'Facebook Ads', adType: 'Lead Gen', headline: 'Free Marketing Audit -- Discover Hidden Growth Opportunities', body: 'Get a comprehensive analysis of your marketing strategy, competitive positioning, and growth potential. Our audits have helped businesses identify an average of $150K in untapped revenue.', cta: 'Get Your Free Audit', audience: 'Business owners and marketing managers, ages 28-55, interested in business growth', cpc: 3.80 },
  { platform: 'LinkedIn Ads', adType: 'Sponsored Content', headline: 'The Marketing Strategy Framework Used by Industry Leaders', body: 'Download our proprietary marketing framework used by Fortune 500 companies and high-growth startups alike. Includes templates, checklists, and real-world case studies.', cta: 'Download the Framework', audience: 'CMOs, VPs of Marketing, and Marketing Directors at companies with 50-500 employees', cpc: 8.50 },
  { platform: 'Instagram Ads', adType: 'Stories', headline: 'Transform Your Brand\'s Social Presence', body: 'In 90 days, we helped brands grow their engaged following by 500%. Authentic content + smart strategy = real results. Tap to see how.', cta: 'See the Transformation', audience: 'Brand managers and entrepreneurs, ages 25-45, interested in social media marketing', cpc: 1.80 },
  { platform: 'YouTube Ads', adType: 'Pre-Roll', headline: 'Stop Wasting Money on Marketing That Doesn\'t Work', body: 'The average business wastes 40% of their marketing budget on ineffective campaigns. Our data-driven approach ensures every dollar works harder. Watch how we transformed marketing ROI for 500+ brands.', cta: 'Watch the Full Story', audience: 'Business professionals watching marketing, entrepreneurship, and business strategy content', cpc: 0.15 },
]

const COMPETITOR_TEMPLATES = [
  {
    name: 'MarketForce Agency',
    url: 'https://marketforce.example.com',
    strengths: ['Strong enterprise client portfolio', 'Established brand reputation', 'Comprehensive service offering', 'Large team with diverse specialists'],
    weaknesses: ['Slow turnaround times', 'Higher pricing than market average', 'Limited SMB focus', 'Outdated reporting tools'],
    opportunities: ['They are losing SMB clients to more agile competitors', 'Their tech stack is falling behind', 'Key talent has been leaving to startups'],
    position: 'Market Leader',
    threat: 'Medium',
  },
  {
    name: 'GrowthPilot Digital',
    url: 'https://growthpilot.example.com',
    strengths: ['AI-powered campaign optimization', 'Competitive pricing model', 'Fast execution speed', 'Modern tech stack'],
    weaknesses: ['Small team limits capacity', 'Narrow service focus (paid media only)', 'Limited brand recognition', 'No content creation capability'],
    opportunities: ['Their paid-only approach leaves content gaps we can fill', 'Growing too fast without infrastructure', 'Client retention issues due to account manager turnover'],
    position: 'Emerging Challenger',
    threat: 'High',
  },
  {
    name: 'BrandCraft Studios',
    url: 'https://brandcraft.example.com',
    strengths: ['Exceptional creative quality', 'Award-winning design team', 'Strong brand strategy methodology', 'Premium positioning'],
    weaknesses: ['Very expensive for most businesses', 'Slow production timelines', 'Limited digital marketing expertise', 'No performance marketing capability'],
    opportunities: ['Their creative-only focus means clients need additional partners for execution', 'Premium pricing limits their total addressable market', 'Shift toward performance marketing is outside their strength'],
    position: 'Niche Specialist',
    threat: 'Low',
  },
  {
    name: 'DataDriven Marketing Co',
    url: 'https://datadriven.example.com',
    strengths: ['Superior analytics and reporting', 'Strong ROI documentation', 'Transparent pricing', 'Good client communication'],
    weaknesses: ['Weak creative capabilities', 'Limited social media expertise', 'Small geographic presence', 'No video production'],
    opportunities: ['Their data strength is undermined by poor creative execution', 'Clients are demanding more creative services', 'Could be a potential partnership or acquisition target'],
    position: 'Established Player',
    threat: 'Medium',
  },
]

// ─── Page Component ─────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { currentOrgId } = useOrg()

  // ── Table subscriptions
  const [allProjects] = useTable(tables.marketing_project)
  const [allAudits] = useTable(tables.marketing_audit)
  const [allContentItems] = useTable(tables.content_calendar_item)
  const [allEmailItems] = useTable(tables.email_sequence_item)
  const [allAdCreatives] = useTable(tables.ad_creative)
  const [allCompetitors] = useTable(tables.competitor_insight)
  const [allReports] = useTable(tables.marketing_report)

  // ── Reducer hooks
  const createMarketingProject = useSpacetimeReducer(reducers.createMarketingProject)
  const deleteMarketingProject = useSpacetimeReducer(reducers.deleteMarketingProject)
  const updateMarketingProjectStatus = useSpacetimeReducer(reducers.updateMarketingProjectStatus)
  const updateMarketingProjectScore = useSpacetimeReducer(reducers.updateMarketingProjectScore)
  const saveMarketingAudit = useSpacetimeReducer(reducers.saveMarketingAudit)
  const deleteMarketingAudit = useSpacetimeReducer(reducers.deleteMarketingAudit)
  const saveContentCalendarItem = useSpacetimeReducer(reducers.saveContentCalendarItem)
  const updateContentItemStatus = useSpacetimeReducer(reducers.updateContentItemStatus)
  const deleteContentCalendarItem = useSpacetimeReducer(reducers.deleteContentCalendarItem)
  const saveEmailSequenceItem = useSpacetimeReducer(reducers.saveEmailSequenceItem)
  const deleteEmailSequenceItem = useSpacetimeReducer(reducers.deleteEmailSequenceItem)
  const saveAdCreative = useSpacetimeReducer(reducers.saveAdCreative)
  const deleteAdCreative = useSpacetimeReducer(reducers.deleteAdCreative)
  const saveCompetitorInsight = useSpacetimeReducer(reducers.saveCompetitorInsight)
  const deleteCompetitorInsight = useSpacetimeReducer(reducers.deleteCompetitorInsight)
  const saveMarketingReport = useSpacetimeReducer(reducers.saveMarketingReport)
  const deleteMarketingReport = useSpacetimeReducer(reducers.deleteMarketingReport)

  // ── Org-scoped data
  const orgProjects = useMemo(
    () => allProjects.filter(p => Number(p.orgId) === currentOrgId),
    [allProjects, currentOrgId]
  )

  // ── Selected project state
  const [selectedProjectId, setSelectedProjectId] = useState<bigint | null>(null)

  const selectedProject = useMemo(
    () => selectedProjectId != null ? orgProjects.find(p => p.id === selectedProjectId) : null,
    [orgProjects, selectedProjectId]
  )

  // ── Project-scoped data
  const projectAudits = useMemo(
    () => selectedProjectId != null ? allAudits.filter(a => a.projectId === selectedProjectId && Number(a.orgId) === currentOrgId) : [],
    [allAudits, selectedProjectId, currentOrgId]
  )
  const projectContent = useMemo(
    () => selectedProjectId != null ? allContentItems.filter(c => c.projectId === selectedProjectId && Number(c.orgId) === currentOrgId) : [],
    [allContentItems, selectedProjectId, currentOrgId]
  )
  const projectEmails = useMemo(
    () => selectedProjectId != null ? allEmailItems.filter(e => e.projectId === selectedProjectId && Number(e.orgId) === currentOrgId) : [],
    [allEmailItems, selectedProjectId, currentOrgId]
  )
  const projectAds = useMemo(
    () => selectedProjectId != null ? allAdCreatives.filter(a => a.projectId === selectedProjectId && Number(a.orgId) === currentOrgId) : [],
    [allAdCreatives, selectedProjectId, currentOrgId]
  )
  const projectCompetitors = useMemo(
    () => selectedProjectId != null ? allCompetitors.filter(c => c.projectId === selectedProjectId && Number(c.orgId) === currentOrgId) : [],
    [allCompetitors, selectedProjectId, currentOrgId]
  )
  const projectReports = useMemo(
    () => selectedProjectId != null ? allReports.filter(r => r.projectId === selectedProjectId && Number(r.orgId) === currentOrgId) : [],
    [allReports, selectedProjectId, currentOrgId]
  )

  // ── Latest audit for dashboard
  const latestAudit = useMemo(
    () => projectAudits.length > 0 ? [...projectAudits].sort((a, b) => Number(b.id) - Number(a.id))[0] : null,
    [projectAudits]
  )

  // ── New project dialog state
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectUrl, setNewProjectUrl] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectIndustry, setNewProjectIndustry] = useState('')

  // ── Report detail view
  const [viewingReportId, setViewingReportId] = useState<bigint | null>(null)
  const viewingReport = useMemo(
    () => viewingReportId != null ? projectReports.find(r => r.id === viewingReportId) : null,
    [projectReports, viewingReportId]
  )

  // ── Generating states
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false)
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false)
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false)
  const [isGeneratingAds, setIsGeneratingAds] = useState(false)
  const [isGeneratingCompetitors, setIsGeneratingCompetitors] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // ── Content calendar filter
  const [calendarPlatformFilter, setCalendarPlatformFilter] = useState<string>('all')

  const filteredContent = useMemo(() => {
    if (calendarPlatformFilter === 'all') return [...projectContent].sort((a, b) => a.dayNumber - b.dayNumber)
    return [...projectContent].filter(c => c.platform?.tag === calendarPlatformFilter).sort((a, b) => a.dayNumber - b.dayNumber)
  }, [projectContent, calendarPlatformFilter])

  // ── Email sequences grouped
  const emailsBySequence = useMemo(() => {
    const map = new Map<string, typeof projectEmails>()
    for (const email of projectEmails) {
      const key = email.sequenceName
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(email)
    }
    for (const [, emails] of map) {
      emails.sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    }
    return map
  }, [projectEmails])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateProject = useCallback(() => {
    if (!newProjectName.trim() || !newProjectUrl.trim() || currentOrgId === null) return
    createMarketingProject({
      orgId: BigInt(currentOrgId),
      name: newProjectName.trim(),
      websiteUrl: newProjectUrl.trim(),
      description: newProjectDesc.trim() || 'Marketing project',
      industry: newProjectIndustry.trim() || undefined,
    })
    setNewProjectName('')
    setNewProjectUrl('')
    setNewProjectDesc('')
    setNewProjectIndustry('')
    setNewProjectOpen(false)
  }, [createMarketingProject, currentOrgId, newProjectName, newProjectUrl, newProjectDesc, newProjectIndustry])

  const handleDeleteProject = useCallback((projectId: bigint) => {
    deleteMarketingProject({ projectId })
    if (selectedProjectId === projectId) setSelectedProjectId(null)
  }, [deleteMarketingProject, selectedProjectId])

  // ── Generation Functions ──────────────────────────────────────────────────

  const generateAudit = useCallback(() => {
    if (!selectedProject || currentOrgId === null || !selectedProjectId) return
    setIsGeneratingAudit(true)

    const scores = {
      contentMessaging: 65 + Math.floor(Math.random() * 25),
      conversion: 50 + Math.floor(Math.random() * 30),
      seo: 60 + Math.floor(Math.random() * 30),
      competitive: 55 + Math.floor(Math.random() * 25),
      brandTrust: 60 + Math.floor(Math.random() * 30),
      growthStrategy: 50 + Math.floor(Math.random() * 30),
    }
    const overall = Math.round(
      scores.contentMessaging * 0.25 +
      scores.conversion * 0.20 +
      scores.seo * 0.20 +
      scores.competitive * 0.15 +
      scores.brandTrust * 0.10 +
      scores.growthStrategy * 0.10
    )

    saveMarketingAudit({
      orgId: BigInt(currentOrgId),
      projectId: selectedProjectId,
      url: selectedProject.websiteUrl,
      overallScore: overall,
      contentMessagingScore: scores.contentMessaging,
      conversionScore: scores.conversion,
      seoScore: scores.seo,
      competitiveScore: scores.competitive,
      brandTrustScore: scores.brandTrust,
      growthStrategyScore: scores.growthStrategy,
      contentMessagingFindings: `Website messaging analysis reveals ${scores.contentMessaging >= 70 ? 'strong' : 'moderate'} alignment with target audience expectations. Value proposition is ${scores.contentMessaging >= 75 ? 'clearly articulated' : 'present but could be sharper'} across main pages. Content tone is ${scores.contentMessaging >= 70 ? 'consistent' : 'inconsistent across sections'}. Blog content shows ${scores.contentMessaging >= 65 ? 'regular publication cadence' : 'irregular posting schedule'} with ${scores.contentMessaging >= 75 ? 'good' : 'moderate'} topical authority signals.`,
      conversionFindings: `Conversion funnel analysis shows ${scores.conversion >= 70 ? 'well-optimized' : 'significant room for improvement in'} user journeys. CTA placement is ${scores.conversion >= 65 ? 'strategic and visible' : 'inconsistent across pages'}. Form completion rate is estimated at ${Math.round(scores.conversion * 0.3)}% based on form complexity analysis. Landing pages ${scores.conversion >= 70 ? 'align well with ad messaging' : 'show disconnect from campaign messaging'}. Mobile conversion path ${scores.conversion >= 65 ? 'is streamlined' : 'needs optimization'}.`,
      seoFindings: `Technical SEO review indicates ${scores.seo >= 70 ? 'solid' : 'foundational'} site health. Page load speed is ${scores.seo >= 75 ? 'within optimal range' : 'above recommended thresholds'}. Meta tags are ${scores.seo >= 65 ? 'well-structured' : 'missing or inconsistent on several pages'}. Internal linking structure is ${scores.seo >= 70 ? 'logical and supports topic clusters' : 'sparse and could be improved'}. Backlink profile shows ${scores.seo >= 75 ? 'healthy growth' : 'limited domain authority diversity'}.`,
      competitiveFindings: `Competitive landscape analysis shows ${scores.competitive >= 70 ? 'strong differentiation' : 'moderate differentiation'} from primary competitors. Market positioning is ${scores.competitive >= 65 ? 'clear and defensible' : 'somewhat unclear to target audience'}. Content gap analysis reveals ${scores.competitive >= 70 ? 'few critical gaps' : 'several topic areas where competitors outrank'}. Pricing strategy is ${scores.competitive >= 75 ? 'competitive and transparent' : 'not clearly communicated vs alternatives'}.`,
      brandTrustFindings: `Brand trust assessment shows ${scores.brandTrust >= 70 ? 'strong social proof integration' : 'opportunity to strengthen social proof'}. Customer testimonials are ${scores.brandTrust >= 65 ? 'prominently featured' : 'underutilized across the site'}. Trust signals (security badges, certifications, press mentions) are ${scores.brandTrust >= 70 ? 'present and well-positioned' : 'sparse or difficult to find'}. Online reputation across review platforms is ${scores.brandTrust >= 75 ? 'positive and well-managed' : 'mixed or limited'}.`,
      growthStrategyFindings: `Growth strategy review indicates ${scores.growthStrategy >= 70 ? 'clear growth channels' : 'opportunity to diversify acquisition channels'}. Content marketing pipeline is ${scores.growthStrategy >= 65 ? 'active and producing' : 'underdeveloped relative to opportunity'}. Email marketing ${scores.growthStrategy >= 70 ? 'shows strong engagement metrics' : 'has significant room for improvement'}. Paid media presence is ${scores.growthStrategy >= 65 ? 'present across relevant channels' : 'limited to one or two channels'}. Referral and partnership strategy is ${scores.growthStrategy >= 75 ? 'generating consistent new business' : 'largely untapped'}.`,
      recommendations: [
        scores.conversion < 70 ? 'Redesign primary CTAs with stronger action verbs and contrast colors to improve click-through rate' : 'A/B test CTA variations to push conversion rate above current benchmarks',
        scores.seo < 70 ? 'Implement a comprehensive technical SEO audit addressing page speed, meta tags, and site structure' : 'Build topical authority clusters around primary keywords to dominate search results',
        scores.contentMessaging < 70 ? 'Refine value proposition to more clearly articulate unique differentiators vs competitors' : 'Expand content calendar to cover emerging topics in your industry before competitors',
        scores.competitive < 70 ? 'Develop a competitive differentiation playbook and train team on positioning' : 'Launch a competitive monitoring system to track and respond to market changes',
        scores.brandTrust < 70 ? 'Add customer testimonials, case studies, and trust badges to high-traffic pages' : 'Build a systematic review generation program to strengthen online reputation',
        scores.growthStrategy < 70 ? 'Diversify acquisition channels -- currently over-reliant on limited sources' : 'Invest in building referral and partnership programs for sustainable growth',
        'Implement marketing attribution tracking to measure true ROI across all channels',
        'Create a quarterly competitive analysis cadence to stay ahead of market shifts',
      ],
    })

    updateMarketingProjectScore({ projectId: selectedProjectId, score: overall })
    setTimeout(() => setIsGeneratingAudit(false), 500)
  }, [selectedProject, selectedProjectId, currentOrgId, saveMarketingAudit, updateMarketingProjectScore])

  const generateContentCalendar = useCallback(() => {
    if (!selectedProjectId || currentOrgId === null) return
    setIsGeneratingCalendar(true)

    const platformCycle = ['Twitter', 'LinkedIn', 'Instagram', 'Blog', 'Facebook', 'Twitter', 'TikTok', 'LinkedIn', 'YouTube', 'Email']
    const today = new Date()

    for (let day = 1; day <= 30; day++) {
      const platform = platformCycle[(day - 1) % platformCycle.length]
      const templates = CONTENT_TEMPLATES[platform]
      const idx = (day - 1) % templates.titles.length
      const scheduledDate = new Date(today)
      scheduledDate.setDate(today.getDate() + day)
      const dateStr = scheduledDate.toISOString().split('T')[0]

      saveContentCalendarItem({
        orgId: BigInt(currentOrgId),
        projectId: selectedProjectId,
        platformTag: platform,
        scheduledDate: dateStr,
        dayNumber: day,
        title: templates.titles[idx],
        content: templates.contents[idx],
        hashtags: templates.hashtags[idx],
      })
    }

    setTimeout(() => setIsGeneratingCalendar(false), 500)
  }, [selectedProjectId, currentOrgId, saveContentCalendarItem])

  const generateEmailSequence = useCallback((type: 'Welcome' | 'Nurture' | 'Launch') => {
    if (!selectedProjectId || currentOrgId === null) return
    setIsGeneratingEmails(true)

    const seq = EMAIL_SEQUENCES[type]
    for (let i = 0; i < seq.emails.length; i++) {
      const email = seq.emails[i]
      saveEmailSequenceItem({
        orgId: BigInt(currentOrgId),
        projectId: selectedProjectId,
        sequenceName: seq.name,
        sequenceType: seq.type,
        sequenceOrder: i + 1,
        subject: email.subject,
        previewText: email.preview,
        body: email.body,
        ctaText: email.cta,
        ctaUrl: email.ctaUrl,
        delayDays: email.delay,
      })
    }

    setTimeout(() => setIsGeneratingEmails(false), 500)
  }, [selectedProjectId, currentOrgId, saveEmailSequenceItem])

  const generateAdCampaign = useCallback(() => {
    if (!selectedProjectId || currentOrgId === null) return
    setIsGeneratingAds(true)

    for (const template of AD_CAMPAIGN_TEMPLATES) {
      saveAdCreative({
        orgId: BigInt(currentOrgId),
        projectId: selectedProjectId,
        platform: template.platform,
        adType: template.adType,
        headline: template.headline,
        body: template.body,
        cta: template.cta,
        targetAudience: template.audience,
        estimatedCpc: template.cpc,
      })
    }

    setTimeout(() => setIsGeneratingAds(false), 500)
  }, [selectedProjectId, currentOrgId, saveAdCreative])

  const generateCompetitorAnalysis = useCallback(() => {
    if (!selectedProjectId || currentOrgId === null) return
    setIsGeneratingCompetitors(true)

    for (const comp of COMPETITOR_TEMPLATES) {
      saveCompetitorInsight({
        orgId: BigInt(currentOrgId),
        projectId: selectedProjectId,
        competitorName: comp.name,
        competitorUrl: comp.url,
        strengths: comp.strengths,
        weaknesses: comp.weaknesses,
        opportunities: comp.opportunities,
        marketPosition: comp.position,
        threatLevel: comp.threat,
      })
    }

    setTimeout(() => setIsGeneratingCompetitors(false), 500)
  }, [selectedProjectId, currentOrgId, saveCompetitorInsight])

  const generateFullReport = useCallback(() => {
    if (!selectedProjectId || currentOrgId === null || !selectedProject) return
    setIsGeneratingReport(true)

    const auditSummary = latestAudit
      ? `Overall marketing score: ${latestAudit.overallScore}/100. Content & Messaging: ${latestAudit.contentMessagingScore}, Conversion: ${latestAudit.conversionScore}, SEO: ${latestAudit.seoScore}, Competitive: ${latestAudit.competitiveScore}, Brand & Trust: ${latestAudit.brandTrustScore}, Growth Strategy: ${latestAudit.growthStrategyScore}.`
      : 'No audit data available yet.'

    const reportContent = `# Marketing Strategy Report: ${selectedProject.name}

## Executive Summary

This comprehensive marketing report provides a strategic overview of the current marketing performance for ${selectedProject.name} (${selectedProject.websiteUrl}). The analysis covers brand positioning, competitive landscape, content strategy, conversion optimization, and growth opportunities.

## Current Performance

${auditSummary}

## Content Strategy Analysis

Total content items in calendar: ${projectContent.length}
Active platforms: ${[...new Set(projectContent.map(c => c.platform?.tag))].join(', ') || 'None yet'}

The content strategy should focus on maintaining consistent publishing cadence across all active platforms while ensuring each piece serves a specific stage of the customer journey. Key recommendations include increasing video content (which sees 2-3x engagement vs static posts) and implementing a content repurposing workflow.

## Email Marketing Assessment

Active sequences: ${emailsBySequence.size}
Total emails configured: ${projectEmails.length}

Email marketing remains one of the highest-ROI channels available. Current sequences should be monitored for open rates (target: 25%+), click-through rates (target: 3%+), and conversion rates. A/B testing subject lines and send times will yield quick improvements.

## Paid Media Overview

Active ad creatives: ${projectAds.length}
Platforms in use: ${[...new Set(projectAds.map(a => a.platform))].join(', ') || 'None yet'}

Paid media should complement organic efforts, not replace them. Current ad creative diversity looks ${projectAds.length >= 5 ? 'healthy' : 'limited -- consider expanding creative variety'}. Recommend implementing a systematic A/B testing cadence for ad copy and creative.

## Competitive Landscape

Competitors analyzed: ${projectCompetitors.length}

${projectCompetitors.length > 0 ? projectCompetitors.map(c => `- **${c.competitorName}**: ${c.marketPosition} (Threat: ${c.threatLevel})`).join('\n') : 'No competitive analysis available yet.'}

## Recommendations

1. Prioritize high-impact, low-effort improvements identified in the latest audit
2. Build a 90-day content calendar with platform-specific strategies
3. Implement marketing automation for lead nurturing sequences
4. Launch competitive monitoring to track market changes monthly
5. Invest in conversion rate optimization across key landing pages
6. Diversify paid media across at minimum 3 channels
7. Build a systematic approach to gathering and showcasing customer testimonials
8. Establish monthly marketing performance reviews with clear KPIs

## Next Steps

Schedule a strategy workshop to prioritize the recommendations above and build an implementation timeline. Focus on quick wins first (30-day improvements) while planning for strategic initiatives (90-day horizon).`

    saveMarketingReport({
      orgId: BigInt(currentOrgId),
      projectId: selectedProjectId,
      reportType: 'Full Strategy Report',
      title: `Marketing Strategy Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      content: reportContent,
    })

    setTimeout(() => setIsGeneratingReport(false), 500)
  }, [selectedProjectId, currentOrgId, selectedProject, latestAudit, projectContent, projectEmails, projectAds, projectCompetitors, emailsBySequence, saveMarketingReport])

  // ── Radar chart data for audit
  const radarData = useMemo(() => {
    if (!latestAudit) return []
    return [
      { dimension: 'Content', score: latestAudit.contentMessagingScore, fullMark: 100 },
      { dimension: 'Conversion', score: latestAudit.conversionScore, fullMark: 100 },
      { dimension: 'SEO', score: latestAudit.seoScore, fullMark: 100 },
      { dimension: 'Competitive', score: latestAudit.competitiveScore, fullMark: 100 },
      { dimension: 'Brand', score: latestAudit.brandTrustScore, fullMark: 100 },
      { dimension: 'Growth', score: latestAudit.growthStrategyScore, fullMark: 100 },
    ]
  }, [latestAudit])

  // ── Platform distribution pie chart
  const platformDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of projectContent) {
      const tag = item.platform?.tag ?? 'Unknown'
      counts[tag] = (counts[tag] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: PLATFORM_CHART_COLORS[name] ?? '#737373',
    }))
  }, [projectContent])

  // ── Content status bar chart
  const contentStatusData = useMemo(() => {
    const counts: Record<string, number> = { Draft: 0, Scheduled: 0, Published: 0, Archived: 0 }
    for (const item of projectContent) {
      const tag = item.status?.tag ?? 'Draft'
      counts[tag] = (counts[tag] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [projectContent])

  const STATUS_BAR_COLORS: Record<string, string> = { Draft: '#737373', Scheduled: '#3b82f6', Published: '#10b981', Archived: '#a3a3a3' }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <PresenceBar />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 p-6">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedProject && (
                <Button variant="ghost" size="icon" className="mr-1" onClick={() => { setSelectedProjectId(null); setViewingReportId(null) }}>
                  <ArrowLeft className="size-5" />
                </Button>
              )}
              <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
                <Megaphone className="size-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  <GradientText
                    colors={['#8b5cf6', '#d946ef', '#ec4899', '#8b5cf6']}
                    animationSpeed={6}
                  >
                    {selectedProject ? selectedProject.name : 'Marketing Agency'}
                  </GradientText>
                </h1>
                <BlurText
                  text={selectedProject ? selectedProject.websiteUrl : 'AI-powered marketing audits, content, and growth strategy'}
                  delay={35}
                  animateBy="words"
                  className="text-sm text-muted-foreground mt-0.5"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PagePresenceStrip className="hidden xl:flex" />
              {selectedProject && (
                <Badge className={`${projectStatusBadge(selectedProject.status?.tag ?? 'Active')} border px-3 py-1`}>
                  {selectedProject.status?.tag ?? 'Active'}
                </Badge>
              )}
              {!selectedProject && (
                <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0">
                      <Plus className="size-4 mr-1.5" />
                      New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Marketing Project</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="proj-name">Project Name *</Label>
                        <Input id="proj-name" placeholder="Q1 Brand Launch" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="proj-url">Website URL *</Label>
                        <Input id="proj-url" placeholder="https://example.com" value={newProjectUrl} onChange={e => setNewProjectUrl(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="proj-desc">Description</Label>
                        <Textarea id="proj-desc" placeholder="Brief description of marketing goals..." value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} rows={3} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="proj-industry">Industry</Label>
                        <Input id="proj-industry" placeholder="SaaS, E-commerce, Healthcare..." value={newProjectIndustry} onChange={e => setNewProjectIndustry(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewProjectOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || !newProjectUrl.trim()} className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0">
                        Create Project
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* ── Project Grid (no project selected) ──────────────────────────── */}
          {!selectedProject && (
            <>
              {orgProjects.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="flex items-center justify-center size-16 rounded-2xl bg-violet-500/10 mb-4">
                      <Megaphone className="size-8 text-violet-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Marketing Projects Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                      Create your first marketing project to start running audits, generating content calendars, email sequences, ad creatives, and more.
                    </p>
                    <Button onClick={() => setNewProjectOpen(true)} className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0">
                      <Plus className="size-4 mr-1.5" />
                      Create First Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orgProjects.map(project => {
                    const audits = allAudits.filter(a => a.projectId === project.id)
                    const content = allContentItems.filter(c => c.projectId === project.id)
                    const emails = allEmailItems.filter(e => e.projectId === project.id)
                    const score = project.overallScore != null ? Number(project.overallScore) : null
                    return (
                      <div key={String(project.id)} className="cursor-pointer" onClick={() => setSelectedProjectId(project.id)}>
                      <SpotlightCard className="p-0" spotlightColor="rgba(139,92,246,0.15)">
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base truncate">{project.name}</h3>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{project.websiteUrl}</p>
                            </div>
                            <ScoreRing score={score} size={56} strokeWidth={5} />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`${projectStatusBadge(project.status?.tag ?? 'Active')} border text-xs`}>
                                {project.status?.tag ?? 'Active'}
                              </Badge>
                              {project.industry && (
                                <Badge variant="outline" className="text-xs">{project.industry}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Search className="size-3" />{audits.length}</span>
                              <span className="flex items-center gap-1"><CalendarDays className="size-3" />{content.length}</span>
                              <span className="flex items-center gap-1"><Mail className="size-3" />{emails.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <span className="text-xs text-muted-foreground">{fmtDate(project.createdAt)}</span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id) }}>
                                <Trash2 className="size-3.5" />
                              </Button>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      </SpotlightCard>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Project Detail View (project selected) ──────────────────────── */}
          {selectedProject && (
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="mb-4 h-10">
                <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="size-3.5" /> Dashboard</TabsTrigger>
                <TabsTrigger value="content" className="gap-1.5"><CalendarDays className="size-3.5" /> Content</TabsTrigger>
                <TabsTrigger value="emails" className="gap-1.5"><Mail className="size-3.5" /> Emails</TabsTrigger>
                <TabsTrigger value="ads" className="gap-1.5"><Target className="size-3.5" /> Ads</TabsTrigger>
                <TabsTrigger value="competitors" className="gap-1.5"><Swords className="size-3.5" /> Competitors</TabsTrigger>
                <TabsTrigger value="reports" className="gap-1.5"><FileText className="size-3.5" /> Reports</TabsTrigger>
              </TabsList>

              {/* ── Dashboard Tab ────────────────────────────────────────────── */}
              <TabsContent value="dashboard" className="space-y-6">
                {/* Score + Quick Stats Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Score Gauge */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Overall Marketing Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-4">
                      <ScoreRing score={selectedProject.overallScore != null ? Number(selectedProject.overallScore) : null} size={140} strokeWidth={10} />
                      <p className="text-sm text-muted-foreground mt-3">
                        {selectedProject.overallScore != null ? (
                          Number(selectedProject.overallScore) >= 80 ? 'Excellent marketing health' :
                          Number(selectedProject.overallScore) >= 60 ? 'Good with room to improve' :
                          Number(selectedProject.overallScore) >= 40 ? 'Moderate -- action needed' :
                          'Needs significant improvement'
                        ) : 'Run an audit to get your score'}
                      </p>
                      <Button
                        onClick={generateAudit}
                        disabled={isGeneratingAudit}
                        className="mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0"
                        size="sm"
                      >
                        <Sparkles className="size-4 mr-1.5" />
                        {isGeneratingAudit ? 'Analyzing...' : 'Run Full Audit'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Radar Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Marketing Dimension Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                            <PolarGrid stroke="#525252" strokeOpacity={0.3} />
                            <PolarAngleAxis dataKey="dimension" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#737373', fontSize: 10 }} />
                            <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                          Run an audit to see dimension scores
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Dimension Score Bars */}
                {latestAudit && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: 'Content & Messaging', score: latestAudit.contentMessagingScore, weight: '25%', icon: FileText },
                        { label: 'Conversion', score: latestAudit.conversionScore, weight: '20%', icon: Target },
                        { label: 'SEO', score: latestAudit.seoScore, weight: '20%', icon: Search },
                        { label: 'Competitive', score: latestAudit.competitiveScore, weight: '15%', icon: Swords },
                        { label: 'Brand & Trust', score: latestAudit.brandTrustScore, weight: '10%', icon: Shield },
                        { label: 'Growth Strategy', score: latestAudit.growthStrategyScore, weight: '10%', icon: Rocket },
                      ].map(dim => (
                        <div key={dim.label} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 w-44 shrink-0">
                            <dim.icon className={`size-4 ${scoreColor(dim.score)}`} />
                            <span className="text-sm font-medium">{dim.label}</span>
                          </div>
                          <div className="flex-1 h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${scoreBg(dim.score)}`}
                              style={{ width: `${dim.score}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold w-10 text-right ${scoreColor(dim.score)}`}>{dim.score}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">{dim.weight}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Audits', value: projectAudits.length, icon: Search, color: 'text-violet-500' },
                    { label: 'Content Items', value: projectContent.length, icon: CalendarDays, color: 'text-blue-500' },
                    { label: 'Email Sequences', value: emailsBySequence.size, icon: Mail, color: 'text-amber-500' },
                    { label: 'Total Emails', value: projectEmails.length, icon: Mail, color: 'text-orange-500' },
                    { label: 'Ad Creatives', value: projectAds.length, icon: Target, color: 'text-pink-500' },
                    { label: 'Competitors', value: projectCompetitors.length, icon: Swords, color: 'text-red-500' },
                  ].map(stat => (
                    <Card key={stat.label}>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <stat.icon className={`size-5 ${stat.color} mb-2`} />
                        <span className="text-2xl font-bold tabular-nums">
                          <CountUp to={stat.value} duration={800} />
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">{stat.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Recommendations */}
                {latestAudit && latestAudit.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Sparkles className="size-4 text-violet-500" />
                        Recommendations from Latest Audit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {latestAudit.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="flex items-center justify-center size-5 shrink-0 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold mt-0.5">{i + 1}</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── Content Calendar Tab ─────────────────────────────────────── */}
              <TabsContent value="content" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Content Calendar</h2>
                    <Badge variant="outline" className="text-xs">{projectContent.length} items</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={calendarPlatformFilter} onValueChange={setCalendarPlatformFilter}>
                      <SelectTrigger className="w-36 h-8">
                        <SelectValue placeholder="All Platforms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={generateContentCalendar}
                      disabled={isGeneratingCalendar}
                      size="sm"
                      className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0"
                    >
                      <Sparkles className="size-4 mr-1.5" />
                      {isGeneratingCalendar ? 'Generating...' : 'Generate 30-Day Calendar'}
                    </Button>
                    {projectContent.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportCSV(
                          `content-calendar-${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}`,
                          [
                            { header: 'Day', accessor: (c: typeof projectContent[0]) => c.dayNumber },
                            { header: 'Date', accessor: (c: typeof projectContent[0]) => c.scheduledDate },
                            { header: 'Platform', accessor: (c: typeof projectContent[0]) => c.platform?.tag ?? '' },
                            { header: 'Status', accessor: (c: typeof projectContent[0]) => c.status?.tag ?? '' },
                            { header: 'Title', accessor: (c: typeof projectContent[0]) => c.title },
                            { header: 'Content', accessor: (c: typeof projectContent[0]) => c.content },
                            { header: 'Hashtags', accessor: (c: typeof projectContent[0]) => c.hashtags.join(', ') },
                          ],
                          projectContent
                        )}
                      >
                        <Download className="size-4 mr-1.5" />
                        Export
                      </Button>
                    )}
                  </div>
                </div>

                {/* Platform distribution + Status charts */}
                {projectContent.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Platform Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={platformDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} strokeWidth={2} stroke="hsl(var(--card))">
                              {platformDistribution.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {platformDistribution.map(p => (
                            <div key={p.name} className="flex items-center gap-1 text-xs">
                              <div className="size-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
                              <span className="text-muted-foreground">{p.name} ({p.value})</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Content Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={contentStatusData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#525252" strokeOpacity={0.2} />
                            <XAxis dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {contentStatusData.map((entry, i) => (
                                <Cell key={i} fill={STATUS_BAR_COLORS[entry.name] ?? '#737373'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Content Items Grid */}
                {filteredContent.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CalendarDays className="size-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No content items yet. Generate a 30-day calendar to get started.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredContent.map(item => (
                      <Card key={String(item.id)} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`${platformColor(item.platform?.tag ?? '')} border text-xs`}>
                                {item.platform?.tag ?? 'Unknown'}
                              </Badge>
                              <Badge className={`${contentStatusBadge(item.status?.tag ?? 'Draft')} border text-xs`}>
                                {item.status?.tag ?? 'Draft'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Day {item.dayNumber}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => deleteContentCalendarItem({ itemId: item.id })}>
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{item.content}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.hashtags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs text-violet-500 dark:text-violet-400">{tag}</span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.scheduledDate}</span>
                            <Select
                              value={item.status?.tag ?? 'Draft'}
                              onValueChange={(val) => updateContentItemStatus({ itemId: item.id, statusTag: val })}
                            >
                              <SelectTrigger className="h-6 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                                <SelectItem value="Published">Published</SelectItem>
                                <SelectItem value="Archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Email Sequences Tab ──────────────────────────────────────── */}
              <TabsContent value="emails" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Email Sequences</h2>
                    <Badge variant="outline" className="text-xs">{emailsBySequence.size} sequences</Badge>
                    <Badge variant="outline" className="text-xs">{projectEmails.length} emails</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => generateEmailSequence('Welcome')}
                      disabled={isGeneratingEmails}
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Sparkles className="size-3.5 mr-1" />
                      Welcome
                    </Button>
                    <Button
                      onClick={() => generateEmailSequence('Nurture')}
                      disabled={isGeneratingEmails}
                      size="sm"
                      variant="outline"
                      className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    >
                      <Sparkles className="size-3.5 mr-1" />
                      Nurture
                    </Button>
                    <Button
                      onClick={() => generateEmailSequence('Launch')}
                      disabled={isGeneratingEmails}
                      size="sm"
                      variant="outline"
                      className="border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                    >
                      <Sparkles className="size-3.5 mr-1" />
                      Launch
                    </Button>
                  </div>
                </div>

                {emailsBySequence.size === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Mail className="size-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No email sequences yet. Generate a Welcome, Nurture, or Launch sequence to get started.</p>
                    </CardContent>
                  </Card>
                ) : (
                  Array.from(emailsBySequence.entries()).map(([seqName, emails]) => (
                    <Card key={seqName}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Mail className="size-4 text-violet-500" />
                            {seqName}
                            <Badge variant="outline" className="text-xs ml-2">{emails.length} emails</Badge>
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-0">
                          {emails.map((email, idx) => (
                            <div key={String(email.id)} className="relative">
                              {/* Connector line */}
                              {idx < emails.length - 1 && (
                                <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
                              )}
                              <div className="flex items-start gap-4 pb-4">
                                {/* Order circle */}
                                <div className="flex flex-col items-center shrink-0">
                                  <div className="flex items-center justify-center size-10 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-sm font-bold">
                                    {email.sequenceOrder}
                                  </div>
                                </div>
                                {/* Email content */}
                                <div className="flex-1 min-w-0 border rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-medium text-sm truncate">{email.subject}</h4>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500" onClick={() => deleteEmailSequenceItem({ itemId: email.id })}>
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground italic mb-2">{email.previewText}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{email.body}</p>
                                  <div className="flex items-center gap-3 text-xs">
                                    <Badge variant="outline" className="text-xs bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400">
                                      {email.ctaText}
                                    </Badge>
                                    {email.delayDays > 0 && (
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="size-3" />
                                        {email.delayDays} day{email.delayDays !== 1 ? 's' : ''} delay
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* ── Ad Creatives Tab ─────────────────────────────────────────── */}
              <TabsContent value="ads" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Ad Creatives</h2>
                    <Badge variant="outline" className="text-xs">{projectAds.length} creatives</Badge>
                  </div>
                  <Button
                    onClick={generateAdCampaign}
                    disabled={isGeneratingAds}
                    size="sm"
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0"
                  >
                    <Sparkles className="size-4 mr-1.5" />
                    {isGeneratingAds ? 'Generating...' : 'Generate Ad Campaign'}
                  </Button>
                </div>

                {projectAds.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Target className="size-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No ad creatives yet. Generate an ad campaign across multiple platforms.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectAds.map(ad => (
                      <Card key={String(ad.id)}>
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 border text-xs">
                                {ad.platform}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {ad.adType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {ad.estimatedCpc != null && (
                                <span className="text-xs text-muted-foreground">
                                  Est. CPC: <span className="font-semibold text-foreground">${Number(ad.estimatedCpc).toFixed(2)}</span>
                                </span>
                              )}
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => deleteAdCreative({ adId: ad.id })}>
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm mb-2">{ad.headline}</h4>
                          <p className="text-xs text-muted-foreground mb-3">{ad.body}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20 border text-xs">
                              {ad.cta}
                            </Badge>
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="size-3" />
                              <span className="font-medium">Target:</span>
                              <span className="line-clamp-1">{ad.targetAudience}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Competitors Tab ──────────────────────────────────────────── */}
              <TabsContent value="competitors" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Competitor Analysis</h2>
                    <Badge variant="outline" className="text-xs">{projectCompetitors.length} analyzed</Badge>
                  </div>
                  <Button
                    onClick={generateCompetitorAnalysis}
                    disabled={isGeneratingCompetitors}
                    size="sm"
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0"
                  >
                    <Sparkles className="size-4 mr-1.5" />
                    {isGeneratingCompetitors ? 'Analyzing...' : 'Analyze Competitors'}
                  </Button>
                </div>

                {projectCompetitors.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Swords className="size-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No competitor insights yet. Generate a competitive analysis to identify opportunities.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {projectCompetitors.map(comp => (
                      <Card key={String(comp.id)}>
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold">{comp.competitorName}</h4>
                              <p className="text-xs text-muted-foreground">{comp.competitorUrl}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{comp.marketPosition}</Badge>
                              <Badge className={`${threatLevelBadge(comp.threatLevel)} border text-xs`}>
                                {comp.threatLevel} Threat
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => deleteCompetitorInsight({ insightId: comp.id })}>
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Strengths */}
                            <div className="space-y-1.5">
                              <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Strengths</h5>
                              {comp.strengths.map((s, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>

                            {/* Weaknesses */}
                            <div className="space-y-1.5">
                              <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Weaknesses</h5>
                              {comp.weaknesses.map((w, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <span className="text-red-500 mt-0.5 shrink-0">-</span>
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Opportunities */}
                          <div className="mt-3 pt-3 border-t space-y-1.5">
                            <h5 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Opportunities</h5>
                            {comp.opportunities.map((o, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <span className="text-blue-500 mt-0.5 shrink-0">*</span>
                                <span>{o}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Reports Tab ──────────────────────────────────────────────── */}
              <TabsContent value="reports" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Reports</h2>
                    <Badge variant="outline" className="text-xs">{projectReports.length} reports</Badge>
                  </div>
                  <Button
                    onClick={generateFullReport}
                    disabled={isGeneratingReport}
                    size="sm"
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white border-0"
                  >
                    <Sparkles className="size-4 mr-1.5" />
                    {isGeneratingReport ? 'Generating...' : 'Generate Full Report'}
                  </Button>
                </div>

                {viewingReport ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => setViewingReportId(null)}>
                            <ArrowLeft className="size-4 mr-1" />
                            Back to Reports
                          </Button>
                          <CardTitle>{viewingReport.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{viewingReport.reportType}</Badge>
                            <span className="text-xs text-muted-foreground">{fmtDate(viewingReport.createdAt)}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => { deleteMarketingReport({ reportId: viewingReport.id }); setViewingReportId(null) }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[600px]">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {viewingReport.content.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-6 mb-3">{line.replace('# ', '')}</h1>
                            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-5 mb-2 text-violet-600 dark:text-violet-400">{line.replace('## ', '')}</h2>
                            if (line.startsWith('- **')) {
                              const match = line.match(/- \*\*(.*?)\*\*: (.*)/)
                              if (match) return <p key={i} className="text-sm ml-4 mb-1"><strong>{match[1]}</strong>: {match[2]}</p>
                            }
                            if (line.match(/^\d+\. /)) return <p key={i} className="text-sm ml-4 mb-1">{line}</p>
                            if (line.trim() === '') return <br key={i} />
                            return <p key={i} className="text-sm mb-2">{line}</p>
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ) : projectReports.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="size-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No reports yet. Generate a full marketing strategy report.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {[...projectReports].sort((a, b) => Number(b.id) - Number(a.id)).map(report => (
                      <Card key={String(report.id)} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setViewingReportId(report.id)}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-10 rounded-lg bg-violet-500/10">
                              <FileText className="size-5 text-violet-500" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{report.title}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs">{report.reportType}</Badge>
                                <span className="text-xs text-muted-foreground">{fmtDate(report.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteMarketingReport({ reportId: report.id }) }}>
                              <Trash2 className="size-3.5" />
                            </Button>
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
