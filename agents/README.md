# Omni AI Agents

Intelligent automation for the Omni platform using LangGraph and LangChain.

## Architecture

The agent system consists of:

### Core Components

1. **SupervisorAgent**: Routes tasks to specialist agents based on capabilities
2. **BaseAgent**: Abstract base class for all specialist agents
3. **Verifier**: Self-verification system to reduce hallucinations
4. **Config**: Centralized configuration management

### Specialist Agents

- **SupportAgent** ✅: Handles customer support tickets and inquiries
- **SalesAgent** ✅: Qualifies leads, scores opportunities, and manages deals
- **RecruiterAgent** ✅: Screens candidates, generates interview questions, and schedules interviews
- **CodeReviewAgent** ✅: Reviews pull requests, triages bugs, and assesses code quality
- **DocsAgent** ✅: Generates API docs, user guides, code comments, and architecture documentation

## Features

- ✅ Self-verification system with configurable confidence thresholds
- ✅ Automatic task routing via SupervisorAgent
- ✅ Retry logic with verification-based improvements
- ✅ Capability-based agent selection
- ✅ Support for multiple LLM providers (OpenAI, Anthropic)
- ✅ All 5 specialist agents fully implemented (Support, Sales, Recruiter, CodeReview, Docs)
- ✅ SpacetimeDB client integration module with real-time task processing
- ✅ Automatic task status updates and activity logging
- ⏳ LangGraph state machine orchestration
- ⏳ Multi-agent workflows
- ⏳ Conversation memory and context

## Installation

```bash
cd agents
pip install -e .
```

For development:
```bash
pip install -e ".[dev]"
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# SpacetimeDB
SPACETIMEDB_URI=https://maincloud.spacetimedb.com
SPACETIMEDB_NAME=omni-platform
SPACETIMEDB_TOKEN=your-token

# LLM Provider (choose one)
ANTHROPIC_API_KEY=your-key
# or
OPENAI_API_KEY=your-key

# Agent Settings
DEFAULT_LLM_PROVIDER=anthropic
DEFAULT_MODEL=claude-3-5-sonnet-20241022
VERIFICATION_THRESHOLD=0.8
```

## Usage

### Basic Task Processing

```python
from src.supervisor import SupervisorAgent
from src.support_agent import SupportAgent
from src.base_agent import TaskInput

# Initialize agents
support_agent = SupportAgent()
supervisor = SupervisorAgent(agents=[support_agent])

# Create a task
task = TaskInput(
    task_id=1,
    description="Help customer reset their password",
    context={
        "customer_message": "I can't log in, I forgot my password",
        "ticket": {"priority": "high", "category": "account"}
    },
    assigned_to="support_agent"
)

# Process the task
result = await supervisor.process_task(task)
print(result.result)
```

### Adding Custom Agents

```python
from src.base_agent import BaseAgent, AgentCapability, TaskInput

class CustomAgent(BaseAgent):
    def __init__(self):
        capabilities = [
            AgentCapability(
                name="Custom Capability",
                description="What your agent does",
                examples=["example task 1", "example task 2"]
            )
        ]
        super().__init__(
            agent_id="custom_agent",
            name="Custom Agent",
            capabilities=capabilities
        )

    async def execute_task(self, task: TaskInput):
        # Your implementation
        return {"result": "done"}
```

## Verification System

All agents use self-verification to validate outputs:

```python
verifier = Verifier(llm, threshold=0.8)
verification = await verifier.verify(
    task_description="Answer customer question",
    agent_output="Here's your answer...",
    context={"customer_type": "premium"}
)

if verification.passed:
    # Submit the output
    pass
else:
    # Retry or escalate
    print(verification.suggestions)
```

## Testing

```bash
pytest tests/
```

## Development

Format code:
```bash
black src/ tests/
ruff check src/ tests/
```

## Next Steps

- [x] Implement remaining specialist agents (Sales, Recruiter, CodeReview, Docs)
- [x] Integrate SpacetimeDB client for real-time updates
- [ ] Finalize SpacetimeDB Python SDK integration (SDK still evolving)
- [ ] Add LangGraph state machine for multi-step workflows
- [ ] Add conversation memory and context
- [ ] Implement collaborative multi-agent workflows
- [ ] Add performance monitoring and metrics dashboard
- [ ] Create agent management UI in client

## Agent Capabilities

### SupportAgent
- Answer customer questions with knowledge base context
- Troubleshoot common issues
- Escalate complex problems to human agents
- Categorize and prioritize tickets
- Maintain professional, empathetic tone

### SalesAgent
- Qualify leads based on ICP criteria
- Score lead quality (0-1 scale)
- Draft personalized outreach messages
- Recommend deal stage progression
- Identify upsell/cross-sell opportunities
- Suggest negotiation strategies

### RecruiterAgent
- Screen resumes against job requirements
- Calculate candidate-job match scores
- Generate role-specific interview questions
- Draft candidate communications (invites, rejections, offers)
- Provide hiring recommendations
- Ensure unbiased, job-relevant evaluations

### CodeReviewAgent
- Review pull requests for quality and security
- Identify bugs and performance issues
- Triage bug reports by severity and priority
- Suggest testing strategies
- Flag technical debt
- Provide constructive, actionable feedback

### DocsAgent
- Generate API documentation from code
- Write user guides and tutorials
- Create README files and changelogs
- Generate code comments and docstrings
- Document system architecture (with Mermaid diagrams)
- Maintain consistent documentation standards
