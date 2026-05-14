from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from database import get_db
from services.retrieval import retrieve_relevant_chunks, compute_confidence
from services.gemini import generate_text
from services.workflow import build_rag_prompt, step_analyze_query

router = APIRouter(prefix="/documents", tags=["query"])


class QueryRequest(BaseModel):
    query: str
    document_id: str | None = None
    top_k: int = 5


class QueryResponse(BaseModel):
    query: str
    response: str
    confidence: float
    sources: list[dict]
    intent: str


@router.post("/query", response_model=QueryResponse)
async def query_documents(req: QueryRequest, db: AsyncSession = Depends(get_db)):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    analysis = await step_analyze_query(req.query)
    chunks = await retrieve_relevant_chunks(
        req.query, db, document_id=req.document_id, top_k=req.top_k
    )

    if not chunks:
        return QueryResponse(
            query=req.query,
            response="No relevant content found in the uploaded documents.",
            confidence=0.0,
            sources=[],
            intent=analysis.get("intent", "question"),
        )

    confidence = compute_confidence(chunks)
    prompt = build_rag_prompt(req.query, chunks, analysis.get("intent", "question"))
    response_text = await generate_text(prompt)

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

    return QueryResponse(
        query=req.query,
        response=response_text,
        confidence=confidence,
        sources=sources,
        intent=analysis.get("intent", "question"),
    )
