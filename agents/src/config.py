"""Configuration management for Omni agents."""

import os
from typing import Literal
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class SpacetimeDBConfig(BaseModel):
    """SpacetimeDB connection configuration."""

    uri: str = Field(default="https://maincloud.spacetimedb.com")
    name: str = Field(default="omni-platform")
    token: str | None = None


class AgentConfig(BaseSettings):
    """Global agent configuration."""

    # SpacetimeDB
    spacetimedb_uri: str = "https://maincloud.spacetimedb.com"
    spacetimedb_name: str = "omni-platform"
    spacetimedb_token: str | None = None

    # LLM Configuration
    default_llm_provider: Literal["openai", "anthropic"] = "anthropic"
    default_model: str = "claude-3-5-sonnet-20241022"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    # Agent Behavior
    verification_threshold: float = 0.8
    max_task_duration_minutes: int = 30
    max_retries: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def spacetimedb_config(self) -> SpacetimeDBConfig:
        """Get SpacetimeDB configuration."""
        return SpacetimeDBConfig(
            uri=self.spacetimedb_uri,
            name=self.spacetimedb_name,
            token=self.spacetimedb_token,
        )


# Global config instance
config = AgentConfig()
