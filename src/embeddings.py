"""Embedding service for generating vector embeddings."""

import logging
from abc import ABC, abstractmethod
from typing import Optional

import openai

logger = logging.getLogger(__name__)


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of texts to embed.

        Returns:
            List of embedding vectors.
        """
        pass

    @abstractmethod
    def embed_query(self, query: str) -> list[float]:
        """Generate embedding for a single query.

        Args:
            query: Query text to embed.

        Returns:
            Embedding vector.
        """
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the dimension of the embeddings."""
        pass


class OpenAIEmbeddings(EmbeddingProvider):
    """OpenAI embedding provider."""

    # Embedding dimensions for different models
    MODEL_DIMENSIONS = {
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        "text-embedding-ada-002": 1536,
    }

    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
    ):
        """Initialize OpenAI embeddings.

        Args:
            api_key: OpenAI API key.
            model: Embedding model name.
        """
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
        self._dimension = self.MODEL_DIMENSIONS.get(model, 1536)

    def embed_texts(
        self,
        texts: list[str],
        batch_size: int = 100,
    ) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of texts to embed.
            batch_size: Number of texts to embed per API call.

        Returns:
            List of embedding vectors.
        """
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]

            # Clean texts (OpenAI has issues with empty strings)
            batch = [text.replace("\n", " ").strip() or "empty" for text in batch]

            try:
                response = self.client.embeddings.create(
                    input=batch,
                    model=self.model,
                )

                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)

                logger.debug(
                    f"Embedded batch {i // batch_size + 1}, "
                    f"texts {i + 1}-{min(i + batch_size, len(texts))}"
                )

            except Exception as e:
                logger.error(f"Failed to embed batch: {e}")
                raise

        return all_embeddings

    def embed_query(self, query: str) -> list[float]:
        """Generate embedding for a single query.

        Args:
            query: Query text to embed.

        Returns:
            Embedding vector.
        """
        embeddings = self.embed_texts([query])
        return embeddings[0]

    @property
    def dimension(self) -> int:
        """Return the dimension of the embeddings."""
        return self._dimension


class LocalEmbeddings(EmbeddingProvider):
    """Local embedding provider using sentence-transformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize local embeddings.

        Args:
            model_name: Name of the sentence-transformers model.
        """
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise ImportError(
                "sentence-transformers is required for local embeddings. "
                "Install it with: pip install sentence-transformers"
            )

        self.model = SentenceTransformer(model_name)
        self._dimension = self.model.get_sentence_embedding_dimension()
        logger.info(f"Loaded local embedding model: {model_name}")

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of texts to embed.

        Returns:
            List of embedding vectors.
        """
        embeddings = self.model.encode(
            texts,
            show_progress_bar=True,
            convert_to_numpy=True,
        )
        return embeddings.tolist()

    def embed_query(self, query: str) -> list[float]:
        """Generate embedding for a single query.

        Args:
            query: Query text to embed.

        Returns:
            Embedding vector.
        """
        embedding = self.model.encode(query, convert_to_numpy=True)
        return embedding.tolist()

    @property
    def dimension(self) -> int:
        """Return the dimension of the embeddings."""
        return self._dimension


def get_embedding_provider(
    provider: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> EmbeddingProvider:
    """Factory function to get an embedding provider.

    Args:
        provider: Provider name ("openai" or "local").
        api_key: API key for OpenAI (required if provider is "openai").
        model: Model name to use.

    Returns:
        EmbeddingProvider instance.

    Raises:
        ValueError: If provider is unknown or required parameters are missing.
    """
    if provider == "openai":
        if not api_key:
            raise ValueError("OpenAI API key is required for OpenAI embeddings")
        return OpenAIEmbeddings(
            api_key=api_key,
            model=model or "text-embedding-3-small",
        )
    elif provider == "local":
        return LocalEmbeddings(model_name=model or "all-MiniLM-L6-v2")
    else:
        raise ValueError(f"Unknown embedding provider: {provider}")
