"""RAG pipeline for question answering over HubSpot knowledgebase."""

import logging
from dataclasses import dataclass
from typing import Optional

import openai

from .vector_store import VectorStore

logger = logging.getLogger(__name__)


@dataclass
class RAGResponse:
    """Response from the RAG pipeline."""

    answer: str
    sources: list[dict]
    query: str
    model: str


class RAGPipeline:
    """Retrieval-Augmented Generation pipeline."""

    SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided context from a HubSpot knowledgebase.

Instructions:
1. Answer the question based ONLY on the provided context
2. If the context doesn't contain enough information to answer the question, say so clearly
3. Be concise but comprehensive in your answers
4. If relevant, mention which article(s) the information comes from
5. Use a professional and helpful tone

Context will be provided in the following format:
- Each piece of context includes the source article title and URL
- Multiple context pieces may be provided from different articles"""

    QUERY_PROMPT_TEMPLATE = """Context from the knowledgebase:

{context}

---

Question: {question}

Please provide a helpful answer based on the context above."""

    def __init__(
        self,
        vector_store: VectorStore,
        openai_api_key: str,
        model: str = "gpt-4o-mini",
        temperature: float = 0.1,
        max_tokens: int = 1024,
        top_k: int = 5,
    ):
        """Initialize the RAG pipeline.

        Args:
            vector_store: Vector store for retrieval.
            openai_api_key: OpenAI API key for generation.
            model: LLM model to use for generation.
            temperature: Temperature for generation.
            max_tokens: Maximum tokens for response.
            top_k: Number of documents to retrieve.
        """
        self.vector_store = vector_store
        self.client = openai.OpenAI(api_key=openai_api_key)
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_k = top_k

    def _format_context(self, results: list[dict]) -> str:
        """Format search results into context string.

        Args:
            results: Search results from vector store.

        Returns:
            Formatted context string.
        """
        context_parts = []

        for i, result in enumerate(results, 1):
            metadata = result.get("metadata", {})
            title = metadata.get("title", "Unknown")
            url = metadata.get("url", "N/A")
            text = result.get("text", "")

            context_part = f"""[Source {i}]
Title: {title}
URL: {url}

{text}
"""
            context_parts.append(context_part)

        return "\n---\n".join(context_parts)

    def query(
        self,
        question: str,
        filter_metadata: Optional[dict] = None,
    ) -> RAGResponse:
        """Answer a question using RAG.

        Args:
            question: The question to answer.
            filter_metadata: Optional metadata filter for retrieval.

        Returns:
            RAGResponse with answer and sources.
        """
        # Step 1: Retrieve relevant documents
        logger.info(f"Retrieving documents for query: {question[:50]}...")
        results = self.vector_store.search(
            query=question,
            top_k=self.top_k,
            filter_metadata=filter_metadata,
        )

        if not results:
            return RAGResponse(
                answer="I couldn't find any relevant information in the knowledgebase to answer your question.",
                sources=[],
                query=question,
                model=self.model,
            )

        # Step 2: Format context
        context = self._format_context(results)

        # Step 3: Generate response
        user_message = self.QUERY_PROMPT_TEMPLATE.format(
            context=context,
            question=question,
        )

        logger.info("Generating response with LLM...")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )

            answer = response.choices[0].message.content

        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            answer = f"I encountered an error while generating the response: {e}"

        # Format sources for response
        sources = [
            {
                "title": r.get("metadata", {}).get("title", "Unknown"),
                "url": r.get("metadata", {}).get("url"),
                "score": r.get("score", 0),
            }
            for r in results
        ]

        return RAGResponse(
            answer=answer,
            sources=sources,
            query=question,
            model=self.model,
        )

    def query_with_history(
        self,
        question: str,
        conversation_history: list[dict],
        filter_metadata: Optional[dict] = None,
    ) -> RAGResponse:
        """Answer a question with conversation history context.

        Args:
            question: The current question.
            conversation_history: List of previous messages in OpenAI format.
            filter_metadata: Optional metadata filter for retrieval.

        Returns:
            RAGResponse with answer and sources.
        """
        # Retrieve relevant documents
        results = self.vector_store.search(
            query=question,
            top_k=self.top_k,
            filter_metadata=filter_metadata,
        )

        if not results:
            return RAGResponse(
                answer="I couldn't find any relevant information in the knowledgebase to answer your question.",
                sources=[],
                query=question,
                model=self.model,
            )

        # Format context
        context = self._format_context(results)

        # Build messages with history
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]

        # Add conversation history (limit to avoid context overflow)
        history_limit = 10  # Keep last 10 messages
        for msg in conversation_history[-history_limit:]:
            messages.append(msg)

        # Add current query with context
        user_message = self.QUERY_PROMPT_TEMPLATE.format(
            context=context,
            question=question,
        )
        messages.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )

            answer = response.choices[0].message.content

        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            answer = f"I encountered an error while generating the response: {e}"

        sources = [
            {
                "title": r.get("metadata", {}).get("title", "Unknown"),
                "url": r.get("metadata", {}).get("url"),
                "score": r.get("score", 0),
            }
            for r in results
        ]

        return RAGResponse(
            answer=answer,
            sources=sources,
            query=question,
            model=self.model,
        )


class StreamingRAGPipeline(RAGPipeline):
    """RAG pipeline with streaming support."""

    def query_stream(
        self,
        question: str,
        filter_metadata: Optional[dict] = None,
    ):
        """Answer a question with streaming response.

        Args:
            question: The question to answer.
            filter_metadata: Optional metadata filter for retrieval.

        Yields:
            Chunks of the response text.
        """
        # Retrieve relevant documents
        results = self.vector_store.search(
            query=question,
            top_k=self.top_k,
            filter_metadata=filter_metadata,
        )

        if not results:
            yield "I couldn't find any relevant information in the knowledgebase to answer your question."
            return

        # Format context
        context = self._format_context(results)

        user_message = self.QUERY_PROMPT_TEMPLATE.format(
            context=context,
            question=question,
        )

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Streaming generation failed: {e}")
            yield f"Error: {e}"
