"""
Multi-step AI workflow:
  Step 1 - Analyze query  : classify intent, extract keywords
  Step 2 - Retrieve context: semantic search over chunks
  Step 3 - Generate response: call Gemini with retrieved context
  Step 4 - Structure output : wrap with citations, confidence, metadata
"""

from sqlalchemy.ext.asyncio import AsyncSession
from services.gemini import generate_text, generate_stream
from services.retrieval import retrieve_relevant_chunks, compute_confidence


async def step_analyze_query(query: str) -> dict:
    prompt = (
        "Analyze the following user query and return a JSON object with exactly these fields:\n"
        '  "intent": one of ["question", "summary_request", "comparison", "definition", "other"]\n'
        '  "keywords": list of 3-5 key terms from the query\n'
        '  "is_document_specific": true if the query refers to a specific document, else false\n\n'
        f"Query: {query}\n\n"
        "Return ONLY valid JSON, no markdown, no explanation."
    )
    raw = await generate_text(prompt)
    import json, re

    # Strip markdown code fences if present
    raw = re.sub(r"```json?\s*|\s*```", "", raw).strip()
    try:
        return json.loads(raw)
    except Exception:
        return {"intent": "question", "keywords": [], "is_document_specific": False}


def build_rag_prompt(query: str, chunks: list[dict], intent: str) -> str:
    context_parts = []
    for i, c in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i}: {c['document_title']} (chunk {c['chunk_index']})]:\n{c['content']}"
        )
    context = "\n\n".join(context_parts)

    instruction = {
        "summary_request": "Provide a comprehensive summary based on the context.",
        "comparison": "Compare and contrast the relevant information from the context.",
        "definition": "Define the term clearly using the context provided.",
    }.get(intent, "Answer the question accurately and concisely based on the context.")

    return (
        f"You are a helpful document assistant. {instruction}\n\n"
        f"Context from documents:\n{context}\n\n"
        f"User query: {query}\n\n"
        "If the context doesn't contain enough information, say so clearly. "
        "Reference source numbers (e.g., [Source 1]) when citing specific information."
    )


async def run_workflow(query: str, db: AsyncSession, document_id: str | None = None) -> dict:
    steps = []

    # Step 1: Analyze query
    steps.append({"step": 1, "name": "Analyze Query", "status": "running"})
    analysis = await step_analyze_query(query)
    steps[-1]["status"] = "done"
    steps[-1]["output"] = analysis

    # Step 2: Retrieve context
    steps.append({"step": 2, "name": "Retrieve Context", "status": "running"})
    chunks = await retrieve_relevant_chunks(query, db, document_id=document_id)
    confidence = compute_confidence(chunks)
    steps[-1]["status"] = "done"
    steps[-1]["output"] = {"chunks_retrieved": len(chunks), "confidence": confidence}

    # Step 3: Generate response
    steps.append({"step": 3, "name": "Generate Response", "status": "running"})
    prompt = build_rag_prompt(query, chunks, analysis.get("intent", "question"))
    response_text = await generate_text(prompt)
    steps[-1]["status"] = "done"

    # Step 4: Structure output
    steps.append({"step": 4, "name": "Structure Output", "status": "done"})

    sources = [
        {
            "document_id": c["document_id"],
            "document_title": c["document_title"],
            "chunk_index": c["chunk_index"],
            "relevance_score": c["score"],
            "excerpt": c["content"][:200] + ("..." if len(c["content"]) > 200 else ""),
        }
        for c in chunks
    ]

    return {
        "query": query,
        "intent": analysis.get("intent", "question"),
        "keywords": analysis.get("keywords", []),
        "response": response_text,
        "confidence": confidence,
        "sources": sources,
        "workflow_steps": steps,
    }


async def run_workflow_stream(query: str, db: AsyncSession, document_id: str | None = None):
    """Yields SSE-compatible dicts for streaming."""
    import json

    # Step 1
    analysis = await step_analyze_query(query)
    yield {"event": "step", "data": json.dumps({"step": 1, "name": "Analyze Query", "output": analysis})}

    # Step 2
    chunks = await retrieve_relevant_chunks(query, db, document_id=document_id)
    confidence = compute_confidence(chunks)
    yield {"event": "step", "data": json.dumps({"step": 2, "name": "Retrieve Context", "output": {"chunks_retrieved": len(chunks), "confidence": confidence}})}

    # Step 3: stream tokens
    prompt = build_rag_prompt(query, chunks, analysis.get("intent", "question"))
    yield {"event": "step", "data": json.dumps({"step": 3, "name": "Generate Response", "output": {}})}

    full_response = []
    async for token in generate_stream(prompt):
        full_response.append(token)
        yield {"event": "token", "data": token}

    response_text = "".join(full_response)

    # Step 4
    sources = [
        {
            "document_id": c["document_id"],
            "document_title": c["document_title"],
            "chunk_index": c["chunk_index"],
            "relevance_score": c["score"],
            "excerpt": c["content"][:200] + ("..." if len(c["content"]) > 200 else ""),
        }
        for c in chunks
    ]

    yield {
        "event": "done",
        "data": json.dumps({
            "step": 4,
            "name": "Structure Output",
            "query": query,
            "intent": analysis.get("intent", "question"),
            "keywords": analysis.get("keywords", []),
            "response": response_text,
            "confidence": confidence,
            "sources": sources,
        }),
    }
