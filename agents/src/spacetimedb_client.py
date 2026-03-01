"""SpacetimeDB client for AI agent integration."""

import logging
from typing import Callable, Optional, Any
from dataclasses import dataclass
from datetime import datetime

from .config import config

logger = logging.getLogger(__name__)


@dataclass
class Task:
    """Task from SpacetimeDB."""

    id: int
    title: str
    description: str
    task_type: str
    priority: str
    status: str
    assigned_to: Optional[str]
    created_by: str
    created_at: int
    updated_at: int
    due_date: Optional[int]
    estimated_hours: Optional[float]
    actual_hours: Optional[float]
    tags: list[str]
    metadata: dict[str, Any]


class SpacetimeDBClient:
    """Client for connecting to SpacetimeDB and processing tasks.

    This client:
    1. Connects to SpacetimeDB using the Python SDK
    2. Subscribes to Task table for AI-assigned tasks
    3. Provides callbacks for task processing
    4. Updates task status and results back to database
    """

    def __init__(
        self,
        uri: str | None = None,
        database_name: str | None = None,
        auth_token: str | None = None,
    ):
        """Initialize SpacetimeDB client.

        Args:
            uri: SpacetimeDB server URI (defaults to config)
            database_name: Database name (defaults to config)
            auth_token: Authentication token if required
        """
        self.uri = uri or config.spacetimedb_uri
        self.database_name = database_name or config.spacetimedb_name
        self.auth_token = auth_token or config.spacetimedb_token

        self.connected = False
        self.task_callbacks: list[Callable[[Task], None]] = []

        logger.info(f"Initializing SpacetimeDB client for {self.database_name}")

    async def connect(self) -> None:
        """Connect to SpacetimeDB.

        This establishes the WebSocket connection and subscribes to relevant tables.
        """
        try:
            # TODO: Implement actual SpacetimeDB Python SDK connection
            # The Python SDK API is still evolving, so this is a placeholder
            # for the connection logic that will be implemented once the SDK
            # is more stable.

            # Expected pattern (based on other SDKs):
            # from spacetimedb_sdk import DbConnection
            #
            # self.conn = DbConnection.builder()
            #     .with_uri(self.uri)
            #     .with_module_name(self.database_name)
            #     .with_token(self.auth_token)
            #     .on_connect(self._on_connected)
            #     .build()
            #
            # await self.conn.run_async()

            logger.warning(
                "SpacetimeDB Python SDK integration pending. "
                "Connection logic will be implemented when SDK is stable."
            )
            self.connected = False

        except Exception as e:
            logger.error(f"Failed to connect to SpacetimeDB: {e}")
            raise

    def _on_connected(self, identity: str, token: str) -> None:
        """Callback when connection is established.

        Args:
            identity: User identity from SpacetimeDB
            token: Authentication token
        """
        logger.info(f"Connected to SpacetimeDB with identity: {identity}")
        self.connected = True

        # Subscribe to Task table for AI-assigned tasks
        self._subscribe_to_tasks()

    def _subscribe_to_tasks(self) -> None:
        """Subscribe to Task table for new AI assignments."""
        # TODO: Implement subscription once SDK is stable
        # Expected pattern:
        # self.conn.subscription_builder()
        #     .subscribe("Task", "assigned_to LIKE 'ai_%'")
        #     .on_insert(self._on_task_inserted)
        #     .on_update(self._on_task_updated)
        #     .apply()

        logger.info("Subscribed to Task table")

    def _on_task_inserted(self, task_data: dict[str, Any]) -> None:
        """Callback when a new task is inserted.

        Args:
            task_data: Raw task data from SpacetimeDB
        """
        try:
            task = self._parse_task(task_data)

            # Check if this task is assigned to an AI agent
            if task.assigned_to and task.assigned_to.startswith("ai_"):
                logger.info(f"New AI task detected: {task.id} - {task.title}")

                # Notify all registered callbacks
                for callback in self.task_callbacks:
                    try:
                        callback(task)
                    except Exception as e:
                        logger.error(f"Error in task callback: {e}")

        except Exception as e:
            logger.error(f"Error processing task insert: {e}")

    def _on_task_updated(self, old_task: dict[str, Any], new_task: dict[str, Any]) -> None:
        """Callback when a task is updated.

        Args:
            old_task: Previous task state
            new_task: New task state
        """
        # For now, we mainly care about new assignments
        # Future: Could handle task updates, priority changes, etc.
        pass

    def _parse_task(self, task_data: dict[str, Any]) -> Task:
        """Parse raw task data into Task dataclass.

        Args:
            task_data: Raw task data from SpacetimeDB

        Returns:
            Parsed Task object
        """
        # Handle SpacetimeDB's algebraic type format for enums
        def extract_tag(value: Any) -> str:
            """Extract tag from algebraic type."""
            if isinstance(value, dict) and "tag" in value:
                return value["tag"]
            return str(value)

        return Task(
            id=task_data.get("id", 0),
            title=task_data.get("title", ""),
            description=task_data.get("description", ""),
            task_type=extract_tag(task_data.get("task_type", "General")),
            priority=extract_tag(task_data.get("priority", "Medium")),
            status=extract_tag(task_data.get("status", "Pending")),
            assigned_to=task_data.get("assigned_to"),
            created_by=task_data.get("created_by", ""),
            created_at=task_data.get("created_at", 0),
            updated_at=task_data.get("updated_at", 0),
            due_date=task_data.get("due_date"),
            estimated_hours=task_data.get("estimated_hours"),
            actual_hours=task_data.get("actual_hours"),
            tags=task_data.get("tags", []),
            metadata=task_data.get("metadata", {}),
        )

    def register_task_callback(self, callback: Callable[[Task], None]) -> None:
        """Register a callback to be called when new tasks arrive.

        Args:
            callback: Function to call with Task object
        """
        self.task_callbacks.append(callback)
        logger.info(f"Registered task callback: {callback.__name__}")

    async def update_task_status(
        self,
        task_id: int,
        status: str,
        result: Optional[str] = None,
    ) -> None:
        """Update task status in SpacetimeDB.

        Args:
            task_id: ID of task to update
            status: New status (InProgress, Completed, Failed, etc.)
            result: Optional result/output from agent
        """
        if not self.connected:
            logger.warning("Not connected to SpacetimeDB, cannot update task")
            return

        try:
            # TODO: Call SpacetimeDB reducer once SDK is available
            # Expected pattern:
            # await self.conn.reducers.update_task_status(
            #     task_id=task_id,
            #     status=status,
            #     result=result or "",
            # )

            logger.info(f"Updated task {task_id} status to {status}")

        except Exception as e:
            logger.error(f"Failed to update task status: {e}")
            raise

    async def add_task_message(
        self,
        task_id: int,
        content: str,
        sender: str = "ai_agent",
    ) -> None:
        """Add a message/comment to a task.

        Args:
            task_id: ID of task
            content: Message content
            sender: Who is sending the message
        """
        if not self.connected:
            logger.warning("Not connected to SpacetimeDB, cannot add message")
            return

        try:
            # TODO: Call SpacetimeDB reducer once SDK is available
            # Expected pattern:
            # await self.conn.reducers.create_message(
            #     sender_id=sender,
            #     content=content,
            #     context_type="Task",
            #     context_id=task_id,
            # )

            logger.info(f"Added message to task {task_id}")

        except Exception as e:
            logger.error(f"Failed to add task message: {e}")
            raise

    async def log_activity(
        self,
        activity_type: str,
        entity_type: str,
        entity_id: int,
        description: str,
        performed_by: str = "ai_agent",
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        """Log activity to ActivityLog table.

        Args:
            activity_type: Type of activity (created, updated, etc.)
            entity_type: What type of entity (Task, Ticket, etc.)
            entity_id: ID of the entity
            description: Human-readable description
            performed_by: Who performed the activity
            metadata: Additional metadata
        """
        if not self.connected:
            return

        try:
            # TODO: Call SpacetimeDB reducer once SDK is available
            logger.debug(f"Logged activity: {activity_type} on {entity_type} {entity_id}")

        except Exception as e:
            logger.error(f"Failed to log activity: {e}")

    async def disconnect(self) -> None:
        """Disconnect from SpacetimeDB."""
        if self.connected:
            # TODO: Close connection once SDK is available
            self.connected = False
            logger.info("Disconnected from SpacetimeDB")


async def create_client() -> SpacetimeDBClient:
    """Create and connect a SpacetimeDB client.

    Returns:
        Connected SpacetimeDBClient instance
    """
    client = SpacetimeDBClient()
    await client.connect()
    return client
