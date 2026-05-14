import asyncio
import io
import re
import uuid
from config import settings
from services.gemini import generate_text, get_embedding

try:
    import PyPDF2
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


def extract_text_from_file(content: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    if ext == "pdf" and HAS_PDF:
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if ext in ("docx", "doc") and HAS_DOCX:
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    return content.decode("utf-8", errors="replace")


def chunk_text(text: str, document_id: str) -> list[dict]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    chunks = []
    size = settings.chunk_size
    overlap = settings.chunk_overlap

    i = 0
    idx = 0
    while i < len(words):
        chunk_words = words[i: i + size]
        chunks.append({
            "id": str(uuid.uuid4()),
            "document_id": document_id,
            "content": " ".join(chunk_words),
            "chunk_index": idx,
        })
        i += size - overlap
        idx += 1

    return chunks


async def embed_and_store_chunks(chunks: list[dict], document_title: str) -> None:
    """Embed each chunk with Gemini and store vectors + text in ChromaDB."""
    from database import chunks_collection

    ids, embeddings, documents, metadatas = [], [], [], []

    for i, chunk in enumerate(chunks):
        embedding = await get_embedding(chunk["content"])
        ids.append(chunk["id"])
        embeddings.append(embedding)
        documents.append(chunk["content"])
        metadatas.append({
            "document_id": chunk["document_id"],
            "chunk_index": chunk["chunk_index"],
            "document_title": document_title,
        })
        # Stay within Gemini free-tier RPM — pause every 10 chunks
        if (i + 1) % 10 == 0:
            await asyncio.sleep(5)

    await asyncio.to_thread(
        chunks_collection.add,
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


async def extract_keywords(text: str) -> list[str]:
    prompt = (
        "Extract the 8 most important keywords or key phrases from the text below. "
        "Return ONLY a comma-separated list, nothing else.\n\n"
        f"Text: {text[:3000]}"
    )
    result = await generate_text(prompt)
    return [kw.strip() for kw in result.split(",") if kw.strip()][:8]


async def generate_summary(text: str, title: str) -> str:
    prompt = (
        f'Summarize the following document titled "{title}" in 2-3 concise sentences. '
        f"Focus on the main ideas and key information.\n\nDocument:\n{text[:6000]}"
    )
    return await generate_text(prompt)
