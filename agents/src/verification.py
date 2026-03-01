"""Self-verification system for AI agents.

This module implements a verification layer that agents use to validate their outputs
before submitting them. This reduces hallucinations and improves reliability.
"""

from typing import Any, TypeVar
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langchain_core.language_models import BaseChatModel

from .config import config


T = TypeVar("T")


class VerificationResult(BaseModel):
    """Result of a verification check."""

    passed: bool = Field(description="Whether the verification passed")
    confidence: float = Field(description="Confidence score (0-1)")
    reasoning: str = Field(description="Explanation of the verification decision")
    suggestions: list[str] = Field(default_factory=list, description="Suggestions for improvement")


class Verifier:
    """Self-verification system for agent outputs.

    The verifier uses a separate LLM call to evaluate the quality and correctness
    of an agent's output before it's submitted.
    """

    def __init__(self, llm: BaseChatModel, threshold: float | None = None):
        """Initialize verifier.

        Args:
            llm: Language model to use for verification
            threshold: Minimum confidence threshold (defaults to config value)
        """
        self.llm = llm
        self.threshold = threshold or config.verification_threshold

    async def verify(
        self,
        task_description: str,
        agent_output: Any,
        context: dict[str, Any] | None = None,
    ) -> VerificationResult:
        """Verify an agent's output.

        Args:
            task_description: Description of what the agent was asked to do
            agent_output: The output produced by the agent
            context: Additional context for verification

        Returns:
            VerificationResult with pass/fail and reasoning
        """
        verification_prompt = self._build_verification_prompt(
            task_description, agent_output, context or {}
        )

        messages: list[BaseMessage] = [
            SystemMessage(content=self._get_system_prompt()),
            HumanMessage(content=verification_prompt),
        ]

        response = await self.llm.ainvoke(messages)

        # Parse the LLM response into a structured result
        # In production, you'd use structured outputs or function calling
        return self._parse_verification_response(response.content)

    def _get_system_prompt(self) -> str:
        """Get the system prompt for verification."""
        return """You are a verification agent responsible for validating AI outputs.

Your job is to:
1. Check if the output correctly addresses the task
2. Verify the output is accurate and doesn't contain hallucinations
3. Ensure the output is complete and actionable
4. Identify any potential issues or improvements

Respond with:
- PASS or FAIL
- Confidence score (0-1)
- Reasoning for your decision
- Suggestions for improvement (if any)

Format your response as:
DECISION: [PASS/FAIL]
CONFIDENCE: [0-1]
REASONING: [Your explanation]
SUGGESTIONS: [List of suggestions, or "None"]
"""

    def _build_verification_prompt(
        self, task: str, output: Any, context: dict[str, Any]
    ) -> str:
        """Build the verification prompt."""
        prompt = f"""Task Description:
{task}

Agent Output:
{str(output)}
"""

        if context:
            prompt += f"\nAdditional Context:\n{str(context)}\n"

        prompt += "\nPlease verify this output."
        return prompt

    def _parse_verification_response(self, response: str) -> VerificationResult:
        """Parse LLM verification response into structured result."""
        # Simple parsing - in production use structured outputs
        lines = response.strip().split("\n")
        decision = "FAIL"
        confidence = 0.0
        reasoning = ""
        suggestions: list[str] = []

        for line in lines:
            line = line.strip()
            if line.startswith("DECISION:"):
                decision = line.split(":", 1)[1].strip()
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.5
            elif line.startswith("REASONING:"):
                reasoning = line.split(":", 1)[1].strip()
            elif line.startswith("SUGGESTIONS:"):
                sugg_text = line.split(":", 1)[1].strip()
                if sugg_text.lower() != "none":
                    suggestions = [s.strip() for s in sugg_text.split(",")]

        passed = decision.upper() == "PASS" and confidence >= self.threshold

        return VerificationResult(
            passed=passed,
            confidence=confidence,
            reasoning=reasoning or "No reasoning provided",
            suggestions=suggestions,
        )
