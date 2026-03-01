"""Support agent for handling customer support tickets."""

from typing import Any
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from .base_agent import BaseAgent, AgentCapability, TaskInput


class TicketResponse(BaseModel):
    """Response to a customer support ticket."""

    message: str = Field(description="Response message to the customer")
    should_escalate: bool = Field(
        default=False, description="Whether to escalate to human agent"
    )
    suggested_status: str = Field(
        default="open", description="Suggested ticket status after response"
    )
    confidence: float = Field(default=1.0, description="Confidence in this response (0-1)")


class SupportAgent(BaseAgent):
    """AI agent specialized in customer support.

    The SupportAgent can:
    - Read and understand customer support tickets
    - Generate appropriate responses to common questions
    - Escalate complex issues to human agents
    - Update ticket status
    - Learn from past interactions
    """

    def __init__(self, **kwargs):
        """Initialize the support agent."""
        capabilities = [
            AgentCapability(
                name="Customer Support",
                description="Handle customer support tickets and questions",
                examples=[
                    "Answer customer questions",
                    "Troubleshoot common issues",
                    "Provide product information",
                    "Handle billing inquiries",
                ],
            ),
            AgentCapability(
                name="Ticket Triage",
                description="Categorize and prioritize support tickets",
                examples=[
                    "Identify urgent issues",
                    "Categorize tickets by topic",
                    "Route specialized questions",
                ],
            ),
            AgentCapability(
                name="Escalation Management",
                description="Determine when to escalate to human agents",
                examples=[
                    "Detect complex technical issues",
                    "Identify frustrated customers",
                    "Flag policy exceptions",
                ],
            ),
        ]

        super().__init__(
            agent_id="support_agent",
            name="Support Agent",
            capabilities=capabilities,
            **kwargs,
        )

    async def execute_task(self, task: TaskInput) -> Any:
        """Execute a support task.

        Args:
            task: The task containing ticket info and customer message

        Returns:
            TicketResponse with the suggested reply
        """
        # Extract ticket context
        ticket_context = task.context.get("ticket", {})
        customer_message = task.context.get("customer_message", "")
        previous_messages = task.context.get("previous_messages", [])

        # Build system prompt with support context
        system_prompt = self._build_support_system_prompt()

        # Build user prompt with ticket details
        user_prompt = self._build_support_user_prompt(
            task.description, ticket_context, customer_message, previous_messages
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        # Get response from LLM
        response = await self.llm.ainvoke(messages)

        # Parse response into structured format
        ticket_response = self._parse_support_response(response.content)

        return ticket_response

    def _build_support_system_prompt(self) -> str:
        """Build system prompt for support agent."""
        return """You are an AI customer support agent for the Omni platform.

Your responsibilities:
1. Provide helpful, accurate, and friendly responses to customer inquiries
2. Troubleshoot common issues and guide customers to solutions
3. Escalate complex or sensitive issues to human agents
4. Maintain a professional and empathetic tone
5. Ensure customer satisfaction while protecting company interests

Guidelines:
- Be concise but thorough
- Use simple, clear language
- Show empathy for customer frustrations
- Admit when you don't know something
- Never make promises you can't keep
- Always prioritize customer data security

Escalation Triggers:
- Requests for refunds or billing disputes
- Technical issues outside your knowledge base
- Angry or threatening customers
- Requests for features you can't provide
- Complex integrations or custom solutions

Response Format:
MESSAGE: [Your response to the customer]
ESCALATE: [YES/NO]
SUGGESTED_STATUS: [open/in_progress/resolved/escalated]
CONFIDENCE: [0.0-1.0]

Example:
MESSAGE: Hi! I'd be happy to help you reset your password. Please click on the "Forgot Password" link on the login page and follow the instructions. Let me know if you run into any issues!
ESCALATE: NO
SUGGESTED_STATUS: resolved
CONFIDENCE: 0.95
"""

    def _build_support_user_prompt(
        self,
        task_description: str,
        ticket: dict[str, Any],
        customer_message: str,
        previous_messages: list[dict[str, Any]],
    ) -> str:
        """Build user prompt for support agent."""
        prompt = f"""Task: {task_description}

Ticket Information:
- Priority: {ticket.get('priority', 'medium')}
- Category: {ticket.get('category', 'general')}
- Customer: {ticket.get('customer_name', 'Customer')}

Customer Message:
{customer_message}
"""

        if previous_messages:
            prompt += "\n\nPrevious Conversation:\n"
            for msg in previous_messages[-5:]:  # Last 5 messages for context
                sender = "Customer" if msg.get("from_customer") else "Agent"
                prompt += f"{sender}: {msg.get('content', '')}\n"

        prompt += "\n\nPlease provide a response following the format specified in your system prompt."

        return prompt

    def _parse_support_response(self, response: str) -> TicketResponse:
        """Parse LLM response into structured ticket response."""
        lines = response.strip().split("\n")

        message = ""
        should_escalate = False
        suggested_status = "open"
        confidence = 0.9

        for line in lines:
            line = line.strip()
            if line.startswith("MESSAGE:"):
                message = line.split(":", 1)[1].strip()
            elif line.startswith("ESCALATE:"):
                escalate_text = line.split(":", 1)[1].strip().upper()
                should_escalate = escalate_text == "YES"
            elif line.startswith("SUGGESTED_STATUS:"):
                suggested_status = line.split(":", 1)[1].strip().lower()
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.9

        # If no MESSAGE: prefix found, use entire response
        if not message:
            message = response.strip()

        return TicketResponse(
            message=message,
            should_escalate=should_escalate,
            suggested_status=suggested_status,
            confidence=confidence,
        )
