"""Sales agent for lead qualification and deal management."""

from typing import Any
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from .base_agent import BaseAgent, AgentCapability, TaskInput


class LeadQualificationResult(BaseModel):
    """Result of lead qualification analysis."""

    qualification_score: float = Field(
        description="Lead quality score from 0-1",
        ge=0.0,
        le=1.0,
    )
    recommended_action: str = Field(
        description="Recommended next action (contact, nurture, disqualify)"
    )
    reasoning: str = Field(description="Explanation of the qualification")
    estimated_value: float = Field(
        default=0.0, description="Estimated deal value if applicable"
    )
    priority: str = Field(
        default="medium", description="Priority level (low/medium/high)"
    )


class DealResponse(BaseModel):
    """Response for deal-related tasks."""

    message: str = Field(description="Response message or recommendation")
    suggested_stage: str = Field(
        default="prospecting",
        description="Suggested deal stage (prospecting/qualification/proposal/negotiation/closed/lost)",
    )
    action_items: list[str] = Field(
        default_factory=list, description="Recommended action items"
    )
    confidence: float = Field(default=1.0, description="Confidence in this response (0-1)")


class SalesAgent(BaseAgent):
    """AI agent specialized in sales operations.

    The SalesAgent can:
    - Qualify leads based on criteria
    - Score leads for prioritization
    - Recommend next actions in sales pipeline
    - Draft outreach messages
    - Analyze deal progress and suggest strategies
    - Identify upsell/cross-sell opportunities
    """

    def __init__(self, **kwargs):
        """Initialize the sales agent."""
        capabilities = [
            AgentCapability(
                name="Lead Qualification",
                description="Analyze and qualify incoming leads",
                examples=[
                    "Score lead quality based on company size and industry",
                    "Determine if lead meets ICP criteria",
                    "Recommend lead prioritization",
                    "Identify high-value opportunities",
                ],
            ),
            AgentCapability(
                name="Deal Management",
                description="Manage deals through the sales pipeline",
                examples=[
                    "Recommend deal stage progression",
                    "Identify deals at risk",
                    "Suggest negotiation strategies",
                    "Estimate deal closure probability",
                ],
            ),
            AgentCapability(
                name="Sales Outreach",
                description="Generate personalized sales communications",
                examples=[
                    "Draft initial outreach emails",
                    "Create follow-up messages",
                    "Generate proposal summaries",
                    "Craft objection handling responses",
                ],
            ),
            AgentCapability(
                name="Opportunity Identification",
                description="Identify upsell and cross-sell opportunities",
                examples=[
                    "Analyze customer usage patterns",
                    "Recommend product expansions",
                    "Identify renewal opportunities",
                    "Suggest strategic account moves",
                ],
            ),
        ]

        super().__init__(
            agent_id="sales_agent",
            name="Sales Agent",
            capabilities=capabilities,
            **kwargs,
        )

    async def execute_task(self, task: TaskInput) -> Any:
        """Execute a sales task.

        Args:
            task: The task containing lead/deal info

        Returns:
            LeadQualificationResult or DealResponse depending on task type
        """
        task_type = task.context.get("task_type", "general")

        if task_type == "lead_qualification":
            return await self._qualify_lead(task)
        elif task_type == "deal_management":
            return await self._manage_deal(task)
        elif task_type == "outreach":
            return await self._generate_outreach(task)
        else:
            # General sales task
            return await self._handle_general_task(task)

    async def _qualify_lead(self, task: TaskInput) -> LeadQualificationResult:
        """Qualify a lead based on provided information."""
        lead_data = task.context.get("lead", {})

        system_prompt = """You are an AI sales agent specializing in lead qualification.

Your responsibilities:
1. Analyze lead information against ideal customer profile (ICP)
2. Score lead quality on a scale of 0-1
3. Recommend next actions (contact, nurture, disqualify)
4. Estimate potential deal value
5. Assign priority level

Qualification Criteria:
- Company size and industry fit
- Budget indicators
- Decision-making authority
- Timeline and urgency
- Product-market fit
- Engagement level

Response Format:
SCORE: [0.0-1.0]
ACTION: [contact/nurture/disqualify]
REASONING: [Your analysis]
ESTIMATED_VALUE: [Dollar amount or 0]
PRIORITY: [low/medium/high]

Example:
SCORE: 0.85
ACTION: contact
REASONING: Strong fit - mid-market SaaS company with 50-200 employees, clear budget authority, active evaluation timeline. High engagement on website.
ESTIMATED_VALUE: 50000
PRIORITY: high
"""

        user_prompt = f"""Task: {task.description}

Lead Information:
- Company: {lead_data.get('company', 'Unknown')}
- Industry: {lead_data.get('industry', 'Unknown')}
- Company Size: {lead_data.get('company_size', 'Unknown')}
- Title: {lead_data.get('title', 'Unknown')}
- Source: {lead_data.get('source', 'Unknown')}
- Notes: {lead_data.get('notes', 'None')}

Please provide a qualification assessment following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_qualification_response(response.content)

    async def _manage_deal(self, task: TaskInput) -> DealResponse:
        """Provide deal management recommendations."""
        deal_data = task.context.get("deal", {})

        system_prompt = """You are an AI sales agent specializing in deal management.

Your responsibilities:
1. Analyze deal progress and health
2. Recommend stage transitions
3. Identify blockers and risks
4. Suggest action items to move deals forward
5. Provide strategic guidance

Deal Stages:
- Prospecting: Initial outreach
- Qualification: Validating fit and budget
- Proposal: Solution presented
- Negotiation: Terms discussion
- Closed: Won or Lost

Response Format:
MESSAGE: [Your analysis and recommendations]
SUGGESTED_STAGE: [prospecting/qualification/proposal/negotiation/closed/lost]
ACTION_ITEMS:
- [Action 1]
- [Action 2]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Deal Information:
- Company: {deal_data.get('company', 'Unknown')}
- Current Stage: {deal_data.get('stage', 'Unknown')}
- Value: ${deal_data.get('estimated_value', 0):,}
- Last Activity: {deal_data.get('last_activity', 'None')}
- Days in Stage: {deal_data.get('days_in_stage', 'Unknown')}
- Notes: {deal_data.get('notes', 'None')}

Please provide deal management recommendations following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_deal_response(response.content)

    async def _generate_outreach(self, task: TaskInput) -> DealResponse:
        """Generate sales outreach content."""
        outreach_context = task.context.get("outreach", {})

        system_prompt = """You are an AI sales agent specializing in personalized outreach.

Your responsibilities:
1. Craft compelling, personalized messages
2. Demonstrate understanding of prospect's business
3. Provide clear value propositions
4. Include strong calls-to-action
5. Maintain professional, consultative tone

Guidelines:
- Keep messages concise (under 200 words)
- Lead with value, not features
- Reference specific pain points or opportunities
- Avoid salesy language
- Make it easy to respond

Response Format:
MESSAGE: [Your drafted outreach message]
SUGGESTED_STAGE: [Current stage this outreach is for]
ACTION_ITEMS:
- [Follow-up reminder]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Outreach Context:
- Prospect: {outreach_context.get('prospect_name', 'Unknown')}
- Company: {outreach_context.get('company', 'Unknown')}
- Outreach Type: {outreach_context.get('type', 'initial_contact')}
- Key Points: {outreach_context.get('key_points', 'None')}
- Previous Context: {outreach_context.get('previous_context', 'None')}

Please generate the outreach message following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_deal_response(response.content)

    async def _handle_general_task(self, task: TaskInput) -> DealResponse:
        """Handle general sales tasks."""
        system_prompt = """You are an AI sales agent for the Omni platform.

Your responsibilities:
1. Provide sales insights and recommendations
2. Analyze sales data and trends
3. Suggest process improvements
4. Support sales team with research and analysis

Response Format:
MESSAGE: [Your response]
SUGGESTED_STAGE: [Relevant stage if applicable]
ACTION_ITEMS:
- [Recommended actions]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Context: {task.context if task.context else 'None'}

Please provide your sales analysis or recommendations following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_deal_response(response.content)

    def _parse_qualification_response(self, response: str) -> LeadQualificationResult:
        """Parse LLM response into structured qualification result."""
        lines = response.strip().split("\n")

        score = 0.5
        action = "nurture"
        reasoning = ""
        estimated_value = 0.0
        priority = "medium"

        for line in lines:
            line = line.strip()
            if line.startswith("SCORE:"):
                try:
                    score = float(line.split(":", 1)[1].strip())
                    score = max(0.0, min(1.0, score))  # Clamp to 0-1
                except ValueError:
                    score = 0.5
            elif line.startswith("ACTION:"):
                action = line.split(":", 1)[1].strip().lower()
            elif line.startswith("REASONING:"):
                reasoning = line.split(":", 1)[1].strip()
            elif line.startswith("ESTIMATED_VALUE:"):
                try:
                    value_str = line.split(":", 1)[1].strip().replace("$", "").replace(",", "")
                    estimated_value = float(value_str)
                except ValueError:
                    estimated_value = 0.0
            elif line.startswith("PRIORITY:"):
                priority = line.split(":", 1)[1].strip().lower()

        # If no reasoning found, use entire response
        if not reasoning:
            reasoning = response.strip()

        return LeadQualificationResult(
            qualification_score=score,
            recommended_action=action,
            reasoning=reasoning,
            estimated_value=estimated_value,
            priority=priority,
        )

    def _parse_deal_response(self, response: str) -> DealResponse:
        """Parse LLM response into structured deal response."""
        lines = response.strip().split("\n")

        message = ""
        suggested_stage = "prospecting"
        action_items = []
        confidence = 0.9

        current_section = None

        for line in lines:
            line = line.strip()
            if line.startswith("MESSAGE:"):
                message = line.split(":", 1)[1].strip()
                current_section = "message"
            elif line.startswith("SUGGESTED_STAGE:"):
                suggested_stage = line.split(":", 1)[1].strip().lower()
                current_section = None
            elif line.startswith("ACTION_ITEMS:"):
                current_section = "action_items"
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.9
                current_section = None
            elif current_section == "action_items" and line.startswith("-"):
                action_items.append(line[1:].strip())
            elif current_section == "message" and line and not line.startswith(("SUGGESTED_STAGE:", "ACTION_ITEMS:", "CONFIDENCE:")):
                message += " " + line

        # If no MESSAGE: prefix found, use entire response
        if not message:
            message = response.strip()

        return DealResponse(
            message=message,
            suggested_stage=suggested_stage,
            action_items=action_items,
            confidence=confidence,
        )
