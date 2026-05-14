import chromadb
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ChromaDB persistent client — stores vectors on disk at ./chroma_db/
chroma_client = chromadb.PersistentClient(path="./chroma_db")
chunks_collection = chroma_client.get_or_create_collection(
    name="document_chunks",
    metadata={"hnsw:space": "cosine"},
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    from sqlalchemy import text
    from models import Document, QueryHistory  # noqa: F401
    async with engine.begin() as conn:
        # Drop legacy chunks table if it exists from the old SQLite-based design
        await conn.execute(text("DROP TABLE IF EXISTS chunks"))
        await conn.run_sync(Base.metadata.create_all)
