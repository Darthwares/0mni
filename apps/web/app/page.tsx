'use client'

import { useAuth } from 'react-oidc-context'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bot,
  Headset,
  TrendingUp,
  Users,
  Code2,
  MessageSquare,
  Shield,
  Zap,
  DollarSign,
  Clock,
  Sparkles,
  ChevronRight,
  Check,
} from 'lucide-react'
import Aurora from '@/components/reactbits/Aurora'
import BlurText from '@/components/reactbits/BlurText'
import GradientText from '@/components/reactbits/GradientText'
import ShinyText from '@/components/reactbits/ShinyText'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import StarBorder from '@/components/reactbits/StarBorder'

export default function LandingPage() {
  const auth = useAuth()
  const router = useRouter()

  const handleSignIn = () => auth.signinRedirect()
  const goToDashboard = () => router.push('/dashboard')

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-neutral-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <span className="font-mono text-lg font-black text-white">0</span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="font-mono">0</span>MNI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </div>

          <div className="flex items-center gap-3">
            {auth.isAuthenticated ? (
              <button
                onClick={goToDashboard}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/25"
              >
                Dashboard <ArrowRight className="size-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={handleSignIn}
                  className="hidden sm:block rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
                >
                  Sign in
                </button>
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/25"
                >
                  Get Started <ArrowRight className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Aurora Background */}
        <div className="absolute inset-0 opacity-40">
          <Aurora
            colorStops={['#7C3AED', '#A78BFA', '#5B21B6']}
            amplitude={1.2}
            blend={0.6}
            speed={0.8}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-purple-600/15 blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm">
            <Sparkles className="size-3.5 text-violet-400" />
            <ShinyText
              text="AI-Powered Operating Platform"
              color="#a78bfa"
              shineColor="#e9d5ff"
              speed={3}
              className="text-sm font-medium"
            />
          </div>

          {/* Main Headline */}
          <h1 className="mb-2 text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter">
            <GradientText
              colors={['#8B5CF6', '#C084FC', '#E9D5FF', '#A78BFA', '#7C3AED']}
              animationSpeed={6}
              className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter"
            >
              <span className="font-mono">0</span>MNI
            </GradientText>
          </h1>

          {/* Subtitle with BlurText animation */}
          <div className="mb-6">
            <BlurText
              text="The operating system for hybrid teams"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white/90 justify-center"
              delay={100}
              animateBy="words"
              direction="bottom"
            />
          </div>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-neutral-400 leading-relaxed">
            Replace entire departments with AI employees that cost pennies per task.
            Support, sales, recruitment, and engineering &mdash; all running{' '}
            <span className="text-violet-300 font-medium">24/7 at 1% the cost</span> of traditional teams.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <StarBorder
              color="#8B5CF6"
              speed="4s"
              thickness={2}
              onClick={auth.isAuthenticated ? goToDashboard : handleSignIn}
              className="cursor-pointer"
            >
              <span className="flex items-center gap-3 px-8 py-4 text-base font-semibold">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Start Free with Google
              </span>
            </StarBorder>

            <button
              disabled
              className="flex items-center gap-3 rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-8 py-4 text-base font-medium text-neutral-500 cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#00a4ef" d="M1 12h10v10H1z" />
                <path fill="#7fba00" d="M12 1h10v10H12z" />
                <path fill="#ffb900" d="M12 12h10v10H12z" />
              </svg>
              Microsoft &mdash; Coming Soon
            </button>
          </div>

          {/* Hero Dashboard Mockup */}
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-violet-600/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80 shadow-2xl shadow-violet-500/10 p-6">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 mx-4 h-7 rounded-md bg-neutral-800/80 flex items-center px-3">
                  <span className="text-[11px] text-neutral-500 font-mono">app.0mni.ai/dashboard</span>
                </div>
              </div>
              {/* Dashboard content */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Open Tickets', val: '12', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Active Leads', val: '38', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Candidates', val: '24', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { label: 'AI Agents', val: '6', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map(card => (
                  <div key={card.label} className={`rounded-lg ${card.bg} border border-white/5 p-3`}>
                    <p className="text-[10px] text-neutral-500 mb-1">{card.label}</p>
                    <p className={`text-2xl font-black ${card.color}`}>{card.val}</p>
                  </div>
                ))}
              </div>
              {/* Activity bars */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-lg bg-neutral-800/60 border border-white/5 p-3">
                  <p className="text-[10px] text-neutral-500 mb-2">AI Task Performance</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-violet-600 to-violet-400" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-neutral-800/60 border border-white/5 p-3">
                  <p className="text-[10px] text-neutral-500 mb-2">Cost Saved</p>
                  <p className="text-xl font-black text-emerald-400">$14.2k</p>
                  <p className="text-[10px] text-emerald-400/60 mt-1">vs traditional hiring</p>
                  <div className="mt-2 h-1 rounded-full bg-neutral-700">
                    <div className="h-1 rounded-full bg-emerald-500 w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-500 animate-bounce">
          <span className="text-xs">Scroll to explore</span>
          <ChevronRight className="size-4 rotate-90" />
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="relative border-y border-white/5 bg-neutral-900/50 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/5">
          <StatItem
            value={98}
            suffix="%"
            label="Cost Reduction"
            icon={<DollarSign className="size-5 text-emerald-400" />}
          />
          <StatItem
            value={24}
            suffix="/7"
            label="Always On"
            icon={<Clock className="size-5 text-blue-400" />}
          />
          <StatItem
            value={50}
            suffix="ms"
            label="Response Time"
            icon={<Zap className="size-5 text-amber-400" />}
          />
          <StatItem
            value={10}
            suffix="x"
            label="Faster Scaling"
            icon={<TrendingUp className="size-5 text-violet-400" />}
          />
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900/50 to-neutral-950" />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="text-center mb-20">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
              <Bot className="size-3.5" />
              Feature-Rich Platform
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Everything runs on <span className="font-mono">0</span>MNI
            </h2>
            <p className="mx-auto max-w-2xl text-neutral-400 text-lg">
              One platform replaces your entire SaaS stack. AI employees handle the work
              while your team focuses on strategy.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="md:col-span-2 lg:col-span-2">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <Headset className="size-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">AI Support Agents</h3>
                  <p className="text-neutral-400 leading-relaxed mb-4">
                    Resolve tickets instantly, 24/7. AI agents handle L1-L3 support with human-like empathy,
                    auto-escalate edge cases, and maintain 99.9% SLA compliance.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <FeatureTag>Auto-routing</FeatureTag>
                    <FeatureTag>Sentiment analysis</FeatureTag>
                    <FeatureTag>Multi-language</FeatureTag>
                  </div>
                </div>
                <div className="relative flex-shrink-0 lg:w-72 rounded-lg overflow-hidden bg-neutral-800/40 border border-white/5 p-4">
                  <div className="space-y-2">
                    {['Urgent: Payment failed', 'High: Login issues', 'Medium: Feature request'].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md bg-neutral-800/80 px-3 py-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <span className="text-neutral-300 truncate">{t}</span>
                        <span className="ml-auto text-emerald-400 text-[10px]">AI</span>
                      </div>
                    ))}
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span className="text-neutral-500">Avg response</span>
                      <span className="text-emerald-400 font-bold">50ms</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-neutral-500">Resolution rate</span>
                      <span className="text-emerald-400 font-bold">94%</span>
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.15)">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="size-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Sales Pipeline</h3>
              <p className="text-neutral-400 leading-relaxed mb-4">
                AI qualifies leads, automates outreach, and nurtures prospects through your pipeline
                while you close the deals that matter.
              </p>
              <div className="flex flex-wrap gap-2">
                <FeatureTag>Lead scoring</FeatureTag>
                <FeatureTag>Auto-outreach</FeatureTag>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(251, 146, 60, 0.15)">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Users className="size-5 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Recruitment</h3>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Screen thousands of candidates in minutes. AI evaluates resumes, conducts initial assessments,
                and ranks top talent for your review.
              </p>
              <div className="flex flex-wrap gap-2">
                <FeatureTag>Resume parsing</FeatureTag>
                <FeatureTag>Skill matching</FeatureTag>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.15)">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Code2 className="size-5 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Engineering</h3>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Triage bugs, review PRs, manage sprints. AI dev agents pair with your engineers
                to ship faster and catch issues early.
              </p>
              <div className="flex flex-wrap gap-2">
                <FeatureTag>Bug triage</FeatureTag>
                <FeatureTag>PR review</FeatureTag>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(56, 189, 248, 0.15)">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <MessageSquare className="size-5 text-sky-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Real-time Collaboration</h3>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Team messaging with AI teammates built in. Share context, get instant answers,
                and collaborate across departments seamlessly.
              </p>
              <div className="flex flex-wrap gap-2">
                <FeatureTag>Channels</FeatureTag>
                <FeatureTag>Threads</FeatureTag>
                <FeatureTag>AI context</FeatureTag>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ─── Cost Comparison Section ─── */}
      <section id="pricing" className="relative py-32 border-t border-white/5">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[150px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
              <DollarSign className="size-3.5" />
              Revolutionary Pricing
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Why pay <span className="line-through text-neutral-500">$50/hr</span> when AI costs{' '}
              <GradientText colors={['#34D399', '#10B981', '#6EE7B7']} className="text-4xl sm:text-5xl font-bold">
                pennies?
              </GradientText>
            </h2>
            <p className="mx-auto max-w-2xl text-neutral-400 text-lg">
              Traditional staffing is broken. <span className="font-mono">0</span>MNI replaces entire departments
              at a fraction of the cost with AI employees that never sleep.
            </p>
          </div>

          {/* Cost comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Traditional */}
            <div className="relative rounded-2xl border border-red-500/20 bg-neutral-900/80 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[60px]" />
              <div className="relative">
                <span className="inline-block mb-4 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                  Traditional Staffing
                </span>
                <div className="mb-6">
                  <span className="text-5xl font-black text-red-400">$<CountUp to={185} duration={2.5} separator="," /></span>
                  <span className="text-neutral-500 text-lg ml-2">k / year per employee</span>
                </div>
                <div className="space-y-3 text-sm text-neutral-400">
                  <CostLine label="Average salary" value="$65k-$120k" negative />
                  <CostLine label="Benefits & overhead" value="$20k-$40k" negative />
                  <CostLine label="Office & equipment" value="$10k-$25k" negative />
                  <CostLine label="Training & onboarding" value="3-6 months" negative />
                  <CostLine label="Available hours" value="8hrs/day" negative />
                  <CostLine label="Sick days, vacation" value="25+ days/yr" negative />
                </div>
              </div>
            </div>

            {/* 0MNI */}
            <div className="relative rounded-2xl border border-emerald-500/30 bg-neutral-900/80 p-8 overflow-hidden ring-1 ring-emerald-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px]" />
              <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              <div className="relative">
                <span className="inline-block mb-4 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  <span className="font-mono">0</span>MNI AI Employee
                </span>
                <div className="mb-6">
                  <span className="text-5xl font-black text-emerald-400">$<CountUp to={99} duration={2.5} /></span>
                  <span className="text-neutral-500 text-lg ml-2">/ month flat</span>
                </div>
                <div className="space-y-3 text-sm text-neutral-400">
                  <CostLine label="Unlimited AI agents" value="Included" positive />
                  <CostLine label="Setup time" value="5 minutes" positive />
                  <CostLine label="Training needed" value="Zero" positive />
                  <CostLine label="Available hours" value="24/7/365" positive />
                  <CostLine label="Sick days" value="Never" positive />
                  <CostLine label="Scales instantly" value="Unlimited" positive />
                </div>
              </div>
            </div>
          </div>

          {/* Savings calculator */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/80 px-8 py-4">
              <span className="text-neutral-400">Potential annual savings:</span>
              <span className="text-3xl font-black text-emerald-400">
                $<CountUp to={184} duration={3} separator="," />k+
              </span>
              <span className="text-neutral-500">per employee replaced</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="relative py-32 border-t border-white/5">
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Live in <GradientText colors={['#A78BFA', '#8B5CF6', '#C084FC']} className="text-4xl sm:text-5xl font-bold">5 minutes</GradientText>
            </h2>
            <p className="mx-auto max-w-xl text-neutral-400 text-lg">
              No complex setup. No training. Just sign in and your AI workforce is ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step="01"
              title="Sign in with Google"
              description="Use your existing Google Workspace credentials. Your entire team joins instantly via SSO."
              icon={<Shield className="size-6 text-violet-400" />}
            />
            <StepCard
              step="02"
              title="Create your org"
              description="Set up your organization in seconds. Invite teammates with a simple link — everyone gets full access."
              icon={<Users className="size-6 text-violet-400" />}
            />
            <StepCard
              step="03"
              title="Deploy AI employees"
              description="Your AI agents start working immediately. Support tickets, sales leads, recruitment — all handled."
              icon={<Bot className="size-6 text-violet-400" />}
            />
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-32 border-t border-white/5">
        <div className="absolute inset-0 opacity-30">
          <Aurora
            colorStops={['#5B21B6', '#7C3AED', '#8B5CF6']}
            amplitude={0.8}
            blend={0.4}
            speed={0.5}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-5xl sm:text-6xl font-black tracking-tighter mb-6">
            Ready to run your
            <br />
            company on{' '}
            <GradientText
              colors={['#8B5CF6', '#C084FC', '#E9D5FF', '#A78BFA']}
              animationSpeed={4}
              className="text-5xl sm:text-6xl font-black"
            >
              <span className="font-mono">0</span>MNI
            </GradientText>
            ?
          </h2>
          <p className="text-lg text-neutral-400 mb-10 max-w-xl mx-auto">
            Join forward-thinking companies that are replacing $185k/yr employees
            with AI that costs $99/month.
          </p>

          <StarBorder
            color="#8B5CF6"
            speed="3s"
            thickness={2}
            onClick={auth.isAuthenticated ? goToDashboard : handleSignIn}
            className="cursor-pointer"
          >
            <span className="flex items-center gap-3 px-10 py-5 text-lg font-bold">
              Get Started Free
              <ArrowRight className="size-5" />
            </span>
          </StarBorder>

          <p className="mt-6 text-sm text-neutral-500">
            No credit card required &middot; Free tier available &middot; Setup in 5 minutes
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 bg-neutral-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <span className="font-mono text-sm font-black text-white">0</span>
              </div>
              <span className="text-sm text-neutral-400">
                <span className="font-mono">0</span>MNI by Darthwares &mdash; AI Operating Platform
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <span>Powered by SpacetimeDB</span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─── Sub-components ─── */

function StatItem({ value, suffix, label, icon }: { value: number; suffix: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-3xl font-black">
          <CountUp to={value} duration={2.5} />
          <span>{suffix}</span>
        </span>
      </div>
      <span className="text-sm text-neutral-500">{label}</span>
    </div>
  )
}

function FeatureTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-400 border border-white/5">
      {children}
    </span>
  )
}

function CostLine({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={positive ? 'text-emerald-400 font-medium' : negative ? 'text-red-400/80' : ''}>
        {positive && <Check className="inline size-3.5 mr-1" />}
        {value}
      </span>
    </div>
  )
}

function StepCard({ step, title, description, icon }: { step: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="relative group">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative rounded-2xl border border-white/5 bg-neutral-900/80 p-8 h-full">
        <span className="text-5xl font-black text-violet-500/20 absolute top-6 right-6">{step}</span>
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
