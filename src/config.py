"""Configuration management for the HubSpot RAG system."""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # HubSpot
    hubspot_access_token: str = Field(description="HubSpot private app access token")

    # OpenAI
    openai_api_key: str = Field(description="OpenAI API key")

    # Embedding Configuration
    embedding_provider: Literal["openai", "local"] = Field(
        default="openai",
        description="Embedding provider to use",
    )
    embedding_model: str = Field(
        default="text-embedding-3-small",
        description="OpenAI embedding model name",
    )
    local_embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Local sentence-transformers model name",
    )

    # LLM Configuration
    llm_model: str = Field(
        default="gpt-4o-mini",
        description="LLM model for generation",
    )
    llm_temperature: float = Field(
        default=0.1,
        description="Temperature for LLM generation",
    )
    llm_max_tokens: int = Field(
        default=1024,
        description="Maximum tokens for LLM response",
    )

    # Vector Store
    chroma_persist_directory: Path = Field(
        default=Path("./data/chromadb"),
        description="Directory to persist ChromaDB data",
    )
    collection_name: str = Field(
        default="hubspot_knowledgebase",
        description="ChromaDB collection name",
    )

    # Chunking
    chunk_size: int = Field(
        default=1000,
        description="Maximum chunk size in characters",
    )
    chunk_overlap: int = Field(
        default=200,
        description="Overlap between chunks in characters",
    )

    # RAG
    top_k_results: int = Field(
        default=5,
        description="Number of results to retrieve",
    )


def get_settings() -> Settings:
    """Load and return application settings."""
    return Settings()
