# Omni - AI Operating Platform

**The first operating system built for hybrid human+AI companies.**

Omni is a comprehensive platform that seamlessly integrates AI agents with human workers across 5 core business functions: Support, Sales, Recruitment, Collaboration, and Engineering.

## 🌟 Key Features

- **Real-time Global Database**: Powered by SpacetimeDB, deployed on maincloud
- **5 Integrated Modules**: Support, Sales, Recruitment, Collaboration, Engineering
- **Intelligent AI Agents**: Autonomous agents with self-verification and task routing
- **Modern React UI**: Built with Vinext (Next.js alternative) and Tailwind CSS
- **Global Edge Deployment**: Cloudflare Workers ready (pending Vinext maturity)
- **80% Auto-Resolution**: AI agents handle routine tasks, escalate when needed

## 📁 Project Structure

```
0mni/
├── spacetimedb/          # Backend database module
│   └── src/
│       └── lib.rs        # All tables, reducers, and business logic
│
├── client/               # Frontend Vinext application
│   ├── app/              # Next.js-style app router
│   │   ├── dashboard/    # Main dashboard
│   │   ├── support/      # Customer support module
│   │   ├── sales/        # Sales and deals module
│   │   ├── recruitment/  # Hiring and interviews module
│   │   ├── collaboration/# Team communication module
│   │   └── engineering/  # Code review and bugs module
│   └── src/
│       ├── components/   # Shared React components
│       ├── providers/    # SpacetimeDB provider
│       └── generated/    # Auto-generated TypeScript bindings
│
└── agents/               # Python AI agent runtime
    └── src/
        ├── config.py           # Configuration management
        ├── base_agent.py       # Base agent class
        ├── supervisor.py       # Task routing supervisor
        ├── verification.py     # Self-verification system
        ├── support_agent.py    # Customer support AI
        └── main.py             # Agent runtime entry point
```

## 🗄️ Database Schema (SpacetimeDB)

### Core Tables
- **Employee**: Human and AI employees
- **Task**: Work assignments with AI routing
- **Message**: Universal messaging (tickets, channels, etc.)

### Module Tables
- **Support**: Customer, Ticket
- **Sales**: Lead, Deal
- **Recruitment**: Candidate, JobPosting, Interview
- **Collaboration**: Channel, Document, Meeting
- **Engineering**: PullRequest, Bug, CodeRepository

### Communication
- **CallSession**: Voice/video calls with AI participants
- **ActivityLog**: Audit trail of all actions

**Database URL**: https://spacetimedb.com/@chibionos/omni-platform

## 🚀 Quick Start

### 1. Database Setup

```bash
# Start local SpacetimeDB (for development)
spacetime start

# Or use maincloud (production)
# Database already published at: omni-platform
```

### 2. Frontend Setup

```bash
cd client
npm install
npm run build

# Development (requires fixing file watcher limits)
npm run dev

# Production build
npm run build  # Creates dist/client and dist/server
```

**Note**: Deployment to Cloudflare Workers is currently blocked by Vinext 0.0.16 limitations (released Feb 24, 2026). The framework is very new and deployment features are not yet stable.

### 3. AI Agents Setup

```bash
cd agents

# Install dependencies
pip install -e .

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run agents
python -m src.main
```

## 🤖 AI Agent System

### Architecture

```
User Request
    ↓
SupervisorAgent (routes to specialist)
    ↓
Specialist Agent (executes task)
    ↓
Verifier (validates output)
    ↓
Result → SpacetimeDB → UI Update
```

### Available Agents

1. **SupportAgent** ✅ - Handles customer support tickets and inquiries
2. **SalesAgent** ✅ - Qualifies leads, scores opportunities, manages deals
3. **RecruiterAgent** ✅ - Screens candidates, generates interview questions, schedules interviews
4. **CodeReviewAgent** ✅ - Reviews PRs, triages bugs, assesses code quality
5. **DocsAgent** ✅ - Generates API docs, user guides, code comments, architecture documentation

### Self-Verification System

All agents use a verification layer that:
- Validates outputs before submission
- Reduces hallucinations and errors
- Provides confidence scores
- Suggests improvements for failed verifications
- Automatically retries with improvements

## 🎨 UI Modules

### Support
- Customer inbox with real-time updates
- Ticket detail view with message threads
- Customer profile sidebar
- AI handling indicators
- Priority and status management

### Sales
- Lead management with AI scoring
- Visual deal pipeline (Kanban-style)
- Lead/deal detail views
- Estimated value tracking
- AI-powered qualification

### Recruitment
- Candidate list with AI match scores
- Job posting board
- Interview scheduling
- Multi-tab interface (Candidates/Jobs/Interviews)
- AI-assisted screening

### Collaboration
- Slack/Teams-style channels
- Real-time messaging
- Document library
- Meeting scheduler
- AI notetaker support

### Engineering
- Pull request tracking
- Bug management with AI triage
- Repository overview
- Code review status
- Test status indicators

## 🔧 Tech Stack

### Backend
- **SpacetimeDB 2.0**: Real-time global database
- **Rust**: Server-side logic and reducers

### Frontend
- **Vinext 0.0.16**: Next.js alternative built on Vite (Feb 24, 2026)
- **React 19**: UI framework
- **Tailwind CSS 3.4.1**: Styling
- **TypeScript 5.9**: Type safety
- **SpacetimeDB React Hooks**: Real-time data binding

### AI Agents
- **Python 3.11+**: Agent runtime
- **LangChain**: LLM orchestration
- **LangGraph**: Multi-step workflows (planned)
- **Anthropic Claude**: Default LLM (configurable)
- **Pydantic**: Data validation

## 📊 Current Status

### ✅ Completed
- SpacetimeDB schema and backend (published to maincloud)
- TypeScript bindings generation
- All 5 module UIs (Support, Sales, Recruitment, Collaboration, Engineering)
- Main dashboard and routing
- AI agent runtime foundation
- SupervisorAgent task routing
- Self-verification system
- All 5 specialist agents (Support, Sales, Recruiter, CodeReview, Docs)
- SpacetimeDB client integration module
- Real-time task processing with automatic status updates

### ⏳ In Progress
- SpacetimeDB Python SDK finalization (SDK still evolving)
- LangGraph workflow orchestration
- Agent performance monitoring

### 📋 Planned
- Playwright E2E testing
- Voice/video calling integration
- Production deployment (waiting for Vinext stability)
- Agent performance monitoring
- Multi-agent collaborative workflows

## 🧪 Testing

### Frontend
```bash
cd client
npm run build  # Verify production build works
```

### Agents
```bash
cd agents
pytest tests/
```

### E2E (Planned)
```bash
cd client
npx playwright test
```

## 📝 Development Notes

### Vinext Deployment Limitations
Vinext 0.0.16 was released on Feb 24, 2026 (4 days ago). While it offers significant improvements over Next.js (4.4x faster builds, 57% smaller bundles), the deployment to Cloudflare Workers currently fails due to virtual module resolution issues. Production builds work fine - only \`wrangler deploy\` is affected.

**Workaround**: Deploy the built files manually or wait for Vinext updates.

### SpacetimeDB Best Practices
- Reducers are deterministic and transactional
- Use auto-increment IDs for primary keys (gaps are normal)
- Subscribe to tables, don't expect return values from reducers
- Index names must be unique across entire module

### Agent Guidelines
- Always use verification for production tasks
- Set appropriate confidence thresholds per agent type
- Monitor verification pass rates
- Escalate to humans when verification fails repeatedly

## 🤝 Contributing

1. Backend changes: Edit \`spacetimedb/src/lib.rs\`
2. Republish: \`spacetime publish omni-platform --clear-database -y --module-path spacetimedb\`
3. Regenerate bindings: \`spacetime generate --lang typescript --out-dir client/src/generated --module-path spacetimedb\`
4. Frontend changes: Edit files in \`client/app/\` or \`client/src/\`
5. Agent changes: Edit files in \`agents/src/\`

## 📄 License

Proprietary - All Rights Reserved

## 🙏 Acknowledgments

- SpacetimeDB for real-time global database infrastructure
- Cloudflare for Vinext and Workers platform
- Anthropic for Claude AI capabilities
- LangChain for LLM orchestration primitives

---

**Built with ❤️ for the future of hybrid human+AI work**
