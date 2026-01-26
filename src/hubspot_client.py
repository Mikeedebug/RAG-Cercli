"""HubSpot API client for fetching knowledgebase articles."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import requests

logger = logging.getLogger(__name__)


@dataclass
class KnowledgeArticle:
    """Represents a HubSpot knowledgebase article."""

    id: str
    title: str
    content: str
    url: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    language: str = "en"

    def to_dict(self) -> dict:
        """Convert article to dictionary for storage."""
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "url": self.url,
            "category": self.category,
            "subcategory": self.subcategory,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "language": self.language,
        }


class HubSpotClient:
    """Client for interacting with HubSpot CMS/Knowledgebase API."""

    BASE_URL = "https://api.hubapi.com"

    def __init__(self, access_token: str):
        """Initialize the HubSpot client.

        Args:
            access_token: HubSpot private app access token.
        """
        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        })

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make a GET request to the HubSpot API.

        Args:
            endpoint: API endpoint path.
            params: Optional query parameters.

        Returns:
            JSON response as dictionary.

        Raises:
            requests.HTTPError: If the request fails.
        """
        url = f"{self.BASE_URL}{endpoint}"
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def get_knowledge_articles(
        self,
        limit: int = 100,
        language: str = "en",
    ) -> list[KnowledgeArticle]:
        """Fetch all knowledgebase articles from HubSpot.

        This method uses the CMS Blog Posts API as HubSpot's knowledgebase
        is typically built on top of the CMS. Adjust the endpoint based on
        your specific HubSpot setup.

        Args:
            limit: Maximum number of articles to fetch per request.
            language: Language code for articles.

        Returns:
            List of KnowledgeArticle objects.
        """
        articles = []
        after = None

        while True:
            params = {
                "limit": min(limit, 100),
                "archived": False,
            }
            if after:
                params["after"] = after

            try:
                # Try fetching from CMS pages (knowledgebase articles)
                response = self._get("/cms/v3/site-search/search", {
                    "limit": min(limit, 100),
                    "type": "KNOWLEDGE_ARTICLE",
                    "language": language,
                })

                for item in response.get("results", []):
                    article = KnowledgeArticle(
                        id=str(item.get("id")),
                        title=item.get("title", ""),
                        content=item.get("description", "") or item.get("content", ""),
                        url=item.get("url"),
                        category=item.get("category"),
                        language=language,
                    )
                    articles.append(article)

                # Check for pagination
                paging = response.get("paging", {})
                next_page = paging.get("next", {})
                after = next_page.get("after")

                if not after:
                    break

            except requests.HTTPError as e:
                if e.response.status_code == 404:
                    logger.warning(
                        "Knowledge articles endpoint not found. "
                        "Trying alternative endpoints..."
                    )
                    # Fall back to blog posts or landing pages
                    return self._get_cms_pages(limit, language)
                raise

        logger.info(f"Fetched {len(articles)} knowledge articles")
        return articles

    def _get_cms_pages(
        self,
        limit: int = 100,
        language: str = "en",
    ) -> list[KnowledgeArticle]:
        """Fetch CMS pages as an alternative to dedicated knowledge articles.

        Args:
            limit: Maximum number of pages to fetch.
            language: Language code for pages.

        Returns:
            List of KnowledgeArticle objects.
        """
        articles = []
        after = None

        while True:
            params = {
                "limit": min(limit, 100),
                "archived": False,
            }
            if after:
                params["after"] = after

            try:
                response = self._get("/cms/v3/pages/site-pages", params)

                for item in response.get("results", []):
                    # Extract content from the page
                    content = self._extract_page_content(item)

                    article = KnowledgeArticle(
                        id=str(item.get("id")),
                        title=item.get("htmlTitle") or item.get("name", ""),
                        content=content,
                        url=item.get("url"),
                        category=item.get("categoryId"),
                        created_at=self._parse_datetime(item.get("createdAt")),
                        updated_at=self._parse_datetime(item.get("updatedAt")),
                        language=item.get("language", language),
                    )
                    articles.append(article)

                # Check for pagination
                paging = response.get("paging", {})
                next_page = paging.get("next", {})
                after = next_page.get("after")

                if not after or len(articles) >= limit:
                    break

            except requests.HTTPError as e:
                logger.error(f"Failed to fetch CMS pages: {e}")
                break

        logger.info(f"Fetched {len(articles)} CMS pages")
        return articles

    def _extract_page_content(self, page: dict) -> str:
        """Extract text content from a HubSpot page object.

        Args:
            page: HubSpot page data dictionary.

        Returns:
            Extracted text content.
        """
        content_parts = []

        # Get meta description
        if page.get("metaDescription"):
            content_parts.append(page["metaDescription"])

        # Get widget content if available
        widgets = page.get("widgets", {})
        for widget_key, widget_data in widgets.items():
            if isinstance(widget_data, dict):
                body = widget_data.get("body", {})
                if isinstance(body, dict):
                    html = body.get("html", "")
                    if html:
                        content_parts.append(html)
                elif isinstance(body, str):
                    content_parts.append(body)

        # Get layout sections
        layout_sections = page.get("layoutSections", {})
        for section_key, section_data in layout_sections.items():
            if isinstance(section_data, dict):
                content = self._extract_layout_content(section_data)
                if content:
                    content_parts.append(content)

        return "\n\n".join(content_parts)

    def _extract_layout_content(self, section: dict) -> str:
        """Recursively extract content from layout sections.

        Args:
            section: Layout section data.

        Returns:
            Extracted text content.
        """
        content_parts = []

        # Check for direct content
        if section.get("html"):
            content_parts.append(section["html"])

        # Check rows and cells
        for row in section.get("rows", []):
            for column in row.get("columns", []):
                for widget in column.get("widgets", []):
                    body = widget.get("body", "")
                    if isinstance(body, str) and body:
                        content_parts.append(body)
                    elif isinstance(body, dict) and body.get("html"):
                        content_parts.append(body["html"])

        return "\n".join(content_parts)

    def _parse_datetime(self, dt_string: Optional[str]) -> Optional[datetime]:
        """Parse a datetime string from HubSpot API.

        Args:
            dt_string: ISO format datetime string.

        Returns:
            Parsed datetime or None.
        """
        if not dt_string:
            return None
        try:
            return datetime.fromisoformat(dt_string.replace("Z", "+00:00"))
        except ValueError:
            return None

    def get_blog_posts(self, limit: int = 100) -> list[KnowledgeArticle]:
        """Fetch blog posts from HubSpot (can be used for knowledge content).

        Args:
            limit: Maximum number of posts to fetch.

        Returns:
            List of KnowledgeArticle objects.
        """
        articles = []
        after = None

        while True:
            params = {
                "limit": min(limit, 100),
                "archived": False,
            }
            if after:
                params["after"] = after

            try:
                response = self._get("/cms/v3/blogs/posts", params)

                for item in response.get("results", []):
                    article = KnowledgeArticle(
                        id=str(item.get("id")),
                        title=item.get("htmlTitle") or item.get("name", ""),
                        content=item.get("postBody", ""),
                        url=item.get("url"),
                        category=item.get("categoryId"),
                        created_at=self._parse_datetime(item.get("createdAt")),
                        updated_at=self._parse_datetime(item.get("updatedAt")),
                        language=item.get("language", "en"),
                    )
                    articles.append(article)

                # Check for pagination
                paging = response.get("paging", {})
                next_page = paging.get("next", {})
                after = next_page.get("after")

                if not after or len(articles) >= limit:
                    break

            except requests.HTTPError as e:
                logger.error(f"Failed to fetch blog posts: {e}")
                break

        logger.info(f"Fetched {len(articles)} blog posts")
        return articles

    def get_all_content(self, limit: int = 500) -> list[KnowledgeArticle]:
        """Fetch all available content from HubSpot.

        This combines knowledge articles, CMS pages, and blog posts.

        Args:
            limit: Maximum total number of articles to fetch.

        Returns:
            List of KnowledgeArticle objects.
        """
        all_articles = []
        seen_ids = set()

        # Try to get knowledge articles first
        try:
            kb_articles = self.get_knowledge_articles(limit=limit)
            for article in kb_articles:
                if article.id not in seen_ids:
                    all_articles.append(article)
                    seen_ids.add(article.id)
        except Exception as e:
            logger.warning(f"Could not fetch knowledge articles: {e}")

        # Get CMS pages
        remaining = limit - len(all_articles)
        if remaining > 0:
            try:
                cms_pages = self._get_cms_pages(limit=remaining)
                for article in cms_pages:
                    if article.id not in seen_ids:
                        all_articles.append(article)
                        seen_ids.add(article.id)
            except Exception as e:
                logger.warning(f"Could not fetch CMS pages: {e}")

        # Get blog posts
        remaining = limit - len(all_articles)
        if remaining > 0:
            try:
                blog_posts = self.get_blog_posts(limit=remaining)
                for article in blog_posts:
                    if article.id not in seen_ids:
                        all_articles.append(article)
                        seen_ids.add(article.id)
            except Exception as e:
                logger.warning(f"Could not fetch blog posts: {e}")

        logger.info(f"Total content fetched: {len(all_articles)} articles")
        return all_articles
