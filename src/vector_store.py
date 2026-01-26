"""Vector store implementation using ChromaDB."""

import logging
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from .document_processor import DocumentChunk
from .embeddings import EmbeddingProvider

logger = logging.getLogger(__name__)


class VectorStore:
    """Vector store for document chunks using ChromaDB."""

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        persist_directory: Path,
        collection_name: str = "hubspot_knowledgebase",
    ):
        """Initialize the vector store.

        Args:
            embedding_provider: Provider for generating embeddings.
            persist_directory: Directory to persist ChromaDB data.
            collection_name: Name of the collection.
        """
        self.embedding_provider = embedding_provider
        self.persist_directory = Path(persist_directory)
        self.collection_name = collection_name

        # Ensure directory exists
        self.persist_directory.mkdir(parents=True, exist_ok=True)

        # Initialize ChromaDB client with persistence
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=ChromaSettings(
                anonymized_telemetry=False,
            ),
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        logger.info(
            f"Initialized vector store at {self.persist_directory} "
            f"with collection '{collection_name}'"
        )

    def add_chunks(
        self,
        chunks: list[DocumentChunk],
        batch_size: int = 100,
    ) -> int:
        """Add document chunks to the vector store.

        Args:
            chunks: List of DocumentChunk objects to add.
            batch_size: Number of chunks to process per batch.

        Returns:
            Number of chunks added.
        """
        if not chunks:
            logger.warning("No chunks to add")
            return 0

        total_added = 0

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]

            # Extract texts for embedding
            texts = [chunk.text for chunk in batch]

            # Generate embeddings
            try:
                embeddings = self.embedding_provider.embed_texts(texts)
            except Exception as e:
                logger.error(f"Failed to generate embeddings for batch: {e}")
                continue

            # Prepare data for ChromaDB
            ids = [chunk.id for chunk in batch]
            metadatas = [chunk.metadata for chunk in batch]
            documents = texts

            # Upsert to collection (handles duplicates)
            try:
                self.collection.upsert(
                    ids=ids,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    documents=documents,
                )
                total_added += len(batch)

                logger.debug(
                    f"Added batch {i // batch_size + 1}, "
                    f"chunks {i + 1}-{min(i + batch_size, len(chunks))}"
                )

            except Exception as e:
                logger.error(f"Failed to add batch to vector store: {e}")
                continue

        logger.info(f"Added {total_added} chunks to vector store")
        return total_added

    def search(
        self,
        query: str,
        top_k: int = 5,
        filter_metadata: Optional[dict] = None,
    ) -> list[dict]:
        """Search for relevant chunks.

        Args:
            query: Search query.
            top_k: Number of results to return.
            filter_metadata: Optional metadata filter.

        Returns:
            List of result dictionaries with text, metadata, and score.
        """
        # Generate query embedding
        query_embedding = self.embedding_provider.embed_query(query)

        # Build query parameters
        query_params = {
            "query_embeddings": [query_embedding],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"],
        }

        if filter_metadata:
            query_params["where"] = filter_metadata

        # Execute search
        results = self.collection.query(**query_params)

        # Format results
        formatted_results = []
        if results and results["documents"]:
            for idx, (doc, metadata, distance) in enumerate(
                zip(
                    results["documents"][0],
                    results["metadatas"][0],
                    results["distances"][0],
                )
            ):
                # Convert distance to similarity score (cosine distance -> similarity)
                similarity = 1 - distance

                formatted_results.append({
                    "text": doc,
                    "metadata": metadata,
                    "score": similarity,
                    "rank": idx + 1,
                })

        logger.debug(f"Search returned {len(formatted_results)} results")
        return formatted_results

    def delete_by_article_id(self, article_id: str) -> bool:
        """Delete all chunks for a specific article.

        Args:
            article_id: Article ID to delete chunks for.

        Returns:
            True if deletion was successful.
        """
        try:
            self.collection.delete(
                where={"article_id": article_id},
            )
            logger.info(f"Deleted chunks for article {article_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete chunks for article {article_id}: {e}")
            return False

    def clear(self) -> bool:
        """Clear all data from the collection.

        Returns:
            True if clearing was successful.
        """
        try:
            # Delete and recreate collection
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info("Cleared vector store")
            return True
        except Exception as e:
            logger.error(f"Failed to clear vector store: {e}")
            return False

    def get_stats(self) -> dict:
        """Get statistics about the vector store.

        Returns:
            Dictionary with collection statistics.
        """
        count = self.collection.count()

        return {
            "collection_name": self.collection_name,
            "total_chunks": count,
            "persist_directory": str(self.persist_directory),
        }
