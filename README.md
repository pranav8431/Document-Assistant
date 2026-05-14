# Document Assistant

A full-stack document Q&A system built on RAG (Retrieval-Augmented Generation). Upload PDFs, DOCX, or text files and query them through a streaming chat interface.

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (free tier)

### 1. Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env
echo "GEMINI_API_KEY=your_key_here" > .env

uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/documents` | Upload a document (multipart: `title`, `file`) |
| `GET` | `/documents` | List all documents |
| `GET` | `/documents/{id}` | Get document detail + chunk count |
| `DELETE` | `/documents/{id}` | Delete document and its vectors |
| `POST` | `/documents/{id}/summary` | Generate or fetch summary + keywords |
| `POST` | `/documents/query` | RAG query (non-streaming) |
| `POST` | `/workflow/query` | Multi-step workflow query (`stream: true` for SSE) |
| `GET` | `/history` | Fetch query history |
| `DELETE` | `/history/{id}` | Delete a history entry |

### Upload a document

```bash
curl -X POST http://localhost:8000/documents \
  -F "title=Research Paper" \
  -F "file=@paper.pdf"
```

### Workflow query (streaming)

```bash
curl -X POST http://localhost:8000/workflow/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the main findings?", "stream": true}'
```

### RAG query (non-streaming)

```bash
curl -X POST http://localhost:8000/documents/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize section 2", "document_id": "optional-uuid"}'
```

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│                   React Frontend                    │
│   Sidebar (docs + history) │ Chat (streaming SSE)  │
└───────────────────┬────────────────────────────────┘
                    │ HTTP / SSE
┌───────────────────▼────────────────────────────────┐
│                  FastAPI Backend                    │
│                                                     │
│  POST /documents                                    │
│    └─► Extract text (PDF / DOCX / TXT / MD)        │
│    └─► Chunk (500 words, 50-word overlap)           │
│    └─► Embed with Gemini (gemini-embedding-001)     │
│    └─► Store vectors in ChromaDB (HNSW index)      │
│    └─► Store metadata in SQLite                     │
│                                                     │
│  POST /workflow/query  (4-step pipeline)            │
│    Step 1 – Analyze query → intent + keywords       │
│    Step 2 – ChromaDB ANN search → top-K chunks      │
│    Step 3 – Gemini generation with retrieved context│
│    Step 4 – Structure output: sources, confidence   │
│                                                     │
│  POST /documents/{id}/summary  (on-demand)          │
│    └─► Gemini summarization + keyword extraction    │
│                                                     │
│  GET /history ──► SQLite QueryHistory               │
└───────────────────┬────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
┌───────▼──────┐      ┌──────────▼──────────┐
│   ChromaDB   │      │   Google Gemini API  │
│  HNSW index  │      │  embedding + generation│
│ cosine space │      └─────────────────────┘
└──────────────┘
```

### Multi-step Workflow

| Step | Name | Description |
|------|------|-------------|
| 1 | Analyze Query | Classify intent (question / summary / comparison / definition) and extract search keywords |
| 2 | Retrieve Context | ChromaDB approximate nearest-neighbor search over embedded chunks |
| 3 | Generate Response | Gemini generates an answer using retrieved chunks as context, streamed via SSE |
| 4 | Structure Output | Attach source citations, relevance scores, and confidence rating |

### Confidence Score

Derived from the top chunk's cosine similarity, scaled to 0–100%.
Green ≥ 70% · Yellow 40–70% · Red < 40%.

### Vector Storage

Chunks are embedded once at upload time and stored in a persistent ChromaDB collection (`./chroma_db/`) with cosine distance as the metric. At query time, the query is embedded and the HNSW index returns the top-K nearest chunks without a full scan — efficient even as the document set grows.

---

## Supported File Types

| Format | Notes |
|--------|-------|
| `.pdf` | Text-layer PDFs (scanned images are not OCR'd) |
| `.docx` | Paragraph text extracted |
| `.txt` / `.md` | Plain text, read as UTF-8 |

---

## Design Decisions

- **Deferred LLM calls on upload** — Keywords and summaries are generated on-demand (`POST /documents/{id}/summary`), not during upload, to avoid hitting Gemini's free-tier rate limits while chunking and embedding.
- **Word-based chunking** — 500-word chunks with 50-word overlap. Simple, effective, and avoids tokenizer dependencies.
- **ChromaDB over in-memory scan** — Persistent HNSW index means vectors survive server restarts and query latency stays flat as the corpus grows.
- **SSE streaming** — The workflow endpoint streams tokens as they arrive from Gemini, giving a real-time typing effect in the UI.
- **No authentication** — Single-user local tool, consistent with the problem scope.

## Bonus Features

- [x] Streaming responses via Server-Sent Events
- [x] Confidence score with colour-coded visual bar
- [x] Query history (sidebar + SQLite persistence)
- [x] Source citations with chunk excerpts and relevance scores
- [x] Intent classification displayed per response
- [x] 7-theme UI (Dark Purple, Midnight, Emerald, Sunset, Rose, Ocean, Light)

## AI Usage & Notes

- Primary LLM: Google Gemini via the `google-generativeai` client. Embeddings and generation are invoked from `backend/services/gemini.py`.
- Vector store: ChromaDB persistent collection at `./chroma_db/` (see `backend/database.py`).
- Prompts and lightweight orchestration live in `backend/services/workflow.py` and `backend/services/processing.py` (intent analysis, keyword extraction, summary prompts).
- Frontend streaming is implemented using SSE (`/workflow/query` with `stream: true`) and the helper `workflowQueryStream` in `frontend/src/api/client.js`.

## Environment Variables

Create a `.env` (in `backend/`) with at minimum:

- `GEMINI_API_KEY` — required for embedding + generation calls.
- `DATABASE_URL` — optional, defaults to `sqlite+aiosqlite:///./documents.db`.
- `EMBEDDING_MODEL` — optional, default `models/gemini-embedding-001`.
- `GENERATION_MODEL` — optional, default `gemini-3-flash-preview`.
- `CHUNK_SIZE`, `CHUNK_OVERLAP`, `TOP_K_CHUNKS` — optional tuning params (defaults in `backend/config.py`).

## Assumptions & Tradeoffs

- No authentication: repository targets a local/single-user demo rather than a multi-tenant production service.
- No OCR: `.pdf` extraction requires a text layer. Scanned documents are not OCR'd by default.
- Chunking is word-based (default 500 words, 50 overlap) to avoid tokenizer dependency and keep logic simple.
- Embeddings are computed at upload time; keywords and summaries are generated on-demand to limit LLM usage during bulk uploads.
- Confidence is a heuristic scaled from the top chunk similarity (see `backend/services/retrieval.py::compute_confidence`).

## Where AI/Assistant Help Was Used

- Code and README edits were assisted interactively (local editing) — prompts and wrapper code in `backend/services/*` were authored to work with the Gemini API. The project does not embed or vendor any external helper model artifacts.

## Quick Smoke Test

1. Start the backend (from project root):

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

2. Upload a document and run a workflow query (examples):

```bash
curl -X POST "http://localhost:8000/documents" -F "title=Test" -F "file=@/path/to/file.txt"

curl -X POST "http://localhost:8000/workflow/query" -H "Content-Type: application/json" -d '{"query":"Summarize the document","stream":false}'
```

## Next Recommendations

- Add a short automated test for `backend/services/processing.py::chunk_text` and `backend/services/retrieval.py::compute_confidence` to guard core behavior.
- Add a brief CONTRIBUTING.md and developer notes for generating a local `.env` with a Gemini key if sharing the repo.

