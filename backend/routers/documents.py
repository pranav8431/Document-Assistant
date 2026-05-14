import asyncio
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db, chunks_collection
from models import Document
from services.processing import (
    extract_text_from_file,
    chunk_text,
    embed_and_store_chunks,
    extract_keywords,
    generate_summary,
)

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_type: str
    word_count: int
    char_count: int
    summary: str | None
    keywords: list[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    content: str
    chunk_count: int


@router.post("", response_model=DocumentResponse, status_code=201)
async def upload_document(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    raw = await file.read()
    text = extract_text_from_file(raw, file.filename or "upload.txt")
    file_type = (file.filename or "file.txt").rsplit(".", 1)[-1].lower()

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Document content is empty.")

    doc_id = str(uuid.uuid4())

    doc = Document(
        id=doc_id,
        title=title,
        content=text,
        file_type=file_type,
        word_count=len(text.split()),
        char_count=len(text),
        summary=None,
        keywords=[],
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Embed chunks and store in ChromaDB (may take time due to rate limiting)
    chunks = chunk_text(text, doc_id)
    await embed_and_store_chunks(chunks, title)

    return doc


@router.get("", response_model=list[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return result.scalars().all()


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Get chunk count from ChromaDB
    chroma_result = await asyncio.to_thread(
        chunks_collection.get,
        where={"document_id": doc_id},
        include=["metadatas"],
    )
    chunk_count = len(chroma_result["ids"])

    return {
        **{c.key: getattr(doc, c.key) for c in doc.__table__.columns},
        "chunk_count": chunk_count,
    }


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Delete vectors from ChromaDB
    await asyncio.to_thread(
        chunks_collection.delete,
        where={"document_id": doc_id},
    )

    await db.delete(doc)
    await db.commit()


@router.post("/{doc_id}/summary")
async def get_document_summary(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc.summary:
        doc.summary = await generate_summary(doc.content, doc.title)
        await db.commit()

    if not doc.keywords:
        doc.keywords = await extract_keywords(doc.content)
        await db.commit()

    return {
        "document_id": doc_id,
        "title": doc.title,
        "summary": doc.summary,
        "keywords": doc.keywords,
        "word_count": doc.word_count,
    }
