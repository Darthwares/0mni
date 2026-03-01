"""Supervisor agent for task routing and orchestration."""

from typing import Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models import BaseChatModel

from .base_agent import BaseAgent, AgentCapability, TaskInput, TaskOutput
from .config import config


class SupervisorAgent:
    """Supervisor agent that routes tasks to specialist agents.

    The supervisor is responsible for:
    - Receiving incoming tasks
    - Determining which specialist agent should handle each task
    - Coordinating multi-agent workflows
    - Escalating tasks when needed
    """

    def __init__(
        self,
        agents: list[BaseAgent],
        llm: BaseChatModel | None = None,
    ):
        """Initialize the supervisor.

        Args:
            agents: List of specialist agents available for task execution
            llm: Language model for routing decisions (defaults to config LLM)
        """
        self.agents = {agent.agent_id: agent for agent in agents}
        self.llm = llm or self._create_default_llm()

    def _create_default_llm(self) -> BaseChatModel:
        """Create default LLM based on config."""
        from langchain_openai import ChatOpenAI
        from langchain_anthropic import ChatAnthropic

        if config.default_llm_provider == "openai":
            return ChatOpenAI(
                model=config.default_model,
                api_key=config.openai_api_key,
                temperature=0,  # Routing should be deterministic
            )
        else:
            return ChatAnthropic(
                model=config.default_model,
                api_key=config.anthropic_api_key,
                temperature=0,
            )

    async def route_task(self, task: TaskInput) -> BaseAgent:
        """Route a task to the appropriate specialist agent.

        Args:
            task: The task to route

        Returns:
            The agent best suited to handle this task

        Raises:
            ValueError: If no suitable agent is found
        """
        # First try simple capability matching
        capable_agents = [
            agent for agent in self.agents.values() if agent.can_handle(task.description)
        ]

        if len(capable_agents) == 1:
            return capable_agents[0]

        if len(capable_agents) > 1:
            # Multiple agents can handle it - use LLM to choose the best one
            return await self._llm_route(task, capable_agents)

        # No agents matched via capabilities - use LLM routing
        return await self._llm_route(task, list(self.agents.values()))

    async def _llm_route(
        self, task: TaskInput, candidate_agents: list[BaseAgent]
    ) -> BaseAgent:
        """Use LLM to route task to best agent.

        Args:
            task: The task to route
            candidate_agents: List of agents to choose from

        Returns:
            Best agent for the task
        """
        system_prompt = self._build_routing_system_prompt(candidate_agents)
        user_prompt = self._build_routing_user_prompt(task)

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)

        # Parse agent ID from response
        agent_id = self._parse_agent_id(response.content, candidate_agents)

        if agent_id not in self.agents:
            raise ValueError(f"Invalid agent ID: {agent_id}")

        return self.agents[agent_id]

    def _build_routing_system_prompt(self, agents: list[BaseAgent]) -> str:
        """Build system prompt for routing."""
        agents_desc = "\n\n".join(
            [
                f"Agent: {agent.name} (ID: {agent.agent_id})\n"
                f"Capabilities:\n"
                + "\n".join(
                    [f"  - {cap.name}: {cap.description}" for cap in agent.capabilities]
                )
                for agent in agents
            ]
        )

        return f"""You are a supervisor AI responsible for routing tasks to specialist agents.

Available Agents:
{agents_desc}

Your job is to select the BEST agent for each task based on their capabilities.

Respond with ONLY the agent ID, nothing else.
"""

    def _build_routing_user_prompt(self, task: TaskInput) -> str:
        """Build user prompt for routing."""
        return f"""Task Description: {task.description}

Context: {task.context if task.context else "None"}

Which agent should handle this task? Respond with the agent ID only."""

    def _parse_agent_id(self, response: str, agents: list[BaseAgent]) -> str:
        """Parse agent ID from LLM response."""
        # Clean the response
        agent_id = response.strip().lower()

        # Try exact match
        for agent in agents:
            if agent.agent_id.lower() == agent_id:
                return agent.agent_id

        # Try partial match
        for agent in agents:
            if agent_id in agent.agent_id.lower() or agent.agent_id.lower() in agent_id:
                return agent.agent_id

        # Default to first agent if no match
        return agents[0].agent_id if agents else ""

    async def process_task(self, task: TaskInput) -> TaskOutput:
        """Process a task by routing it to the appropriate agent.

        Args:
            task: The task to process

        Returns:
            TaskOutput from the specialist agent
        """
        try:
            # Route to appropriate agent
            agent = await self.route_task(task)

            # Let the agent process the task
            result = await agent.process_task(task)

            return result

        except Exception as e:
            return TaskOutput(
                task_id=task.task_id,
                success=False,
                error=f"Supervisor error: {str(e)}",
            )

    def add_agent(self, agent: BaseAgent) -> None:
        """Add a new agent to the supervisor.

        Args:
            agent: The agent to add
        """
        self.agents[agent.agent_id] = agent

    def remove_agent(self, agent_id: str) -> None:
        """Remove an agent from the supervisor.

        Args:
            agent_id: ID of the agent to remove
        """
        self.agents.pop(agent_id, None)

    def list_agents(self) -> list[dict[str, Any]]:
        """List all available agents.

        Returns:
            List of agent descriptions
        """
        return [agent.describe() for agent in self.agents.values()]
