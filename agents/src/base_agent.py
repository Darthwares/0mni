"""Base agent class for all Omni agents."""

from abc import ABC, abstractmethod
from typing import Any
from datetime import datetime
from pydantic import BaseModel, Field
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from .config import config
from .verification import Verifier, VerificationResult


class AgentCapability(BaseModel):
    """Represents a capability of an agent."""

    name: str = Field(description="Name of the capability")
    description: str = Field(description="What this capability does")
    examples: list[str] = Field(default_factory=list, description="Example use cases")


class TaskInput(BaseModel):
    """Input for an agent task."""

    task_id: int = Field(description="SpacetimeDB task ID")
    description: str = Field(description="What needs to be done")
    context: dict[str, Any] = Field(default_factory=dict, description="Additional context")
    assigned_to: str = Field(description="Agent identity assigned to this task")


class TaskOutput(BaseModel):
    """Output from an agent task."""

    task_id: int
    success: bool
    result: Any | None = None
    error: str | None = None
    verification: VerificationResult | None = None
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class BaseAgent(ABC):
    """Base class for all AI agents in the Omni platform.

    Agents are autonomous AI workers that can:
    - Execute tasks from their assigned domains
    - Verify their own outputs before submission
    - Communicate with SpacetimeDB
    - Collaborate with other agents via the Supervisor
    """

    def __init__(
        self,
        agent_id: str,
        name: str,
        capabilities: list[AgentCapability],
        llm: BaseChatModel | None = None,
        enable_verification: bool = True,
    ):
        """Initialize the agent.

        Args:
            agent_id: Unique identifier for this agent
            name: Human-readable name
            capabilities: List of what this agent can do
            llm: Language model (defaults to config LLM)
            enable_verification: Whether to use self-verification
        """
        self.agent_id = agent_id
        self.name = name
        self.capabilities = capabilities
        self.llm = llm or self._create_default_llm()
        self.enable_verification = enable_verification
        self.verifier = Verifier(self.llm) if enable_verification else None

    def _create_default_llm(self) -> BaseChatModel:
        """Create default LLM based on config."""
        if config.default_llm_provider == "openai":
            return ChatOpenAI(
                model=config.default_model,
                api_key=config.openai_api_key,
                temperature=0.7,
            )
        else:  # anthropic
            return ChatAnthropic(
                model=config.default_model,
                api_key=config.anthropic_api_key,
                temperature=0.7,
            )

    @abstractmethod
    async def execute_task(self, task: TaskInput) -> Any:
        """Execute a task and return the result.

        This is the core method that each specialized agent implements.

        Args:
            task: The task to execute

        Returns:
            The result of the task execution
        """
        pass

    async def process_task(self, task: TaskInput) -> TaskOutput:
        """Process a task with verification.

        This is the main entry point that handles:
        1. Task execution
        2. Self-verification (if enabled)
        3. Retry logic (if verification fails)
        4. Result packaging

        Args:
            task: The task to process

        Returns:
            TaskOutput with results and verification status
        """
        max_retries = config.max_retries
        attempts = 0

        while attempts < max_retries:
            attempts += 1

            try:
                # Execute the task
                result = await self.execute_task(task)

                # Verify the output if enabled
                verification = None
                if self.enable_verification and self.verifier:
                    verification = await self.verifier.verify(
                        task_description=task.description,
                        agent_output=result,
                        context=task.context,
                    )

                    # If verification failed and we have retries left, try again
                    if not verification.passed and attempts < max_retries:
                        # Optionally: Use verification.suggestions to improve next attempt
                        continue

                return TaskOutput(
                    task_id=task.task_id,
                    success=True,
                    result=result,
                    verification=verification,
                )

            except Exception as e:
                # On final attempt, return the error
                if attempts >= max_retries:
                    return TaskOutput(
                        task_id=task.task_id,
                        success=False,
                        error=str(e),
                    )
                # Otherwise continue to next attempt
                continue

        # Should not reach here, but just in case
        return TaskOutput(
            task_id=task.task_id,
            success=False,
            error="Max retries exceeded",
        )

    def can_handle(self, task_description: str) -> bool:
        """Check if this agent can handle a given task.

        This is used by the SupervisorAgent to route tasks.

        Args:
            task_description: Description of the task

        Returns:
            True if this agent can handle the task
        """
        # Simple keyword matching - in production use semantic similarity
        task_lower = task_description.lower()

        for capability in self.capabilities:
            # Check if any capability keywords appear in task
            capability_keywords = capability.name.lower().split()
            if any(keyword in task_lower for keyword in capability_keywords):
                return True

            # Check examples
            for example in capability.examples:
                example_keywords = example.lower().split()
                if any(keyword in task_lower for keyword in example_keywords):
                    return True

        return False

    def describe(self) -> dict[str, Any]:
        """Get a description of this agent and its capabilities.

        Returns:
            Dict with agent info
        """
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "capabilities": [cap.model_dump() for cap in self.capabilities],
            "verification_enabled": self.enable_verification,
        }
