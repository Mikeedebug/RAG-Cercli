"""Command-line interface for the HubSpot RAG system."""

import logging
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from .config import get_settings
from .document_processor import DocumentProcessor
from .embeddings import get_embedding_provider
from .hubspot_client import HubSpotClient
from .hubspot_crm import HubSpotCRMClient
from .rag_pipeline import RAGPipeline, StreamingRAGPipeline
from .vector_store import VectorStore

console = Console()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def get_components():
    """Initialize and return all RAG system components."""
    settings = get_settings()

    # Initialize embedding provider
    embedding_provider = get_embedding_provider(
        provider=settings.embedding_provider,
        api_key=settings.openai_api_key,
        model=(
            settings.embedding_model
            if settings.embedding_provider == "openai"
            else settings.local_embedding_model
        ),
    )

    # Initialize vector store
    vector_store = VectorStore(
        embedding_provider=embedding_provider,
        persist_directory=settings.chroma_persist_directory,
        collection_name=settings.collection_name,
    )

    return settings, embedding_provider, vector_store


@click.group()
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def cli(verbose: bool):
    """HubSpot RAG System - Query your knowledgebase with AI."""
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)


@cli.command()
@click.option("--limit", "-l", default=500, help="Maximum number of articles to fetch")
@click.option("--clear", "-c", is_flag=True, help="Clear existing data before ingestion")
def ingest(limit: int, clear: bool):
    """Ingest HubSpot knowledgebase articles into the vector store."""
    try:
        settings, embedding_provider, vector_store = get_components()

        if clear:
            console.print("[yellow]Clearing existing data...[/yellow]")
            vector_store.clear()

        # Initialize HubSpot client
        hubspot_client = HubSpotClient(settings.hubspot_access_token)

        # Initialize document processor
        doc_processor = DocumentProcessor(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            # Fetch articles
            task = progress.add_task("Fetching articles from HubSpot...", total=None)
            articles = hubspot_client.get_all_content(limit=limit)
            progress.update(task, completed=True)

            if not articles:
                console.print("[red]No articles found in HubSpot.[/red]")
                return

            console.print(f"[green]Fetched {len(articles)} articles[/green]")

            # Process articles into chunks
            task = progress.add_task("Processing articles into chunks...", total=None)
            chunks = doc_processor.process_articles(articles)
            progress.update(task, completed=True)

            console.print(f"[green]Created {len(chunks)} chunks[/green]")

            # Add chunks to vector store
            task = progress.add_task("Adding chunks to vector store...", total=None)
            added = vector_store.add_chunks(chunks)
            progress.update(task, completed=True)

            console.print(f"[green]Added {added} chunks to vector store[/green]")

        # Show stats
        stats = vector_store.get_stats()
        console.print(Panel(
            f"Collection: {stats['collection_name']}\n"
            f"Total chunks: {stats['total_chunks']}\n"
            f"Storage: {stats['persist_directory']}",
            title="Ingestion Complete",
            border_style="green",
        ))

    except Exception as e:
        console.print(f"[red]Error during ingestion: {e}[/red]")
        logger.exception("Ingestion failed")
        sys.exit(1)


@cli.command("ingest-crm")
@click.option("--leads-limit", "-l", default=500, help="Maximum number of leads to fetch")
@click.option("--deals-limit", "-d", default=500, help="Maximum number of deals to fetch")
@click.option("--clear", "-c", is_flag=True, help="Clear existing data before ingestion")
@click.option("--no-history", is_flag=True, help="Skip fetching stage history (faster)")
def ingest_crm(leads_limit: int, deals_limit: int, clear: bool, no_history: bool):
    """Ingest HubSpot CRM data (Leads and Deals) into the vector store."""
    try:
        settings, embedding_provider, vector_store = get_components()

        if clear:
            console.print("[yellow]Clearing existing data...[/yellow]")
            vector_store.clear()

        # Initialize HubSpot CRM client
        crm_client = HubSpotCRMClient(settings.hubspot_access_token)

        # Initialize document processor
        doc_processor = DocumentProcessor(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            # Fetch leads
            task = progress.add_task("Fetching leads from HubSpot...", total=None)
            leads = crm_client.get_leads(
                limit=leads_limit,
                include_stage_history=not no_history,
            )
            progress.update(task, completed=True)
            console.print(f"[green]Fetched {len(leads)} leads[/green]")

            # Fetch deals
            task = progress.add_task("Fetching deals from HubSpot...", total=None)
            deals = crm_client.get_deals(
                limit=deals_limit,
                include_stage_history=not no_history,
            )
            progress.update(task, completed=True)
            console.print(f"[green]Fetched {len(deals)} deals[/green]")

            if not leads and not deals:
                console.print("[red]No CRM data found in HubSpot.[/red]")
                return

            # Process CRM data into chunks
            task = progress.add_task("Processing CRM data into chunks...", total=None)
            chunks = doc_processor.process_crm_data(leads, deals)
            progress.update(task, completed=True)
            console.print(f"[green]Created {len(chunks)} chunks[/green]")

            # Add chunks to vector store
            task = progress.add_task("Adding chunks to vector store...", total=None)
            added = vector_store.add_chunks(chunks)
            progress.update(task, completed=True)
            console.print(f"[green]Added {added} chunks to vector store[/green]")

        # Show stats
        stats = vector_store.get_stats()

        # Create summary table
        table = Table(title="CRM Ingestion Summary")
        table.add_column("Data Type", style="cyan")
        table.add_column("Count", style="green")

        table.add_row("Leads", str(len(leads)))
        table.add_row("Deals", str(len(deals)))
        table.add_row("Total Chunks", str(stats['total_chunks']))

        console.print(table)

        console.print(Panel(
            f"Collection: {stats['collection_name']}\n"
            f"Storage: {stats['persist_directory']}",
            title="Ingestion Complete",
            border_style="green",
        ))

    except Exception as e:
        console.print(f"[red]Error during CRM ingestion: {e}[/red]")
        logger.exception("CRM ingestion failed")
        sys.exit(1)


@cli.command()
@click.argument("question")
@click.option("--top-k", "-k", default=5, help="Number of documents to retrieve")
@click.option("--stream", "-s", is_flag=True, help="Stream the response")
@click.option("--show-sources", is_flag=True, help="Show source documents")
def query(question: str, top_k: int, stream: bool, show_sources: bool):
    """Ask a question about the knowledgebase."""
    try:
        settings, embedding_provider, vector_store = get_components()

        # Check if vector store has data
        stats = vector_store.get_stats()
        if stats["total_chunks"] == 0:
            console.print(
                "[red]Vector store is empty. Run 'ingest' first to load articles.[/red]"
            )
            sys.exit(1)

        if stream:
            # Use streaming pipeline
            pipeline = StreamingRAGPipeline(
                vector_store=vector_store,
                openai_api_key=settings.openai_api_key,
                model=settings.llm_model,
                temperature=settings.llm_temperature,
                max_tokens=settings.llm_max_tokens,
                top_k=top_k,
            )

            console.print(Panel(question, title="Question", border_style="blue"))
            console.print("\n[bold]Answer:[/bold]")

            for chunk in pipeline.query_stream(question):
                console.print(chunk, end="")

            console.print("\n")

        else:
            # Use regular pipeline
            pipeline = RAGPipeline(
                vector_store=vector_store,
                openai_api_key=settings.openai_api_key,
                model=settings.llm_model,
                temperature=settings.llm_temperature,
                max_tokens=settings.llm_max_tokens,
                top_k=top_k,
            )

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
            ) as progress:
                task = progress.add_task("Generating answer...", total=None)
                response = pipeline.query(question)
                progress.update(task, completed=True)

            console.print(Panel(question, title="Question", border_style="blue"))
            console.print(Panel(response.answer, title="Answer", border_style="green"))

            if show_sources and response.sources:
                table = Table(title="Sources")
                table.add_column("Title", style="cyan")
                table.add_column("URL", style="blue")
                table.add_column("Score", style="green")

                for source in response.sources:
                    table.add_row(
                        source["title"],
                        source["url"] or "N/A",
                        f"{source['score']:.3f}",
                    )

                console.print(table)

    except Exception as e:
        console.print(f"[red]Error during query: {e}[/red]")
        logger.exception("Query failed")
        sys.exit(1)


@cli.command()
def chat():
    """Start an interactive chat session."""
    try:
        settings, embedding_provider, vector_store = get_components()

        # Check if vector store has data
        stats = vector_store.get_stats()
        if stats["total_chunks"] == 0:
            console.print(
                "[red]Vector store is empty. Run 'ingest' first to load articles.[/red]"
            )
            sys.exit(1)

        pipeline = StreamingRAGPipeline(
            vector_store=vector_store,
            openai_api_key=settings.openai_api_key,
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            top_k=settings.top_k_results,
        )

        console.print(Panel(
            "Welcome to the HubSpot RAG Chat!\n"
            "Ask questions about your knowledgebase.\n"
            "Type 'exit' or 'quit' to end the session.\n"
            "Type 'clear' to clear the screen.",
            title="HubSpot RAG Chat",
            border_style="blue",
        ))

        conversation_history = []

        while True:
            try:
                question = console.input("\n[bold blue]You:[/bold blue] ").strip()

                if not question:
                    continue

                if question.lower() in ("exit", "quit"):
                    console.print("[yellow]Goodbye![/yellow]")
                    break

                if question.lower() == "clear":
                    console.clear()
                    continue

                console.print("\n[bold green]Assistant:[/bold green] ", end="")

                # Stream the response
                full_response = ""
                for chunk in pipeline.query_stream(question):
                    console.print(chunk, end="")
                    full_response += chunk

                console.print()

                # Add to conversation history
                conversation_history.append({"role": "user", "content": question})
                conversation_history.append({"role": "assistant", "content": full_response})

            except KeyboardInterrupt:
                console.print("\n[yellow]Goodbye![/yellow]")
                break

    except Exception as e:
        console.print(f"[red]Error during chat: {e}[/red]")
        logger.exception("Chat failed")
        sys.exit(1)


@cli.command()
def stats():
    """Show statistics about the vector store."""
    try:
        settings, embedding_provider, vector_store = get_components()

        stats_data = vector_store.get_stats()

        table = Table(title="Vector Store Statistics")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")

        for key, value in stats_data.items():
            table.add_row(key.replace("_", " ").title(), str(value))

        console.print(table)

    except Exception as e:
        console.print(f"[red]Error getting stats: {e}[/red]")
        logger.exception("Stats failed")
        sys.exit(1)


@cli.command()
@click.confirmation_option(prompt="Are you sure you want to clear all data?")
def clear():
    """Clear all data from the vector store."""
    try:
        settings, embedding_provider, vector_store = get_components()

        vector_store.clear()
        console.print("[green]Vector store cleared successfully.[/green]")

    except Exception as e:
        console.print(f"[red]Error clearing data: {e}[/red]")
        logger.exception("Clear failed")
        sys.exit(1)


@cli.command()
@click.argument("query_text")
@click.option("--top-k", "-k", default=5, help="Number of results to show")
def search(query_text: str, top_k: int):
    """Search the vector store without generating an answer."""
    try:
        settings, embedding_provider, vector_store = get_components()

        results = vector_store.search(query_text, top_k=top_k)

        if not results:
            console.print("[yellow]No results found.[/yellow]")
            return

        for i, result in enumerate(results, 1):
            metadata = result.get("metadata", {})
            console.print(Panel(
                f"[bold]Title:[/bold] {metadata.get('title', 'N/A')}\n"
                f"[bold]URL:[/bold] {metadata.get('url', 'N/A')}\n"
                f"[bold]Score:[/bold] {result.get('score', 0):.3f}\n\n"
                f"{result.get('text', '')[:500]}...",
                title=f"Result {i}",
                border_style="blue",
            ))

    except Exception as e:
        console.print(f"[red]Error during search: {e}[/red]")
        logger.exception("Search failed")
        sys.exit(1)


def main():
    """Entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()
