"""Main entry point for Omni AI agents."""

import asyncio
import logging
from typing import Any

from .config import config
from .supervisor import SupervisorAgent
from .support_agent import SupportAgent
from .sales_agent import SalesAgent
from .recruiter_agent import RecruiterAgent
from .code_review_agent import CodeReviewAgent
from .docs_agent import DocsAgent
from .base_agent import TaskInput
from .spacetimedb_client import SpacetimeDBClient, Task

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    """Run the Omni agent system."""
    logger.info("Starting Omni AI Agents...")
    logger.info(f"LLM Provider: {config.default_llm_provider}")
    logger.info(f"Model: {config.default_model}")
    logger.info(f"Verification Threshold: {config.verification_threshold}")

    # Initialize specialist agents
    support_agent = SupportAgent()
    sales_agent = SalesAgent()
    recruiter_agent = RecruiterAgent()
    code_review_agent = CodeReviewAgent()
    docs_agent = DocsAgent()

    # Initialize supervisor with all agents
    supervisor = SupervisorAgent(
        agents=[
            support_agent,
            sales_agent,
            recruiter_agent,
            code_review_agent,
            docs_agent,
        ]
    )

    logger.info(f"Initialized {len(supervisor.agents)} agents")
    logger.info("Available agents:")
    for agent_info in supervisor.list_agents():
        logger.info(f"  - {agent_info['name']} ({agent_info['agent_id']})")

    # Example: Process a sample support task
    logger.info("\n" + "=" * 60)
    logger.info("Processing sample support task...")
    logger.info("=" * 60 + "\n")

    sample_task = TaskInput(
        task_id=1,
        description="Help customer with password reset",
        context={
            "customer_message": "I can't log in to my account. I think I forgot my password.",
            "ticket": {
                "priority": "high",
                "category": "account",
                "customer_name": "John Doe",
            },
            "previous_messages": [],
        },
        assigned_to="support_agent",
    )

    result = await supervisor.process_task(sample_task)

    logger.info(f"Task completed: {result.success}")
    if result.success:
        logger.info(f"Result: {result.result}")
        if result.verification:
            logger.info(f"Verification passed: {result.verification.passed}")
            logger.info(f"Confidence: {result.verification.confidence}")
    else:
        logger.error(f"Error: {result.error}")

    logger.info("\n" + "=" * 60)
    logger.info("Connecting to SpacetimeDB...")
    logger.info("=" * 60)

    # Initialize SpacetimeDB client
    db_client = SpacetimeDBClient()

    # Define task processor
    async def process_db_task(task: Task):
        """Process a task from SpacetimeDB."""
        logger.info(f"\nProcessing task from SpacetimeDB: {task.id} - {task.title}")

        # Update task status to InProgress
        await db_client.update_task_status(task.id, "InProgress")

        # Convert SpacetimeDB Task to agent TaskInput
        task_input = TaskInput(
            task_id=task.id,
            description=task.description,
            context={
                "title": task.title,
                "task_type": task.task_type,
                "priority": task.priority,
                "metadata": task.metadata,
            },
            assigned_to=task.assigned_to or "supervisor",
        )

        # Process through supervisor
        result = await supervisor.process_task(task_input)

        # Update task in database based on result
        if result.success:
            await db_client.update_task_status(
                task.id, "Completed", result=str(result.result)
            )
            await db_client.add_task_message(
                task.id, f"Task completed successfully: {result.result}"
            )
            logger.info(f"✓ Task {task.id} completed successfully")
        else:
            await db_client.update_task_status(
                task.id, "Failed", result=result.error or "Unknown error"
            )
            await db_client.add_task_message(
                task.id, f"Task failed: {result.error or 'Unknown error'}"
            )
            logger.error(f"✗ Task {task.id} failed: {result.error}")

        # Log activity
        await db_client.log_activity(
            activity_type="task_processed",
            entity_type="Task",
            entity_id=task.id,
            description=f"Task {task.id} processed by AI agents",
            performed_by="ai_supervisor",
            metadata={"success": result.success, "agent": result.agent_id if hasattr(result, 'agent_id') else None},
        )

    # Register task processor
    db_client.register_task_callback(lambda task: asyncio.create_task(process_db_task(task)))

    # Connect to SpacetimeDB
    try:
        await db_client.connect()
        logger.info("✓ Connected to SpacetimeDB")
        logger.info("✓ Subscribed to Task table for AI assignments")
        logger.info("\n" + "=" * 60)
        logger.info("Agent system ready and waiting for tasks...")
        logger.info("=" * 60)

        # Keep the agent system running
        # In production, this would run indefinitely processing tasks
        # For now, we'll run for a demo period
        logger.info("\nAgent system is now processing tasks from SpacetimeDB in real-time.")
        logger.info("Press Ctrl+C to stop.\n")

        # Run indefinitely (until interrupted)
        while True:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        logger.info("\nShutting down agent system...")
        await db_client.disconnect()
        logger.info("✓ Disconnected from SpacetimeDB")
        logger.info("Agent system stopped.")
    except Exception as e:
        logger.error(f"Error in agent system: {e}")
        await db_client.disconnect()
        raise


if __name__ == "__main__":
    asyncio.run(main())
