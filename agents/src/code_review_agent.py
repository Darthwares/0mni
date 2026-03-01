"""Code review agent for PR analysis and bug triage."""

from typing import Any
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from .base_agent import BaseAgent, AgentCapability, TaskInput


class CodeReviewResult(BaseModel):
    """Result of code review analysis."""

    approval_recommendation: str = Field(
        description="Recommendation: approve, request_changes, or comment"
    )
    quality_score: float = Field(
        description="Code quality score from 0-1",
        ge=0.0,
        le=1.0,
    )
    findings: list[str] = Field(
        default_factory=list, description="Code review findings and suggestions"
    )
    security_concerns: list[str] = Field(
        default_factory=list, description="Security-related issues found"
    )
    performance_notes: list[str] = Field(
        default_factory=list, description="Performance optimization opportunities"
    )
    summary: str = Field(description="Overall review summary")
    confidence: float = Field(default=1.0, description="Confidence in assessment (0-1)")


class BugTriageResult(BaseModel):
    """Result of bug triage analysis."""

    severity: str = Field(
        description="Bug severity (critical/high/medium/low)"
    )
    priority: str = Field(
        description="Bug priority (urgent/high/medium/low)"
    )
    category: str = Field(
        description="Bug category (functionality/performance/security/ui/other)"
    )
    root_cause_hypothesis: str = Field(
        description="Hypothesis about potential root cause"
    )
    suggested_assignee: str = Field(
        default="", description="Suggested team or person to handle this"
    )
    reproduction_steps: list[str] = Field(
        default_factory=list, description="Steps to reproduce (if inferrable)"
    )
    confidence: float = Field(default=1.0, description="Confidence in triage (0-1)")


class CodeReviewAgent(BaseAgent):
    """AI agent specialized in code review and bug triage.

    The CodeReviewAgent can:
    - Review pull requests for code quality
    - Identify potential bugs and security issues
    - Suggest performance optimizations
    - Triage bug reports
    - Recommend testing strategies
    - Generate review comments
    """

    def __init__(self, **kwargs):
        """Initialize the code review agent."""
        capabilities = [
            AgentCapability(
                name="Code Review",
                description="Analyze pull requests for quality, security, and best practices",
                examples=[
                    "Review code changes for bugs",
                    "Identify security vulnerabilities",
                    "Suggest performance improvements",
                    "Check code style and conventions",
                ],
            ),
            AgentCapability(
                name="Bug Triage",
                description="Categorize and prioritize bug reports",
                examples=[
                    "Assess bug severity and priority",
                    "Identify root cause hypotheses",
                    "Route bugs to appropriate teams",
                    "Suggest reproduction steps",
                ],
            ),
            AgentCapability(
                name="Test Recommendations",
                description="Suggest testing strategies and test cases",
                examples=[
                    "Identify missing test coverage",
                    "Recommend test scenarios",
                    "Suggest edge cases to test",
                    "Review test quality",
                ],
            ),
            AgentCapability(
                name="Technical Debt Assessment",
                description="Identify and prioritize technical debt",
                examples=[
                    "Flag code that needs refactoring",
                    "Suggest modernization opportunities",
                    "Identify deprecated patterns",
                    "Recommend cleanup tasks",
                ],
            ),
        ]

        super().__init__(
            agent_id="code_review_agent",
            name="Code Review Agent",
            capabilities=capabilities,
            **kwargs,
        )

    async def execute_task(self, task: TaskInput) -> Any:
        """Execute a code review or bug triage task.

        Args:
            task: The task containing PR/bug info

        Returns:
            CodeReviewResult or BugTriageResult depending on task type
        """
        task_type = task.context.get("task_type", "general")

        if task_type == "code_review":
            return await self._review_code(task)
        elif task_type == "bug_triage":
            return await self._triage_bug(task)
        elif task_type == "test_review":
            return await self._review_tests(task)
        else:
            # General engineering task
            return await self._handle_general_task(task)

    async def _review_code(self, task: TaskInput) -> CodeReviewResult:
        """Review code changes in a pull request."""
        pr_data = task.context.get("pull_request", {})
        code_diff = task.context.get("diff", "")

        system_prompt = """You are an AI code review agent specializing in software quality.

Your responsibilities:
1. Review code for correctness, security, and performance
2. Identify potential bugs and edge cases
3. Check adherence to best practices and patterns
4. Suggest improvements and optimizations
5. Provide constructive, actionable feedback

Review Checklist:
- Correctness: Does the code do what it's supposed to do?
- Security: Are there any security vulnerabilities?
- Performance: Are there obvious performance issues?
- Readability: Is the code clear and maintainable?
- Testing: Is there adequate test coverage?
- Error Handling: Are errors handled appropriately?
- Documentation: Are complex parts documented?

Feedback Guidelines:
- Be specific and actionable
- Explain the "why" behind suggestions
- Acknowledge good practices
- Prioritize critical issues over style
- Suggest alternatives, don't just criticize

Response Format:
RECOMMENDATION: [approve/request_changes/comment]
QUALITY_SCORE: [0.0-1.0]
FINDINGS:
- [Finding 1]
- [Finding 2]
SECURITY_CONCERNS:
- [Security issue 1]
PERFORMANCE_NOTES:
- [Performance note 1]
SUMMARY: [Overall assessment]
CONFIDENCE: [0.0-1.0]

Example:
RECOMMENDATION: request_changes
QUALITY_SCORE: 0.75
FINDINGS:
- Line 45: Missing null check on user input could cause NPE
- Consider using const instead of let for immutable variables
- Good use of async/await pattern
SECURITY_CONCERNS:
- SQL query on line 78 vulnerable to injection - use parameterized queries
PERFORMANCE_NOTES:
- Loop on line 120 could be optimized with a map operation
SUMMARY: Generally well-structured code with good async patterns. Main concerns are the SQL injection vulnerability (critical) and missing input validation. Tests look comprehensive.
CONFIDENCE: 0.88
"""

        user_prompt = f"""Task: {task.description}

Pull Request Information:
- Title: {pr_data.get('title', 'Unknown')}
- Author: {pr_data.get('author', 'Unknown')}
- Description: {pr_data.get('description', 'Not provided')}
- Files Changed: {pr_data.get('files_changed', 'Unknown')}

Code Changes:
{code_diff[:5000] if code_diff else 'No diff provided'}

Please provide a code review following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_review_response(response.content)

    async def _triage_bug(self, task: TaskInput) -> BugTriageResult:
        """Triage a bug report."""
        bug_data = task.context.get("bug", {})

        system_prompt = """You are an AI code review agent specializing in bug triage.

Your responsibilities:
1. Assess bug severity and priority
2. Categorize the bug type
3. Hypothesize about root causes
4. Suggest appropriate team or person to handle it
5. Provide reproduction steps if possible

Severity Levels:
- Critical: System down, data loss, security breach
- High: Major functionality broken, affects many users
- Medium: Functionality impaired, workaround exists
- Low: Minor issue, cosmetic problem

Priority Levels:
- Urgent: Must fix immediately
- High: Fix in current sprint
- Medium: Fix in next sprint
- Low: Fix when possible

Categories:
- Functionality: Feature not working as expected
- Performance: Slow or resource-intensive operation
- Security: Vulnerability or exposure
- UI: Visual or UX issue
- Other: Doesn't fit other categories

Response Format:
SEVERITY: [critical/high/medium/low]
PRIORITY: [urgent/high/medium/low]
CATEGORY: [functionality/performance/security/ui/other]
ROOT_CAUSE: [Your hypothesis about the cause]
SUGGESTED_ASSIGNEE: [Team or person, or "needs investigation"]
REPRODUCTION_STEPS:
- [Step 1]
- [Step 2]
CONFIDENCE: [0.0-1.0]

Example:
SEVERITY: high
PRIORITY: high
CATEGORY: functionality
ROOT_CAUSE: Likely a race condition in the async message handler when multiple messages arrive simultaneously. The shared state isn't properly synchronized.
SUGGESTED_ASSIGNEE: Backend team (message handling expertise)
REPRODUCTION_STEPS:
- Send 10+ messages rapidly in succession
- Observe message order in UI
- Check for dropped or duplicated messages
CONFIDENCE: 0.80
"""

        user_prompt = f"""Task: {task.description}

Bug Report:
- Title: {bug_data.get('title', 'Unknown')}
- Reporter: {bug_data.get('reporter', 'Unknown')}
- Description: {bug_data.get('description', 'Not provided')}
- Steps to Reproduce: {bug_data.get('steps', 'Not provided')}
- Expected Behavior: {bug_data.get('expected', 'Not specified')}
- Actual Behavior: {bug_data.get('actual', 'Not specified')}
- Environment: {bug_data.get('environment', 'Not specified')}

Please provide bug triage analysis following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_triage_response(response.content)

    async def _review_tests(self, task: TaskInput) -> CodeReviewResult:
        """Review test coverage and quality."""
        test_data = task.context.get("tests", {})

        system_prompt = """You are an AI code review agent specializing in test quality.

Your responsibilities:
1. Assess test coverage completeness
2. Identify missing test cases
3. Review test quality and maintainability
4. Suggest edge cases to test
5. Check test isolation and reliability

Test Quality Criteria:
- Coverage: Are all critical paths tested?
- Edge Cases: Are boundary conditions covered?
- Isolation: Do tests avoid dependencies on each other?
- Clarity: Are test names and assertions clear?
- Maintainability: Are tests easy to update?

Response Format:
RECOMMENDATION: [approve/request_changes/comment]
QUALITY_SCORE: [0.0-1.0]
FINDINGS:
- [Finding 1]
- [Finding 2]
SUMMARY: [Overall assessment]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Test Information:
- Test File: {test_data.get('file', 'Unknown')}
- Coverage: {test_data.get('coverage', 'Unknown')}%
- Test Count: {test_data.get('count', 'Unknown')}

Test Code:
{test_data.get('code', 'Not provided')[:3000]}

Please provide test review following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_review_response(response.content)

    async def _handle_general_task(self, task: TaskInput) -> CodeReviewResult:
        """Handle general engineering tasks."""
        system_prompt = """You are an AI code review agent for the Omni platform.

Your responsibilities:
1. Provide engineering insights and recommendations
2. Analyze code quality and architecture
3. Suggest improvements and best practices
4. Support development team with technical analysis

Response Format:
RECOMMENDATION: [Your recommendation]
QUALITY_SCORE: [0.0-1.0 if applicable, otherwise 0.5]
FINDINGS:
- [Finding 1]
SUMMARY: [Your response]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Context: {task.context if task.context else 'None'}

Please provide your engineering analysis following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_review_response(response.content)

    def _parse_review_response(self, response: str) -> CodeReviewResult:
        """Parse LLM response into structured code review result."""
        lines = response.strip().split("\n")

        recommendation = "comment"
        quality_score = 0.7
        findings = []
        security_concerns = []
        performance_notes = []
        summary = ""
        confidence = 0.9

        current_section = None

        for line in lines:
            line = line.strip()
            if line.startswith("RECOMMENDATION:"):
                recommendation = line.split(":", 1)[1].strip().lower()
                current_section = None
            elif line.startswith("QUALITY_SCORE:"):
                try:
                    quality_score = float(line.split(":", 1)[1].strip())
                    quality_score = max(0.0, min(1.0, quality_score))
                except ValueError:
                    quality_score = 0.7
                current_section = None
            elif line.startswith("FINDINGS:"):
                current_section = "findings"
            elif line.startswith("SECURITY_CONCERNS:"):
                current_section = "security"
            elif line.startswith("PERFORMANCE_NOTES:"):
                current_section = "performance"
            elif line.startswith("SUMMARY:"):
                summary = line.split(":", 1)[1].strip()
                current_section = "summary"
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.9
                current_section = None
            elif current_section == "findings" and line.startswith("-"):
                findings.append(line[1:].strip())
            elif current_section == "security" and line.startswith("-"):
                security_concerns.append(line[1:].strip())
            elif current_section == "performance" and line.startswith("-"):
                performance_notes.append(line[1:].strip())
            elif current_section == "summary" and line and not line.startswith(("CONFIDENCE:", "RECOMMENDATION:")):
                summary += " " + line

        # If no summary found, use entire response
        if not summary:
            summary = response.strip()

        return CodeReviewResult(
            approval_recommendation=recommendation,
            quality_score=quality_score,
            findings=findings,
            security_concerns=security_concerns,
            performance_notes=performance_notes,
            summary=summary,
            confidence=confidence,
        )

    def _parse_triage_response(self, response: str) -> BugTriageResult:
        """Parse LLM response into structured bug triage result."""
        lines = response.strip().split("\n")

        severity = "medium"
        priority = "medium"
        category = "functionality"
        root_cause = ""
        suggested_assignee = "needs investigation"
        reproduction_steps = []
        confidence = 0.9

        current_section = None

        for line in lines:
            line = line.strip()
            if line.startswith("SEVERITY:"):
                severity = line.split(":", 1)[1].strip().lower()
                current_section = None
            elif line.startswith("PRIORITY:"):
                priority = line.split(":", 1)[1].strip().lower()
                current_section = None
            elif line.startswith("CATEGORY:"):
                category = line.split(":", 1)[1].strip().lower()
                current_section = None
            elif line.startswith("ROOT_CAUSE:"):
                root_cause = line.split(":", 1)[1].strip()
                current_section = "root_cause"
            elif line.startswith("SUGGESTED_ASSIGNEE:"):
                suggested_assignee = line.split(":", 1)[1].strip()
                current_section = None
            elif line.startswith("REPRODUCTION_STEPS:"):
                current_section = "reproduction"
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.9
                current_section = None
            elif current_section == "reproduction" and line.startswith("-"):
                reproduction_steps.append(line[1:].strip())
            elif current_section == "root_cause" and line and not line.startswith(("SUGGESTED_ASSIGNEE:", "REPRODUCTION_STEPS:", "CONFIDENCE:")):
                root_cause += " " + line

        # If no root cause found, use entire response
        if not root_cause:
            root_cause = response.strip()

        return BugTriageResult(
            severity=severity,
            priority=priority,
            category=category,
            root_cause_hypothesis=root_cause,
            suggested_assignee=suggested_assignee,
            reproduction_steps=reproduction_steps,
            confidence=confidence,
        )
