import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from services.gemini import get_query_embedding
from config import settings


async def retrieve_relevant_chunks(
    query: str,
    db: AsyncSession,
    document_id: str | None = None,
    top_k: int | None = None,
) -> list[dict]:
    from database import chunks_collection

    k = top_k or settings.top_k_chunks
    query_emb = await get_query_embedding(query)

    # Count available chunks (filtered or total) so n_results never exceeds them
    if document_id:
        count_result = await asyncio.to_thread(
            chunks_collection.get,
            where={"document_id": document_id},
            include=["metadatas"],
        )
        total = len(count_result["ids"])
    else:
        total = await asyncio.to_thread(chunks_collection.count)

    if total == 0:
        return []

    n_results = min(k, total)

    query_kwargs = dict(
        query_embeddings=[query_emb],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )
    if document_id:
        query_kwargs["where"] = {"document_id": document_id}

    results = await asyncio.to_thread(chunks_collection.query, **query_kwargs)

    ids = results["ids"][0]
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]

    output = []
    for chunk_id, content, meta, distance in zip(ids, docs, metas, distances):
        # ChromaDB cosine distance = 1 - cosine_similarity  (range 0–2)
        similarity = max(0.0, 1.0 - distance)
        output.append({
            "chunk_id": chunk_id,
            "document_id": meta["document_id"],
            "document_title": meta.get("document_title", "Unknown"),
            "content": content,
            "chunk_index": meta["chunk_index"],
            "score": round(similarity, 4),
        })

    # ChromaDB returns results sorted by distance (closest first) — already best first
    return output


def compute_confidence(chunks: list[dict]) -> float:
    if not chunks:
        return 0.0
    top_score = chunks[0]["score"]
    # Scale cosine similarity to 0–1 confidence
    # Gemini embeddings for relevant content typically score 0.6–0.95
    confidence = min(1.0, max(0.0, (top_score - 0.4) / 0.5))
    return round(confidence, 3)
