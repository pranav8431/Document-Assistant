import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import QueryHistory
from services.workflow import run_workflow, run_workflow_stream

router = APIRouter(tags=["workflow"])


class WorkflowRequest(BaseModel):
    query: str
    document_id: str | None = None
    stream: bool = False


@router.post("/workflow/query")
async def workflow_query(req: WorkflowRequest, db: AsyncSession = Depends(get_db)):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if req.stream:
        async def event_generator():
            full_response = ""
            sources = []
            intent = "question"
            confidence = 0.0
            keywords = []

            async for event in run_workflow_stream(req.query, db, req.document_id):
                if event["event"] == "token":
                    full_response += event["data"]
                elif event["event"] == "done":
                    done_data = json.loads(event["data"])
                    full_response = done_data.get("response", full_response)
                    sources = done_data.get("sources", [])
                    intent = done_data.get("intent", "question")
                    confidence = done_data.get("confidence", 0.0)
                    keywords = done_data.get("keywords", [])

                yield f"event: {event['event']}\ndata: {event['data']}\n\n"

            # Persist to history
            history = QueryHistory(
                id=str(uuid.uuid4()),
                query=req.query,
                response=full_response,
                intent=intent,
                confidence=confidence,
                sources=sources,
            )
            db.add(history)
            await db.commit()

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    result = await run_workflow(req.query, db, req.document_id)

    history = QueryHistory(
        id=str(uuid.uuid4()),
        query=req.query,
        response=result["response"],
        intent=result["intent"],
        confidence=result["confidence"],
        sources=result["sources"],
        workflow_steps=result["workflow_steps"],
    )
    db.add(history)
    await db.commit()

    return result


@router.get("/history")
async def get_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QueryHistory).order_by(QueryHistory.created_at.desc()).limit(limit)
    )
    items = result.scalars().all()
    return [
        {
            "id": h.id,
            "query": h.query,
            "response": h.response,
            "intent": h.intent,
            "confidence": h.confidence,
            "sources": h.sources,
            "workflow_steps": h.workflow_steps,
            "created_at": h.created_at.isoformat(),
        }
        for h in items
    ]


@router.delete("/history/{history_id}", status_code=204)
async def delete_history(history_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QueryHistory).where(QueryHistory.id == history_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found.")
    await db.delete(item)
    await db.commit()
