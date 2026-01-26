"""HubSpot RAG System - Retrieval Augmented Generation for HubSpot Knowledgebase."""

__version__ = "0.1.0"

from .hubspot_client import HubSpotClient, KnowledgeArticle
from .hubspot_crm import HubSpotCRMClient, Lead, Deal, StageHistory
from .document_processor import DocumentProcessor, DocumentChunk
from .vector_store import VectorStore
from .rag_pipeline import RAGPipeline, StreamingRAGPipeline
from .embeddings import get_embedding_provider

__all__ = [
    "HubSpotClient",
    "HubSpotCRMClient",
    "KnowledgeArticle",
    "Lead",
    "Deal",
    "StageHistory",
    "DocumentProcessor",
    "DocumentChunk",
    "VectorStore",
    "RAGPipeline",
    "StreamingRAGPipeline",
    "get_embedding_provider",
]
