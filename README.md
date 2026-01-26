# HubSpot RAG System

A Retrieval-Augmented Generation (RAG) system for querying your HubSpot knowledgebase using AI. This system fetches articles from HubSpot, processes them into embeddings, and allows you to ask natural language questions about your content.

## Features

- **HubSpot CRM Integration**: Fetches Leads and Deals with full pipeline stage history
  - Track date entered/exited each pipeline stage
  - Calculate cumulative time per stage
  - Weighted deal amounts based on stage probability
- **HubSpot CMS Integration**: Fetches articles from knowledgebase and blog posts
- **Smart Chunking**: Intelligently splits documents with overlap for better context preservation
- **Multiple Embedding Options**:
  - OpenAI embeddings (text-embedding-3-small, text-embedding-3-large)
  - Local embeddings using sentence-transformers
- **Vector Storage**: Uses ChromaDB for efficient similarity search with persistence
- **Interactive Chat**: Real-time streaming chat interface
- **CLI Tools**: Complete command-line interface for all operations

## Installation

### Prerequisites

- Python 3.10 or higher
- HubSpot private app access token
- OpenAI API key (for embeddings and LLM)

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd RAG-Cercli
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
HUBSPOT_ACCESS_TOKEN=your_hubspot_token
OPENAI_API_KEY=your_openai_key

# Optional - customize as needed
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o-mini
```

## Usage

### 1. Ingest CRM Data (Leads & Deals)

Fetch and process your HubSpot CRM data with pipeline stage history:

```bash
# Ingest leads and deals with full stage history
python -m src.cli ingest-crm

# Specify limits
python -m src.cli ingest-crm --leads-limit 100 --deals-limit 200

# Skip stage history for faster ingestion
python -m src.cli ingest-crm --no-history

# Clear existing data and re-ingest
python -m src.cli ingest-crm --clear
```

This will fetch:
- **Leads**: Name, lifecycle stage, date entered/exited each stage
- **Deals**: Name, weighted amount, pipeline stages, cumulative time per stage

### 2. Ingest CMS Articles (Optional)

If you also have knowledgebase articles or blog posts:

```bash
# Ingest up to 500 articles
python -m src.cli ingest

# Ingest with a specific limit
python -m src.cli ingest --limit 100

# Clear existing data and re-ingest
python -m src.cli ingest --clear
```

### 3. Query Your Data

Ask questions about your leads, deals, and content:

```bash
# Ask about deals
python -m src.cli query "Which deals have been in negotiation stage the longest?"

# Ask about leads
python -m src.cli query "Show me leads that moved from MQL to SQL this month"

# With streaming response
python -m src.cli query "What is the average time deals spend in each stage?" --stream

# Show source documents
python -m src.cli query "Which deals have the highest weighted amount?" --show-sources
```

### 4. Interactive Chat

Start an interactive chat session:

```bash
python -m src.cli chat
```

### 5. Other Commands

```bash
# View vector store statistics
python -m src.cli stats

# Search without generating an answer
python -m src.cli search "billing"

# Clear all data
python -m src.cli clear
```

## Configuration

All settings can be configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `EMBEDDING_PROVIDER` | `openai` or `local` | `openai` |
| `EMBEDDING_MODEL` | OpenAI embedding model | `text-embedding-3-small` |
| `LOCAL_EMBEDDING_MODEL` | Sentence-transformers model | `all-MiniLM-L6-v2` |
| `LLM_MODEL` | LLM for generation | `gpt-4o-mini` |
| `LLM_TEMPERATURE` | Generation temperature | `0.1` |
| `LLM_MAX_TOKENS` | Max response tokens | `1024` |
| `CHROMA_PERSIST_DIRECTORY` | Vector store location | `./data/chromadb` |
| `COLLECTION_NAME` | ChromaDB collection | `hubspot_knowledgebase` |
| `CHUNK_SIZE` | Max chunk size (chars) | `1000` |
| `CHUNK_OVERLAP` | Chunk overlap (chars) | `200` |
| `TOP_K_RESULTS` | Results to retrieve | `5` |

## HubSpot Setup

### Creating a Private App

1. Go to your HubSpot account settings
2. Navigate to **Integrations > Private Apps**
3. Click **Create a private app**
4. Give it a name (e.g., "RAG System")
5. Under **Scopes**, enable:
   - `crm.objects.contacts.read` - for leads/contacts
   - `crm.objects.deals.read` - for deals
   - `crm.schemas.deals.read` - for deal pipelines
   - `content` (read) - for CMS content (optional)
   - `cms.knowledge_base.articles.read` - for knowledgebase (optional)
6. Click **Create app**
7. Copy the access token to your `.env` file

## Architecture

```
┌─────────────────┐
│  HubSpot CRM    │
│  (Leads/Deals)  │─────┐
└─────────────────┘     │     ┌──────────────────┐     ┌─────────────────┐
                        ├────▶│ Document         │────▶│   ChromaDB      │
┌─────────────────┐     │     │ Processor        │     │ (Vector Store)  │
│  HubSpot CMS    │─────┘     │ (Chunking)       │     └────────┬────────┘
│  (Articles)     │           └──────────────────┘              │
└─────────────────┘                                             │
                                                                │
┌─────────────────┐     ┌──────────────────┐                    │
│   User Query    │────▶│ RAG Pipeline     │◀───────────────────┘
│                 │     │ (Retrieval +     │
└─────────────────┘     │  Generation)     │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   OpenAI LLM     │
                        │   (Response)     │
                        └──────────────────┘
```

## Project Structure

```
RAG-Cercli/
├── src/
│   ├── __init__.py
│   ├── cli.py              # Command-line interface
│   ├── config.py           # Configuration management
│   ├── document_processor.py # Chunking and text processing
│   ├── embeddings.py       # Embedding providers
│   ├── hubspot_client.py   # HubSpot CMS API client
│   ├── hubspot_crm.py      # HubSpot CRM client (Leads & Deals)
│   ├── rag_pipeline.py     # RAG query pipeline
│   └── vector_store.py     # ChromaDB vector store
├── data/                   # Vector store data (gitignored)
├── .env                    # Environment variables (gitignored)
├── .env.example           # Example environment file
├── .gitignore
├── README.md
├── requirements.txt
└── setup.py
```

## Using Local Embeddings

To use local embeddings instead of OpenAI (for privacy or cost savings):

1. Set environment variables:

```env
EMBEDDING_PROVIDER=local
LOCAL_EMBEDDING_MODEL=all-MiniLM-L6-v2
```

2. The first run will download the model automatically

Note: Local embeddings are faster and free but may have slightly lower quality than OpenAI embeddings.

## Troubleshooting

### "Vector store is empty"

Run the ingest command first:

```bash
python -m src.cli ingest
```

### "No articles found in HubSpot"

- Verify your HubSpot access token has the correct scopes
- Check if your HubSpot account has CMS content or blog posts

### Rate Limiting

If you hit OpenAI rate limits during ingestion:
- Reduce the batch size in the code
- Wait and retry
- Use local embeddings instead

## License

MIT License - see LICENSE file for details
