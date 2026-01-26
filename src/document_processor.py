"""Document processing for chunking and preparing content for embedding."""

import logging
import re
from dataclasses import dataclass
from typing import Optional

from bs4 import BeautifulSoup
import html2text

from .hubspot_client import KnowledgeArticle

logger = logging.getLogger(__name__)


@dataclass
class DocumentChunk:
    """Represents a chunk of a document ready for embedding."""

    id: str
    text: str
    metadata: dict

    def __post_init__(self):
        """Validate chunk data."""
        if not self.text.strip():
            raise ValueError("Chunk text cannot be empty")


class DocumentProcessor:
    """Processes documents into chunks suitable for embedding."""

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ):
        """Initialize the document processor.

        Args:
            chunk_size: Maximum size of each chunk in characters.
            chunk_overlap: Number of overlapping characters between chunks.
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Configure html2text
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = True
        self.html_converter.ignore_emphasis = False
        self.html_converter.body_width = 0  # No line wrapping

    def clean_html(self, html_content: str) -> str:
        """Convert HTML to clean text.

        Args:
            html_content: HTML string to clean.

        Returns:
            Clean text content.
        """
        if not html_content:
            return ""

        # First pass: BeautifulSoup to handle malformed HTML
        soup = BeautifulSoup(html_content, "html.parser")

        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()

        # Convert to markdown-like text
        text = self.html_converter.handle(str(soup))

        # Clean up the text
        text = self._normalize_whitespace(text)

        return text

    def _normalize_whitespace(self, text: str) -> str:
        """Normalize whitespace in text.

        Args:
            text: Text to normalize.

        Returns:
            Text with normalized whitespace.
        """
        # Replace multiple newlines with double newlines
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Replace multiple spaces with single space
        text = re.sub(r" {2,}", " ", text)

        # Strip leading/trailing whitespace from each line
        lines = [line.strip() for line in text.split("\n")]
        text = "\n".join(lines)

        return text.strip()

    def chunk_text(
        self,
        text: str,
        metadata: Optional[dict] = None,
    ) -> list[DocumentChunk]:
        """Split text into overlapping chunks.

        Uses a smart chunking strategy that tries to split on:
        1. Paragraph boundaries
        2. Sentence boundaries
        3. Word boundaries (as fallback)

        Args:
            text: Text to chunk.
            metadata: Optional metadata to attach to each chunk.

        Returns:
            List of DocumentChunk objects.
        """
        if not text.strip():
            return []

        metadata = metadata or {}
        chunks = []

        # Split into paragraphs first
        paragraphs = re.split(r"\n\n+", text)

        current_chunk = ""
        chunk_index = 0

        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue

            # Check if adding this paragraph exceeds chunk size
            potential_chunk = (
                f"{current_chunk}\n\n{paragraph}"
                if current_chunk
                else paragraph
            )

            if len(potential_chunk) <= self.chunk_size:
                current_chunk = potential_chunk
            else:
                # Save current chunk if it has content
                if current_chunk:
                    chunk = DocumentChunk(
                        id=f"{metadata.get('article_id', 'doc')}_{chunk_index}",
                        text=current_chunk,
                        metadata={**metadata, "chunk_index": chunk_index},
                    )
                    chunks.append(chunk)
                    chunk_index += 1

                # Handle long paragraphs that need to be split
                if len(paragraph) > self.chunk_size:
                    sub_chunks = self._split_long_text(
                        paragraph,
                        metadata,
                        chunk_index,
                    )
                    chunks.extend(sub_chunks)
                    chunk_index += len(sub_chunks)
                    current_chunk = ""
                else:
                    # Start new chunk with overlap from previous
                    if chunks:
                        overlap_text = self._get_overlap_text(chunks[-1].text)
                        current_chunk = f"{overlap_text}\n\n{paragraph}"
                    else:
                        current_chunk = paragraph

        # Don't forget the last chunk
        if current_chunk.strip():
            chunk = DocumentChunk(
                id=f"{metadata.get('article_id', 'doc')}_{chunk_index}",
                text=current_chunk,
                metadata={**metadata, "chunk_index": chunk_index},
            )
            chunks.append(chunk)

        return chunks

    def _split_long_text(
        self,
        text: str,
        metadata: dict,
        start_index: int,
    ) -> list[DocumentChunk]:
        """Split a long text that exceeds chunk size.

        Args:
            text: Long text to split.
            metadata: Metadata for chunks.
            start_index: Starting chunk index.

        Returns:
            List of DocumentChunk objects.
        """
        chunks = []
        sentences = re.split(r"(?<=[.!?])\s+", text)

        current_chunk = ""
        chunk_index = start_index

        for sentence in sentences:
            potential_chunk = (
                f"{current_chunk} {sentence}"
                if current_chunk
                else sentence
            )

            if len(potential_chunk) <= self.chunk_size:
                current_chunk = potential_chunk
            else:
                if current_chunk:
                    chunk = DocumentChunk(
                        id=f"{metadata.get('article_id', 'doc')}_{chunk_index}",
                        text=current_chunk.strip(),
                        metadata={**metadata, "chunk_index": chunk_index},
                    )
                    chunks.append(chunk)
                    chunk_index += 1

                # If single sentence is too long, split by words
                if len(sentence) > self.chunk_size:
                    word_chunks = self._split_by_words(
                        sentence,
                        metadata,
                        chunk_index,
                    )
                    chunks.extend(word_chunks)
                    chunk_index += len(word_chunks)
                    current_chunk = ""
                else:
                    overlap_text = self._get_overlap_text(current_chunk)
                    current_chunk = f"{overlap_text} {sentence}".strip()

        if current_chunk.strip():
            chunk = DocumentChunk(
                id=f"{metadata.get('article_id', 'doc')}_{chunk_index}",
                text=current_chunk.strip(),
                metadata={**metadata, "chunk_index": chunk_index},
            )
            chunks.append(chunk)

        return chunks

    def _split_by_words(
        self,
        text: str,
        metadata: dict,
        start_index: int,
    ) -> list[DocumentChunk]:
        """Split text by words as a last resort.

        Args:
            text: Text to split.
            metadata: Metadata for chunks.
            start_index: Starting chunk index.

        Returns:
            List of DocumentChunk objects.
        """
        chunks = []
        words = text.split()

        current_chunk = ""
        chunk_index = start_index

        for word in words:
            potential_chunk = f"{current_chunk} {word}" if current_chunk else word

            if len(potential_chunk) <= self.chunk_size:
                current_chunk = potential_chunk
            else:
                if current_chunk:
                    chunk = DocumentChunk(
                        id=f"{metadata.get('article_id', 'doc')}_{chunk_index}",
                        text=current_chunk.strip(),
                        metadata={**metadata, "chunk_index": chunk_index},
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                current_chunk = word

        if current_chunk.strip():
            chunk = DocumentChunk(
                id=f"{metadata.get('article_id', 'doc')}_{chunk_index}",
                text=current_chunk.strip(),
                metadata={**metadata, "chunk_index": chunk_index},
            )
            chunks.append(chunk)

        return chunks

    def _get_overlap_text(self, text: str) -> str:
        """Get the overlap portion from the end of a text.

        Args:
            text: Text to get overlap from.

        Returns:
            Overlap text portion.
        """
        if len(text) <= self.chunk_overlap:
            return text

        # Try to find a sentence boundary within the overlap region
        overlap_region = text[-self.chunk_overlap:]

        # Find the start of a sentence within the overlap
        sentence_start = re.search(r"(?<=[.!?])\s+", overlap_region)
        if sentence_start:
            return overlap_region[sentence_start.end():]

        # Fall back to word boundary
        word_start = overlap_region.find(" ")
        if word_start != -1:
            return overlap_region[word_start + 1:]

        return overlap_region

    def process_article(self, article: KnowledgeArticle) -> list[DocumentChunk]:
        """Process a knowledge article into chunks.

        Args:
            article: KnowledgeArticle to process.

        Returns:
            List of DocumentChunk objects.
        """
        # Clean HTML content
        clean_content = self.clean_html(article.content)

        # If content is empty after cleaning, use title only
        if not clean_content.strip():
            logger.warning(f"Article {article.id} has no content after cleaning")
            clean_content = article.title

        # Prepare full text with title
        full_text = f"# {article.title}\n\n{clean_content}"

        # Create metadata
        metadata = {
            "article_id": article.id,
            "title": article.title,
            "url": article.url,
            "category": article.category,
            "subcategory": article.subcategory,
            "language": article.language,
        }

        # Remove None values from metadata
        metadata = {k: v for k, v in metadata.items() if v is not None}

        # Chunk the text
        chunks = self.chunk_text(full_text, metadata)

        logger.debug(f"Processed article {article.id} into {len(chunks)} chunks")
        return chunks

    def process_articles(
        self,
        articles: list[KnowledgeArticle],
    ) -> list[DocumentChunk]:
        """Process multiple articles into chunks.

        Args:
            articles: List of KnowledgeArticle objects.

        Returns:
            List of all DocumentChunk objects.
        """
        all_chunks = []

        for article in articles:
            try:
                chunks = self.process_article(article)
                all_chunks.extend(chunks)
            except Exception as e:
                logger.error(f"Failed to process article {article.id}: {e}")
                continue

        logger.info(
            f"Processed {len(articles)} articles into {len(all_chunks)} chunks"
        )
        return all_chunks
