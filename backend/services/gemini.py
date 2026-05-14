import asyncio
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from config import settings

genai.configure(api_key=settings.gemini_api_key)

_gen_model = genai.GenerativeModel(settings.generation_model)


async def _with_retry(fn, *args, max_retries=4, **kwargs):
    delay = 15
    for attempt in range(max_retries):
        try:
            return await fn(*args, **kwargs) if asyncio.iscoroutinefunction(fn) else fn(*args, **kwargs)
        except ResourceExhausted:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(delay)
            delay *= 2


async def get_embedding(text: str) -> list[float]:
    def _embed():
        return genai.embed_content(
            model=settings.embedding_model,
            content=text,
            task_type="retrieval_document",
        )["embedding"]
    return await _with_retry(_embed)


async def get_query_embedding(text: str) -> list[float]:
    def _embed():
        return genai.embed_content(
            model=settings.embedding_model,
            content=text,
            task_type="retrieval_query",
        )["embedding"]
    return await _with_retry(_embed)


async def generate_text(prompt: str) -> str:
    async def _gen():
        response = await _gen_model.generate_content_async(prompt)
        return response.text
    return await _with_retry(_gen)


async def generate_stream(prompt: str):
    async for chunk in await _gen_model.generate_content_async(prompt, stream=True):
        if chunk.text:
            yield chunk.text
